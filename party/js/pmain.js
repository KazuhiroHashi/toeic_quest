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

  var ZAKO_PACKS = [
    { bg: "zone2", enemies: ["goblin", "bee"] },
    { bg: "zone3", enemies: ["wolf", "ghost", "snake"] },
    { bg: "zone4", enemies: ["lizard", "clock"] }
  ];

  function bossHowl() {
    return {
      bg: "tower1",
      intro: [
        "四天王のひとり ハウルが\n道をふさいでいる！",
        "『聞く力は わたしが喰らった。\n　お前たちの叫びも\n　もう 誰にも届かない！』"
      ],
      enemies: [{
        base: "gen_r", name: "四天王ハウル", lv: 600,
        hp: 760, atk: 24, def: 20, agi: 20, mag: 28, exp: 600,
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

  async function run(enc, lv) {
    $("ptitle-screen").style.display = "none";
    window.PBATTLE.demoParty(lv || 6); // demos use a full 4-member party
    await window.PBATTLE.start(enc);
    saveStudy();
    $("ptitle-screen").style.display = "flex";
    if (window.BGM) BGM.playAny(["title"]);
  }

  function refreshBgmBtn() {
    $("pbtn-bgm").textContent = "ＢＧＭ：" + (window.BGM && BGM.isEnabled() ? "ＯＮ" : "ＯＦＦ");
  }

  $("pbtn-field").addEventListener("click", function () {
    $("pbtn-field").blur();
    window.PFIELD.start(false); // continues the save if one exists
  });
  $("pbtn-zako").addEventListener("click", function () {
    var pack = ZAKO_PACKS[Math.floor(Math.random() * ZAKO_PACKS.length)];
    run({ bg: pack.bg, enemies: pack.enemies.map(function (id) { return scaledFoe(id); }) }, 5);
  });
  $("pbtn-boss").addEventListener("click", function () { run(bossHowl(), 8); });
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
