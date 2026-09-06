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
  var buses = {};       // 名前 -> GainNode
  var levels = {};      // 名前 -> 音量（context ができる前に指定された分を覚える）
  var buffers = {};     // 効果音の名前 -> AudioBuffer
  var state = {};       // 効果音の名前 -> "loading" | "fail"
  var dead = !Ctx;      // Web Audio そのものが使えない

  function context() {
    if (ctx || dead) return ctx;
    try {
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
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
    if (c.state !== "running" && c.resume) { try { c.resume(); } catch (e) {} }
    return c.state === "running";
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

  // 鳴らせたら true。false なら呼び出し側が <audio> で鳴らす
  function play(name, busName) {
    var c = context();
    if (!c) return false;
    var buf = buffers[name];
    if (!buf) return false;
    if (!resume()) return false;       // まだ操作前
    try {
      var s = c.createBufferSource();
      s.buffer = buf;
      s.connect(bus(busName || "sfx"));
      s.start(0);
      return true;
    } catch (e) { return false; }
  }

  function ready(name) { return !!buffers[name]; }

  // ---- <audio> を Web Audio の経路に繋ぐ（BGM用）----
  // 繋いだ要素の音は GainNode を通るようになるので、el.volume ではなく
  // setLevel() で音量を変える。一度しか繋げないので印を付けておく
  function connect(el, busName) {
    var c = context();
    if (!c || !el) return false;
    if (el.__wqBus) return true;
    var g = bus(busName);
    if (!g) return false;
    try {
      var src = c.createMediaElementSource(el);
      src.connect(g);
      el.__wqBus = busName;
      el.volume = 1;            // ここから先の音量は GainNode が持つ
      return true;
    } catch (e) { return false; }
  }

  window.WQAUDIO = {
    available: function () { return !!context(); },
    resume: resume,
    load: load,
    play: play,
    ready: ready,
    connect: connect,
    setLevel: setLevel,
    getLevel: getLevel
  };
})();
