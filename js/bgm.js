// TOEIC QUEST - BGM player (file-based)
// Plays assets/bgm/<track>.mp3 (title/field/town/dungeon/battle/boss),
// looped with a short crossfade. If a file is missing: silence (no fallback).
// Drop high-quality tracks in and they play automatically.
(function () {
  "use strict";

  var TRACKS = ["title", "field", "town", "dungeon", "battle", "boss"];
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
    a.src = (window.BGM_ART && window.BGM_ART[name]) || "assets/bgm/" + name + ".mp3";
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
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* needs user gesture; retried on unlock */ });
    });
  }

  function play(name) {
    if (TRACKS.indexOf(name) < 0) return;
    if (cur === name) {
      if (enabled && unlocked && playing && playing.paused) startTrack(name);
      return;
    }
    cur = name;
    if (!enabled) return;
    if (unlocked) startTrack(name);
    // if not unlocked yet, the gesture handler below starts it
  }

  function stop() {
    if (playing) { fadeOut(playing); playing = null; }
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

  window.BGM = { play: play, stop: stop, setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
