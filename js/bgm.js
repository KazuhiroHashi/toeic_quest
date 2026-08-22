// TOEIC QUEST - BGM player (one shared <audio>, file- or data-URI-backed)
// Plays assets/bgm/<track>.mp3, looped, with a short fade when switching.
// - title/field/town/dungeon resume from where they last stopped
// - battle-type tracks (battle/arena*/midboss/king*/boss/lastboss) restart from 0
// - playAny([..]) plays the first track that actually exists (missing ones skip)
// If a track is missing: silence (no fallback beeps).
//
// One element on purpose. iOS Safari only lets a media element begin playing
// from a user gesture, and that permission sticks to the *element* — so the
// element the player's first tap unlocked is the one that can later start the
// battle theme, which begins on a timer rather than on a tap. For the same
// reason nothing below waits for a load event before calling play(): iOS never
// preloads, so canplaythrough does not fire until playback is asked for, and
// waiting on it left the phone silent forever.
(function () {
  "use strict";

  var TRACKS = ["title", "field", "town", "dungeon",
                "battle", "battle2", "battle_dungeon",
                "arena1", "arena2", "arena3", "arena4", "arena5",
                "midboss", "king1", "king2", "king3", "king4",
                "boss", "lastboss", "ending", "victory", "gameover"];
  var NO_RESUME = { battle: 1, battle2: 1, battle_dungeon: 1,
                    arena1: 1, arena2: 1, arena3: 1, arena4: 1, arena5: 1,
                    midboss: 1, king1: 1, king2: 1, king3: 1, king4: 1,
                    boss: 1, lastboss: 1, ending: 1, gameover: 1 };
  var VOLUME = 0.55;
  var DUCK = 0.35;      // 読み上げ中のBGM音量（VOLUMEに対する比）
  var STEP = 40;        // ms per fade tick (fade-out only — a track always
                        // starts at full volume, or its opening hit is lost)

  var enabled = true;
  try { enabled = localStorage.getItem("tq_bgm") !== "0"; } catch (e) {}

  var el = null;      // the one audio element
  var cur = null;     // track the game asked for
  var loaded = null;  // track currently attached to the element
  var missing = {};   // name -> true once its source failed to load
  var pos = {};       // name -> seconds, for the resumable tracks
  var unlocked = false;
  var onFail = null;  // playAny's "try the next one" continuation
  var ramp = null;

  function srcOf(name) {
    return (window.BGM_ART && window.BGM_ART[name]) ||
           (window.ASSET_BASE || "") + "assets/bgm/" + name + ".mp3";
  }

  // inline/standalone builds embed only some tracks, so a miss is known up front
  function exists(name) {
    if (missing[name]) return false;
    if (window.BGM_ART && !window.BGM_ART[name]) { missing[name] = true; return false; }
    return true;
  }

  function audio() {
    if (el) return el;
    el = new Audio();
    el.preload = "auto";
    el.loop = true;
    el.volume = VOLUME;
    el.addEventListener("error", function () {
      var name = loaded;
      if (!name) return;
      missing[name] = true;
      if (cur === name) {
        cur = loaded = null;
        var f = onFail; onFail = null;
        if (f) f();   // fall through to the next candidate
      }
    });
    return el;
  }

  function remember() {
    if (el && loaded && !NO_RESUME[loaded]) { try { pos[loaded] = el.currentTime; } catch (e) {} }
  }

  function fadeOut() {
    if (!el) return;
    clearInterval(ramp);
    var a = el, v = a.volume;
    ramp = setInterval(function () {
      v -= 0.08;
      if (v <= 0) { clearInterval(ramp); ramp = null; a.pause(); a.volume = ducked ? VOLUME * DUCK : VOLUME; }
      else a.volume = v;
    }, STEP);
  }

  function startTrack(name) {
    if (!enabled || missing[name]) return;
    var a = audio();
    clearInterval(ramp); ramp = null;   // cancel a fade-out still in progress
    a.volume = ducked ? VOLUME * DUCK : VOLUME;
    if (loaded === name) {
      if (NO_RESUME[name]) { try { a.currentTime = 0; } catch (e) {} }
      else if (!a.paused) return;
    } else {
      remember();
      loaded = name;
      a.src = srcOf(name);
      var want = NO_RESUME[name] ? 0 : (pos[name] || 0);
      if (want) {
        // seeking before the metadata lands is ignored, so wait for just that
        a.addEventListener("loadedmetadata", function once() {
          a.removeEventListener("loadedmetadata", once);
          if (loaded === name) { try { a.currentTime = want; } catch (e) {} }
        });
      }
    }
    var p = a.play();
    if (p && p.catch) p.catch(function () { /* needs a gesture; retried on the next tap */ });
  }

  function play(name) {
    if (TRACKS.indexOf(name) < 0) return;
    onFail = null;   // a direct play() abandons any pending playAny fallback
    if (cur === name && !NO_RESUME[name]) {
      if (enabled && unlocked && el && el.paused) startTrack(name);
      return;
    }
    cur = name;
    if (!enabled) return;
    if (unlocked) startTrack(name);
    // before the first gesture the handler at the bottom starts it
  }

  // Play the first available track in the list (missing ones are skipped).
  function playAny(list) {
    var i = 0;
    (function tryNext() {
      while (i < list.length) {
        var name = list[i++];
        if (TRACKS.indexOf(name) < 0 || !exists(name)) continue;
        play(name);
        onFail = tryNext;   // a hosted file can still 404; error advances the list
        return;
      }
      onFail = null;
    })();
  }

  function stop() {
    onFail = null;
    remember();
    cur = null;
    fadeOut();
  }

  // 単語の読み上げを重ねるあいだだけ音量を下げる。止めると戦闘の緊張が切れる
  var ducked = false;
  function duck(on) {
    if (ducked === !!on) return;
    ducked = !!on;
    if (!el || ramp) return;          // フェード中は触らない（取り合いになる）
    el.volume = ducked ? VOLUME * DUCK : VOLUME;
  }

  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem("tq_bgm", v ? "1" : "0"); } catch (e) {}
    if (!v) { var keep = cur; stop(); cur = keep; }  // keep it, so re-enabling resumes
    else if (cur) startTrack(cur);
  }

  // browsers require a user gesture before audio can start
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      var first = !unlocked;
      unlocked = true;
      if (cur && enabled && (first || !el || el.paused)) startTrack(cur);
    }, { passive: true });
  });

  window.BGM = { play: play, playAny: playAny, stop: stop, duck: duck,
                 setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
