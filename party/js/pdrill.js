// WORDRIA - 学習の記録（弱点分析）
//
// タイトルから開くのは PDRILL.analysis() だけ。
// PDRILL.open()（試験対策の連続出題）は動く状態で残してあるが、画面には
// 出していない。モードを増やしても遊びの手応えが増えない、という判断のため。
// 要望が出たら index.html にボタンを戻すだけで復活する。
//
// 分析は G.study.words に貯まっている実データだけで組む。持っていない数字は
// 出さない。持っていない数字を推測で埋めない。
// レコードの形は js/quiz.js の record() が決めている：
//   { l:段階, m:意味, p:品詞, c:正解数, wr:誤答数, s:連続正解, f:2秒以内の経験,
//     g:3連続の経験, t:正解までの秒数の合計, d:最終学習日, box/due:復習の予定 }
(function () {
  "use strict";

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

  // 直近 DAYS 日ぶんの日次データ。記録がない日も 0 として並べる
  // （抜けを詰めると「毎日やった」ように見えてしまう）
  var DAYS = 14;
  function dnumToDate(n) {
    return new Date(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100);
  }
  function daily() {
    var st = (window.G && window.G.study) || {}, log = st.daily || {};
    var out = [], now = new Date();
    for (var i = DAYS - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      var e = log[key];
      out.push({ key: key, date: d, a: (e && e.a) || 0, c: (e && e.c) || 0 });
    }
    return out;
  }

  function analyse() {
    var w = words(), today = window.QUIZ_DNUM ? QUIZ_DNUM(0) : 0;
    var out = {
      n: 0, correct: 0, wrong: 0, timeSum: 0, timeN: 0,
      state: { fresh: 0, weak: 0, vague: 0, solid: 0 },
      group: [], weak: [], vague: [], solid: [], due: 0, total: 0,
      daily: daily(), missCount: []
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
      if (s === "solid") out.solid.push({ w: k, r: r });
      if (r.due != null && r.due <= today) out.due++;

      var gi = inGroup[k];
      if (gi != null) {
        var ge = out.group[gi];
        ge.n++; ge.correct += r.c || 0; ge.wrong += r.wr || 0;
        if (r.c > 0) ge.learned++;
      }
    }
    // 間違えた回数の多い順。同数なら、出会った回数が少ないほうを上にする
    // （5回中3回間違いのほうが、10回中3回より定着していない）
    for (var k2 in w) {
      var r2 = w[k2];
      if (!r2 || !(r2.wr > 0)) continue;
      out.missCount.push({ w: k2, r: r2, wr: r2.wr, tries: (r2.c || 0) + (r2.wr || 0) });
    }
    out.missCount.sort(function (a, b) { return b.wr - a.wr || a.tries - b.tries; });

    out.weak.sort(function (a, b) { return (b.r.wr || 0) - (a.r.wr || 0); });
    out.vague.sort(function (a, b) {
      return (b.r.t / b.r.c || 0) - (a.r.t / a.r.c || 0);
    });
    // 即答は速い順。「これだけ速く言えるようになった」が上に来る
    out.solid.sort(function (a, b) {
      return (a.r.t / a.r.c || 9) - (b.r.t / b.r.c || 9);
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
      // 中身の中にも「押すと閉じて、その値を返す」口を作る。定着度のタイルから
      // 単語一覧へ移るのに使う。ボタン列は下端にしか置けないので、これが無いと
      // 表の途中から次の画面へ進ませられない
      box.querySelectorAll("[data-pick]").forEach(function (el) {
        el.onclick = function (e) {
          e.preventDefault();
          wrap.remove();
          resolve(el.getAttribute("data-pick"));
        };
      });
      // 左上の×。中身が長いと下の「閉じる」までスクロールしないと届かない
      var x = document.createElement("button");
      x.className = "wq2-x";
      x.textContent = "✕";
      x.setAttribute("aria-label", "閉じる");
      x.onclick = function (e) { e.preventDefault(); wrap.remove(); resolve("no"); };
      box.appendChild(x);
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

  // ---------- 推移グラフ ----------
  // 棒＝解答数（文脈）、折れ線＝正答率（主役）。2つの軸を重ねているので、
  // 交点そのものに意味はない。株価と出来高と同じ読み方で、棒は背景に退かせ、
  // 目盛りを両側に出して取り違えを防ぐ。
  function chart(days) {
    var W = 300, H = 116, L = 26, R = 26, T = 10, B = 18;
    var iw = W - L - R, ih = H - T - B;
    var maxA = Math.max(1, days.reduce(function (m, d) { return Math.max(m, d.a); }, 0));
    var step = iw / days.length;
    var bw = Math.max(3, Math.min(14, step * 0.56));

    var s = '<svg class="dr-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="日ごとの解答数と正答率の推移">';

    // 目盛り線（控えめに）
    [0, 50, 100].forEach(function (v) {
      var y = T + ih - ih * v / 100;
      s += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y +
           '" class="dr-grid"/>';
      s += '<text x="' + (L - 4) + '" y="' + (y + 3) + '" class="dr-ax dr-ax-l">' + v + '</text>';
    });
    s += '<text x="' + (W - R + 4) + '" y="' + (T + 4) + '" class="dr-ax dr-ax-r">' + maxA + '</text>';
    s += '<text x="' + (W - R + 4) + '" y="' + (T + ih + 3) + '" class="dr-ax dr-ax-r">0</text>';

    // 棒：解答数
    days.forEach(function (d, i) {
      if (!d.a) return;
      var h = ih * d.a / maxA;
      var x = L + step * i + (step - bw) / 2;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (T + ih - h).toFixed(1) +
           '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
           '" rx="2" class="dr-barmark"/>';
    });

    // 折れ線：正答率（解いた日だけ結ぶ。0問の日は線を切る）
    var seg = [], pts = [];
    days.forEach(function (d, i) {
      if (!d.a) { if (seg.length) { pts.push(seg); seg = []; } return; }
      var x = L + step * i + step / 2;
      var y = T + ih - ih * (d.c / d.a);
      seg.push([x, y]);
    });
    if (seg.length) pts.push(seg);
    pts.forEach(function (g) {
      if (g.length > 1) {
        s += '<polyline class="dr-line" points="' +
             g.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ") + '"/>';
      }
      g.forEach(function (q) {
        s += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) +
             '" r="2.6" class="dr-dot"/>';
      });
    });

    // 直近の値だけ数字を添える（全点に置くと読めなくなる）
    var last = null;
    for (var i = days.length - 1; i >= 0; i--) if (days[i].a) { last = days[i]; break; }
    if (last) {
      var li = days.indexOf(last);
      var lx = L + step * li + step / 2, ly = T + ih - ih * (last.c / last.a);
      s += '<text x="' + Math.min(lx + 5, W - R - 16) + '" y="' + Math.max(ly - 5, T + 8) +
           '" class="dr-tip">' + Math.round(last.c / last.a * 100) + '%</text>';
    }

    var f = days[0].date, l = days[days.length - 1].date;
    s += '<text x="' + L + '" y="' + (H - 5) + '" class="dr-ax">' +
         (f.getMonth() + 1) + "/" + f.getDate() + '</text>';
    s += '<text x="' + (W - R) + '" y="' + (H - 5) + '" class="dr-ax" text-anchor="end">' +
         (l.getMonth() + 1) + "/" + l.getDate() + '</text>';
    s += '</svg>';
    return s;
  }

  // ---------- 分析 ----------
  // 無料とプレミアムの線引き（2026-08-27）
  //   無料      正答率・平均反応・学習語数・定着度・範囲別
  //   プレミアム ＋ 毎日の推移グラフ ＋ 誤答回数の多い単語
  // 全部を隠さないのは、この画面が「ゲームなのにちゃんと分析してくれる」という
  // 評判を取りに行く機能だから。無料でも自分の苦手が3種類に分かれて見えるところ
  // までは見せる。一方で、鍵のかかった中身が目の前にあるほうが「広告が消える」
  // より強い購入動機になるので、いちばん知りたい2つを伏せている。
  function isPremium() {
    return !!(window.WQ2_STORE && WQ2_STORE.isPremium && WQ2_STORE.isPremium());
  }

  // 伏せ字。実際の単語をDOMに置いたままぼかすと、開発者ツールで読めてしまう。
  // 見た目の行数と文字数だけ残して、中身は入れない
  function masked(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += "●";
    return s;
  }

  function locked(inner) {
    return '<div class="dr-lock">' +
      '<div class="dr-lock-body">' + inner + '</div>' +
      '<div class="dr-lock-tag">🔒 プレミアム</div>' +
      '</div>';
  }

  function showAnalysis() {
    var a = analyse();
    if (a.n < 10) {
      return panel(
        '<div class="wq2-store-h">学習の記録</div>' +
        '<div class="dr-empty">記録は まだ ' + a.n + ' 語分です。<br><br>' +
        '王国か 試験対策を 少し進めると、<br>毎日の推移と 苦手な単語を<br>ここに表示します。<br><br>' +
        '<b>あと ' + (10 - a.n) + ' 語</b>で 表示できます。</div>',
        []
      );
    }
    var attempts = a.correct + a.wrong;
    var avg = a.timeN ? (a.timeSum / a.timeN) : null;
    var pro = isPremium();
    var h = '<div class="wq2-store-h">学習の記録</div>';

    h += '<div class="dr-kpi">' +
      '<div><b>' + pct(a.correct, attempts) + '%</b><span>正答率</span></div>' +
      '<div><b>' + (avg ? avg.toFixed(1) + '<i>秒</i>' : '—') + '</b><span>平均反応</span></div>' +
      '<div><b>' + a.n + '</b><span>学習語数</span></div>' +
      '</div>';

    // ---- 推移（最重要）----
    var activeDays = a.daily.filter(function (d) { return d.a > 0; });
    var sumA = a.daily.reduce(function (s2, d) { return s2 + d.a; }, 0);
    h += '<div class="dr-h">毎日の学習量と正答率</div>';
    var legend = '<div class="dr-legend">' +
      '<span><i class="lg-bar"></i>解答数（右目盛）</span>' +
      '<span><i class="lg-line"></i>正答率（左目盛・%）</span>' +
      '</div>';
    if (pro) {
      h += chart(a.daily) + legend;
    } else {
      // グラフの形そのものは秘密ではないので、実データを描いてぼかす。
      // 「自分の記録が確かに溜まっている」が伝わるほうが効く
      h += locked(chart(a.daily) + legend);
    }
    h += '<div class="dr-note">直近14日で <b>' + activeDays.length + '日</b>学習、合計 <b>' + sumA + '問</b>。</div>';

    // ---- 定着度 ----
    // 数だけ見せても「で、どれ？」で終わる。押すとその単語が並ぶようにした。
    // 語が1つも無い区分は押せない（押して空の画面が出るのは裏切りになる）
    h += '<div class="dr-h">定着度<span class="dr-hint">押すと単語が見られます</span></div>';
    function tile(kind, cls, n, label) {
      var on = n > 0;
      return '<' + (on ? 'button data-pick="state:' + kind + '"' : 'div') +
        ' class="' + cls + (on ? '' : ' dr-off') + '">' +
        '<b>' + n + '</b>' + label + '</' + (on ? 'button' : 'div') + '>';
    }
    h += '<div class="dr-state">' +
      tile("solid", "s-solid", a.state.solid, "即答") +
      tile("vague", "s-vague", a.state.vague, "曖昧") +
      tile("weak", "s-weak", a.state.weak, "苦手") +
      '</div>';

    // ---- 誤答回数（重要）----
    if (a.missCount.length) {
      h += '<div class="dr-h">誤答回数の多い単語</div>';
      // 伏せてあるときに10行も並べても、読めない帯が長くなるだけ。
      // リストが在ることが伝わればいいので5行に詰める
      var rows = a.missCount.slice(0, pro ? 10 : 5);
      var list = '<div class="dr-list">';
      rows.forEach(function (x) {
        // 回数は本物のまま出す。伏せるのは「どの単語か」だけ
        var w = pro ? x.w : masked(Math.min(Math.max(x.w.length, 4), 9));
        var m = pro ? (x.r.m || "") : masked(4);
        list += '<div><span class="dr-w">' + w + '</span><span class="dr-m">' + m + '</span>' +
                '<span class="dr-c">' + x.wr + '回<small>/' + x.tries + '</small></span></div>';
      });
      list += '</div>';
      h += pro ? list : locked(list);
      if (!pro) {
        h += '<div class="dr-note">間違えた回数の多い単語が <b>' + a.missCount.length + '語</b> 見つかっています。</div>';
      }
    }

    // ---- 範囲別 ----
    if (a.group.some(function (g) { return g.n > 0; })) {
      h += '<div class="dr-h">範囲別の正答率</div>';
      a.group.forEach(function (g) {
        if (!g.n) return;
        h += bar(g.name, g.correct, g.correct + g.wrong, g.learned + "/" + g.total + "語");
      });
    }

    var btns = [];   // 閉じるのは左上の×だけ
    if (!pro) {
      h += '<div class="dr-sell">グラフと 苦手な単語の 一覧は<br>' +
           'プレミアム（月額' +
           (window.WQ2_STORE && WQ2_STORE.price ? WQ2_STORE.price() : "") +
           '）で 見られます。</div>';
      btns.unshift({ key: "buy", primary: true, label: "★ プレミアムで すべて見る" });
    }
    return panel(h, btns).then(function (k) {
      // 定着度のタイルから来た。単語一覧を見せて、閉じたらここへ戻す
      if (k && k.indexOf("state:") === 0) {
        return showStateList(k.slice(6)).then(showAnalysis);
      }
      if (k !== "buy" || !window.WQ2_STORE) return;
      return new Promise(function (r) { WQ2_STORE.buyPremium(r); }).then(function (ok) {
        // 買えたら開き直す。何を買ったのかがその場で見えないと、
        // 「払ったのに変わらない」という体験になる
        if (ok) return showAnalysis();
      });
    });
  }

  // ---------- 定着度の単語一覧 ----------
  // 即答／曖昧／苦手のどれかを押したときに出る。数の内訳を実際の語で見せる。
  // 並びは analyse() が区分ごとに意味のある順にしてある
  //   即答 … 速い順（いちばん身についた語が上）
  //   曖昧 … 遅い順（あと一歩の語が上）
  //   苦手 … 間違えた回数の多い順
  var STATE_INFO = {
    solid: { name: "即答", cls: "s-solid",
             note: "2秒以内に答えられた語です。ここに入れば、試験でも迷いません。" },
    vague: { name: "曖昧", cls: "s-vague",
             note: "正解はするものの、思い出すのに時間がかかっている語です。あと一歩。" },
    weak:  { name: "苦手", cls: "s-weak",
             note: "間違えた回数が正解に追いついている語です。ここを潰すのがいちばん効きます。" }
  };
  function showStateList(kind) {
    var info = STATE_INFO[kind];
    if (!info) return Promise.resolve();
    var a = analyse(), list = a[kind] || [];
    var pro = isPremium();
    var h = '<div class="wq2-store-h">' + info.name + 'の単語</div>' +
            '<div class="dr-state dr-state-one"><div class="' + info.cls + '">' +
            '<b>' + list.length + '</b>語</div></div>' +
            '<div class="dr-note dr-note-top">' + info.note + '</div>';

    // 一覧そのものはプレミアムの売り物なので、無料版では伏せる。
    // 誤答回数のリストと同じ扱いにしてある（片方だけ開けると筋が通らない）
    var rows = list.slice(0, pro ? 60 : 5);
    var body = '<div class="dr-list">';
    rows.forEach(function (x) {
      var avg = x.r.t && x.r.c ? (x.r.t / x.r.c) : null;
      var right = kind === "weak"
        ? (x.r.wr || 0) + "回<small>/" + ((x.r.c || 0) + (x.r.wr || 0)) + "</small>"
        : (avg ? avg.toFixed(1) + "<small>秒</small>" : "—");
      body += '<div><span class="dr-w">' + (pro ? x.w : masked(Math.min(Math.max(x.w.length, 4), 9))) + '</span>' +
              '<span class="dr-m">' + (pro ? (x.r.m || "") : masked(4)) + '</span>' +
              '<span class="dr-c">' + right + '</span></div>';
    });
    body += '</div>';
    h += pro ? body : locked(body);
    if (pro && list.length > rows.length) {
      h += '<div class="dr-note">上位' + rows.length + '語を表示しています（全' + list.length + '語）。</div>';
    }

    var btns = [{ key: "back", primary: true, label: "← 学習の記録へ戻る" }];
    if (!pro) {
      h += '<div class="dr-sell">単語の一覧は プレミアム（月額' +
           (window.WQ2_STORE && WQ2_STORE.price ? WQ2_STORE.price() : "") + '）で 見られます。</div>';
      btns.unshift({ key: "buy", label: "★ プレミアムで すべて見る" });
    }
    return panel(h, btns).then(function (k) {
      if (k !== "buy" || !window.WQ2_STORE) return;
      return new Promise(function (r) { WQ2_STORE.buyPremium(r); });
    });
  }

  // ---------- 試験対策（現在は画面に出していない。上の注記を参照）----------
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
      '<div class="wq2-store-p">戦闘なしで 20問 連続出題。<br>制限時間は 1問 6秒。</div>',
      [
        { key: "weak", primary: true, disabled: nWeak < 4,
          label: '苦手な単語を集中<span class="wq2-mode-sub">' +
            (nWeak < 4 ? 'データが 不足しています' : nWeak + '語から 出題') + '</span>' },
        { key: "due", disabled: a.due < 4,
          label: '復習期限の単語<span class="wq2-mode-sub">' +
            (a.due < 4 ? '期限が来た単語は ありません' : a.due + '語が 期限切れ') + '</span>' },
        { key: "all", label: '全体から 均等に<span class="wq2-mode-sub">未定着の単語を 優先</span>' },
        { key: "no", label: "中止" }
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
        '<div class="dr-empty">出題できる単語が ありません。<br>王国を 少し進めてから どうぞ。</div>',
        []);
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
      h += '<div class="dr-h">間違えた単語</div><div class="dr-list">';
      missed.slice(0, 10).forEach(function (m) { h += '<div><span class="dr-w">' + m + '</span></div>'; });
      h += '</div><div class="dr-note">これらは 明日 再出題されます。</div>';
    } else {
      h += '<div class="dr-note">全問正解。この調子で。</div>';
    }

    battle.style.display = "none";
    title.style.display = "flex";
    if (window.BGM) BGM.playAny(["title"]);
    await panel(h, []);
  }

  window.PDRILL = { open: open, analysis: showAnalysis, analyse: analyse, stateOf: stateOf };
})();
