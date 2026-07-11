// TOEIC QUEST - BGM engine (Web Audio chiptune, all-original compositions)
// No audio files, no copyright risk, tiny footprint, works offline.
// BGM.play("field" | "town" | "dungeon" | "battle" | "boss" | "title"), BGM.stop()
(function () {
  "use strict";

  var ctx = null, master = null;
  var enabled = true;
  try { enabled = localStorage.getItem("tq_bgm") !== "0"; } catch (e) {}

  function ensureCtx() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {}
  }

  // note name -> frequency ("A4" = 440). "-" = rest.
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    var m = /^([A-G])(#?)(\d)$/.exec(n);
    if (!m) return 0;
    var s = SEMI[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (s - 69) / 12);
  }
  // "C4:1 E4:.5 -:.5" -> [[freq,beats],...]
  function seq(str) {
    return str.trim().split(/\s+/).map(function (t) {
      var p = t.split(":");
      return [p[0] === "-" ? 0 : freq(p[0]), parseFloat(p[1] || 1)];
    });
  }

  // ---- original compositions (composed for this game; simple diatonic loops) ----
  var TRACKS = {
    title: {
      bpm: 92, mtype: "triangle", btype: "sine", mvol: 0.055, bvol: 0.05,
      mel: seq("F4:1 A4:1 C5:1.5 A4:.5 B4:1 A4:1 G4:2 " +
               "E4:1 G4:1 B4:1.5 G4:.5 A4:1 G4:1 F4:2 " +
               "F4:1 A4:1 C5:1 F5:1 E5:1 C5:1 D5:2 " +
               "C5:1 B4:1 A4:1 G4:1 F4:3 -:1"),
      bass: seq("F2:2 C3:2 G2:2 C3:2 C2:2 G2:2 F2:2 C3:2 " +
                "F2:2 A2:2 B2:2 C3:2 F2:2 C3:2 F2:3 -:1")
    },
    field: {
      bpm: 128, mtype: "square", btype: "triangle", mvol: 0.04, bvol: 0.05,
      mel: seq("A4:.5 C5:.5 E5:1 E5:.5 D5:.5 C5:1 B4:.5 C5:.5 D5:1 E5:.5 D5:.5 C5:1 " +
               "A4:.5 C5:.5 E5:1 G5:.5 F5:.5 E5:1 D5:.5 E5:.5 F5:1 E5:1 D5:1 " +
               "C5:.5 D5:.5 E5:1 A5:1 G5:1 E5:1 F5:.5 E5:.5 D5:1 C5:.5 D5:.5 E5:1 " +
               "D5:.5 C5:.5 B4:1 C5:.5 B4:.5 A4:1 G4:1 B4:1 A4:2"),
      bass: seq("A2:1 E3:1 A2:1 E3:1 F2:1 C3:1 G2:1 D3:1 " +
                "A2:1 E3:1 C3:1 G3:1 D3:1 A3:1 E3:1 E2:1 " +
                "A2:1 E3:1 F2:1 C3:1 C3:1 G3:1 F2:1 C3:1 " +
                "G2:1 D3:1 E2:1 E3:1 A2:1 E3:1 A2:2")
    },
    town: {
      bpm: 100, mtype: "triangle", btype: "sine", mvol: 0.055, bvol: 0.045,
      mel: seq("G4:1 C5:1 E5:1 D5:1 C5:1 B4:1 A4:1 B4:1 C5:1 " +
               "G4:1 B4:1 D5:1 C5:1 B4:1 A4:1 G4:2 -:1 " +
               "E5:1 D5:1 C5:1 D5:1 C5:1 B4:1 C5:1 D5:1 E5:1 " +
               "D5:1 C5:1 B4:1 C5:2 -:1 G4:1 C5:1 E5:1"),
      bass: seq("C3:3 G2:3 A2:3 F2:3 C3:3 G2:3 C3:3 C3:3 " +
                "A2:3 F2:3 C3:3 G2:3 A2:3 F2:3 G2:3 C3:3")
    },
    dungeon: {
      bpm: 84, mtype: "triangle", btype: "sine", mvol: 0.05, bvol: 0.055,
      mel: seq("A3:2 C4:1 B3:2 -:1 E4:2 D4:1 C4:2 -:1 " +
               "A3:2 C4:1 E4:2 -:1 F4:2 E4:1 D4:2 -:1 " +
               "G#3:2 B3:1 E4:2 -:1 C4:2 B3:1 A3:2 -:1 " +
               "F4:2 E4:1 D4:2 C4:1 B3:2 -:1 A3:3"),
      bass: seq("A1:3 A1:3 E2:3 E2:3 A1:3 A1:3 F2:3 D2:3 " +
                "E2:3 E2:3 A1:3 A1:3 D2:3 E2:3 A1:3 A1:3")
    },
    battle: {
      bpm: 152, mtype: "square", btype: "triangle", mvol: 0.038, bvol: 0.05,
      mel: seq("E5:.5 E5:.5 B4:.5 E5:.5 G5:.5 F#5:.5 E5:.5 B4:.5 " +
               "C5:.5 C5:.5 G4:.5 C5:.5 E5:.5 D5:.5 C5:.5 G4:.5 " +
               "A4:.5 A4:.5 E4:.5 A4:.5 C5:.5 B4:.5 A4:.5 E4:.5 " +
               "B4:.5 C5:.5 D5:.5 E5:.5 F#5:.5 G5:.5 A5:.5 B5:.5 " +
               "E5:.5 E5:.5 B4:.5 E5:.5 G5:.5 F#5:.5 E5:.5 D5:.5 " +
               "C5:.5 E5:.5 G5:.5 C6:.5 B5:.5 G5:.5 E5:.5 C5:.5 " +
               "A4:.5 C5:.5 E5:.5 A5:.5 G5:.5 E5:.5 C5:.5 A4:.5 " +
               "B4:1 B4:.5 A#4:.5 B4:1 D5:.5 F#5:.5"),
      bass: seq("E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 " +
                "C2:.5 C3:.5 C2:.5 C3:.5 C2:.5 C3:.5 C2:.5 C3:.5 " +
                "A1:.5 A2:.5 A1:.5 A2:.5 A1:.5 A2:.5 A1:.5 A2:.5 " +
                "B1:.5 B2:.5 B1:.5 B2:.5 B1:.5 B2:.5 B1:.5 B2:.5 " +
                "E2:.5 E3:.5 E2:.5 E3:.5 E2:.5 E3:.5 D2:.5 D3:.5 " +
                "C2:.5 C3:.5 C2:.5 C3:.5 C2:.5 C3:.5 C2:.5 C3:.5 " +
                "A1:.5 A2:.5 A1:.5 A2:.5 A1:.5 A2:.5 A1:.5 A2:.5 " +
                "B1:.5 B2:.5 B1:.5 B2:.5 B1:1 B1:1")
    },
    boss: {
      bpm: 138, mtype: "square", btype: "sawtooth", mvol: 0.036, bvol: 0.03,
      mel: seq("D5:.75 D5:.75 D5:.5 F5:1 E5:.5 D5:.5 C#5:1 " +
               "D5:.75 D5:.75 D5:.5 A5:1 G5:.5 F5:.5 E5:1 " +
               "F5:.75 F5:.75 F5:.5 G5:1 A5:.5 G5:.5 F5:1 " +
               "E5:.75 E5:.75 E5:.5 C#5:1 D5:.5 E5:.5 A4:1 " +
               "D5:.5 F5:.5 A5:.5 D6:1 C6:.5 A5:.5 F5:1 " +
               "B4:.5 D5:.5 G5:.5 B5:1 A5:.5 G5:.5 E5:1 " +
               "F5:.5 A5:.5 C6:.5 F6:.5 E6:.5 C6:.5 A5:.5 F5:.5 " +
               "E5:1 C#5:1 D5:2"),
      bass: seq("D2:.5 D2:.5 A2:.5 D2:.5 D2:.5 A2:.5 D2:.5 A2:.5 " +
                "D2:.5 D2:.5 A2:.5 D2:.5 D2:.5 A2:.5 D2:.5 A2:.5 " +
                "A#1:.5 A#1:.5 F2:.5 A#1:.5 A#1:.5 F2:.5 A#1:.5 F2:.5 " +
                "A1:.5 A1:.5 E2:.5 A1:.5 A1:.5 E2:.5 A1:.5 E2:.5 " +
                "D2:.5 D2:.5 A2:.5 D2:.5 G1:.5 G1:.5 D2:.5 G1:.5 " +
                "G1:.5 G1:.5 D2:.5 G1:.5 C2:.5 C2:.5 G2:.5 C2:.5 " +
                "A#1:.5 A#1:.5 F2:.5 A#1:.5 A1:.5 A1:.5 E2:.5 A1:.5 " +
                "A1:1 A1:1 D2:2")
    }
  };

  var cur = null, timer = null;
  var state = { name: null, mi: 0, bi: 0, mAt: 0, bAt: 0 };

  function schedVoice(track, list, idxKey, atKey, type, vol) {
    var ahead = ctx.currentTime + 0.15;
    var spb = 60 / track.bpm;
    while (state[atKey] < ahead) {
      var note = list[state[idxKey] % list.length];
      var t = state[atKey];
      var dur = note[1] * spb;
      if (note[0] > 0) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.value = note[0];
        g.gain.setValueAtTime(vol, t);
        g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.06));
        g.gain.linearRampToValueAtTime(0.0001, t + dur - 0.01);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur);
      }
      state[atKey] = t + dur;
      state[idxKey]++;
    }
  }

  function tick() {
    if (!ctx || !cur) return;
    var track = TRACKS[cur];
    schedVoice(track, track.mel, "mi", "mAt", track.mtype, track.mvol);
    schedVoice(track, track.bass, "bi", "bAt", track.btype, track.bvol);
  }

  function play(name) {
    if (!TRACKS[name]) return;
    if (cur === name && timer) return;
    stop();
    if (!enabled) { cur = name; return; } // remember; starts on enable
    ensureCtx();
    if (!ctx) return;
    cur = name;
    state = { name: name, mi: 0, bi: 0, mAt: ctx.currentTime + 0.05, bAt: ctx.currentTime + 0.05 };
    timer = setInterval(tick, 50);
    tick();
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    // scheduled notes just play out (short); next track takes over
  }
  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem("tq_bgm", v ? "1" : "0"); } catch (e) {}
    if (!v) { var was = cur; stop(); cur = was; }
    else if (cur) { var n = cur; cur = null; play(n); }
  }

  // iOS: audio must start from a user gesture — resume on any press
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      ensureCtx();
      if (cur && enabled && !timer) { var n = cur; cur = null; play(n); }
    }, { passive: true });
  });

  window.BGM = { play: play, stop: stop, setEnabled: setEnabled, isEnabled: function () { return enabled; } };
})();
