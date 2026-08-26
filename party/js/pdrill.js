// WORD QUEST - 試験対策モードと弱点分析
//
// 闘技場は「遊び」で、こちらは「勉強」。戦闘も広告も挟まず、選んだ範囲の単語を
// 続けて出す。終わったらその場で結果を返す。
//
// 分析は G.study.words に貯まっている実データだけで組む。持っていない数字は
// 出さない（たとえば「あなたは動詞が苦手です」と言うには品詞別の正答率が要る）。
// レコードの形は js/quiz.js の record() が決めている：
//   { l:段階, m:意味, p:品詞, c:正解数, wr:誤答数, s:連続正解, f:2秒以内の経験,
//     g:3連続の経験, t:正解までの秒数の合計, d:最終学習日, box/due:復習の予定 }
(function () {
  "use strict";

  var POS = { n: "名詞", v: "動詞", adj: "形容詞", adv: "副詞", phr: "熟語" };
  var FAST = 2.0;      // これ以内なら「即答」
  var SLOW = 3.5;      // これを超えたら「思い出すのに時間がかかる」

  function $(id) { return document.getElementById(id); }
  function words() { return (window.G && window.G.study && window.G.study.words) || {}; }
  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0; }

  // 1語の状態を4つに分ける。分析も出題もこの区分で動く
  //   fresh  まだ正解していない
  //   weak   間違えた回数が多い
  //   vague  正解はするが遅い（あやふや）
  //   solid  速く確実に答えられる
  function stateOf(r) {
    if (!r || (!(r.c > 0) && !(r.wr > 0))) return "fresh";   // 一度も出会っていない
    // 間違えた回数が正解を上回る語は「苦手」。r.c だけを見ると、
    // 一度間違えただけの語が「未学習」に落ちてしまう（実測で判明）
    if ((r.wr || 0) > 0 && (r.wr || 0) >= (r.c || 0)) return "weak";
    var avg = r.t && r.c ? r.t / r.c : null;
    if (avg == null) return r.f ? "solid" : "vague";   // 古い記録は秒数を持たない
    if (avg > SLOW || (r.wr || 0) > 0) return "vague";
    return avg <= FAST ? "solid" : "vague";
  }

  function analyse() {
    var w = words(), today = window.QUIZ_DNUM ? QUIZ_DNUM(0) : 0;
    var out = {
      n: 0, correct: 0, wrong: 0, timeSum: 0, timeN: 0,
      state: { fresh: 0, weak: 0, vague: 0, solid: 0 },
      pos: {}, group: [], weak: [], vague: [], due: 0, total: 0
    };
    var groups = (window.WQ2_MODE && WQ2_MODE.groups) ? WQ2_MODE.groups() : [];
    var inGroup = {};
    groups.forEach(function (g, i) {
      out.group.push({ name: g.name, n: 0, correct: 0, wrong: 0, learned: 0, total: g.words.length });
      g.words.forEach(function (e) { if (inGroup[e.w] == null) inGroup[e.w] = i; });
      out.total += g.words.length;
    });

    for (var k in w) {
      var r = w[k];
      if (!r || (!(r.c > 0) && !(r.wr > 0))) continue;
      out.n++;
      out.correct += r.c || 0;
      out.wrong += r.wr || 0;
      if (r.t && r.c) { out.timeSum += r.t; out.timeN += r.c; }
      var s = stateOf(r);
      out.state[s]++;
      if (s === "weak") out.weak.push({ w: k, r: r });
      if (s === "vague") out.vague.push({ w: k, r: r });
      if (r.due != null && r.due <= today) out.due++;

      var p = POS[r.p] ? r.p : "other";
      var pe = out.pos[p] || (out.pos[p] = { n: 0, correct: 0, wrong: 0 });
      pe.n++; pe.correct += r.c || 0; pe.wrong += r.wr || 0;

      var gi = inGroup[k];
      if (gi != null) {
        var ge = out.group[gi];
        ge.n++; ge.correct += r.c || 0; ge.wrong += r.wr || 0;
        if (r.c > 0) ge.learned++;
      }
    }
    out.weak.sort(function (a, b) { return (b.r.wr || 0) - (a.r.wr || 0); });
    out.vague.sort(function (a, b) {
      return (b.r.t / b.r.c || 0) - (a.r.t / a.r.c || 0);
    });
    return out;
  }

  // ---------- 画面の部品 ----------
  function bar(label, ok, total, sub) {
    var p = pct(ok, total);
    return '<div class="dr-row">' +
      '<div class="dr-lab">' + label + '</div>' +
      '<div class="dr-bar"><i style="width:' + p + '%"></i></div>' +
      '<div class="dr-num">' + p + '%<small>' + (sub || (ok + "/" + total)) + '</small></div>' +
      '</div>';
  }

  function panel(html, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl dr-ovl";
      var box = document.createElement("div");
      box.className = "wq2-store-panel dq-window dr-panel";
      box.innerHTML = html;
      var row = document.createElement("div");
      row.className = "wq2-store-btns";
      buttons.forEach(function (b) {
        var el = document.createElement("button");
        el.className = "wq2-store-btn" + (b.primary ? " primary" : "") + (b.disabled ? " dr-off" : "");
        el.innerHTML = b.label;
        el.onclick = function (e) {
          e.preventDefault();
          if (b.disabled) return;
          wrap.remove(); resolve(b.key);
        };
        row.appendChild(el);
      });
      box.appendChild(row);
      wrap.appendChild(box);
      ($("screen") || document.body).appendChild(wrap);
    });
  }

  // ---------- 分析 ----------
  function showAnalysis() {
    var a = analyse();
    if (a.n < 10) {
      return panel(
        '<div class="wq2-store-h">弱点分析</div>' +
        '<div class="dr-empty">まだ ' + a.n + ' 語ぶんの記録しか ありません。<br><br>' +
        '闘技場か 試験対策を すこし遊ぶと、<br>どの学年・どの品詞が 弱いかを<br>ここに出せるようになります。<br><br>' +
        '<b>あと ' + (10 - a.n) + ' 語</b>で 分析できます。</div>',
        [{ key: "no", label: "とじる" }]
      );
    }
    var attempts = a.correct + a.wrong;
    var avg = a.timeN ? (a.timeSum / a.timeN) : null;
    var h = '<div class="wq2-store-h">弱点分析</div>';

    h += '<div class="dr-kpi">' +
      '<div><b>' + pct(a.correct, attempts) + '%</b><span>正答率</span></div>' +
      '<div><b>' + (avg ? avg.toFixed(1) + '<i>秒</i>' : '—') + '</b><span>平均反応</span></div>' +
      '<div><b>' + a.n + '</b><span>学習した語</span></div>' +
      '</div>';

    h += '<div class="dr-h">定着のぐあい</div>';
    h += '<div class="dr-state">' +
      '<div class="s-solid"><b>' + a.state.solid + '</b>即答できる</div>' +
      '<div class="s-vague"><b>' + a.state.vague + '</b>あやふや</div>' +
      '<div class="s-weak"><b>' + a.state.weak + '</b>苦手</div>' +
      '</div>';
    h += '<div class="dr-note">「あやふや」は 正解はするけれど ' + SLOW + '秒より 時間がかかる語。<br>' +
         'テストでは 出てこないことが 多い層です。</div>';

    if (a.group.some(function (g) { return g.n > 0; })) {
      h += '<div class="dr-h">範囲べつの 正答率</div>';
      a.group.forEach(function (g) {
        if (!g.n) return;
        h += bar(g.name, g.correct, g.correct + g.wrong, g.learned + "/" + g.total + "語");
      });
    }

    var posKeys = Object.keys(a.pos).filter(function (k) { return a.pos[k].n >= 3; });
    if (posKeys.length) {
      h += '<div class="dr-h">品詞べつの 正答率</div>';
      posKeys.sort(function (x, y) {
        return pct(a.pos[x].correct, a.pos[x].correct + a.pos[x].wrong) -
               pct(a.pos[y].correct, a.pos[y].correct + a.pos[y].wrong);
      });
      posKeys.forEach(function (k) {
        var e = a.pos[k];
        h += bar(POS[k] || "その他", e.correct, e.correct + e.wrong, e.n + "語");
      });
    }

    if (a.weak.length) {
      h += '<div class="dr-h">まちがえた回数が 多い語</div><div class="dr-list">';
      a.weak.slice(0, 8).forEach(function (x) {
        h += '<div><span class="dr-w">' + x.w + '</span><span class="dr-m">' + (x.r.m || "") + '</span>' +
             '<span class="dr-c">×' + (x.r.wr || 0) + '</span></div>';
      });
      h += '</div>';
    }
    if (a.due) h += '<div class="dr-note">復習の期限が きている語が <b>' + a.due + '</b> あります。</div>';

    return panel(h, [
      { key: "drill", label: "この結果で 試験対策する", primary: true },
      { key: "no", label: "とじる" }
    ]).then(function (k) { if (k === "drill") return open(); });
  }

  // ---------- 試験対策（ドリル） ----------
  function pickList(kind, limit) {
    var a = analyse(), w = words(), today = window.QUIZ_DNUM ? QUIZ_DNUM(0) : 0, list = [];
    if (kind === "weak") {
      list = a.weak.concat(a.vague);
    } else if (kind === "due") {
      for (var k in w) {
        var r = w[k];
        if (r && r.due != null && r.due <= today) list.push({ w: k, r: r });
      }
      list.sort(function (x, y) { return (x.r.box || 0) - (y.r.box || 0); });
    } else {
      // まんべんなく：出題範囲の全語から、まだ固まっていないものを優先
      var groups = (window.WQ2_MODE && WQ2_MODE.groups) ? WQ2_MODE.groups() : [];
      var pool = [];
      groups.forEach(function (g) { pool = pool.concat(g.words); });
      pool.forEach(function (e) {
        var r = w[e.w];
        var s = stateOf(r);
        if (s === "solid") return;
        list.push({ w: e.w, r: r || { l: 500, m: e.m, p: e.p } });
      });
      for (var i = list.length - 1; i > 0; i--) {   // 混ぜる
        var j = Math.floor(Math.random() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t;
      }
    }
    return list.slice(0, limit);
  }

  function open() {
    var a = analyse();
    var nWeak = a.weak.length + a.vague.length;
    return panel(
      '<div class="wq2-store-h">試験対策</div>' +
      '<div class="wq2-store-p">戦闘なしで 20問 続けて出します。<br>時間は 1問 6秒。</div>',
      [
        { key: "weak", primary: true, disabled: nWeak < 4,
          label: '苦手な語をたたく<span class="wq2-mode-sub">' +
            (nWeak < 4 ? 'まだデータが 足りません' : nWeak + '語から 出題') + '</span>' },
        { key: "due", disabled: a.due < 4,
          label: '忘れかけを 拾う<span class="wq2-mode-sub">' +
            (a.due < 4 ? '期限がきた語は ありません' : a.due + '語が 復習の期限') + '</span>' },
        { key: "all", label: 'まんべんなく<span class="wq2-mode-sub">まだ固まっていない語から</span>' },
        { key: "no", label: "やめる" }
      ]
    ).then(function (kind) {
      if (!kind || kind === "no") return;
      return run(kind);
    });
  }

  async function run(kind) {
    var list = pickList(kind, 20);
    if (!list.length) {
      await panel('<div class="wq2-store-h">試験対策</div>' +
        '<div class="dr-empty">出せる単語が ありません。<br>闘技場を すこし遊んでから どうぞ。</div>',
        [{ key: "no", label: "とじる" }]);
      return;
    }
    var title = $("ptitle-screen"), battle = $("pbattle-screen");
    title.style.display = "none";
    battle.style.display = "block";
    var kv = (window.UI_ART && window.UI_ART.titlebg) || "../assets/ui/title_bg.png";
    var bg = $("pbattle-bg");
    bg.style.backgroundImage = "url('" + kv + "')";
    bg.style.backgroundSize = "cover"; bg.style.backgroundPosition = "center top";
    $("penemy-row").innerHTML = ""; $("pparty-strip").innerHTML = ""; $("pchain-badge").className = "";
    if (window.BGM) BGM.playAny(["arena2", "battle2", "title"]);

    var ok = 0, times = [], missed = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i].r;
      var res = await window.QUIZ.ask(r.l || 500, {
        time: 6, noCrit: true,
        entry: { w: list[i].w, m: r.m, p: r.p }
      });
      if (res.correct) { ok++; times.push(res.elapsed); }
      else missed.push(list[i].w + "＝" + (r.m || ""));
      // 復習の予定を進める（正解したら次はもっと先に）
      var rec = words()[list[i].w];
      if (rec && res.correct && rec.due != null) {
        var GAP = [1, 2, 4, 7, 15, 30];
        rec.box = Math.min((rec.box || 0) + 1, GAP.length - 1);
        rec.due = QUIZ_DNUM(GAP[rec.box]);
      }
      if (window.WQ2_SAVE_STUDY) window.WQ2_SAVE_STUDY();
    }

    var avg = times.length ? (times.reduce(function (a, b) { return a + b; }, 0) / times.length) : null;
    var h = '<div class="wq2-store-h">おつかれさま</div>' +
      '<div class="dr-kpi">' +
      '<div><b>' + ok + '<i>/' + list.length + '</i></b><span>正解</span></div>' +
      '<div><b>' + (avg ? avg.toFixed(1) + '<i>秒</i>' : '—') + '</b><span>平均反応</span></div>' +
      '</div>';
    if (missed.length) {
      h += '<div class="dr-h">まちがえた語</div><div class="dr-list">';
      missed.slice(0, 10).forEach(function (m) { h += '<div><span class="dr-w">' + m + '</span></div>'; });
      h += '</div><div class="dr-note">この語は 明日 また出てきます。</div>';
    } else {
      h += '<div class="dr-note">全問正解！ この調子で。</div>';
    }

    battle.style.display = "none";
    title.style.display = "flex";
    if (window.BGM) BGM.playAny(["title"]);
    await panel(h, [{ key: "no", label: "とじる" }]);
  }

  window.PDRILL = { open: open, analysis: showAnalysis, analyse: analyse, stateOf: stateOf };
})();
