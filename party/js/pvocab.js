// WORDRIA - 出題範囲（TOEIC / 学生）の切り替え
//
// ゲーム側は昔から window.VOCAB[400..900] という6段階だけを見ている
// （敵ごとの quizLv、魔法の quizLv、単語帳、称号のすべて）。なので学生版でも
// 同じ6段階のキーに中高の単語を入れ直すだけでよく、戦闘やクイズのコードには
// 一切手を入れていない。
//
// 学年ごとの6段階は「その学年の到達点で終わる」ように組んである。たとえば高1に
// 中1の単語を6段階ぶん並べても練習にならないので、下限を学年に合わせて上げる。
(function () {
  "use strict";

  var KEY = "wq2_mode_v1";
  var BANDS = [400, 500, 600, 700, 800, 900];

  // data/vocab_400..900.js が読み込んだTOEICの語彙。学生版に切り替えても
  // 戻せるように、window.VOCAB を書き換える前に確保しておく
  var TOEIC = {};
  BANDS.forEach(function (b) { if (window.VOCAB && window.VOCAB[b]) TOEIC[b] = window.VOCAB[b]; });

  function jhs(k) { return (window.VOCAB_JHS || {})[k] || []; }
  function hs(k) { return (window.VOCAB_HS || {})[k] || []; }

  var POOL = {
    g1:  { name: "中1",     get: function () { return jhs("g1"); } },
    g2:  { name: "中2",     get: function () { return jhs("g2"); } },
    g3:  { name: "中3",     get: function () { return jhs("g3"); } },
    lv1: { name: "高校基礎", get: function () { return hs("lv1"); } },
    lv2: { name: "大学入試", get: function () { return hs("lv2"); } },
    lv3: { name: "難関大",   get: function () { return hs("lv3"); } }
  };

  // 学年 → 使う語彙プール（易しい順）。最後のプールがその学年の到達点
  var GRADES = [
    { id: "j1", name: "中学1年", pools: ["g1"] },
    { id: "j2", name: "中学2年", pools: ["g1", "g2"] },
    { id: "j3", name: "中学3年", pools: ["g1", "g2", "g3"] },
    { id: "h1", name: "高校1年", pools: ["g2", "g3", "lv1"] },
    { id: "h2", name: "高校2年", pools: ["g3", "lv1", "lv2"] },
    { id: "h3", name: "高校3年", pools: ["lv1", "lv2", "lv3"] }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i];
    return null;
  }

  // 各段階の配合。1段階＝1学年にすると、出題範囲が狭いうえに、闘技場が実際に
  // 使う段階が下寄り（400×2 500×2 600×3 700×3 800×1 900×0）なので、選んだ学年の
  // 単語が最終戦にしか出なかった。そこで段階ごとに「選んだ学年」と「その下」を
  // 混ぜ、進むほど選んだ学年の比率を上げる。
  //   数値は目標学年からの距離ぶん：[その学年, 1つ下, 2つ下]
  var MIX = [
    [0.20, 0.40, 0.40],   // 段階400（第1・2戦）
    [0.35, 0.40, 0.25],   // 段階500（第3・4戦）
    [0.55, 0.33, 0.12],   // 段階600（第5〜7戦）
    [0.70, 0.22, 0.08],   // 段階700（第8〜10戦）
    [0.80, 0.15, 0.05],   // 段階800（第11戦）
    [0.90, 0.10, 0.00]    // 段階900（挑戦の塔の高層）
  ];

  // 使えるプールが3つ未満なら、届かないぶんの比率を一番下のプールへ寄せる
  function mixFor(k, bandIndex) {
    var raw = MIX[bandIndex], w = [], d;
    for (d = 0; d < k; d++) w[d] = raw[Math.min(d, raw.length - 1)];
    for (d = k; d < raw.length; d++) w[k - 1] += raw[d];
    var sum = w.reduce(function (a, b) { return a + b; }, 0);
    return w.map(function (x) { return x / sum; });
  }

  // lock: プレミアム限定。指定した1つのレベルの単語だけを出す。
  //   TOEIC   … "400".."900"（スコア帯）
  //   学生    … "g1".."lv3"（プールのキー）
  //   null    … 固定しない（段階が上がるほど難しくなる、これまでの動き）
  // 解約された状態でも値は残す。入り直したときに設定し直さなくて済むように
  var state = { mode: "toeic", grade: "j3", lock: null };
  var chosen = false;
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.mode) { state = raw; chosen = true; }
  } catch (e) {}
  if (state.lock === undefined) state.lock = null;

  function premium() {
    return !!(window.WQ2_STORE && WQ2_STORE.isPremium && WQ2_STORE.isPremium());
  }
  // 固定の順番。Object.keys に頼ると並びが暗黙になるので明示する
  var LOCKS_STUDENT = ["g1", "g2", "g3", "lv1", "lv2", "lv3"];
  function lockName(v) {
    if (v == null) return null;
    if (POOL[v]) return POOL[v].name;
    return "スコア" + v;
  }
  // いま実際に効いている固定。解約中は効かせない
  function activeLock() {
    if (state.lock == null || !premium()) return null;
    if (state.mode === "student") return POOL[state.lock] ? state.lock : null;
    var b = +state.lock;
    return (TOEIC[b] && TOEIC[b].length) ? b : null;
  }

  // 単語帳と称号の「まとまり」。出題の6段階とは別物にする。
  // 学生版は1つの段階に複数学年が混ざるので、段階ごとに数えると
  // 同じ学年名の欄が並び、数も中身とずれる（実際にそうなっていた）。
  // 見せるときは語彙のプール（中1/中2/中3）で数える。
  var groups = [];     // [{ name, words }] 学習の記録・称号が数える範囲（選んだ学年のぶんだけ）
  var allGroups = [];  // 単語帳に並べる全まとまり。学年に関係なく中1〜難関大の6つ
  var bandName = {};   // 400..900 -> 表示名（その段階で主役になる学年）
  var bandTotal = {};  // 400..900 -> 主役の学年の語数（称号の分母）
  var allWords = 0;    // その出題範囲で出うる単語の総数（重複なし）

  function apply() {
    window.VOCAB = window.VOCAB || {};
    window.VOCAB_W = window.VOCAB_W || {};
    bandName = {}; bandTotal = {}; allWords = 0; groups = []; allGroups = [];

    if (state.mode === "student") {
      var g = gradeById(state.grade) || GRADES[2];
      var pools = g.pools, k = pools.length;
      var seen = {};
      BANDS.forEach(function (b, i) {
        var mix = mixFor(k, i);
        var words = [], weights = [], top = 0;
        // 距離d = 0 がその学年。pools は易しい順なので末尾が目標
        for (var d = 0; d < k; d++) {
          var pool = POOL[pools[k - 1 - d]].get();
          if (!pool.length) continue;
          // 1語あたりの出やすさ＝そのプールの取り分 ÷ 語数
          var per = mix[d] / pool.length;
          for (var n = 0; n < pool.length; n++) { words.push(pool[n]); weights.push(per); }
          if (mix[d] > mix[top]) top = d;
        }
        window.VOCAB[b] = words;
        window.VOCAB_W[b] = weights;
        var lead = POOL[pools[k - 1 - top]];
        bandName[b] = lead.name;
        bandTotal[b] = lead.get().length;
      });
      pools.forEach(function (key) {
        POOL[key].get().forEach(function (e) { if (!seen[e.w]) { seen[e.w] = 1; allWords++; } });
        groups.push({ name: POOL[key].name, words: POOL[key].get() });
      });
      // 単語帳は辞書なので、選んだ学年に関係なく6つ全部を並べる。
      // 中1を選んでいても、この先どんな単語が出るのかは見たい
      LOCKS_STUDENT.forEach(function (key) {
        allGroups.push({ name: POOL[key].name, words: POOL[key].get() });
      });
    } else {
      BANDS.forEach(function (b) {
        window.VOCAB[b] = TOEIC[b] || [];
        window.VOCAB_W[b] = null;      // TOEICは1段階＝1スコア帯なので配合しない
        bandName[b] = "スコア" + b;
        bandTotal[b] = (TOEIC[b] || []).length;
        allWords += (TOEIC[b] || []).length;
        groups.push({ name: String(b), words: TOEIC[b] || [] });
        allGroups.push({ name: "スコア" + b, words: TOEIC[b] || [] });
      });
    }
    // ---- レベル固定（プレミアム）----
    // 差し替えるのは「クイズに出る単語」だけにする。単語帳の並び（groups）と
    // 称号の分母（bandTotal）は固定していないときと同じにしておく。
    // ここまで固定すると、固定を切り替えるたびに単語帳の中身と達成率が
    // 動いてしまい、何を覚えたのか読めなくなる。
    // 段階の表示名（bandName）だけは固定側に合わせる。出る単語と
    // 「スコア400レベル」の表示が食い違うのを避けるため。
    var lk = activeLock();
    if (lk != null) {
      var words = state.mode === "student" ? POOL[lk].get() : (TOEIC[lk] || []);
      if (words.length) {
        var nm = lockName(lk);
        BANDS.forEach(function (b) {
          window.VOCAB[b] = words;
          window.VOCAB_W[b] = null;
          bandName[b] = nm;
        });
      }
    }

    // 出題語が変わるので、この周回の「出題済み」記録は捨てる
    if (window.QUIZ && window.QUIZ.resetRunSeen) window.QUIZ.resetRunSeen();
  }

  // 学習の進み具合はモードごとに別々に持つ。TOEICで覚えた語と中学の語を
  // 同じ「覚えた単語」に混ぜると、単語帳も称号も意味が読めなくなる
  function studyKey() {
    return "wq2_study_v1" + (state.mode === "student" ? "_" + state.grade : "");
  }

  function label() {
    var base = "TOEIC";
    if (state.mode === "student") {
      var g = gradeById(state.grade);
      base = g ? g.name : "学生";
    }
    var lk = activeLock();
    return lk == null ? base : base + "・" + lockName(lk) + "だけ";
  }

  // ---------- 選択画面 ----------
  function panel(html, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      var box = document.createElement("div");
      box.className = "wq2-store-panel dq-window";
      box.innerHTML = html;
      var row = document.createElement("div");
      row.className = "wq2-store-btns";
      buttons.forEach(function (b) {
        var el = document.createElement("button");
        el.className = "wq2-store-btn" + (b.primary ? " primary" : "");
        el.innerHTML = b.label;
        el.onclick = function (e) { e.preventDefault(); wrap.remove(); resolve(b.key); };
        row.appendChild(el);
      });
      box.appendChild(row);
      wrap.appendChild(box);
      (document.getElementById("screen") || document.body).appendChild(wrap);
    });
  }

  function chooseGrade() {
    return panel(
      '<div class="wq2-store-h">学年を えらぶ</div>' +
      '<div class="wq2-store-p">受ける学年に あわせた単語が 出ます。</div>' +
      // 実際に習う学年とずれている語がある。言い切らずに断っておく。
      // 理由は書かない。書くほど言い訳に見える（2026-09-13 本人の判断）
      '<div class="wq2-store-note">学年の分け方は 目安です。<br>' +
      '実際に習う学年と 異なる語があります。</div>',
      GRADES.map(function (g) {
        return { key: g.id, label: g.name + '<span class="wq2-mode-sub">' + g.pools.map(function (k) { return POOL[k].name; }).join(" → ") + '</span>', primary: g.id === state.grade };
      }).concat([{ key: "back", label: "もどる" }])
    );
  }

  function chooseMode() {
    return panel(
      '<div class="wq2-store-h">出題範囲を えらぶ</div>' +
      '<div class="wq2-store-p">あとから タイトル画面で 変えられます。</div>',
      [{ key: "toeic", label: 'TOEIC<span class="wq2-mode-sub">スコア400〜900の 3027語</span>', primary: state.mode !== "student" },
       { key: "student", label: '学生（中学・高校）<span class="wq2-mode-sub">学年べつの 教科書・入試の単語</span>', primary: state.mode === "student" }]
    );
  }

  // 出題レベルの固定（プレミアム）。mode は「これから決まる方」を渡す
  function chooseLevel(mode) {
    var pro = premium();
    var opts = mode === "student"
      ? LOCKS_STUDENT.map(function (k) { return { key: k, name: POOL[k].name }; })
      : BANDS.map(function (b) { return { key: String(b), name: "スコア" + b }; });
    var cur = state.lock == null ? "all" : String(state.lock);
    var btns = [{
      key: "all", primary: cur === "all",
      label: 'すべて<span class="wq2-mode-sub">進むほど 難しくなる（おすすめ）</span>'
    }];
    opts.forEach(function (o) {
      btns.push({
        key: o.key, primary: pro && cur === o.key,
        label: (pro ? "" : "🔒 ") + o.name + 'だけ'
      });
    });
    btns.push({ key: "back", label: "もどる" });
    return panel(
      '<div class="wq2-store-h">出題レベル</div>' +
      '<div class="wq2-store-p">' + (pro
        ? "えらんだレベルの単語だけが 出ます。<br>苦手な範囲を 集中して やりたいときに。"
        : "1つのレベルだけを 練習する機能です。<br>プレミアムで つかえます。") +
      '</div>',
      btns);
  }

  // 変更はその場で反映する。以前は location.reload() していたが、読み込み直すと
  // タイトル画像が出るまでの背景グラデーションが一瞬見えてしまう。
  //
  // 「もどる」は必ず step() を呼び直して最初の画面（出題範囲）から選ばせる。
  // 以前はレベル画面の「もどる」が同じレベル画面を開き直すだけで、押しても
  // 何も起きないように見えていた。学年画面の「もどる」も open() を丸ごと
  // 呼び直しており、その戻り値（真偽値）が state に入って設定を壊しうる形だった。
  function open() {
    function step() {
      return chooseMode().then(function (m) {
        if (m === "toeic") return { mode: "toeic", grade: state.grade };
        return chooseGrade().then(function (g) {
          return g === "back" ? null : { mode: "student", grade: g };
        });
      }).then(function (base) {
        if (!base) return step();                      // 学年で もどる
        // 初回起動は「範囲を選ぶ」だけで通す。遊び始める前に3枚も選ばせない。
        // レベルの固定は、あとからタイトルの「出題：〜」でいつでも設定できる
        if (!chosen) { base.lock = null; return base; }
        return chooseLevel(base.mode).then(function (k) {
          if (k === "back") return step();             // レベルで もどる
          if (k === "all") { base.lock = null; return base; }
          if (premium()) { base.lock = k; return base; }
          // 鍵つきを押された：購入へ。買わなければ固定なしで進む
          return new Promise(function (r) {
            window.WQ2_STORE.buyPremium(function (ok) { r(ok); });
          }).then(function (ok) {
            base.lock = ok ? k : null;
            return base;
          });
        });
      });
    }
    return step().then(function (next) {
      if (!next) return false;
      var changed = next.mode !== state.mode ||
        (next.mode === "student" && next.grade !== state.grade) ||
        String(next.lock) !== String(state.lock);
      var first = !chosen;
      state = next;
      chosen = true;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      if (changed || first) {
        apply();
        // 学習記録は範囲ごとに別ファイルなので、pmain 側で読み直してもらう
        if (window.WQ2_ON_MODE_CHANGE) window.WQ2_ON_MODE_CHANGE();
      }
      return changed;
    });
  }

  apply();

  // 初回起動：まだ選んでいなければ出題範囲をたずねる。pmain.js が
  // タイトルを組み立て終わってから出したいので1tick遅らせる
  if (!chosen) setTimeout(function () { open(); }, 0);

  window.WQ2_MODE = {
    get: function () { return { mode: state.mode, grade: state.grade, lock: activeLock() }; },
    isStudent: function () { return state.mode === "student"; },
    chosen: function () { return chosen; },
    label: label,
    bandName: function (lv) { return bandName[lv] || String(lv); },
    bandSize: function (lv) { return bandTotal[lv] || 0; },
    groups: function () { return groups; },
    allGroups: function () { return allGroups.length ? allGroups : groups; },
    totalWords: function () { return allWords; },
    studyKey: studyKey,
    open: open
  };

  // quiz.js の「スコア600 レベル」表示を、学生版では「中3 レベル」にする
  window.LEVEL_NAME = function (lv) { return bandName[lv] || String(lv); };
})();
