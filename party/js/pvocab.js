// WORD QUEST - 出題範囲（TOEIC / 学生）の切り替え
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

  // 6段階に k個のプールを均等に割り当てる（k=1なら全段階が同じ、k=3なら2段階ずつ）
  function poolForBand(pools, i) {
    return pools[Math.min(pools.length - 1, Math.floor(i * pools.length / BANDS.length))];
  }

  var state = { mode: "toeic", grade: "j3" };
  var chosen = false;
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.mode) { state = raw; chosen = true; }
  } catch (e) {}

  var bandName = {};   // 400..900 -> 表示名

  function apply() {
    window.VOCAB = window.VOCAB || {};
    bandName = {};
    if (state.mode === "student") {
      var g = gradeById(state.grade) || GRADES[2];
      BANDS.forEach(function (b, i) {
        var key = poolForBand(g.pools, i);
        window.VOCAB[b] = POOL[key].get();
        bandName[b] = POOL[key].name;
      });
    } else {
      BANDS.forEach(function (b) {
        window.VOCAB[b] = TOEIC[b] || [];
        bandName[b] = "スコア" + b;
      });
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
    if (state.mode !== "student") return "TOEIC";
    var g = gradeById(state.grade);
    return g ? g.name : "学生";
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
      '<div class="wq2-store-p">受ける学年に あわせた単語が 出ます。</div>',
      GRADES.map(function (g) {
        var last = POOL[g.pools[g.pools.length - 1]].name;
        return { key: g.id, label: g.name + '<span class="wq2-mode-sub">' + g.pools.map(function (k) { return POOL[k].name; }).join(" → ") + '</span>', primary: g.id === state.grade };
      }).concat([{ key: "back", label: "もどる" }])
    );
  }

  function chooseMode() {
    return panel(
      '<div class="wq2-store-h">出題範囲を えらぶ</div>' +
      '<div class="wq2-store-p">あとから タイトル画面で 変えられます。</div>',
      [{ key: "toeic", label: 'TOEIC<span class="wq2-mode-sub">スコア400〜900の 3000語</span>', primary: state.mode !== "student" },
       { key: "student", label: '学生（中学・高校）<span class="wq2-mode-sub">学年べつの 教科書・入試の単語</span>', primary: state.mode === "student" }]
    );
  }

  // 変更はその場で反映する。以前は location.reload() していたが、読み込み直すと
  // タイトル画像が出るまでの背景グラデーションが一瞬見えてしまう
  function open() {
    return chooseMode().then(function (m) {
      if (m === "toeic") return { mode: "toeic", grade: state.grade };
      return chooseGrade().then(function (g) {
        if (g === "back") return open();
        return { mode: "student", grade: g };
      });
    }).then(function (next) {
      if (!next) return false;
      var changed = next.mode !== state.mode || (next.mode === "student" && next.grade !== state.grade);
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
    get: function () { return { mode: state.mode, grade: state.grade }; },
    isStudent: function () { return state.mode === "student"; },
    chosen: function () { return chosen; },
    label: label,
    bandName: function (lv) { return bandName[lv] || String(lv); },
    bandSize: function (lv) { return (window.VOCAB && window.VOCAB[lv] ? window.VOCAB[lv].length : 0); },
    studyKey: studyKey,
    open: open
  };

  // quiz.js の「スコア600 レベル」表示を、学生版では「中3 レベル」にする
  window.LEVEL_NAME = function (lv) { return bandName[lv] || String(lv); };
})();
