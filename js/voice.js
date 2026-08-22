// WORD QUEST - 英単語の読み上げ（assets/voice/<単語>.mp3）
// 問題が出た瞬間に鳴らす。効果音と同じで、BGMには一切触らずに重ねるだけ。
//
// bgm.js と同じ理由で要素はひとつだけ持ち回す。iOS Safari は「最初のタップで
// 解禁された要素」しか後から再生できないので、単語ごとに new Audio() すると
// 2問目から無音になる（BGMで実際に踏んだ）。src を差し替えて使い回す。
//
// BGMを下げない理由：実測で、読み上げは声の帯域（300-4000Hz）でBGMより +12dB 上にある。
// 下げなくても埋もれない。0.6秒ごとにBGMが上下すると、かえって耳につく。
// 効果音（game.js の SFX）も音量0.5でBGMに重ねているだけで、同じ扱いに揃えた。
//
// 音声が無い単語（生成漏れ・記号を含む語など）は黙って飛ばす。エラー音は出さない。
(function () {
  "use strict";

  var VOLUME = 0.95;    // BGM 0.55 / 効果音 0.5 に対して。2026-08-22 に耳で決めた値
  var enabled = true;
  try { enabled = localStorage.getItem("tq_voice") !== "0"; } catch (e) {}

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

  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem("tq_voice", enabled ? "1" : "0"); } catch (e) {}
    if (!enabled) stop();
  }

  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { unlocked = true; }, { passive: true });
  });

  window.VOICE = { say: say, stop: stop, slug: slug,
                   setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
