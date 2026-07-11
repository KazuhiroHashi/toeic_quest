// TOEIC QUEST - quiz module
// QUIZ.ask(level, {time}) -> Promise<{correct, elapsed, entry, timeout}>
(function () {
  "use strict";

  var overlay, box, levelTag, wordEl, hintEl, timerBar, choicesEl, resultEl;

  function $(id) { return document.getElementById(id); }

  function initDom() {
    overlay = $("quiz-overlay");
    levelTag = $("quiz-level-tag");
    wordEl = $("quiz-word");
    hintEl = $("quiz-hint");
    timerBar = $("timer-bar");
    choicesEl = $("quiz-choices");
    resultEl = $("quiz-result");
  }

  var POS_LABEL = { n: "名詞", v: "動詞", adj: "形容詞", adv: "副詞", phr: "熟語" };

  function availableLevels() {
    return Object.keys(window.VOCAB || {}).map(Number).sort(function (a, b) { return a - b; });
  }

  // fall back to nearest stocked level if requested one is missing
  function resolveLevel(level) {
    var ls = availableLevels();
    if (!ls.length) return null;
    var best = ls[0], bd = Infinity;
    ls.forEach(function (l) {
      var d = Math.abs(l - level);
      if (d < bd) { bd = d; best = l; }
    });
    return best;
  }

  function studyRec(word) {
    var G = window.G;
    if (!G) return null;
    G.study = G.study || { missed: {}, answered: 0, correct: 0 };
    return G.study;
  }

  // weighted pick: words answered wrong recently appear ~4x more often
  function pickEntry(level) {
    var pool = window.VOCAB[level];
    var st = studyRec();
    var missed = st ? st.missed : {};
    var weights = [], total = 0;
    for (var i = 0; i < pool.length; i++) {
      var m = missed[pool[i].w];
      var w = (m && m.wrong > 0 && (m.correctStreak || 0) < 2) ? 4 : 1;
      total += w; weights.push(total);
    }
    var r = Math.random() * total;
    var lo = 0, hi = weights.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (weights[mid] < r) lo = mid + 1; else hi = mid; }
    return pool[lo];
  }

  function pickChoices(level, entry) {
    var pool = window.VOCAB[level];
    var used = { }; used[entry.m] = true;
    var same = pool.filter(function (e) { return e.p === entry.p && e.w !== entry.w; });
    var any = pool.filter(function (e) { return e.w !== entry.w; });
    var src = same.length >= 8 ? same : any;
    var wrong = [];
    var guard = 0;
    while (wrong.length < 3 && guard++ < 300) {
      var c = src[(Math.random() * src.length) | 0];
      if (!used[c.m]) { used[c.m] = true; wrong.push(c.m); }
    }
    var choices = wrong.concat([entry.m]);
    // shuffle
    for (var i = choices.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = choices[i]; choices[i] = choices[j]; choices[j] = t;
    }
    return choices;
  }

  function record(entry, correct) {
    var st = studyRec();
    if (!st) return;
    st.answered++;
    if (correct) {
      st.correct++;
      if (window.onQuizCorrect) window.onQuizCorrect();
    }
    var m = st.missed[entry.w];
    if (!correct) {
      if (!m) m = st.missed[entry.w] = { m: entry.m, wrong: 0, correctStreak: 0 };
      m.wrong++; m.correctStreak = 0;
    } else if (m) {
      m.correctStreak = (m.correctStreak || 0) + 1;
    }
  }

  var keyHandler = null;

  // level: requested TOEIC level. opts: {time: seconds}
  function ask(level, opts) {
    opts = opts || {};
    if (!overlay) initDom();
    var lv = resolveLevel(level);
    return new Promise(function (resolve) {
      if (lv == null) { resolve({ correct: true, elapsed: 0, entry: null }); return; }
      var entry = pickEntry(lv);
      var choices = pickChoices(lv, entry);
      var time = (opts.time || 5) * 1000;
      var done = false;
      var t0 = performance.now();
      var raf = 0, timeoutId = 0;

      levelTag.textContent = "TOEIC " + lv + " レベル" + (lv !== level ? "（" + level + "の代替出題）" : "");
      wordEl.textContent = entry.w;
      hintEl.textContent = "【" + (POS_LABEL[entry.p] || "?") + "】 意味は？";
      resultEl.textContent = ""; resultEl.className = "";
      choicesEl.innerHTML = "";
      var btns = choices.map(function (m, i) {
        var b = document.createElement("button");
        b.className = "quiz-choice";
        b.innerHTML = '<span class="num">' + (i + 1) + '</span>' + m;
        b.addEventListener("pointerdown", function (ev) { ev.preventDefault(); answer(i); });
        choicesEl.appendChild(b);
        return b;
      });
      overlay.style.display = "flex";
      timerBar.style.transform = "scaleX(1)";

      function tick(now) {
        var left = 1 - (now - t0) / time;
        if (left <= 0) { timeUp(); return; }
        timerBar.style.transform = "scaleX(" + Math.max(0, left) + ")";
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      keyHandler = function (e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) answer(n - 1);
      };
      window.addEventListener("keydown", keyHandler);

      function finish(correct, timeout) {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", keyHandler);
        record(entry, correct);
        var elapsed = (performance.now() - t0) / 1000;
        // reveal
        btns.forEach(function (b, i) {
          if (choices[i] === entry.m) b.classList.add("correct");
        });
        if (correct) {
          resultEl.textContent = elapsed <= 2 ? "かいしん！ +" + entry.w + " = " + entry.m : "せいかい！";
          resultEl.className = "ok";
          if (window.SFX) SFX.play(correct && elapsed <= 2 ? "crit" : "ok");
        } else {
          resultEl.textContent = (timeout ? "じかんぎれ… " : "ミス… ") + entry.w + " = " + entry.m;
          resultEl.className = "ng";
          if (window.SFX) SFX.play("ng");
        }
        timeoutId = setTimeout(function () {
          overlay.style.display = "none";
          resolve({ correct: correct, elapsed: elapsed, entry: entry, timeout: !!timeout });
        }, correct ? 650 : 1400);
      }
      function answer(i) {
        if (done) return;
        if (choices[i] !== entry.m) btns[i].classList.add("wrong");
        finish(choices[i] === entry.m, false);
      }
      function timeUp() { timerBar.style.transform = "scaleX(0)"; finish(false, true); }
    });
  }

  window.QUIZ = { ask: ask, availableLevels: availableLevels, resolveLevel: resolveLevel };
})();
