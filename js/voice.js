// WORD QUEST - 英単語の読み上げ（assets/voice/<単語>.mp3）
// 問題が出た瞬間に鳴らす。効果音と同じで、BGMには一切触らずに重ねるだけ。
//
// bgm.js と同じ理由で要素はひとつだけ持ち回す。iOS Safari は「最初のタップで
// 解禁された要素」しか後から再生できないので、単語ごとに new Audio() すると
// 2問目から無音になる（BGMで実際に踏んだ）。src を差し替えて使い回す。
//
// 音量について：iOS の <audio> は volume を受け付けないので、実機ではBGMも
// 効果音も読み上げも、ずっと 1.0 で鳴っていた。Web Audio に移して初めて
// 音量差が作れるようになった（js/audio.js）。それでも読み上げが埋もれる
// という声があったので、こう置いている。
//     BGM     0.73   （js/bgm.js）
//     効果音   0.81   （party/js/pbattle.js）
//     読み上げ 1.0    （下の BOOST。持ち上げず、mp3側で音量を揃えてある）
// 読み上げの間だけBGMを下げる手（ダッキング）は採らない。0.6秒ごとに音量が
// 上下すると、かえって耳につくため。下げるなら一律で下げる。
//
// 音声が無い単語（生成漏れ・記号を含む語など）は黙って飛ばす。エラー音は出さない。
(function () {
  "use strict";

  // 以前はここで 1.10 倍していた。読み上げのmp3が語によって小さかったので、
  // 足りないぶんを再生側で持ち上げていた。
  //
  // 2026-09-08、mp3 側の音量の揃え方を直した（tools/gen_voice_local.py）。
  // 以前はピークだけを揃えていたため体感音量が -12〜-21dB と9dBも開いて
  // いたが、体感音量（RMS）で揃えるようにして -14.5dB でそろった。
  // 語ごとの当たり外れが無くなったので、再生側で持ち上げる必要がない。
  //
  // 上げないほうが良い理由もある。1.10倍を前提にすると、mp3側でその分の
  // 余裕を空けておかねばならず、音を潰して（圧縮して）作ることになる。
  // 1.0 のままなら潰さずに済み、そのぶん素直な音になる。
  var VOLUME = 1.0;
  var BOOST = 1.0;       // Web Audio に繋げたときだけ効く
  var routed = false;
  // 読み上げは常にオン。切れるようにしていたが、消したまま使って
  // 「音が出ない」と受け取られるほうが損なので、設定ごと廃止した。
  // setEnabled / isEnabled は game.js など呼び出し側が残っているので形だけ保つ
  var enabled = true;

  var el = null;
  var unlocked = false;
  var missing = {};     // slug -> true（404を一度踏んだら二度と取りにいかない）
  var playing = null;

  // tools/build_voice_list.js の slug() と同じ規則。ずれるとファイルが引けない
  function slug(w) {
    return String(w).toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function srcOf(s) {
    return (window.VOICE_ART && window.VOICE_ART[s]) ||
           (window.ASSET_BASE || "") + "assets/voice/" + s + ".mp3";
  }

  // インライン版は音声を同梱しない（17MBで上限を超える）。その場合は最初から諦める
  function exists(s) {
    if (missing[s]) return false;
    if (window.VOICE_ART && !window.VOICE_ART[s]) { missing[s] = true; return false; }
    return true;
  }

  function audio() {
    if (el) return el;
    el = new Audio();
    el.preload = "auto";
    el.volume = VOLUME;
    el.addEventListener("error", function () {
      if (playing) missing[playing] = true;   // 404を踏んだ語は二度と取りにいかない
      playing = null;
    });
    return el;
  }

  // ---- 鳴らし方は2通り ----
  // Web Audio：先に読み込んで展開してから鳴らす。待ち時間がほぼ無い。
  // <audio>  ：src を入れて play()。実機では毎回 0.2 秒ほど遅れて聞こえる
  //            （再生の仕組みを都度組み直すため）。Web Audio が使えないときの控え。
  var node = null;      // Web Audio で鳴らしている最中のもの
  var seq = 0;          // 読み込んでいる間に次の単語が来たら、古いほうは捨てる

  function stopNode() {
    if (!node) return;
    try { node.stop(); } catch (e) {}
    node = null;
  }

  function sayViaElement(s) {
    var a = audio();
    playing = s;
    try { a.pause(); } catch (e) {}
    a.src = srcOf(s);
    var p = a.play();
    if (p && p.catch) p.catch(function () { playing = null; });   // 解禁前などは黙って諦める
  }

  function say(word) {
    if (!enabled || !unlocked || !word) return;
    var s = slug(word);
    if (!s || !exists(s)) return;

    if (window.WQAUDIO && WQAUDIO.resume()) {
      if (!routed) { WQAUDIO.setLevel("voice", BOOST); routed = true; }
      var token = ++seq;
      stopNode();
      playing = s;
      WQAUDIO.buffer(srcOf(s)).then(function (buf) {
        if (token !== seq) return;                 // 次の単語に追い越された
        node = WQAUDIO.source(buf, "voice");
        if (!node) sayViaElement(s);               // 念のため
      }, function () {
        // 読み込めなかった。ここで「無い語」と決めつけてはいけない。
        // file:// のように fetch だけが通らない環境があり、そう決めると
        // 読み上げが二度と鳴らなくなる。今まで通りの鳴らし方に落とす。
        // 本当に無い語なら、<audio> 側の error で missing に入る
        if (token !== seq) return;
        sayViaElement(s);
      });
      return;
    }

    sayViaElement(s);
  }

  function stop() {
    seq++;                     // 読み込み中のものも無効にする
    stopNode();
    if (el) { try { el.pause(); } catch (e) {} }
    playing = null;
  }

  function setEnabled() { /* 廃止。常にオン */ }

  // 読み上げの要素は解禁処理を入れない。
  // 一度は入れたが、無音の音を鳴らして解禁しようとすると、その再生が
  // すぐ次の単語の読み上げに割り込まれて失敗し、失敗するたびに再挑戦して
  // 読み上げそのものを横取りしてしまった（実機で読み上げが止まった）。
  // 元々この要素はタップの流れの中で作られていて問題が出ていないので、
  // 触らないのが正しい。効果音（pbattle.js）とは事情が違う。
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { unlocked = true; }, { passive: true });
  });

  window.VOICE = { say: say, stop: stop, slug: slug,
                   setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
