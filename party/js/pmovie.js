// WORD QUEST II - OP/ED movie playback.
// PMOVIE.play("op"|"ed") -> Promise. Fullscreen <video> over the game with a
// skip button. Resolves when the video ends, is skipped, or cannot play
// (missing file / unsupported codec / autoplay refusal) — the game must never
// hang on a movie. Call from inside a user gesture so audio is allowed.
(function () {
  "use strict";

  // The native (Capacitor) build serves www/movie/*.mp4; the dev build serves
  // ../assets/movie/*.mp4. <source> elements are tried in order, so both
  // layouts work with one tag. The inline/artifact build has neither and
  // falls straight through to the error path.
  var CANDIDATES = { op: ["movie/op.mp4", "../assets/movie/op.mp4"],
                     ed: ["movie/ed.mp4", "../assets/movie/ed.mp4"] };

  function play(name) {
    return new Promise(function (resolve) {
      var srcs = CANDIDATES[name];
      if (!srcs) { resolve(false); return; }
      if (window.BGM) BGM.stop();

      var wrap = document.createElement("div");
      wrap.className = "pmovie-wrap";
      var v = document.createElement("video");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.preload = "auto";
      srcs.forEach(function (s) {
        var el = document.createElement("source");
        el.src = s; el.type = "video/mp4";
        v.appendChild(el);
      });
      var skip = document.createElement("button");
      skip.className = "pmovie-skip";
      skip.textContent = "スキップ ▶";
      wrap.appendChild(v);
      wrap.appendChild(skip);
      document.body.appendChild(wrap);

      var done = false, started = false, guard = null, showTimer = null;
      function finish(played) {
        if (done) return;
        done = true;
        clearTimeout(guard); clearTimeout(showTimer);
        try { v.pause(); } catch (e) {}
        wrap.remove();
        resolve(played);
      }
      v.addEventListener("ended", function () { finish(true); });
      v.addEventListener("error", function () { finish(false); }, true);
      // the <source> chain reports its failure on the last source element
      var last = v.lastElementChild;
      if (last) last.addEventListener("error", function () { finish(false); });
      skip.addEventListener("pointerdown", function (e) { e.stopPropagation(); finish(true); });
      v.addEventListener("playing", function () {
        started = true;
        clearTimeout(guard);
        showTimer = setTimeout(function () { skip.classList.add("show"); }, 1200);
      });
      // never let a stalled load (headless codecs, broken file) trap the player
      guard = setTimeout(function () { if (!started) finish(false); }, 4000);

      var p = v.play();
      if (p && p.catch) p.catch(function () { finish(false); });
    });
  }

  window.PMOVIE = { play: play };
})();
