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

  // words already asked during this run — avoid repeats until the pool is used up
  var runSeen = {};
  function resetRunSeen() { runSeen = {}; }

  // weighted pick: words answered wrong recently appear ~4x more often,
  // words already asked this run are heavily de-prioritised (weight 0.02)
  // 同じデータを、ゲームと勉強で逆向きに使う。
  //   闘技場（bias:"easy"）… 知っている語を多めに。勝たせて気持ちよくするのが目的で、
  //     ここで苦手な語を突くと「クリアできないゲーム」になる
  //   復習・試験対策       … 苦手な語を名指しで出す（呼び出し側が entry を渡す）
  // 既定（bias なし）は従来どおり、間違えた語を4倍出す
  function biasWeight(bias, r) {
    if (bias !== "easy") return 1;
    if (!r || !r.c) return 1;                       // 未学習はふつう
    if ((r.wr || 0) >= (r.c || 0)) return 0.35;     // 苦手な語はゲームでは控えめに
    var avg = r.t && r.c ? r.t / r.c : null;
    if (avg != null && avg <= 2.0) return 3;        // 即答できる語を多めに
    return r.g ? 2.5 : 1.6;
  }

  function pickEntry(level, opts) {
    var pool = window.VOCAB[level];
    // 学生版では1つの段階に複数学年が混ざるので、語ごとの出やすさが渡される
    // （pvocab.js が学年ごとの取り分を語数で割ったもの）。TOEIC版では null
    var pw = (window.VOCAB_W || {})[level];
    var st = studyRec();
    var missed = st ? st.missed : {};
    var weights = [], total = 0;
    for (var i = 0; i < pool.length; i++) {
      var e = pool[i];
      var m = missed[e.w];
      var bias = opts && opts.bias;
      var w = (m && m.wrong > 0 && (m.correctStreak || 0) < 2) ? (bias === "easy" ? 0.5 : 4) : 1;
      w *= biasWeight(bias, (st && st.words) ? st.words[e.w] : null);
      if (pw) w *= pw[i];
      if (runSeen[e.w]) w *= 0.02; // asked already this run: only reuse if nothing else is left
      total += w; weights.push(total);
    }
    var r = Math.random() * total;
    var lo = 0, hi = weights.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (weights[mid] < r) lo = mid + 1; else hi = mid; }
    runSeen[pool[lo].w] = 1;
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

  function record(entry, correct, elapsed, lv) {
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
    // ---- word book stars (bronze=correct once, silver=<=2s, gold=3 in a row) ----
    st.words = st.words || {};
    var r = st.words[entry.w];
    if (!r) r = st.words[entry.w] = { l: lv, m: entry.m, p: entry.p, c: 0, wr: 0, s: 0, f: 0, g: 0 };
    if (correct) {
      r.c++; r.s++;
      if (elapsed <= 2) r.f = 1;
      if (r.s >= 3) r.g = 1;
      // 正解までの秒数を足しこむ。r.t / r.c が平均で、これがあると
      // 「即答できる」と「思い出すのに時間がかかる」を分けられる。
      // 分析はこの差でしか語れないので、フラグ(r.f)だけでは足りない
      r.t = (r.t || 0) + elapsed;
    } else {
      r.wr++; r.s = 0;
      // SRS: a missed word becomes due for review tomorrow (box back to 0)
      r.box = 0; r.due = window.QUIZ_DNUM ? QUIZ_DNUM(1) : 0;
    }
    r.d = window.QUIZ_DNUM ? QUIZ_DNUM(0) : 0;   // 最終学習日（忘却の目安）

    // 日ごとの解答数と正解数。単語ごとの記録からは「いつ何問解いたか」を
    // 復元できない（最終学習日しか残らない）ので、別に積む。
    // これが推移グラフの元データになる
    if (window.QUIZ_DNUM) {
      st.daily = st.daily || {};
      var day = QUIZ_DNUM(0);
      var d = st.daily[day] || (st.daily[day] = { a: 0, c: 0 });
      d.a++;
      if (correct) d.c++;
    }
    // ---- combo chain (persists across battles, reset on miss) ----
    var G = window.G;
    if (G) G.combo = correct ? (G.combo || 0) + 1 : 0;
  }

  var keyHandler = null;

  // level: requested TOEIC level. opts: {time: seconds}
  function ask(level, opts) {
    opts = opts || {};
    if (!overlay) initDom();
    var lv = resolveLevel(level);
    return new Promise(function (resolve) {
      if (lv == null) { resolve({ correct: true, elapsed: 0, entry: null }); return; }
      var entry = opts.entry || pickEntry(lv, opts);
      var choices = pickChoices(lv, entry);
      var time = (opts.time || 5) * 1000;
      var done = false;
      var t0 = performance.now();
      var raf = 0, timeoutId = 0;

      levelTag.textContent = (window.LEVEL_NAME ? window.LEVEL_NAME(lv) : (window.LEVEL_LABEL || "TOEIC ") + lv) + " レベル";
      wordEl.textContent = entry.w;
      if (window.VOICE) VOICE.say(entry.w);   // 出題と同時に読み上げ（無い語は黙って飛ぶ）
      hintEl.textContent = "【" + (POS_LABEL[entry.p] || "?") + "】 意味は？";
      resultEl.textContent = ""; resultEl.className = "";
      choicesEl.innerHTML = "";
      choicesEl.classList.remove("locked");   // 前の問題で付けたものを外す
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
        if (window.VOICE) VOICE.stop();
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", keyHandler);
        var elapsed = (performance.now() - t0) / 1000;
        record(entry, correct, elapsed, lv);
        // 触れても反応しないようにしてから、正解を見せる。
        // ここで結果の文字が入って枠の高さが変わり、選択肢がすこし動く。
        // まだ画面に触れている指の下に別の選択肢が来ると :active が当たり、
        // その色が .correct とほぼ同じなので、正解が2つあるように見えていた
        choicesEl.classList.add("locked");
        // reveal
        btns.forEach(function (b, i) {
          if (choices[i] === entry.m) b.classList.add("correct");
        });
        if (correct) {
          var fast = elapsed <= 2 && !opts.noCrit;
          resultEl.textContent = fast ? "クリティカルヒット！ " + entry.w + " = " + entry.m : "正解！";
          resultEl.className = "ok";
          // 正解の合図はいつも ok（ピローン）。会心でも crit は鳴らさない。
          // crit を鳴らすのは攻撃する側（pbattle.js / battle.js）の役目で、
          // ここで鳴らすと必ず二重になっていた。2秒以内に正解すると
          //   quiz.js の crit → 攻撃の crit
          // と同じ音が続けて鳴り、ピローンは一度も鳴らなかった。
          // 会心音を鳴らす呼び出し元は通常攻撃の2か所だけで、どちらも
          // 自分で crit を鳴らす。魔法と単語ドリルは noCrit なので元から ok。
          // 2026-09-13 実機で指摘を受けて確認
          if (window.SFX) SFX.play("ok");
        } else {
          resultEl.textContent = (timeout ? "時間切れ… " : "ミス… ") + entry.w + " = " + entry.m;
          resultEl.className = "ng";
          if (window.SFX) SFX.play("ng");
        }
        timeoutId = setTimeout(function () {
          overlay.style.display = "none";
          resolve({ correct: correct, elapsed: elapsed, entry: entry, timeout: !!timeout, lv: lv });
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

  // date-as-number helper (yyyymmdd) for the SRS scheduler — shared with the review mode
  window.QUIZ_DNUM = function (offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  window.QUIZ = { ask: ask, availableLevels: availableLevels, resolveLevel: resolveLevel, resetRunSeen: resetRunSeen };
})();
