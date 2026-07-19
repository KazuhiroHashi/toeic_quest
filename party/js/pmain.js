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

  function scaledFoe(id, over) {
    var d = window.ENEMY_BY_ID[id];
    // prototype party is mid-game strength: scale zako up to match
    return Object.assign({
      base: d.id, name: d.name, lv: d.lv,
      hp: Math.round(d.hp * 3.5), atk: Math.round(d.atk * 2.2), def: Math.round(d.def * 1.5), exp: d.exp,
      agi: Math.round(d.lv / 25),
      hasty: d.traits && d.traits.indexOf("hasty") >= 0
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
        "四天王のひとり ハウルが\nみちを ふさいでいる！",
        "『きくちからは わたしが くった。\n　おまえたちの さけびも\n　もう だれにも とどかない！』"
      ],
      enemies: [{
        base: "gen_r", name: "四天王ハウル", lv: 600,
        hp: 1850, atk: 42, def: 30, agi: 26, exp: 1200,
        boss: true,
        phases: [
          { at: 1.0, acts: 1, aoe: 0, charge: 0 },
          { at: 0.66, acts: 2, aoe: 0.3, charge: 0,
            msg: ["ハウルの ようすが かわった！\n『ほう… やるではないか！』", "ハウルの こうどうが\n２かいに ふえた！"] },
          { at: 0.33, acts: 2, aoe: 0.3, charge: 0.4,
            msg: ["ハウルが ほんきを だした！！\n『この さけびで おわらせる！』", "（ちからを ためたら ぼうぎょだ！）"] }
        ]
      }]
    };
  }

  async function run(enc) {
    $("ptitle-screen").style.display = "none";
    window.PBATTLE.resetParty();
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
    run({ bg: pack.bg, enemies: pack.enemies.map(function (id) { return scaledFoe(id); }) });
  });
  $("pbtn-boss").addEventListener("click", function () { run(bossHowl()); });
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
