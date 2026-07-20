// TOEIC QUEST - BGM player (file-based)
// Plays assets/bgm/<track>.mp3, looped, with a short fade on switch.
// - field/town/dungeon/title resume from where they last stopped
// - battle-type tracks (battle/battle2/battle_dungeon/midboss/boss) restart from 0
// - playAny([..]) plays the first track that actually exists (missing files skip)
// If a file is missing: silence (no fallback beeps).
(function () {
  "use strict";

  var TRACKS = ["title", "field", "town", "dungeon",
                "battle", "battle2", "battle_dungeon", "midboss", "midboss2", "midboss3", "boss", "lastboss", "ending", "gameover"];
  var NO_RESUME = { battle: 1, battle2: 1, battle_dungeon: 1, midboss: 1, midboss2: 1, midboss3: 1, boss: 1, lastboss: 1, ending: 1, gameover: 1 };
  var VOLUME = 0.55;

  var enabled = true;
  try { enabled = localStorage.getItem("tq_bgm") !== "0"; } catch (e) {}

  var cache = {};   // name -> HTMLAudioElement | "no"
  var cur = null;   // current track name
  var playing = null; // current Audio element
  var unlocked = false;

  function probe(name, cb) {
    if (cache[name]) { cb(cache[name]); return; }
    var a = new Audio();
    a.preload = "auto";
    a.loop = true;
    a.volume = VOLUME;
    a.oncanplaythrough = function () { a.oncanplaythrough = null; cache[name] = a; cb(a); };
    a.onerror = function () { cache[name] = "no"; cb("no"); };
    a.src = (window.BGM_ART && window.BGM_ART[name]) || (window.ASSET_BASE || "") + "assets/bgm/" + name + ".mp3";
  }

  function fadeOut(a) {
    if (!a) return;
    var v = a.volume;
    var iv = setInterval(function () {
      v -= 0.08;
      if (v <= 0) { clearInterval(iv); a.pause(); a.volume = VOLUME; }
      else a.volume = v;
    }, 40);
  }

  function startTrack(name) {
    probe(name, function (a) {
      if (a === "no" || cur !== name || !enabled) return;
      if (playing && playing !== a) fadeOut(playing);
      playing = a;
      a.volume = VOLUME;
      if (NO_RESUME[name]) { try { a.currentTime = 0; } catch (e) {} }
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* needs user gesture; retried on unlock */ });
    });
  }

  function play(name) {
    if (TRACKS.indexOf(name) < 0) return;
    if (cur === name && !NO_RESUME[name]) {
      if (enabled && unlocked && playing && playing.paused) startTrack(name);
      return;
    }
    cur = name;
    if (!enabled) return;
    if (unlocked) startTrack(name);
    // if not unlocked yet, the gesture handler below starts it
  }

  // Play the first available track in the list (missing files are skipped).
  function playAny(list) {
    var i = 0;
    (function tryNext() {
      if (i >= list.length) return;
      var name = list[i++];
      if (TRACKS.indexOf(name) < 0) { tryNext(); return; }
      probe(name, function (a) {
        if (a === "no") { tryNext(); return; }
        play(name);
      });
    })();
  }

  function stop() {
    if (playing) { fadeOut(playing); playing = null; }
    cur = null;
  }

  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem("tq_bgm", v ? "1" : "0"); } catch (e) {}
    if (!v) stop();
    else if (cur) startTrack(cur);
  }

  // browsers require a user gesture before audio can start
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      unlocked = true;
      if (cur && enabled && (!playing || playing.paused)) startTrack(cur);
    }, { passive: true });
  });

  window.BGM = { play: play, playAny: playAny, stop: stop, setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
