// WORD QUEST II - prototype shell (demo menu)
(function () {
  "use strict";
  window.ASSET_BASE = "../"; // bgm.js loads from ../assets/bgm/
  window.LEVEL_LABEL = "スコア"; // 公開用: TOEICはETS商標のため表示は「スコア600 レベル」形式にする

  // minimal state for quiz.js (study log + combo)
  window.G = { study: { missed: {}, answered: 0, correct: 0 }, combo: 0 };
  try {
    var st = localStorage.getItem("wq2_study_v1");
    if (st) window.G.study = JSON.parse(st);
  } catch (e) {}
  function saveStudy() {
    try { localStorage.setItem("wq2_study_v1", JSON.stringify(window.G.study)); } catch (e) {}
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
    return king({ base: "gen_r", name: "四天王ハウル", lv: 600, hp: 3060, atk: 58, def: 24, exp: 1400, quizLv: 600, bg: "tower1", bgm: "midboss",
      skills: [{ name: "轟音の叫び", power: 0.72, all: true }],
      intro: ["四天王ハウルが 道をふさぐ！", "『聞く力は わたしが喰らった。\n　お前たちの叫びは 誰にも届かん！』"] });
  }
  function bossGag() {
    return king({ base: "king_gag", name: "四天王ガグ", lv: 700, hp: 3910, atk: 76, def: 28, exp: 2000, quizLv: 650, bg: "tower2", bgm: "midboss2",
      aoeCry: "静まりなさい", aoeVerb: "命じた",
      skills: [{ name: "沈黙の号令", power: 0.5, all: true }, { name: "言霊砕き", power: 1.3, all: false }],
      intro: ["四天王ガグが 立ちはだかる！", "『話す力は 我が手にある。\n　その声も この地で 奪わせてもらう。』"] });
  }
  function bossBlank() {
    return king({ base: "king_blank", name: "四天王ブランク", lv: 800, hp: 5600, atk: 94, def: 30, exp: 2800, quizLv: 700, acts3: 3, bg: "zone6", bgm: "boss",
      skills: [{ name: "白紙化", power: 0.72, all: true }, { name: "記憶消去", power: 1.35, all: false }],
      intro: ["四天王ブランクが 現れた！", "『読む力は 消し去った。\n　お前たちの記憶も 白紙にしてやろう』"] });
  }
  function bossErase() {
    return king({ base: "king_erase", name: "四天王イレイズ", lv: 850, hp: 6800, atk: 112, def: 34, exp: 3600, quizLv: 750, acts3: 3, bg: "zone5", bgm: "midboss3",
      skills: [{ name: "消し去る風", power: 1.05, all: true }, { name: "抹消の一撃", power: 1.4, all: false }],
      intro: ["最後の四天王 イレイズ！", "『書く力を 奪った我が、\n　四天王 最強よ。ここで 消えろ！』"] });
  }
  // two-phase last boss: beat ミュートス, then the TRUE form rises
  function bossMaou1() {
    return {
      bg: "maou", quizLv: 750,
      intro: ["ついに 現れた 沈黙王ミュートス。", "『ことばは 人を傷つける。\n　ならば いっそ 全て奪おう。\n　この静寂こそ 救いなのだ』"],
      bgm: "boss",
      enemies: [{
        base: "maou_mutos", name: "沈黙王ミュートス", lv: 900,
        hp: 4600, atk: 66, def: 38, agi: 22, mag: 74, exp: 5000, boss: true,
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
        hp: 6800, atk: 88, def: 42, agi: 24, mag: 98, exp: 12000, boss: true,
        skills: [{ name: "絶対静寂", power: 1.1, all: true }, { name: "言葉狩り", power: 1.4, all: false }], skillRate: 0.44,
        phases: [
          { at: 1.0, acts: 2, aoe: 0.25, charge: 0 },
          { at: 0.66, acts: 2, aoe: 0.35, charge: 0.3, msg: ["真ミュートスの 咆哮！", "闇が 渦を巻く！"] },
          { at: 0.33, acts: 3, aoe: 0.42, charge: 0.4, msg: ["ミュートスが 最後の力を放つ！！", "行動が 3回に！総力戦だ！"] }
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
      { label: "第1戦", enc: { bg: "zone1", quizLv: 400, enemies: [af("slime", 1.4), af("bat", 1.4)] } },        // Yu solo
      { label: "第2戦", enc: { bg: "zone2", quizLv: 450, enemies: [af("rat", 1.4), af("goblin", 1.4), af("bee", 1.4)] } }, // +Gai
      { label: "第3戦", enc: { bg: "zone3", quizLv: 500, enemies: [af("wolf", 1.5), af("ghost", 1.5), af("snake", 1.5)] } }, // +Rina
      { label: "第4戦", enc: { bg: "zone4", quizLv: 550, enemies: [af("mush", 1.9), af("owl", 1.9), af("ghost", 1.9), af("wolf", 1.9)] } },
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

  async function runArena() {
    $("ptitle-screen").style.display = "none";
    arenaStartParty(); // Yu solo; companions join as the gauntlet goes
    var rounds = arenaRounds();
    for (var i = 0; i < rounds.length; i++) {
      var r = rounds[i];
      // 10 shown battles; the 11th (真ラスボス) is a hidden surprise — no counter, no start card
      if (i < 10) await gsay("【ことばの闘技場】\n" + r.label + "（" + (i + 1) + "／10）\nＡボタンで 開始！");
      var res = await window.PBATTLE.start(r.enc);
      saveStudy();
      if (res.result !== "win") {
        await gsay("闘技場に 敗れた…。\nＬｖ" + window.PBATTLE.getParty()[0].lv + "／" + (i + 1) + "戦目でリタイア。\n（タイトルで たんごちょうを 見られます）");
        break;
      }
      if (i < rounds.length - 1) {
        window.PBATTLE.fullHeal();
        var ups = window.PBATTLE.levelEveryone(i >= 3 ? 3 : 2); // faster leveling from the mid-boss on (Yu reaches Lv20=パーティヒール by the ガグ戦)
        var gift = GIFTS[i] || "herb";
        var who = window.PBATTLE.giveItemToParty(gift);
        var giftName = gift === "herb" ? "ハーブティー" : gift === "elixir" ? "エナジーコーヒー" : gift === "espresso" ? "エスプレッソ" : "帰還の羽根ペン";
        var head = (i === 9) ? "ミュートスを倒した…と思ったその時！" : "勝利！ パーティは 全回復した。";
        var msg = head + "\n" + (who ? who + "が『" + giftName + "』を拾った！" : "（道具袋は満杯だった）");
        if (ups.length) msg += "\nみんなの レベルが上がった！（Ｌｖ" + window.PBATTLE.getParty()[0].lv + "）";
        await gsay(msg);
        var join = JOIN_AFTER[i];
        if (join) {
          var m = window.PBATTLE.addMember(join.id, window.PBATTLE.getParty()[0].lv);
          if (m) { m.bag = ["herb", "elixir"]; for (var s = 0; s < join.scene.length; s++) await gsay(join.scene[s]); }
        }
      } else {
        if (window.BGM) BGM.playAny(["ending", "title"]); // victory epilogue music
        await gsay("真・沈黙王ミュートスを 打ち倒した！！\n\n〜 ことばの闘技場 制覇 〜\nおめでとう！\n（タイトルで たんごちょうを 見られます）");
      }
    }
    if (window.BGM) BGM.stop();
    $("pbattle-screen").style.display = "none"; // clear the battle layer so the title/zukan show cleanly
    $("ptitle-screen").style.display = "flex";
    if (window.BGM) BGM.playAny(["title"]);
  }

  function refreshBgmBtn() {
    $("pbtn-bgm").textContent = "ＢＧＭ：" + (window.BGM && BGM.isEnabled() ? "ＯＮ" : "ＯＦＦ");
  }

  $("pbtn-arena").addEventListener("click", function () { $("pbtn-arena").blur(); runArena(); });
  $("pbtn-zukan").addEventListener("click", function () { $("pbtn-zukan").blur(); if (window.PFIELD) window.PFIELD.openZukan(); });
  // story mode is under construction: first tap warns, second tap (within 4s) opens the preview
  var fieldArmed = false;
  $("pbtn-field").addEventListener("click", function () {
    $("pbtn-field").blur();
    if (!fieldArmed) {
      fieldArmed = true;
      $("pbtn-field").textContent = "作成中です　もう一度押すと試遊";
      setTimeout(function () {
        fieldArmed = false;
        $("pbtn-field").textContent = "ストーリーモード（作成中）";
      }, 4000);
      return;
    }
    fieldArmed = false;
    $("pbtn-field").textContent = "ストーリーモード（作成中）";
    window.PFIELD.start(false); // continues the save if one exists
  });
  $("pbtn-bgm").addEventListener("click", function () {
    if (window.BGM) BGM.setEnabled(!BGM.isEnabled());
    refreshBgmBtn();
  });

  // ornate UI frame auto-detection (shared with game 1)
  (function () {
    var src = (window.UI_ART && window.UI_ART.frame) || "../assets/ui/frame.png";
    var img = new Image();
    img.onload = function () {
      document.documentElement.style.setProperty("--frame-src", "url('" + src + "')");
      document.documentElement.classList.add("ui-frame");
    };
    img.src = src;
  })();

  refreshBgmBtn();
  if (window.BGM) BGM.playAny(["title"]);
})();
