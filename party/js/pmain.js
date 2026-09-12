// WORDRIA - prototype shell (demo menu)
(function () {
  "use strict";
  window.ASSET_BASE = "../"; // bgm.js loads from ../assets/bgm/
  window.LEVEL_LABEL = "スコア"; // 公開用: TOEICはETS商標のため表示は「スコア600 レベル」形式にする
  try { window.WQ2_EASY = localStorage.getItem("wq2_easy") === "1"; } catch (e) { window.WQ2_EASY = false; }

  // minimal state for quiz.js (study log + combo)
  window.G = { study: { missed: {}, answered: 0, correct: 0 }, combo: 0 };
  // 学習記録は出題範囲ごとに別々。TOEICで覚えた語と中学の語を同じ記録に
  // 混ぜると、単語帳も称号も何を表しているのか読めなくなる
  function studyKey() { return window.WQ2_MODE ? WQ2_MODE.studyKey() : "wq2_study_v1"; }
  try {
    var st = localStorage.getItem(studyKey());   // TOEICは従来キーのまま＝既存の記録を引き継ぐ
    if (st) window.G.study = JSON.parse(st);
  } catch (e) {}
  function saveStudy() {
    try { localStorage.setItem(studyKey(), JSON.stringify(window.G.study)); } catch (e) {}
  }
  window.WQ2_SAVE_STUDY = saveStudy;   // pdrill.js から呼ぶ

  // total distinct words cleared (answered correctly at least once) out of the
  // current vocabulary range's total. 2026-09-07: TOEIC側は6帯で3,027語。
  // 元は帯をまたいで重複しており（重複を除くと1,907語）、そこへ新しい語を
  // 1,120足して6帯を作り直した。data/vocab_*.js と tools/rebalance_toeic_bands.js
  // ／tools/add_toeic_words.js を参照
  window.studyProgress = function () {
    var words = (window.G && window.G.study && window.G.study.words) || {};
    var cleared = 0;
    for (var k in words) { if (words[k] && words[k].c > 0) cleared++; }
    // 学生版は1つの段階に複数学年が混ざる＝段階の語数を足すと重複するので、
    // 出題範囲そのものが持つ単語数（重複なし）を使う
    var total = window.WQ2_MODE ? WQ2_MODE.totalWords() : 0;
    return { cleared: cleared, total: total || 3027 };
  };
  // trophy tier for a cleared count: 100 bronze / 200 silver / 300 gold / 500 platinum
  window.trophyFor = function (n) {
    if (n >= 500) return { name: "プラチナ", icon: "🏆", cls: "platinum", need: 500 };
    if (n >= 300) return { name: "ゴールド", icon: "🥇", cls: "gold", need: 300, next: 500 };
    if (n >= 200) return { name: "シルバー", icon: "🥈", cls: "silver", need: 200, next: 300 };
    if (n >= 100) return { name: "ブロンズ", icon: "🥉", cls: "bronze", need: 100, next: 200 };
    return { name: "トロフィーまであと少し", icon: "🔰", cls: "none", need: 0, next: 100 };
  };

  // ---- SRS review: missed words come back on a schedule (1/2/4/7/15/30 days) ----
  var SRS_GAP = [1, 2, 4, 7, 15, 30];
  function srsDue() {
    var words = (window.G.study && window.G.study.words) || {};
    var today = QUIZ_DNUM(0), list = [];
    for (var w in words) {
      var r = words[w];
      if (!r || !(r.wr > 0)) continue;              // only words missed at least once
      if (r.due == null && r.s >= 2) continue;       // legacy word already re-mastered
      if (r.due == null || r.due <= today) list.push({ w: w, r: r });
    }
    list.sort(function (a, b) { return (a.r.box || 0) - (b.r.box || 0) || (b.r.wr - a.r.wr); });
    return list.slice(0, 20); // one session = up to 20 words
  }

  // ---- arena records (score attack) ----
  function loadRec() {
    try { return JSON.parse(localStorage.getItem("wq2_records_v1")) || {}; } catch (e) { return {}; }
  }
  function saveRec(r) { try { localStorage.setItem("wq2_records_v1", JSON.stringify(r)); } catch (e) {} }
  function fmtMs(ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + "分" + ("0" + (s % 60)).slice(-2) + "秒";
  }

  // ---- daily study streak (🔥N日連続) ----
  function dayKey(off) {
    var d = new Date(Date.now() + (off || 0) * 86400000);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function bumpStreak() {
    try {
      var s = JSON.parse(localStorage.getItem("wq2_streak") || "{}");
      if (s.last !== dayKey(0)) {
        s.n = (s.last === dayKey(-1)) ? (s.n || 1) + 1 : 1;
        s.last = dayKey(0);
        localStorage.setItem("wq2_streak", JSON.stringify(s));
      }
      refreshStreak();
    } catch (e) {}
  }
  function refreshStreak() {
    var el = $("ptitle-streak");
    if (!el) return;
    var n = 0;
    try {
      var s = JSON.parse(localStorage.getItem("wq2_streak") || "{}");
      if (s.last === dayKey(0) || s.last === dayKey(-1)) n = s.n || 0;
    } catch (e) {}
    if (n >= 2) { el.style.display = ""; el.textContent = "🔥 " + n + "日連続で 学習中！"; }
    else el.style.display = "none";
  }

  function $(id) { return document.getElementById(id); }

  var FOE_SKILLS = {
    ghost: [{ name: "呪いの言葉", power: 1.1, all: false }],
    owl:   [{ name: "風の刃", power: 0.75, all: true }],
    bee:   [{ name: "群れの一撃", power: 0.7, all: true }],
    snake: [{ name: "毒牙", power: 1.05, all: false }],
    goblin:[{ name: "石つぶて", power: 0.7, all: true }]
  };
  function scaledFoe(id, over, str) {
    str = str || 1;
    var d = window.ENEMY_BY_ID[id];
    return Object.assign({
      base: d.id, name: d.name, lv: d.lv,
      hp: Math.round(d.hp * 1.5 * str), atk: Math.round(d.atk * 1.15 * str), def: Math.round(d.def * 1.05),
      mag: Math.round(d.atk * 1.1 * str), exp: Math.round(d.exp * 1.4 * str),
      agi: Math.round(d.lv / 25),
      hasty: d.traits && d.traits.indexOf("hasty") >= 0,
      skills: FOE_SKILLS[id], skillRate: 0.32
    }, over || {});
  }
  function af(id, str) { return scaledFoe(id, null, str); } // arena foe with strength scale

  function miniBoss(id, name, over) {
    var f = scaledFoe(id, over);
    f.name = name; f.boss = true;
    f.hp = Math.round(f.hp * 3.2); f.atk = Math.round(f.atk * 1.5); f.mag = Math.round(f.atk * 1.1);
    f.exp = Math.round(f.exp * 4); f.skillRate = 0.34;
    f.phases = [
      { at: 1.0, acts: 1, aoe: 0.1, charge: 0 },
      { at: 0.4, acts: 2, aoe: 0.35, charge: 0, msg: [name + "は 手負いになり\nいっそう 荒れ狂う！", name + "の行動が 2回になった！"] }
    ];
    return f;
  }

  // mid-boss dragon (round 5) — tanky (+30% HP) but hits moderately:
  // fixed atk 74 -> 単純攻撃 ~55 / 鎮まれ(全体) ~48（以前は128で90+も出て強すぎた）
  function dragonEnc() {
    var d = miniBoss("dragon", "洞窟の古竜");
    d.hp = Math.round(d.hp * 1.3); d.maxhp = d.hp;
    d.atk = 74; d.mag = Math.round(d.atk * 1.1);
    // 全体攻撃を、竜のものに差し替える。
    // 既定のままだと「静まれ！」と叫ぶ——言葉を奪う者の決め台詞を、5戦目の
    // 古竜が ハウルより先に使ってしまう。あれは四天王ハウルで初めて出したい。
    // 古竜は言葉を奪う側ではなく、ただ洞窟をふさいでいるだけの獣なので、
    // 二つ首から吐くブレスにする（assets/enemies/dragon.png は双頭の赤竜）。
    // ダメージの計算式（f.atk * 0.8 ...）は触っていないので、強さは変わらない。
    d.aoeLine = "洞窟の古竜は 二つの首を もたげた！\n灼熱の ブレスが 吹き荒れる！";
    return { bg: "cave", quizLv: 600, bgm: "midboss", enemies: [d] };
  }

  function bossHowl() {
    return {
      bg: "tower1",
      intro: [
        "四天王のひとり ハウルが\n道をふさいでいる！",
        "『聞く力は わたしが喰らった。\n　お前たちの叫びも\n　もう 誰にも届かない！』"
      ],
      enemies: [{
        base: "gen_r", name: "四天王ハウル", lv: 600,
        hp: 3450, atk: 48, def: 22, agi: 20, mag: 56, exp: 1400,
        boss: true,
        skills: [{ name: "轟音の叫び", power: 0.85, all: true }], skillRate: 0.28,
        phases: [
          { at: 1.0, acts: 1, aoe: 0.12, charge: 0 },
          { at: 0.7, acts: 2, aoe: 0.22, charge: 0,
            msg: ["ハウルの様子が変わった！\n『ほう… やるではないか！』", "ハウルの行動が 2回になった！"] },
          { at: 0.35, acts: 2, aoe: 0.28, charge: 0.28,
            msg: ["ハウルが本気を出した！！\n『この叫びで 終わらせる！』", "（力をためたら 防御だ！）"] }
        ]
      }]
    };
  }

  // four heavenly kings — escalating; each stronger than the last (player levels up too)
  function king(o) {
    return {
      bg: o.bg, quizLv: o.quizLv, intro: o.intro, bgm: o.bgm,
      enemies: [{
        base: o.base, name: o.name, lv: o.lv,
        hp: o.hp, atk: o.atk, def: o.def, agi: 22, mag: Math.round(o.atk * 1.15), exp: o.exp, boss: true,
        aoeCry: o.aoeCry, aoeVerb: o.aoeVerb,
        magicCharge: o.magicCharge, chargeCry: o.chargeCry,
        skills: o.skills, skillRate: 0.34,
        phases: [
          { at: 1.0, acts: 1, aoe: 0.15, charge: 0 },
          { at: 0.62, acts: 2, aoe: 0.28, charge: 0, msg: [o.name + "の様子が変わった！", o.name + "の行動が 2回になった！"] },
          { at: 0.3, acts: o.acts3 || 2, aoe: 0.34, charge: 0.3, msg: [o.name + "が 本気を出した！！", "（力をためたら 防御だ！）"] }
        ]
      }]
    };
  }
  function bossHowl() {
    return king({ base: "gen_r", name: "四天王ハウル", lv: 600, hp: 3060, atk: 58, def: 24, exp: 1400, quizLv: 600, bg: "tower1", bgm: "king1",
      skills: [{ name: "轟音の叫び", power: 0.72, all: true }],
      intro: ["四天王ハウルが 道をふさぐ！", "『聞く力は わたしが喰らった。\n　お前たちの叫びは 誰にも届かん！』"] });
  }
  function bossGag() {
    return king({ base: "king_gag", name: "四天王ガグ", lv: 700, hp: 3910, atk: 76, def: 28, exp: 2000, quizLv: 650, bg: "tower2", bgm: "king2",
      aoeCry: "静まりなさい", aoeVerb: "命じた",
      magicCharge: true, chargeCry: "『沈黙の 大呪文—！』",
      skills: [{ name: "沈黙の号令", power: 0.5, all: true }, { name: "言霊砕き", power: 1.3, all: false }],
      intro: ["四天王ガグが 立ちはだかる！", "『話す力は 我が手にある。\n　その声も この地で 奪わせてもらう。』"] });
  }
  function bossBlank() {
    return king({ base: "king_blank", name: "四天王ブランク", lv: 800, hp: 4800, atk: 94, def: 30, exp: 2800, quizLv: 700, bg: "zone6", bgm: "king3",
      aoeCry: "しずかに しようね", aoeVerb: "ささやいた",
      magicCharge: true, chargeCry: "『いくよー。ぜんぶ まっしろ！』",
      skills: [{ name: "白紙化", power: 0.72, all: true }, { name: "記憶消去", power: 1.35, all: false }],
      intro: ["四天王ブランクが ぽわんと 現れた！", "『こんにちは。みんなの あたまの中、\n　まっしろに しちゃうね？　うふふ』"] });
  }
  function bossErase() {
    return king({ base: "king_erase", name: "四天王イレイズ", lv: 850, hp: 6300, atk: 112, def: 34, exp: 3600, quizLv: 750, bg: "zone5", bgm: "king4",
      // 四天王で唯一、全体攻撃の台詞が既定（＝ハウルと同じ）のままだった。
      // ガグとブランクは固有の言い回しを持っているので、ここだけ揃っていない。
      // イレイズが奪ったのは「書く力」で、静めるのではなく消す側。
      // 口調は短く冷たい（chargeCry『すべて、消える。』／intro『ここで 消す。』）
      aoeCry: "消えろ", aoeVerb: "言い放った",
      magicCharge: true, chargeCry: "『すべて、消える。』",
      skills: [{ name: "消し去る風", power: 0.68, all: true }, { name: "抹消の一撃", power: 1.0, all: false }],
      intro: ["最後の四天王 イレイズが 立ちはだかる！", "『書く力は すでに この手の中。\n　お前たちの名も、ここで 消す。』"] });
  }
  // two-phase last boss: beat ミュートス, then the TRUE form rises
  function bossMaou1() {
    return {
      bg: "maou", quizLv: 750,
      intro: ["ついに 現れた 沈黙王ミュートス。", "『ことばは 人を傷つける。\n　ならば いっそ 全て奪おう。\n　この静寂こそ 救いなのだ』"],
      bgm: "boss",
      enemies: [{
        base: "maou_mutos", name: "沈黙王ミュートス", lv: 900,
        hp: 5200, atk: 112, def: 38, agi: 22, mag: 92, exp: 5000, boss: true,
        // 四天王は全員 声を出して戦う（叫ぶ・命じる・ささやく・言い放つ）。
        // その主であるミュートスだけは、声を使わずに同じことをやってのける。
        // 既定の「静まれ！」と叫んだ を使うと、部下と同じ言い方になってしまう。
        aoeLine: "沈黙王ミュートスが 静かに 手を かざした。\nあたりの 声が、音もなく 吸いこまれていく——",
        magicCharge: true, chargeCry: "『静寂よ、すべてを 呑み込め—！』",
        skills: [{ name: "静寂の波動", power: 0.95, all: true }, { name: "言葉狩り", power: 1.3, all: false }], skillRate: 0.4,
        phases: [
          { at: 1.0, acts: 1, aoe: 0.18, charge: 0 },
          { at: 0.6, acts: 2, aoe: 0.32, charge: 0, msg: ["ミュートスの闇が 濃くなる…！", "行動が 2回になった！"] },
          { at: 0.3, acts: 2, aoe: 0.36, charge: 0.35, msg: ["『まだ 声を捨てぬのか』", "ミュートスが 力をためる—防御を！"] }
        ]
      }]
    };
  }
  function bossMaou2() {
    return {
      bg: "maou", quizLv: 800,
      intro: ["『ふふ…まだ 終わらぬ』", "沈黙王ミュートスが 真の姿を現した！！", "『これが 静寂の 極み—！』"],
      bgm: "lastboss", // 専用曲があれば使用、無ければbossにフォールバック
      enemies: [{
        base: "maou_true", name: "真・沈黙王ミュートス", lv: 900,
        hp: 7000, atk: 148, def: 42, agi: 24, mag: 112, exp: 12000, boss: true,
        // 真の姿では、10戦目で通していた静けさが崩れる。抑えていたものが
        // ことばになって出てくる。エンディングの『わたしは ことばに 傷つき、
        // ことばを 憎んでいた』につながる
        aoeLine: "『ことばなど、はじめから いらなかった』\n絶対の 静寂が、すべてを 押しつぶす——！",
        magicCharge: true, chargeCry: "『これが 絶対の 静寂—！』",
        // 真の姿だけは、ためた大魔法のあとに 通常攻撃が1回続く（ためターンも2回行動）
        chargeFollowUp: true,
        skills: [{ name: "絶対静寂", power: 1.1, all: true }, { name: "言葉狩り", power: 1.4, all: false }], skillRate: 0.44,
        phases: [
          { at: 1.0, acts: 2, aoe: 0.25, charge: 0 },
          { at: 0.66, acts: 2, aoe: 0.35, charge: 0.32, msg: ["真ミュートスの 咆哮！", "闇が 渦を巻く！"] },
          { at: 0.33, acts: 2, aoe: 0.44, charge: 0.45, msg: ["ミュートスが 最後の力を放つ！！", "闇が すべてを 呑み込もうとする！"] }
        ]
      }]
    };
  }

  // ---- ことばの闘技場: 10 consecutive battles, heal + item + level up between ----
  function gsay(text) {
    return new Promise(function (res) {
      var scr = $("pbattle-screen"); scr.style.display = "block";
      var el = $("pbattle-msg"); el.style.display = "block";
      el.innerHTML = '<span class="body">' + text.replace(/\n/g, "<br>") + '</span><span class="arrow">▼</span>';
      function done(e) { if (e) e.preventDefault(); cleanup(); res(); }
      function cleanup() {
        $("btn-a").removeEventListener("pointerdown", done);
        el.removeEventListener("pointerdown", done);
        window.removeEventListener("keydown", onKey);
      }
      function onKey(e) { if (["Enter", " ", "z", "Escape", "x"].indexOf(e.key) >= 0) done(); }
      $("btn-a").addEventListener("pointerdown", done);
      el.addEventListener("pointerdown", done);
      window.addEventListener("keydown", onKey);
    });
  }
  // 中盤以降はMP大回復の「エスプレッソ」を拾えるように（MPが枯れやすいボス連戦対策）
  var GIFTS = ["herb", "elixir", "herb", "elixir", "espresso", "elixir", "espresso", "herb", "espresso", "herb"];
  // party grows: Yu solo -> +Gai(b2) -> +Rina(b3) -> +Mia(b5). joinAfter[i] joins after round i.
  var JOIN_AFTER = {
    0: { id: "gai", scene: [
      "闘技を 見終えた 剣士が\n静かに 歩み寄ってきた。",
      "「見事な 太刀筋だった。\n　—だが お前 ひとりでは\n　四天王には 届かん。」",
      "剣士ガイが 背中を預けると\n決めたようだ。\n仲間に 加わった！"
    ] },
    1: { id: "rina", scene: [
      "客席の 灯りが ひとつ 消え、\n杖を手にした 娘が 降りてきた。",
      "「魔法使いの リナよ。\n　あなたの その眼、\n　まだ 言葉を 諦めていない。」",
      "「なら わたしの 魔法も\n　その 眼のために。」\n魔法使いリナが 仲間に加わった！"
    ] },
    3: { id: "mia", scene: [
      "傷を負った あなたたちに\n白い光が そっと 差した。\n祈りを 捧げる 娘がいた。",
      "「僧侶の ミアと 申します。\n　剣は 持てませんが、\n　あなたがたを 倒れさせは しません。」",
      "「どうか この先も、\n　ご一緒 させてください。」\n僧侶ミアが 仲間に加わった！"
    ] }
  };
  // 11 rounds: zako(1-4) -> 中ボス竜(5) -> 四天王4連戦(6-9) -> ラスボス(10) -> 真ラスボス(11)
  function arenaRounds() {
    return [
      { label: "第1戦", enc: { bg: "zone1", quizLv: 400, bgm: "arena1", enemies: [af("bee", 1.4), af("bat", 1.4)] } },        // Yu solo（スペルバード＝青 ＋ アルファベットひよこ＝黄）
      { label: "第2戦", enc: { bg: "zone2", quizLv: 450, bgm: "arena2", enemies: [af("worm", 1.4), af("goblin", 1.4), af("rat", 1.4)] } }, // +Gai（ペンシルラビット登場）
      { label: "第3戦", enc: { bg: "zone3", quizLv: 500, bgm: "arena3", enemies: [af("wolf", 1.5), af("ghost", 1.5), af("snake", 1.5)] } }, // +Rina
      { label: "第4戦", enc: { bg: "zone4", quizLv: 550, bgm: "arena4", enemies: [af("mush", 1.9), af("owl", 1.9), af("ghost", 1.9), af("wolf", 1.9)] } },
      { label: "第5戦・中ボス 洞窟の古竜", enc: dragonEnc() }, // +Mia
      { label: "第6戦・四天王ハウル", enc: bossHowl() },
      { label: "第7戦・四天王ガグ", enc: bossGag() },
      { label: "第8戦・四天王ブランク", enc: bossBlank() },
      { label: "第9戦・四天王イレイズ", enc: bossErase() },
      { label: "第10戦・ラスボス", enc: bossMaou1() },
      { label: "最終戦・真ラスボス", enc: bossMaou2() }
    ];
  }

  function arenaStartParty() {
    var yu = window.PBATTLE.makeMember("yu", 5);
    yu.bag = ["herb", "herb", "elixir"];
    window.PBATTLE.setParty([yu]);
  }

  // generic choice dialog -> Promise<index>
  // Choice dialog. Resolves the chosen index, or -1 when cancelled
  // (B button / Esc / タップで外側 / やめる). opts may set {cancel:true} on an
  // entry to mark it as the cancel action.
  function choiceOverlay(title, opts) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      var panel = document.createElement("div");
      panel.className = "wq2-store-panel dq-window";
      panel.innerHTML = '<div class="wq2-store-h">' + title + "</div>";
      var row = document.createElement("div");
      row.className = "wq2-store-btns";
      function done(v) {
        window.removeEventListener("keydown", onKey, true);
        $("btn-b").removeEventListener("pointerdown", onB, true);
        wrap.remove();
        resolve(v);
      }
      opts.forEach(function (o, i) {
        var el = document.createElement("button");
        el.className = "wq2-store-btn" + (i === 0 ? " primary" : "");
        el.innerHTML = o.label;
        el.onclick = function (e) { e.preventDefault(); done(i); };
        row.appendChild(el);
      });
      function onKey(e) {
        if (e.key === "Escape" || e.key === "x") { e.preventDefault(); e.stopPropagation(); done(-1); }
      }
      function onB(e) { e.preventDefault(); e.stopPropagation(); done(-1); }
      // tapping the dark area outside the panel also cancels
      wrap.onpointerdown = function (e) { if (e.target === wrap) { e.preventDefault(); done(-1); } };
      window.addEventListener("keydown", onKey, true);
      $("btn-b").addEventListener("pointerdown", onB, true);
      panel.appendChild(row);
      wrap.appendChild(panel);
      $("screen").appendChild(wrap);
    });
  }

  // ---- mid-run save/resume (phone calls, app switches, accidental closes) ----
  var RUN_KEY = "wq2_run_v1";
  function saveRun(nextIndex) {
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({
        i: nextIndex,                        // next battle to fight
        party: window.PBATTLE.getParty(),    // levels/HP/MP/bag/spells
        stats: window.ARENA_STATS || null,
        easy: !!window.WQ2_EASY,
        at: Date.now()
      }));
    } catch (e) {}
  }
  function loadRun() {
    try {
      var r = JSON.parse(localStorage.getItem(RUN_KEY) || "null");
      if (!r || typeof r.i !== "number" || !r.party || !r.party.length) return null;
      return r;
    } catch (e) { return null; }
  }
  function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }

  async function runArena(resume) {
    // resuming an interrupted run costs no stamina (it was already paid for)
    if (!resume) {
      // stamina gate (free daily plays); premium skips it entirely
      if (window.WQ2_STORE && !WQ2_STORE.canPlay()) {
        var ok = await WQ2_STORE.openGate();
        refreshStamina();
        if (!ok) return; // out of plays, stay on title
      }
      if (window.WQ2_STORE) { WQ2_STORE.spendPlay(); refreshStamina(); }
    }

    var startAt = 0;
    if (resume) {
      window.ARENA_STATS = resume.stats || { t0: Date.now(), maxChain: 0 };
      window.PBATTLE.setParty(resume.party);
      startAt = resume.i;
    } else {
      window.ARENA_STATS = { t0: Date.now(), maxChain: 0 }; // score attack: clear time + max chain
      arenaStartParty(); // Yu solo; companions join as the gauntlet goes
    }
    if (window.QUIZ && QUIZ.resetRunSeen) QUIZ.resetRunSeen(); // fresh word rotation per run
    bumpStreak();
    $("ptitle-screen").style.display = "none";
    var rounds = arenaRounds();
    for (var i = startAt; i < rounds.length; i++) {
      saveRun(i); // checkpoint before each battle so an interruption resumes here
      var r = rounds[i];
      // 何戦目かを渡す。広告を出す位置の判断に使う（pstore.js の AD_ROUNDS）
      r.enc.round = i + 1;
      // 10 shown battles; the 11th (真ラスボス) is a hidden surprise — no counter, no start card
      if (i < 10) await gsay("【ことばの闘技場】\n" + r.label + "（" + (i + 1) + "／10）\nＡボタンで 開始！");
      var res = await window.PBATTLE.start(r.enc);
      saveStudy();
      if (res.result === "flee") {
        // 中断してタイトルへ。直前に saveRun(i) を打ってあるので、
        // 「続きから」でこの戦いから再開できる。負けたことにはしない
        await gsay("闘技場から 引き上げた。\n\n（タイトルの「続きから」で\n　この戦いから 再開できます）");
        break;
      }
      if (res.result !== "win") {
        // rewarded-ad continue: full-heal and retry this same battle
        var cont = window.WQ2_STORE ? await WQ2_STORE.offerContinue() : false;
        if (cont) { window.PBATTLE.fullHeal(); i--; continue; }
        clearRun(); // run is over — no resume point
        var pg = window.studyProgress(), tr = window.trophyFor(pg.cleared);
        // keep the best chain even on defeat
        var st0 = window.ARENA_STATS || {}, rc0 = loadRec();
        if ((st0.maxChain || 0) > (rc0.bestChain || 0)) { rc0.bestChain = st0.maxChain; saveRec(rc0); refreshRecords(); }
        await gsay("闘技場に 敗れた…。\nＬｖ" + window.PBATTLE.getParty()[0].lv + "／" + (i + 1) + "戦目でリタイア。\n\n" +
          "これまでに " + pg.cleared + " ／ " + pg.total + " 問クリア！" + (tr.icon ? "　" + tr.icon + tr.name : "") + "\n" +
          "（タイトルの「単語帳」で 復習できます）");
        break;
      }
      if (i < rounds.length - 1) {
        window.PBATTLE.fullHeal();
        var ups = window.PBATTLE.levelEveryone(i >= 3 ? 3 : 2); // faster leveling from the mid-boss on (Yu reaches Lv20=パーティヒール by the ガグ戦)
        var gift = GIFTS[i] || "herb";
        var who = window.PBATTLE.giveItemToParty(gift);
        // 名前は pbattle.js の ITEMS が唯一の出どころ。ここに書き写すと、
        // 名前を変えたときに片方だけ古いまま残る
        var gi = window.PBATTLE.ITEMS[gift] || {};
        var giftName = gi.name || gift;
        var head = (i === 9) ? "ミュートスを倒した…と思ったその時！" : "勝利！ パーティは 全回復した。";
        var msg = head + "\n" + (who ? who + "が『" + giftName + "』を拾った！" : "（道具袋は満杯だった）");
        if (ups.length) msg += "\nみんなの レベルが上がった！（Ｌｖ" + window.PBATTLE.getParty()[0].lv + "）";
        await gsay(msg);
        // levelEveryone は覚えた魔法も返しているのに、これまで受け取る側で
        // 捨てていた。闘技場のレベルは大半がここで上がる（1戦ごとに2〜3）
        // ので、「魔法をおぼえた」がほとんど出ないままになっていた。
        // 戦闘中と同じく、人ごとに1通ずつ出す
        var order = [], spellsOf = {};
        ups.forEach(function (u) {
          if (!u.learned || !u.learned.length) return;
          if (!spellsOf[u.name]) { spellsOf[u.name] = []; order.push(u.name); }
          spellsOf[u.name] = spellsOf[u.name].concat(u.learned);
        });
        for (var li = 0; li < order.length; li++) {
          await gsay(order[li] + "は 魔法『" + spellsOf[order[li]].join("』『") + "』を おぼえた！");
        }
        var join = JOIN_AFTER[i];
        if (join) {
          var m = window.PBATTLE.addMember(join.id, window.PBATTLE.getParty()[0].lv);
          if (m) { m.bag = ["herb", "elixir"]; for (var s = 0; s < join.scene.length; s++) await gsay(join.scene[s]); }
        }
      } else {
        if (window.BGM) BGM.playAny(["ending", "title"]); // victory epilogue music
        // ending scene: clear the fallen boss and switch to a bright, hopeful backdrop
        $("penemy-row").innerHTML = "";
        // ステータス列も畳む。戦いは終わっていて見る必要がないうえ、
        // エピローグの「冒険の記録」は6行あり、伸びたメッセージ窓が
        // この列に重なってしまう
        $("pparty-strip").innerHTML = "";
        var kv = (window.UI_ART && window.UI_ART.titlebg) || "../assets/ui/title_bg.png";
        var bgEl = $("pbattle-bg");
        bgEl.style.backgroundImage = "url('" + kv + "')";
        bgEl.style.backgroundSize = "cover"; bgEl.style.backgroundPosition = "center top";
        var lv = window.PBATTLE.getParty()[0].lv;
        var pg = window.studyProgress(), tr = window.trophyFor(pg.cleared);
        // score attack: save clear time + max chain, flag new records
        var sst = window.ARENA_STATS || {};
        var clearMs = sst.t0 ? Date.now() - sst.t0 : 0;
        var rc = loadRec();
        var newTime = clearMs > 0 && (!rc.bestMs || clearMs < rc.bestMs);
        var newChain = (sst.maxChain || 0) > (rc.bestChain || 0);
        if (newTime) rc.bestMs = clearMs;
        if (newChain) rc.bestChain = sst.maxChain;
        rc.clears = (rc.clears || 0) + 1;
        saveRec(rc); refreshRecords();
        clearRun(); // cleared — nothing to resume
        var ending = [
          "真・沈黙王ミュートスは\nまばゆい光の中へ 溶けて消えた…。",
          "『…ありがとう。\n　わたしは ことばに 傷つき、\n　ことばを 憎んでいた。』",
          "『けれど きみたちの声は\n　まっすぐで、あたたかかった。\n　その響きに、救われたよ。』",
          "奪われていた ことばが\n世界へ 還っていく。\n人々の 声が、歌が、笑い声が、\n少しずつ 街に あふれ出した。",
          "ユウたちは たがいの顔を 見合わせ、\nどちらからともなく 笑った。\nもう 多くの言葉は いらなかった。",
          "——そして いつか。\nきみが 覚えた 一つ一つの単語が、\n誰かに 何かを 伝える日が くる。",
          "【 冒険の記録 】\n　最終レベル … " + lv +
            (clearMs ? "\n　クリアタイム … " + fmtMs(clearMs) + (newTime ? "　🎉新記録！" : "") : "") +
            (sst.maxChain ? "\n　最大チェイン … ×" + sst.maxChain + (newChain ? "　🎉新記録！" : "") : "") +
            "\n　覚えた単語 … " + pg.cleared + " ／ " + pg.total + " 語" +
            (tr.icon ? "\n　称号 … " + tr.icon + " " + tr.name : ""),
          "〜 ことばの闘技場 制覇 〜\n\n★　Ｗ Ｏ Ｒ Ｄ Ｒ Ｉ Ａ　★\n\nおめでとう！ そして ありがとう。",
          "（タイトルの「単語帳」で\n　出会った単語を いつでも 復習できます。\n　全" + pg.total + "語 制覇を めざそう！）"
        ];
        // 挑戦の塔は初回クリアで開放される（refreshTowerBtn がボタンを出す）。
        // これまで何も知らせていなかったので、遊べる場所が増えたことに
        // 気づけなかった。初回だけ伝える（2回目以降は新しい報せではない）
        if (rc.clears === 1) {
          ending.splice(ending.length - 1, 0,
            "🗼　挑戦の塔が 開放された！\n\nタイトルの「挑戦の塔」から のぼれる。\n" +
            "レベルは固定、道具もなし。\nどこまで のぼれるか——腕だめしの場だ。");
        }
        for (var e = 0; e < ending.length; e++) await gsay(ending[e]);
        // ending movie after the epilogue text (skippable; failures fall through)
        if (window.PMOVIE) { if (window.BGM) BGM.stop(); await PMOVIE.play("ed"); }
        // エンディングを見終えて、タイトルに戻るところ。1周が完全に終わった
        // 区切りで、この先に続きを待っている人がいない。全画面広告を置くなら
        // ここがいちばん邪魔にならない。戦闘前と同じく、止まったときのために
        // 6秒で見切る
        if (window.WQ2_STORE && WQ2_STORE.adAfterEnding) {
          await Promise.race([
            WQ2_STORE.adAfterEnding(),
            new Promise(function (r) { setTimeout(r, 6000); })
          ]).catch(function () {});
        }
        // 1周を遊びきった直後は、いちばん気持ちが乗っている。ストアの評価を
        // お願いするなら ここしかない。2周目以降・90日おき・生涯3回まで、
        // そして見返りは一切つけない（条件と理由は party/js/prate.js）。
        // maybeAsk は必ず解決するので、ここで止まることはない
        if (window.WQ2_RATE) await WQ2_RATE.maybeAsk(rc.clears);
      }
    }
    if (window.BGM) BGM.stop();
    $("pbattle-screen").style.display = "none"; // clear the battle layer so the title/zukan show cleanly
    $("ptitle-screen").style.display = "flex";
    refreshStamina(); refreshArenaBtn(); refreshReviewBtn(); refreshTowerBtn(); refreshModeBtn(); refreshVoiceBtn();
    if (window.BGM) BGM.playAny(["title"]);
  }

  // ================= 挑戦の塔（endless mode・闘技場のバランスには一切触れない） =================
  // Unlocked after the first arena clear. Fixed Lv30 party, no level-ups, no items
  // gained — pure "how far can you go" score attack. Records are separate.
  var TOWER_FOES = ["bee", "rat", "goblin", "worm", "snake", "ghost", "wolf", "owl", "mush",
                    "twins", "lizard", "clock", "knight5", "golem", "demon", "mummy", "ogre",
                    "snight", "harpy", "reaper", "kraken", "phoenix", "wizard", "shadow"];
  var TOWER_BG = ["zone1", "zone2", "zone3", "zone4", "cave", "tower1", "tower2", "zone5", "zone6", "maou"];
  function towerFloorEnc(floor) {
    var str = 1 + (floor - 1) * 0.16;                 // gentle, predictable ramp
    var qz = [400, 450, 500, 550, 600, 650, 700, 750, 800, 900][Math.min(9, Math.floor((floor - 1) / 3))];
    var n = floor < 3 ? 2 : floor < 7 ? 3 : 4;
    var foes = [];
    for (var k = 0; k < n; k++) {
      var id = TOWER_FOES[(floor * 3 + k * 5) % TOWER_FOES.length];
      foes.push(af(id, str));
    }
    // every 5th floor is a boss floor
    if (floor % 5 === 0) {
      var b = miniBoss(TOWER_FOES[(floor * 7) % TOWER_FOES.length], floor + "階の 守護者");
      b.hp = Math.round(b.hp * (0.7 + floor * 0.06));
      b.maxhp = b.hp;
      b.atk = Math.round(40 + floor * 4.5);
      b.mag = Math.round(b.atk * 1.05);
      foes = [b];
    }
    // floor は広告の位置の判断に使う（pstore.js の TOWER_EVERY）
    return { floor: floor, bg: TOWER_BG[(floor - 1) % TOWER_BG.length], quizLv: qz,
             bgm: floor % 5 === 0 ? "midboss" : "arena" + (((floor - 1) % 5) + 1), enemies: foes };
  }
  async function runTower() {
    if (window.WQ2_STORE && !WQ2_STORE.canPlay()) {
      var ok = await WQ2_STORE.openGate(); refreshStamina();
      if (!ok) return;
    }
    if (window.WQ2_STORE) { WQ2_STORE.spendPlay(); refreshStamina(); }
    if (window.QUIZ && QUIZ.resetRunSeen) QUIZ.resetRunSeen();
    bumpStreak();
    $("ptitle-screen").style.display = "none";
    // fixed party: no growth during the climb, so it's purely about your answers
    window.PBATTLE.setParty(["yu", "gai", "rina", "mia"].map(function (id) {
      var m = window.PBATTLE.makeMember(id, 30);
      m.bag = ["herb", "herb", "elixir", "espresso"];
      return m;
    }));
    var rc = loadRec();
    await gsay("【挑戦の塔】\nどこまで 登れるか——\n\nレベルは Ｌｖ30で 固定。\n回復は 5階ごとだけ！" +
      (rc.bestFloor ? "\n\n自己ベスト … " + rc.bestFloor + "階" : ""));
    var floor = 1, reached = 0;
    for (;;) {
      await gsay("【挑戦の塔】" + floor + "階" + (floor % 5 === 0 ? "　★守護者の間★" : ""));
      var res = await window.PBATTLE.start(towerFloorEnc(floor));
      saveStudy();
      // にげた場合も、その階は突破していないので到達は1つ下。
      // 塔は途中再開のしくみが無いので、結果まで進んで記録を残す
      if (res.result !== "win") { reached = floor - 1; break; }
      reached = floor;
      if (floor % 5 === 0) { window.PBATTLE.fullHeal(); await gsay(floor + "階を 突破！\nパーティは 全回復した。"); }
      floor++;
    }
    var st = window.ARENA_STATS || {};
    var best = rc.bestFloor || 0, isNew = reached > best;
    if (isNew) { rc.bestFloor = reached; saveRec(rc); refreshRecords(); }
    var pg = window.studyProgress();
    await gsay("【挑戦の塔・結果】\n到達 … " + reached + "階" + (isNew ? "　🎉自己ベスト更新！" : "（自己ベスト " + best + "階）") +
      "\n覚えた単語 … " + pg.cleared + " ／ " + pg.total + " 語");
    if (window.BGM) BGM.stop();
    $("pbattle-screen").style.display = "none";
    $("ptitle-screen").style.display = "flex";
    refreshStamina(); refreshRecords(); refreshReviewBtn(); refreshTowerBtn();
    if (window.BGM) BGM.playAny(["title"]);
  }

  function refreshBgmBtn() {
    $("pbtn-bgm").textContent = (window.BGM && BGM.isEnabled()) ? "🔊" : "🔇";
    $("pbtn-bgm").classList.toggle("off", !(window.BGM && BGM.isEnabled()));
  }
  function refreshDiffBtn() {
    var tx = $("pbtn-diff").querySelector(".tx") || $("pbtn-diff");
    tx.textContent = "難易度：" + (window.WQ2_EASY ? "やさしい" : "ふつう");
  }
  function refreshTowerBtn() {
    var rc = loadRec();
    $("pbtn-tower").style.display = (rc.clears > 0) ? "" : "none"; // unlocked after a first clear
    var tx = $("pbtn-tower").querySelector(".tx");
    if (tx) tx.textContent = "挑戦の塔" + (rc.bestFloor ? "（最高 " + rc.bestFloor + "階）" : "");
  }

  // ---- 称号・記録 (achievements) ----
  function showAchievements() {
    var rc = loadRec(), pg = window.studyProgress(), words = (window.G.study && window.G.study.words) || {};
    var gold = 0, fast = 0;
    for (var k in words) {
      var r = words[k];
      if (!r) continue;
      if (r.g) gold++;
      if (r.f) fast++;
    }
    var streak = 0;
    try { var s = JSON.parse(localStorage.getItem("wq2_streak") || "{}"); if (s.last === dayKey(0) || s.last === dayKey(-1)) streak = s.n || 0; } catch (e) {}
    var tr = window.trophyFor(pg.cleared);
    // 出題の段階ではなく語彙のまとまりで数える。学生版は1つの段階に
    // 複数学年が混ざるので、段階ごとに数えると同じ学年名が並んでしまう
    var gs = (window.WQ2_MODE && WQ2_MODE.groups) ? WQ2_MODE.groups() : [];
    var medals = gs.map(function (g) {
      var n = 0;
      for (var i = 0; i < g.words.length; i++) {
        var rec = words[g.words[i].w];
        if (rec && rec.c > 0) n++;
      }
      var t = window.trophyFor(n);
      return '<div class="achv-medal ' + t.cls + '"><div class="achv-ic">' + (t.icon || "🔒") + '</div>' +
        '<div class="achv-lv">' + g.name + '</div><div class="achv-n">' + n + '/' + g.words.length + '</div></div>';
    }).join("");
    var rows = [
      ["📚 覚えた単語", pg.cleared + " / " + pg.total + " 語"],
      ["🏆 総合称号", (tr.icon || "🔰") + " " + tr.name],
      ["⭐ 金★（3連続正解）", gold + " 語"],
      ["⚡ 銀★（2秒以内）", fast + " 語"],
      ["🔥 連続学習", streak >= 1 ? streak + " 日" : "—"],
      ["🎖 闘技場 制覇", (rc.clears || 0) + " 回"],
      ["⏱ 最速クリア", rc.bestMs ? fmtMs(rc.bestMs) : "—"],
      ["🔗 最大チェイン", rc.bestChain ? "×" + rc.bestChain : "—"],
      ["🗼 挑戦の塔 最高", rc.bestFloor ? rc.bestFloor + " 階" : "—"]
    ].map(function (r) { return '<div class="achv-row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join("");
    var wrap = document.createElement("div");
    wrap.className = "wq2-store-ovl";
    wrap.innerHTML = '<div class="wq2-store-panel dq-window achv-panel">' +
      '<div class="wq2-store-h">🏅 称号・記録</div>' +
      '<div class="achv-medals">' + medals + '</div>' +
      '<div class="achv-list">' + rows + '</div></div>';
    function closeAchv() {
      window.removeEventListener("keydown", onKey, true);
      $("btn-b").removeEventListener("pointerdown", onB, true);
      wrap.remove();
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "x") { e.preventDefault(); e.stopPropagation(); closeAchv(); } }
    function onB(e) { e.preventDefault(); e.stopPropagation(); closeAchv(); }
    wrap.onpointerdown = function (e) { if (e.target === wrap) { e.preventDefault(); closeAchv(); } };
    window.addEventListener("keydown", onKey, true);
    $("btn-b").addEventListener("pointerdown", onB, true);
    // 閉じ口は左上の×ひとつ。下にも「閉じる」を置いていたが、
    // 同じ働きのものが2つあると、どちらを押すのか迷わせるだけだった
    var x = document.createElement("button");
    x.className = "wq2-x";
    x.textContent = "✕";
    x.setAttribute("aria-label", "閉じる");
    x.onclick = function (e) { e.preventDefault(); closeAchv(); };
    wrap.querySelector(".wq2-store-panel").appendChild(x);
    $("screen").appendChild(wrap);
  }

  // ---- 今日の復習 (SRS session) ----
  async function runReview() {
    var due = srsDue();
    $("ptitle-screen").style.display = "none";
    var kv = (window.UI_ART && window.UI_ART.titlebg) || "../assets/ui/title_bg.png";
    var bgEl = $("pbattle-bg");
    bgEl.style.backgroundImage = "url('" + kv + "')";
    bgEl.style.backgroundSize = "cover"; bgEl.style.backgroundPosition = "center top";
    $("penemy-row").innerHTML = ""; $("pparty-strip").innerHTML = ""; $("pchain-badge").className = "";
    if (!due.length) {
      await gsay("【今日の復習】\n復習する単語は ありません！\n\n闘技場で ミスした単語が\n自動で ここに たまります。");
    } else {
      bumpStreak();
      await gsay("【今日の復習】\nミスした単語 " + due.length + " 語に 再挑戦！\n正解するほど 次の出題は 先になります。");
      var ok = 0;
      for (var i = 0; i < due.length; i++) {
        var r = due[i].r;
        var res = await window.QUIZ.ask(r.l || 500, { time: 6, noCrit: true, entry: { w: due[i].w, m: r.m, p: r.p } });
        if (res.correct) { // advance the SRS box: next review moves further out
          ok++;
          r.box = Math.min((r.box || 0) + 1, SRS_GAP.length - 1);
          r.due = QUIZ_DNUM(SRS_GAP[r.box]);
        } // on miss, record() already reset box=0 / due=tomorrow
        saveStudy();
      }
      var msg = "復習終了！　" + ok + " ／ " + due.length + " 問 正解。";
      if (window.WQ2_STORE && WQ2_STORE.claimReviewBonus()) msg += "\n毎日の復習ボーナス！ ⚡スタミナ＋1";
      msg += "\n（次は 忘れかけたころに また出題します）";
      await gsay(msg);
    }
    $("pbattle-screen").style.display = "none";
    $("ptitle-screen").style.display = "flex";
    refreshStamina(); refreshReviewBtn();
    if (window.BGM) BGM.playAny(["title"]);
  }
  // 今日の復習モードは画面から外した（モードを増やしても遊びの density が
  // 上がらない、という判断）。仕組みと記録は残してあるので、要望が出たら
  // index.html にボタンを戻すだけで復活する
  function refreshReviewBtn() {
    if (!$("pbtn-review")) return;
    var n = srsDue().length;
    var b = $("review-badge");
    if (b) { b.textContent = n > 0 ? String(n) : ""; }
  }
  function refreshRecords() {
    var el = $("ptitle-records");
    if (!el) return;
    var rc = loadRec();
    if (!rc.bestMs && !rc.bestChain) { el.style.display = "none"; return; }
    el.style.display = "";
    el.innerHTML = "🏅 " +
      (rc.bestMs ? "最速 " + fmtMs(rc.bestMs) : "") +
      (rc.bestMs && rc.bestChain ? "　" : "") +
      (rc.bestChain ? "最大チェイン ×" + rc.bestChain : "") +
      (rc.clears ? "　制覇 " + rc.clears + "回" : "");
  }

  function refreshStamina() {
    var el = $("ptitle-stamina"), ub = $("pbtn-unlock");
    if (!window.WQ2_STORE) { if (el) el.style.display = "none"; if (ub) ub.style.display = "none"; return; }
    if (WQ2_STORE.isPremium()) {
      if (el) el.innerHTML = "★ プレミアム加入中（広告オフ・学習機能プラス）";
      if (ub) ub.style.display = "none";
    } else {
      if (el) el.innerHTML = "⚡ 本日のプレイ　" + WQ2_STORE.stamina() + " ／ " + WQ2_STORE.max();
      if (ub) {
        // 金額は pstore.js の PRICE ひとつだけを見る。index.html にも書いてあると
        // 値段を変えたときに片方だけ古いまま残る
        // 「広告が消える」だけだと、学べることが増える点が伝わらない。
        // 実際に増えるのは 出題レベルの固定 と 学習の記録の全表示
        ub.textContent = "★ プレミアム（月額" + WQ2_STORE.price() + "・広告オフ・学習機能プラス）";
        ub.style.display = "";
      }
    }
  }
  if ($("pbtn-unlock")) $("pbtn-unlock").addEventListener("click", function () {
    $("pbtn-unlock").blur();
    if (window.WQ2_STORE) WQ2_STORE.buyPremium(function (ok) { if (ok) refreshStamina(); });
  });
  // 読み上げの ON/OFF ボタンは廃止した。単語の発音はこのアプリの中身そのもので、
  // 切れるようにしておくと、消したまま使って「音が出ない」と受け取られる。
  // 呼び出し側を全部消して回るより、何もしない関数を1つ残すほうが安全
  function refreshVoiceBtn() {}

  function refreshModeBtn() {
    var b = $("pbtn-mode");
    if (!b || !window.WQ2_MODE) return;
    b.querySelector(".tx").textContent = "出題：" + WQ2_MODE.label();
  }
  // 出題範囲が変わったとき pvocab.js から呼ばれる。学習記録は範囲ごとに
  // 別なので読み直し、タイトルの表示を作り直す（画面の再読み込みはしない）
  window.WQ2_ON_MODE_CHANGE = function () {
    window.G.study = { missed: {}, answered: 0, correct: 0 };
    try {
      var s = localStorage.getItem(studyKey());
      if (s) window.G.study = JSON.parse(s);
    } catch (e) {}
    refreshModeBtn(); refreshStamina(); refreshArenaBtn();
    refreshReviewBtn(); refreshTowerBtn(); refreshRecords();
  };
  if ($("pbtn-mode")) $("pbtn-mode").addEventListener("click", function () {
    $("pbtn-mode").blur();
    if (window.WQ2_MODE) WQ2_MODE.open().then(refreshModeBtn);
  });
  $("pbtn-diff").addEventListener("click", function () {
    $("pbtn-diff").blur();
    window.WQ2_EASY = !window.WQ2_EASY;
    try { localStorage.setItem("wq2_easy", window.WQ2_EASY ? "1" : "0"); } catch (e) {}
    refreshDiffBtn();
  });

  function refreshArenaBtn() {
    var r = loadRun(), tx = $("pbtn-arena").querySelector(".tx");
    if (!tx) return;
    tx.textContent = r ? "続きから（" + Math.min(r.i + 1, 11) + "戦目）" : "ことばの闘技場";
  }
  $("pbtn-arena").addEventListener("click", async function () {
    $("pbtn-arena").blur();
    var r = loadRun();
    if (r) {
      var pick = await choiceOverlay("中断した 挑戦が あります",
        [{ label: "▶ 続きから（" + Math.min(r.i + 1, 11) + "戦目・Ｌｖ" + r.party[0].lv + "）" },
         { label: "🆕 最初から やり直す" },
         { label: "もどる" }]);
      if (pick === 0) { runArena(r); return; }
      if (pick !== 1) return;          // もどる / B / Esc: keep the saved run, stay on the title
      clearRun(); refreshArenaBtn();
    }
    runArena();
  });
  $("pbtn-tower").addEventListener("click", function () { $("pbtn-tower").blur(); runTower(); });
  $("pbtn-achv").addEventListener("click", function () { $("pbtn-achv").blur(); showAchievements(); });
  // 自分から評価しに来た人の入口。何も見返りは無い（prate.js の冒頭に理由）
  if ($("pbtn-rate")) $("pbtn-rate").addEventListener("click", function () {
    $("pbtn-rate").blur();
    if (window.WQ2_RATE) WQ2_RATE.openStore();
  });
  if ($("pbtn-analysis")) $("pbtn-analysis").addEventListener("click", function () {
    $("pbtn-analysis").blur();
    if (window.PDRILL) PDRILL.analysis();
  });
  $("pbtn-zukan").addEventListener("click", function () { $("pbtn-zukan").blur(); if (window.PFIELD) window.PFIELD.openZukan(); });
  // story mode is under construction: first tap warns, second tap (within 4s) opens the preview
  var fieldArmed = false;
  // release builds strip this entry point (see tools/build_www.js), so it may be absent
  var fieldBtn = $("pbtn-field");
  if (fieldBtn) fieldBtn.addEventListener("click", function () {
    $("pbtn-field").blur();
    if (!fieldArmed) {
      fieldArmed = true;
      $("pbtn-field").textContent = "制作中です　もう一度押すと試遊";
      setTimeout(function () {
        fieldArmed = false;
        $("pbtn-field").textContent = "※ ストーリーモードは 制作中です";
      }, 4000);
      return;
    }
    fieldArmed = false;
    $("pbtn-field").textContent = "※ ストーリーモードは 制作中です";
    window.PFIELD.start(false); // continues the save if one exists
  });
  $("pbtn-bgm").addEventListener("click", function () {
    if (window.BGM) BGM.setEnabled(!BGM.isEnabled());
    refreshBgmBtn();
  });

  // オープニングを見る。自動再生はしないので、見る手段はこのボタンだけ。
  // pointerdown で止めているのは、タイトル画面が同じイベントを拾って
  // 別の処理を始めるのを防ぐため。連打で二重に開かないよう playing で塞ぐ
  (function () {
    var btn = $("pbtn-movie");
    if (!btn) return;
    var playing = false;
    btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (playing || !window.PMOVIE) return;
      playing = true;
      btn.classList.add("off");
      PMOVIE.play("op").then(function () {
        playing = false;
        btn.classList.remove("off");
        if (window.BGM) BGM.playAny(["title"]);
      });
    });
  })();

  // 窓枠の装飾画像があれば使う（css/style.css の .ui-frame）。
  //
  // 以前は assets/ui/frame.png を決め打ちで取りに行っていた。その絵は
  // 結局作らなかったので、起動のたびに実機のコンソールへ
  // ERR_FILE_NOT_FOUND が1件出ていた。動きには影響しないが、無いものを
  // 毎回取りに行っているのは事実なので消す。<img> の404はブラウザが
  // 直接記録するため、onerror では握りつぶせない。取りに行かないしかない。
  //
  // 絵を用意したら tools/build_inline_assets.js が UI_ART.frame に載せる
  // （存在するファイルだけを拾う作りになっている）。ここは触らなくてよい。
  (function () {
    var src = window.UI_ART && window.UI_ART.frame;
    if (!src) return;
    var img = new Image();
    img.onload = function () {
      document.documentElement.style.setProperty("--frame-src", "url('" + src + "')");
      document.documentElement.classList.add("ui-frame");
    };
    img.src = src;
  })();

  // タイトルの絵（背景とロゴ）。どちらも無ければ CSS のグラデーションと
  // 文字のロゴのまま成立する作りにしてある。
  //
  // ただし、以前は「まず文字ロゴ＋グラデーションで出し、絵が読めたら差し替える」
  // 順番だったので、実機では別のタイトル画面が一瞬見えてから本物に変わっていた。
  // 両方そろうまで（読めない絵があっても2.5秒で見切る）隠しておき、一度だけ出す。
  (function () {
    var t = $("ptitle-screen");
    t.classList.add("art-wait");
    var left = 2, shown = false;
    var guard = setTimeout(reveal, 2500);   // 絵が無い・遅いときも必ず出す
    function reveal() {
      if (shown) return;
      shown = true;
      clearTimeout(guard);
      t.style.opacity = "";              // index.html に直接書いてあるぶん
      t.classList.remove("art-wait");    // party.css のぶん
    }
    function one() { if (--left <= 0) reveal(); }

    // 背景の絵
    var bgSrc = (window.UI_ART && window.UI_ART.titlebg) || "../assets/ui/title_bg.png";
    var bg = new Image();
    bg.onload = function () {
      // 上に薄い暗幕（明るい空でもロゴとボタンが読める）。下の仲間は暗くしない
      t.style.backgroundImage = "linear-gradient(180deg, rgba(8,10,30,.28) 0%, rgba(8,10,30,0) 34%, rgba(8,10,30,0) 82%, rgba(8,10,30,.30) 100%), url('" + bgSrc + "')";
      t.style.backgroundSize = "cover";
      t.style.backgroundPosition = "center top";
      t.classList.add("has-kv");
      one();
    };
    bg.onerror = one;
    bg.src = bgSrc;

    // ロゴの絵
    var lgSrc = (window.UI_ART && window.UI_ART.logo) || "../assets/ui/logo.png";
    var lg = new Image();
    lg.onload = function () {
      var box = $("ptitle-logo");
      box.innerHTML = '<img src="' + lgSrc + '" alt="WORDRIA">';
      box.classList.add("img");
      one();
    };
    lg.onerror = one;
    lg.src = lgSrc;
  })();

  refreshBgmBtn();
  refreshDiffBtn();
  refreshStamina();
  refreshReviewBtn();
  refreshRecords();
  refreshStreak();
  refreshArenaBtn();
  refreshTowerBtn();
  refreshModeBtn();
  refreshVoiceBtn();

  // Opening: browsers block audio until a user gesture, and the first tap is
  // usually a menu button that jumps straight into battle — so the title theme
  // never gets heard. Gate the title behind a "tap to start" so the opening
  // music plays on that first touch. (After a battle, audio is already unlocked,
  // so returning to the title plays music without the gate.)
  if (window.BGM) BGM.playAny(["title"]); // set current track = title
  (function armStart() {
    var t = $("ptitle-screen");
    t.classList.add("pre-start");
    function go() {
      t.removeEventListener("pointerdown", go);
      t.classList.remove("pre-start");
      // 初回起動でオープニングを自動再生していたが、やめた。アプリを開いて
      // 最初の数十秒は「遊べるかどうか」を見る時間で、そこにムービーを挟む
      // 価値はない。見たい人は左上の 🎬 ボタンからいつでも見られる。
      if (window.BGM) BGM.playAny(["title"]);
    }
    t.addEventListener("pointerdown", go);
  })();

  // タイトル右下のビルド番号を1.5秒長押しすると、広告の状態が読める。
  //
  // 広告が出ないときに、その理由を確かめる手段がなかった。Safariの
  // ウェブインスペクタは Mac と有線接続が要るうえ、遊んでいる本人が
  // 開けるものではない。実機だけで読めるところに出しておく。
  // 遊ぶ人が偶然たどり着く操作ではないので、審査にも影響しない。
  (function armAdDiag() {
    var el = $("ptitle-build");
    if (!el) return;
    var timer = 0;
    function cancel() { if (timer) { clearTimeout(timer); timer = 0; } }
    el.addEventListener("pointerdown", function () {
      cancel();
      timer = setTimeout(function () {
        timer = 0;
        var txt = (window.WQ2_ADS && window.WQ2_ADS.report)
          ? WQ2_ADS.report()
          : "このビルドではネイティブの広告が動いていません。\n" +
            "（ブラウザで開いている／Capacitor のプラグインが入っていない）";
        if (window.WQ2_STORE && WQ2_STORE.note) WQ2_STORE.note(txt);
        else alert(txt);
      }, 1500);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (e) {
      el.addEventListener(e, cancel);
    });
  })();
})();
