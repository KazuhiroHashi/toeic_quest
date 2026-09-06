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
  // iOS の <audio> は volume を受け付けないので、これまで実機ではこの値が
  // 何であれ 1.0 で鳴っていた。Web Audio の GainNode に移して初めて効く
  // ようになった（js/audio.js）。つまり実機での「以前の音量」は 1.0 であり、
  // ここを 0.45 にすると体感が半分以下になって落差が大きすぎた。
  //
  // 目的は「読み上げがBGMに埋もれないこと」だけ。0.9 では足りなかったので
  // さらに1割下げて 0.81。効果音も同じだけ下げ（0.9）、読み上げは音源の
  // 余裕ぶんだけ上げている（1.10）。
  // 曲は長いので <audio> のまま鳴らし、音量だけ GainNode で取る。
  // 繋げなかった環境では今まで通り el.volume を使う。
  var VOLUME = 0.81;
  var routed = false;   // Web Audio の経路に繋げたか

  function setVol(v) {
    if (routed) { window.WQAUDIO.setLevel("bgm", v); return; }
    if (el) el.volume = v;
  }
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
    if (window.WQAUDIO && WQAUDIO.connect(el, "bgm")) {
      routed = true;
      WQAUDIO.setLevel("bgm", VOLUME);   // 以降 el.volume は 1 のまま触らない
    }
    return el;
  }

  function remember() {
    if (el && loaded && !NO_RESUME[loaded]) { try { pos[loaded] = el.currentTime; } catch (e) {} }
  }

  function fadeOut() {
    if (!el) return;
    clearInterval(ramp);
    var a = el, v = VOLUME;
    ramp = setInterval(function () {
      v -= VOLUME * 0.15;
      if (v <= 0) { clearInterval(ramp); ramp = null; a.pause(); setVol(VOLUME); }
      else setVol(v);
    }, STEP);
  }

  function startTrack(name) {
    if (!enabled || missing[name]) return;
    var a = audio();
    clearInterval(ramp); ramp = null;   // cancel a fade-out still in progress
    setVol(VOLUME);
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

  window.BGM = { play: play, playAny: playAny, stop: stop, setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
