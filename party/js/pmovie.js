// WORDRIA - OP/ED movie playback.
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
      // iOS は、利用者の操作から離れたところでの再生を拒む。OPは「タップして
      // スタート」の操作の中で始まるので鳴るが、EDは文章送りのあとに始まるため
      // 必ず拒否され、黙って閉じていた（実機でエンディングが流れなかった原因）。
      // 拒否されたときだけこの札を出し、そのタップに乗せて鳴らす
      var tap = document.createElement("button");
      tap.className = "pmovie-tap";
      tap.textContent = "▶ タップして 再生";
      wrap.appendChild(v);
      wrap.appendChild(skip);
      wrap.appendChild(tap);
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
      // 捕獲フェーズ（第3引数 true）で拾ってはいけない。<source> は上から順に
      // 試すもので、1つ目が見つからないのは正常な流れ（製品ビルドでは
      // movie/ 直下は無く、assets/movie/ にある）。捕獲で拾うと、その正常な
      // 失敗まで「再生できない」と判断して閉じてしまう。
      // 全部だめだったときは video 自身に error が来るので、それだけを見る
      v.addEventListener("error", function () { finish(false); });
      // the <source> chain reports its failure on the last source element
      var last = v.lastElementChild;
      if (last) last.addEventListener("error", function () { finish(false); });
      skip.addEventListener("pointerdown", function (e) { e.stopPropagation(); finish(true); });
      v.addEventListener("playing", function () {
        started = true;
        // ここで初めて <video> を見せる。それまでは party.css で隠してある。
        // 最初のコマが出るまでブラウザが描く「白地に▶」を見せないため
        v.classList.add("on");
        clearTimeout(guard);
        showTimer = setTimeout(function () { skip.classList.add("show"); }, 1200);
      });
      // never let a stalled load (headless codecs, broken file) trap the player
      guard = setTimeout(function () { if (!started) finish(false); }, 4000);

      // 札を出したあとは「読み込めていない」のではなく「待っている」状態なので、
      // 見切りのタイマーは止める。押されるまで待つ
      function askForTap() {
        if (done || started) return;
        clearTimeout(guard);
        tap.classList.add("show");
        skip.classList.add("show");
      }
      tap.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        tap.classList.remove("show");
        var q = v.play();
        if (q && q.catch) q.catch(function () { finish(false); });   // 本当に壊れている
      });

      var p = v.play();
      if (p && p.catch) p.catch(askForTap);
    });
  }

  window.PMOVIE = { play: play };
})();
