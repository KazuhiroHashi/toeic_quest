// WORD QUEST II - prototype shell (demo menu)
(function () {
  "use strict";
  window.ASSET_BASE = "../"; // bgm.js loads from ../assets/bgm/

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
  function scaledFoe(id, over) {
    var d = window.ENEMY_BY_ID[id];
    return Object.assign({
      base: d.id, name: d.name, lv: d.lv,
      hp: Math.round(d.hp * 1.5), atk: Math.round(d.atk * 1.15), def: Math.round(d.def * 1.05),
      mag: Math.round(d.atk * 1.1), exp: Math.round(d.exp * 1.4),
      agi: Math.round(d.lv / 25),
      hasty: d.traits && d.traits.indexOf("hasty") >= 0,
      skills: FOE_SKILLS[id], skillRate: 0.32
    }, over || {});
  }

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
        skills: [{ name: "轟音の叫び", power: 0.85, all: true }], skillRate: 0.3,
        phases: [
          { at: 1.0, acts: 1, aoe: 0, charge: 0 },
          { at: 0.66, acts: 2, aoe: 0.25, charge: 0,
            msg: ["ハウルの様子が変わった！\n『ほう… やるではないか！』", "ハウルの行動が 2回になった！"] },
          { at: 0.33, acts: 2, aoe: 0.3, charge: 0.4,
            msg: ["ハウルが本気を出した！！\n『この叫びで 終わらせる！』", "（力をためたら 防御だ！）"] }
        ]
      }]
    };
  }

  function bossMaou() {
    return {
      bg: "maou",
      intro: [
        "ついに 現れた 沈黙王ミュートス。",
        "『ことばは 人を傷つける。\n　ならば いっそ 全て奪おう。\n　この静寂こそ 救いなのだ』",
        "（長い戦いになる。\n　アイテムを 出し惜しむな！）"
      ],
      enemies: [{
        base: "maou", name: "沈黙王ミュートス", lv: 900,
        hp: 13000, atk: 55, def: 40, agi: 22, mag: 62, exp: 8000, boss: true,
        skills: [{ name: "静寂の波動", power: 0.9, all: true }, { name: "言葉狩り", power: 1.35, all: false }], skillRate: 0.42,
        phases: [
          { at: 1.0, acts: 1, aoe: 0.15, charge: 0 },
          { at: 0.75, acts: 2, aoe: 0.3, charge: 0, msg: ["ミュートスの闇が 濃くなる…！", "行動が 2回になった！"] },
          { at: 0.5, acts: 2, aoe: 0.35, charge: 0.35, msg: ["『まだ 声を捨てぬのか』", "ミュートスが 力をためる—防御を！"] },
          { at: 0.25, acts: 3, aoe: 0.4, charge: 0.4, msg: ["ミュートスが 最後の力を放つ！！", "行動が 3回に！総力戦だ！"] }
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
  var GIFTS = ["herb", "elixir", "herb", "wing", "elixir", "herb", "elixir", "herb", "elixir"];
  function arenaRounds() {
    return [
      { label: "第1戦", enc: { bg: "zone1", enemies: ["slime", "bat"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第2戦", enc: { bg: "zone2", enemies: ["rat", "goblin"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第3戦", enc: { bg: "zone2", enemies: ["bee", "mush", "wolf"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第4戦", enc: { bg: "zone3", enemies: ["ghost", "snake", "owl"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第5戦・中ボス", enc: { bg: "cave", enemies: [miniBoss("dragon", "洞窟の古竜", {})] } },
      { label: "第6戦", enc: { bg: "zone3", enemies: ["wolf", "ghost", "lizard"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第7戦", enc: { bg: "zone4", enemies: ["lizard", "clock", "snake"].map(function (i) { return scaledFoe(i); }) } },
      { label: "第8戦・四天王", enc: bossHowl() },
      { label: "第9戦・中ボス", enc: { bg: "tower2", enemies: [miniBoss("gen_l", "四天王ガグ", { atk: 30 })] } },
      { label: "最終戦・ラスボス", enc: bossMaou() }
    ];
  }

  async function runArena() {
    $("ptitle-screen").style.display = "none";
    window.PBATTLE.demoParty(6); // arena party starts at Lv6, grows each round
    var rounds = arenaRounds();
    for (var i = 0; i < rounds.length; i++) {
      var r = rounds[i];
      await gsay("【ことばの闘技場】\n" + r.label + "（" + (i + 1) + "／" + rounds.length + "）\nＡボタンで 開始！");
      var res = await window.PBATTLE.start(r.enc);
      saveStudy();
      if (res.result !== "win") {
        await gsay("闘技場に 敗れた…。\nＬｖ" + window.PBATTLE.getParty()[0].lv + "／" + (i + 1) + "戦目でリタイア。");
        break;
      }
      if (i < rounds.length - 1) {
        window.PBATTLE.fullHeal();
        var ups = window.PBATTLE.levelEveryone(i === 6 || i === 8 ? 3 : 2); // extra before bosses
        var gift = GIFTS[i] || "herb";
        var who = window.PBATTLE.giveItemToParty(gift);
        var giftName = gift === "herb" ? "ハーブティー" : gift === "elixir" ? "エナジーコーヒー" : "帰還の羽根ペン";
        var msg = "勝利！ パーティは 全回復した。\n" + (who ? who + "が『" + giftName + "』を拾った！" : "（道具袋は満杯だった）");
        if (ups.length) msg += "\nみんなの レベルが上がった！（Ｌｖ" + window.PBATTLE.getParty()[0].lv + "）";
        await gsay(msg);
      } else {
        await gsay("沈黙王ミュートスを 打ち倒した！！\n\n〜 ことばの闘技場 制覇 〜\nおめでとう！");
      }
    }
    if (window.BGM) BGM.stop();
    $("ptitle-screen").style.display = "flex";
    if (window.BGM) BGM.playAny(["title"]);
  }

  function refreshBgmBtn() {
    $("pbtn-bgm").textContent = "ＢＧＭ：" + (window.BGM && BGM.isEnabled() ? "ＯＮ" : "ＯＦＦ");
  }

  $("pbtn-arena").addEventListener("click", function () { $("pbtn-arena").blur(); runArena(); });
  $("pbtn-field").addEventListener("click", function () {
    $("pbtn-field").blur();
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
