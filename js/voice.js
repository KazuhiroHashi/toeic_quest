// WORD QUEST - 英単語の読み上げ（assets/voice/<単語>.mp3）
// 問題が出た瞬間に鳴らす。効果音と同じで、BGMには一切触らずに重ねるだけ。
//
// bgm.js と同じ理由で要素はひとつだけ持ち回す。iOS Safari は「最初のタップで
// 解禁された要素」しか後から再生できないので、単語ごとに new Audio() すると
// 2問目から無音になる（BGMで実際に踏んだ）。src を差し替えて使い回す。
//
// 音量について：読み上げは <audio> の上限(1.0)まで出しているので、これ以上は
// 上げられない。実機で試したところ聞き取りにくいという声があったため、
// BGM側を 0.55 → 0.45 まで下げて差を作った（js/bgm.js）。
// 読み上げの間だけBGMを下げる手（ダッキング）は採らない。0.6秒ごとに音量が
// 上下すると、かえって耳につくため。下げるなら一律で下げる。
//
// 音声が無い単語（生成漏れ・記号を含む語など）は黙って飛ばす。エラー音は出さない。
(function () {
  "use strict";

  // 1.0 は <audio> の音量の上限。これ以上大きくするには Web Audio のゲインを
  // 噛ませるか、音声ファイルを録り直すしかない。上限に張り付いているので、
  // 聞き取りやすさの調整は BGM 側（js/bgm.js の VOLUME）で行う
  var VOLUME = 1.0;
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

  function say(word) {
    if (!enabled || !unlocked || !word) return;
    var s = slug(word);
    if (!s || !exists(s)) return;
    var a = audio();
    playing = s;
    try { a.pause(); } catch (e) {}
    a.src = srcOf(s);
    var p = a.play();
    if (p && p.catch) p.catch(function () { playing = null; });   // 解禁前などは黙って諦める
  }

  function stop() {
    if (!el) return;
    try { el.pause(); } catch (e) {}
    playing = null;
  }

  function setEnabled() { /* 廃止。常にオン */ }

  // iOS の「操作の中で一度でも再生した要素だけが、あとから鳴らせる」規則は
  // 要素ごとに付く。読み上げは問題が出た瞬間＝操作から離れた場所で始まるので、
  // 要素の用意だけを最初のタップの中で済ませ、無音の音で一度鳴らして解禁する。
  // src は後から差し替えるが、解禁は要素に付いたまま残る（bgm.js と同じ手）。
  var SILENT = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==";
  var primed = false;
  function prime() {
    if (primed) return;
    var a = audio(), vol = a.volume, p;
    a.volume = 0;
    a.src = SILENT;
    try { p = a.play(); } catch (e) { a.volume = vol; return; }
    function settle(ok) {
      // 解禁の最中に単語の読み上げが始まっていたら、それは止めない
      if (a.src === SILENT) { try { a.pause(); } catch (e) {} }
      a.volume = vol;
      primed = !!ok;      // 拒まれたら次のタップでやり直す
    }
    if (p && p.then) p.then(function () { settle(true); }, function () { settle(false); });
    else settle(true);
  }

  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { unlocked = true; prime(); }, { passive: true });
  });

  window.VOICE = { say: say, stop: stop, slug: slug,
                   setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
