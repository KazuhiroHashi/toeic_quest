// WORD QUEST - 音の土台（Web Audio）
//
// なぜ <audio> をやめたか。iOS の <audio> には、直しようのない制約が2つある。
//
//  1) 音量を受け付けない。el.volume に何を入れても無視され、読み出すと常に 1 が
//     返る。音量はハードのボリュームだけで決まる。つまり BGM 0.45 / 効果音 0.7 /
//     読み上げ 1.0 という調整は、iPhone では全部 1.0 として鳴っていた。
//     （実機で確認：効果音を volume=0 にして鳴らしたら、そのまま全部鳴った）
//
//  2) 「利用者の操作の中で一度でも再生した要素」しか、あとから鳴らせない。
//     しかもこの許可は要素ごとに付く。効果音は18種類あって、鳴る場面の多くが
//     演出の待ち時間＝操作から離れた場所なので、要素を作った瞬間に拒まれ、
//     その音は無音のまま二度と鳴らなかった。
//     先に全部を無音で鳴らして解禁する手も試したが、解禁の再生と本来の再生が
//     取り合いになり、読み上げを止めるなどの副作用が出た。
//
// Web Audio にはこのどちらも無い。AudioContext をひとつ持ち、最初の操作で
// resume() するだけで解禁は済み（要素ごとの許可は不要）、GainNode の音量は
// iOS でも普通に効く。効果音は decodeAudioData で読んでおけば、何個でも
// 重ねて鳴らせる。
//
// BGM は曲が長く、全部を展開すると重いので <audio> のまま。ただし
// createMediaElementSource で Web Audio の経路に繋ぎ、音量は GainNode で取る。
//
// Web Audio が使えない環境（古いブラウザ、file:// で fetch できない場合など）
// では黙って false を返す。呼び出し側は今まで通り <audio> で鳴らせばよい。
(function () {
  "use strict";

  var Ctx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var limiter = null;
  var buses = {};       // 名前 -> GainNode
  var levels = {};      // 名前 -> 音量（context ができる前に指定された分を覚える）
  var buffers = {};     // 効果音の名前 -> AudioBuffer
  var state = {};       // 効果音の名前 -> "loading" | "fail"
  var dead = !Ctx;      // Web Audio そのものが使えない

  // 出口に頭打ち（リミッター）を1枚置く。
  //
  // Web Audio は重ねた音をそのまま足し算するので、違う音が同時に鳴ると
  // 出力が 1.0 を超える。実測：
  //                                     入れる前 → 入れたあと
  //     効果音1つ                          0.79  →  0.79
  //     正解の瞬間（読み上げ中に会心の音）    1.23  →  0.93
  //     効果音＋読み上げ                    1.29  →  0.92
  //     呪文＋斬＋会心＋被弾（全体攻撃）      2.15  →  0.96
  //     勝利（ファンファーレ＋レベルアップ）   1.03  →  0.89
  //     広告や着信のあと、溜まった音が一斉に  2.76  →  0.92
  // 1.0 を超えたぶんは歪むだけでなく、iOS では出力全体を抑えにかかるので、
  // 「急に音が異常に小さくなる」という形で表に出る（実機で報告あり）。
  //
  // 同じ名前の音を1つに絞る対処は入れてあるが、それは同じ音の連打にしか
  // 効かない。違う音どうしの重なりはここで受ける。
  // 0.70 までは素通しで、そこから上だけを 0.92 に向けて丸める。ふだんの1音は
  // 0.79 なのでほぼ手つかず（-0.05dB）、重なった分だけが頭を押さえられる。
  // 読み上げの mp3 を作るときと同じ形（tools/gen_voice_local.py の _soft_limit）。
  //
  // DynamicsCompressorNode ではなく波形で作っているのは、あちらが中で
  // 持ち上げ（メイクアップゲイン）を掛けるため。実測で音が1つのときまで
  // +0.9dB 大きくなり、しかもその量はしきい値の付け方で変わる。エンジンが
  // 違えば量も変わるので、実機で当てにできない。こちらは計算どおりに効く。
  //
  // BGM は Web Audio を通っていない（素の <audio>）ので、ここには入らない。
  // つまり効果音が重なってもBGMが押し下げられることはない。
  var KNEE = 0.70, CEIL = 0.92, RANGE = 4;   // RANGE = 受け止められる重なりの上限
  function limitCurve() {
    var n = 8192, c = new Float32Array(n), room = CEIL - KNEE;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;         // -1〜+1（実際の入力の RANGE 倍ぶん）
      var a = Math.abs(x) * RANGE, y;
      y = a <= KNEE ? a : KNEE + room * Math.tanh((a - KNEE) / room);
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }

  function context() {
    if (ctx || dead) return ctx;
    try {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 1;
      var out = ctx.destination;
      if (ctx.createWaveShaper) {
        var pre = ctx.createGain();
        pre.gain.value = 1 / RANGE;          // ±4 を波形の ±1 に畳む
        limiter = ctx.createWaveShaper();
        limiter.curve = limitCurve();
        limiter.oversample = "4x";           // 折り返しノイズを出さない
        pre.connect(limiter);
        limiter.connect(out);
        out = pre;
      }
      master.connect(out);
    } catch (e) { dead = true; ctx = null; }
    return ctx;
  }

  // 経路（BGM用・効果音用など）を分けておくと、片方だけ音量を変えられる
  function bus(name) {
    var c = context();
    if (!c) return null;
    var g = buses[name];
    if (!g) {
      g = buses[name] = c.createGain();
      g.gain.value = (levels[name] == null) ? 1 : levels[name];
      g.connect(master);
    }
    return g;
  }

  function setLevel(name, v) {
    levels[name] = v;
    var g = buses[name];
    if (g) {
      // 値を飛ばすとプツッと鳴るので、ごく短い時間でならす
      try { g.gain.setTargetAtTime(v, g.context.currentTime, 0.01); }
      catch (e) { g.gain.value = v; }
    }
  }

  function getLevel(name) {
    return levels[name] == null ? 1 : levels[name];
  }

  // 最初の操作で解禁する。ここ一箇所だけで、音の全部に効く
  function resume() {
    var c = context();
    if (!c) return false;
    if (c.state === "running") return true;
    if (c.resume) {
      try {
        var q = c.resume();
        // 動き出したら、抱えていた分はもう「溜まった音」ではない
        if (q && q.then) q.then(function () { pend.length = 0; }, function () {});
      } catch (e) {}
    }
    // ここで c.state を見て false を返してはいけない。resume() は非同期で、
    // 呼んだ直後はまだ "suspended" のまま（実測：直後 suspended、120ms後に
    // running）。false を返すと呼び出し側が <audio> の控えに落ちるが、iOS の
    // <audio> は要素ごとに解禁が要るので鳴らず、その1音が消える。
    // 「ボタンのクリック音が鳴らない時がある」はこれ。広告のあとは iOS が
    // context を止めるので、広告のたびに次の1音が落ちていた。
    // 止まっている context に start() した音は、動き出した時にちゃんと鳴る。
    return c.state !== "closed";
  }
  ["pointerdown", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, resume, { passive: true });
  });
  // 電話・他のアプリ・広告の動画などに音を奪われると iOS は context を
  // 止めることがある。戻ってきたときに繋ぎ直す
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) resume();
  });
  window.addEventListener("pageshow", resume);

  // ---- 効果音（短いので丸ごと展開して持つ）----
  function load(name, url) {
    var c = context();
    if (!c || buffers[name] || state[name]) return;
    state[name] = "loading";
    function fail() { state[name] = "fail"; }
    var got;
    try { got = fetch(url); } catch (e) { fail(); return; }
    got.then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); })
       .then(function (ab) {
         return new Promise(function (ok, ng) {
           // Safari は古い呼び出し方しか受けない版があるので両対応にする
           var q = c.decodeAudioData(ab, ok, ng);
           if (q && q.then) q.then(ok, ng);
         });
       })
       .then(function (buf) { buffers[name] = buf; state[name] = null; }, fail);
  }

  // 同じ音が続けて呼ばれたときの決まり。
  //
  // 【なぜ2回作り直しているか】
  // Web Audio はいくらでも音が重なる。同じ音が続けて呼ばれると何重にもなり、
  // 「プェプェプェプェーーーン」と尾を引いて音が割れる（2026-09-07に報告）。
  // そこで「同じ名前の音は1つまで。来たら前のを止めて鳴らし直す」にした。
  //
  // これが別の不具合を生んだ。stop() はその瞬間に切り落とすので、余韻の
  // 途中で止まると「カキーン」が「カッ」になる（2026-09-08に報告）。
  // 実測すると、これは例外ではなく日常的に起きていた：
  //     crit  の聞こえる長さ 0.35秒 ／ slash 0.35秒 ／ hit 0.50秒 ／ cursor 0.70秒
  //     実際の呼び直し間隔   cursor 0.315秒（8回中4回）／ hit 0.328秒（7回中2回）
  // 鳴り終わる前に切られていた。
  //
  // 【いまの決まり】重ねないことと、切らないことを両立させる。
  //   ・70ms 以内に同じ音がまた来たら、それは「ひとつの出来事の重複」。
  //     たとえばボスの全体攻撃は味方4人ぶんの hit を同じ瞬間に呼ぶ。
  //     2つ目以降は鳴らさず、いま鳴っている音をそのまま鳴らしきる。
  //     → 重ならないし、切れもしない。
  //   ・それより後なら、別の出来事なので重ねて鳴らす。
  //     同時に3つまで。あふれたら、いちばん古いものを 80ms かけて
  //     消してから譲る。stop() でぶつ切りにはしない。
  //   ・重なったぶんの音量は、出口のリミッターが受け止める。
  var MIN_GAP = 0.07;    // 秒。これより短い間隔＝同じ出来事の重複
  var MAX_SAME = 3;      // 同じ音を同時に鳴らす上限
  var FADE = 0.08;       // 打ち切るときの消し方（秒）

  // 止まっている context に start() した音は、動き出した瞬間に「全部いっしょに」
  // 鳴り出す。広告・着信・アプリの切り替えのあとがこれで、実測で8個が同じ瞬間に
  // 重なり、出力が 2.76（+8.8dB）まで跳ねた。
  // 止まっている間に抱えておくのは最後の1つだけにする。1つは残すので、
  // 「広告のあと、押したボタンの音が鳴らない」は起きないままにできる。
  var pend = [];
  function hold(s) {
    var c = ctx;
    if (!c) return;
    if (c.state === "running") { pend.length = 0; return; }
    for (var i = 0; i < pend.length; i++) { try { pend[i].stop(); } catch (e) {} }
    pend = [s];
  }

  var live = {};         // 名前 -> 鳴っている最中のものの一覧（古い順）
  function play(name, busName) {
    var c = context();
    if (!c) return false;
    var buf = buffers[name];
    if (!buf) return false;
    if (!resume()) return false;       // まだ操作前
    try {
      var now = c.currentTime;
      var arr = live[name] || (live[name] = []);

      // ひとつの出来事から続けて呼ばれたぶんは、鳴らさずに見送る。
      // いま鳴っている音がそのまま最後まで鳴る
      if (arr.length && now - arr[arr.length - 1].t < MIN_GAP) return true;

      // あふれたぶんは、消してから譲る（ぶつ切りにしない）
      while (arr.length >= MAX_SAME) {
        var old = arr.shift();
        try {
          var g0 = old.g.gain;
          g0.cancelScheduledValues(now);
          g0.setValueAtTime(g0.value, now);
          g0.linearRampToValueAtTime(0.0001, now + FADE);
          old.s.stop(now + FADE);
        } catch (e) { try { old.s.stop(); } catch (e2) {} }
      }

      var g = c.createGain();
      g.connect(bus(busName || "sfx"));
      var s = c.createBufferSource();
      s.buffer = buf;
      s.connect(g);
      var rec = { s: s, g: g, t: now };
      s.onended = function () {
        var k = arr.indexOf(rec);
        if (k >= 0) arr.splice(k, 1);
        try { g.disconnect(); } catch (e) {}
      };
      arr.push(rec);
      s.start(0);
      hold(s);
      return true;
    } catch (e) { return false; }
  }

  function ready(name) { return !!buffers[name]; }

  // ---- 読み上げのように「その場で決まる音」を、待たずに鳴らすための入口 ----
  // <audio> に src を入れて play() すると、再生の仕組みを毎回組み直すぶん
  // 実機で 0.2 秒ほど遅れる。読み込んで展開したものを鳴らせばその間が消える。
  // 単語は 4,883 語あるので全部は持てない。使った順に少しだけ覚えておく
  var VOICE_CACHE = 60;
  var byUrl = {};       // url -> AudioBuffer
  var order = [];       // 使った順（古いものから捨てる）
  var loading = {};     // url -> Promise（同じ語を二重に取りにいかない）

  function buffer(url) {
    var c = context();
    if (!c) return Promise.reject();
    var hit = byUrl[url];
    if (hit) return Promise.resolve(hit);
    if (loading[url]) return loading[url];
    var q = fetch(url)
      .then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); })
      .then(function (ab) {
        return new Promise(function (ok, ng) {
          var d = c.decodeAudioData(ab, ok, ng);
          if (d && d.then) d.then(ok, ng);
        });
      })
      .then(function (buf) {
        delete loading[url];
        byUrl[url] = buf;
        order.push(url);
        while (order.length > VOICE_CACHE) delete byUrl[order.shift()];
        return buf;
      }, function (e) { delete loading[url]; throw e; });
    loading[url] = q;
    return q;
  }

  // 鳴らして、止めるためのノードを返す（止めないなら捨ててよい）
  function source(buf, busName) {
    var c = context();
    if (!c || !buf || !resume()) return null;
    try {
      var s = c.createBufferSource();
      s.buffer = buf;
      s.connect(bus(busName || "sfx"));
      s.start(0);
      hold(s);
      return s;
    } catch (e) { return null; }
  }

  // <audio> を Web Audio の経路に繋ぐ仕組みは置かない。
  // BGMで一度やったが、createMediaElementSource に繋いだ要素は src を
  // 差し替えても鳴り始めないことがある（WebKit の既知のふるまい）。
  // BGMは曲ごとに src を入れ替える作りなので、これに正面からぶつかり、
  // 「戦闘が始まってもしばらく曲が鳴らない」「BGMが鳴らない」が出た。
  // BGMは素の <audio> のままにして、音量はファイル側で調整する
  // （tools/build_www.js の BGM_GAIN）。

  window.WQAUDIO = {
    available: function () { return !!context(); },
    resume: resume,
    load: load,
    play: play,
    ready: ready,
    buffer: buffer,
    source: source,
    setLevel: setLevel,
    getLevel: getLevel
  };
})();
