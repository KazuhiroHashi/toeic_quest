// WORD WIZ - game data: cards, skills, enemies, quests
(function () {
  "use strict";

  // ---- elements ----
  // triangle: fire > thunder > water > fire ; light <-> dark
  window.ELEMS = {
    fire:    { name: "火", icon: "🔥", c1: "#ff7847", c2: "#ffb347", deep: "#d63f2e" },
    water:   { name: "水", icon: "💧", c1: "#4aa8ff", c2: "#7fe3ff", deep: "#2f6fd6" },
    thunder: { name: "雷", icon: "⚡", c1: "#ffd54a", c2: "#fff3a0", deep: "#e6a817" },
    light:   { name: "光", icon: "✨", c1: "#ffe9a8", c2: "#ffffff", deep: "#e0a92f" },
    dark:    { name: "闇", icon: "🌙", c1: "#9b6cff", c2: "#c9a8ff", deep: "#5a3ea8" }
  };
  window.elemMult = function (atkE, defE) {
    var strong = { fire: "thunder", thunder: "water", water: "fire", light: "dark", dark: "light" };
    if (strong[atkE] === defE) return 1.5;
    if (strong[defE] === atkE) return 0.5;
    return 1;
  };

  // ---- answer skills (AS: passive on correct answer) ----
  window.AS_DEFS = {
    speed: { name: "クイックソウル",   desc: "2秒以内の正解で 自身の攻撃×1.4" },
    chain: { name: "チェインブースト", desc: "チェイン5以上で 自身の攻撃×1.5" },
    slayer:{ name: "ウィークハンター", desc: "弱点属性への攻撃 さらに×1.3" },
    heal:  { name: "いやしのうた",     desc: "正解するたび チームHPを2%回復" },
    crit:  { name: "ラッキーアイ",     desc: "自身のクリティカル率+12%" },
    guard: { name: "まもりのちから",   desc: "うけるダメージ-15%(重複可)" }
  };

  // ---- special skills (SS: charge by correct answers, tap to fire) ----
  window.SS_DEFS = {
    nuke:   { name: "エレメントバースト", need: 5, desc: "敵単体に 攻撃×3.5の属性ダメージ" },
    aoe:    { name: "エレメントストーム", need: 6, desc: "敵全体に 攻撃×2.2の属性ダメージ" },
    heal30: { name: "セイントヒール",     need: 5, desc: "チームHPを30%回復" },
    time3:  { name: "じかんのしずく",     need: 4, desc: "次の3問 制限時間+3秒" },
    lvdown: { name: "やさしいひかり",     need: 4, desc: "次の3問 出題レベルを1段階ダウン" },
    chain5: { name: "ことばのれんさ",     need: 4, desc: "チェイン+5" },
    shield: { name: "ひかりのたて",       need: 4, desc: "次の敵の攻撃を80%カット" },
    buff:   { name: "ブレイブコール",     need: 6, desc: "次の正解時 全員の攻撃×1.8" }
  };

  // ---- cards (23 spirits) ----
  // species: blob drop fox cat rabbit bird dragon squirrel pup ram unicorn bat whale mouse
  var C = [
    // fire
    { id: "hinoko",   name: "ヒノコ",       sp: "fox",     elem: "fire",    r: 1, as: "speed",  ss: "nuke",   flavor: "しっぽの火は ぜったいに消えない。" },
    { id: "merabit",  name: "メラビット",   sp: "rabbit",  elem: "fire",    r: 2, as: "crit",   ss: "chain5", flavor: "跳ねるたびに 火の粉がまう。" },
    { id: "frenya",   name: "フレニャ",     sp: "cat",     elem: "fire",    r: 3, as: "speed",  ss: "buff",   flavor: "早口ことばが とくいな火猫。" },
    { id: "volca",    name: "ヴォルカ",     sp: "dragon",  elem: "fire",    r: 4, as: "slayer", ss: "aoe",    flavor: "ちいさな体に 火山のちから。" },
    { id: "phoenixia",name: "フェニクシア", sp: "bird",    elem: "fire",    r: 5, as: "chain",  ss: "nuke",   flavor: "何度でも 燃えあがる不死鳥。" },
    // water
    { id: "shizuku",  name: "シズク",       sp: "drop",    elem: "water",   r: 1, as: "heal",   ss: "heal30", flavor: "泣き虫だけど がんばりや。" },
    { id: "pukurabi", name: "プクラビ",     sp: "rabbit",  elem: "water",   r: 2, as: "guard",  ss: "shield", flavor: "あわのシャボンで みんなを守る。" },
    { id: "aquanya",  name: "アクアニャ",   sp: "cat",     elem: "water",   r: 3, as: "heal",   ss: "heal30", flavor: "お水は苦手。でも泳げる。" },
    { id: "rivina",   name: "リヴィナ",     sp: "dragon",  elem: "water",   r: 4, as: "chain",  ss: "time3",  flavor: "ふかい海のように おだやか。" },
    { id: "hoeria",   name: "ホエリア",     sp: "whale",   elem: "water",   r: 5, as: "guard",  ss: "aoe",    flavor: "空をおよぐ 星のクジラ。" },
    // thunder
    { id: "biriris",  name: "ビリリス",     sp: "squirrel",elem: "thunder", r: 1, as: "crit",   ss: "chain5", flavor: "しっぽに静電気を ためている。" },
    { id: "goropika", name: "ゴロピカ",     sp: "pup",     elem: "thunder", r: 2, as: "speed",  ss: "nuke",   flavor: "かみなり雲の上で 昼寝する子犬。" },
    { id: "raivi",    name: "ライヴィ",     sp: "rabbit",  elem: "thunder", r: 3, as: "crit",   ss: "buff",   flavor: "音より速く 跳ねたい。" },
    { id: "volt",     name: "ヴォルト",     sp: "dragon",  elem: "thunder", r: 4, as: "speed",  ss: "nuke",   flavor: "プラズマの翼で 空を裂く。" },
    { id: "raizel",   name: "ライゼル",     sp: "bird",    elem: "thunder", r: 5, as: "slayer", ss: "aoe",    flavor: "雷鳴は この子のうた声。" },
    // light
    { id: "lumil",    name: "ルミル",       sp: "mouse",   elem: "light",   r: 2, as: "heal",   ss: "lvdown", flavor: "まよったとき 道を照らしてくれる。" },
    { id: "paffy",    name: "パフィ",       sp: "ram",     elem: "light",   r: 3, as: "guard",  ss: "heal30", flavor: "ひかる羊毛は 雲より軽い。" },
    { id: "unisiel",  name: "ユニシエル",   sp: "unicorn", elem: "light",   r: 4, as: "chain",  ss: "time3",  flavor: "つのに ふれると 時がやさしくなる。" },
    { id: "seraphina",name: "セラフィナ",   sp: "bird",    elem: "light",   r: 5, as: "heal",   ss: "buff",   flavor: "祝福の歌で 仲間をふるい立たせる。" },
    // dark
    { id: "nokuto",   name: "ノクト",       sp: "bat",     elem: "dark",    r: 2, as: "crit",   ss: "nuke",   flavor: "夜のとばりで かくれんぼ。" },
    { id: "chanoir",  name: "シャノワ",     sp: "cat",     elem: "dark",    r: 3, as: "speed",  ss: "chain5", flavor: "月夜にことばを あつめる黒猫。" },
    { id: "bakuu",    name: "バクゥ",       sp: "pup",     elem: "dark",    r: 4, as: "slayer", ss: "shield", flavor: "わるい夢だけ たべてくれる。" },
    { id: "kuronoa",  name: "クロノワ",     sp: "cat",     elem: "dark",    r: 5, as: "chain",  ss: "buff",   flavor: "魔法図書館の主。すべての言葉を知る黒猫。", hat: true }
  ];
  var HP_BASE  = [0, 90, 120, 160, 210, 270];
  var ATK_BASE = [0, 52, 72, 98, 128, 162];
  C.forEach(function (c) { c.hp = HP_BASE[c.r]; c.atk = ATK_BASE[c.r]; });
  window.CARDS = C;
  window.CARD_BY_ID = {};
  C.forEach(function (c) { window.CARD_BY_ID[c.id] = c; });

  // growth
  window.cardMaxLv = function (card, st) { return 20 + card.r * 10 + (st && st.evo ? 10 : 0); };
  window.cardStat = function (card, st) {
    var lv = st ? st.lv : 1, evo = st && st.evo ? 1.3 : 1;
    var g = 1 + 0.04 * (lv - 1);
    return { hp: Math.round(card.hp * g * evo), atk: Math.round(card.atk * g * evo) };
  };
  window.lvUpCost = function (lv) { return Math.round(30 + lv * lv * 1.6); }; // mana per level

  // ---- enemies (void creatures) ----
  var E = [
    { id: "v_blob_f", name: "ヒダネヴォイド",   sp: "blob",   elem: "fire",    hp: 90,  atk: 26, count: 2 },
    { id: "v_blob_w", name: "ミズカゲ",         sp: "blob",   elem: "water",   hp: 100, atk: 24, count: 2 },
    { id: "v_blob_t", name: "ライカゲ",         sp: "blob",   elem: "thunder", hp: 85,  atk: 28, count: 2 },
    { id: "v_blob_l", name: "シロカゲ",         sp: "blob",   elem: "light",   hp: 110, atk: 26, count: 3 },
    { id: "v_blob_d", name: "ヨルカゲ",         sp: "blob",   elem: "dark",    hp: 110, atk: 30, count: 3 },
    { id: "v_bat",    name: "ヴォイドバット",   sp: "bat",    elem: "dark",    hp: 130, atk: 34, count: 2 },
    { id: "v_pup",    name: "ヴォイドハウンド", sp: "pup",    elem: "fire",    hp: 150, atk: 38, count: 3 },
    { id: "v_cat",    name: "ヴォイドキャット", sp: "cat",    elem: "dark",    hp: 140, atk: 36, count: 2 },
    { id: "v_serp",   name: "ヴォイドサーペント", sp: "dragon", elem: "water", hp: 180, atk: 42, count: 3 },
    { id: "v_bird",   name: "ヴォイドバード",   sp: "bird",   elem: "thunder", hp: 160, atk: 40, count: 2 },
    { id: "b_dragon", name: "灰燼竜シンダー",   sp: "dragon", elem: "fire",    hp: 420, atk: 60, count: 3, boss: true },
    { id: "b_whale",  name: "深淵鯨アビソス",   sp: "whale",  elem: "water",   hp: 500, atk: 55, count: 3, boss: true },
    { id: "b_bird",   name: "雷帝鳥ヴォルトス", sp: "bird",   elem: "thunder", hp: 460, atk: 65, count: 2, boss: true },
    { id: "b_uni",    name: "偽光獣ルクス",     sp: "unicorn",elem: "light",   hp: 520, atk: 62, count: 3, boss: true },
    { id: "b_bat",    name: "宵闇卿ノワール",   sp: "bat",    elem: "dark",    hp: 560, atk: 68, count: 2, boss: true },
    { id: "b_queen",  name: "沈黙の女王ミュートス", sp: "cat", elem: "dark",   hp: 780, atk: 75, count: 2, boss: true, last: true }
  ];
  window.WENEMIES = E;
  window.WENEMY_BY_ID = {};
  E.forEach(function (e) { window.WENEMY_BY_ID[e.id] = e; });

  // ---- quests: 6 chapters (TOEIC 400..900) x 4 quests ----
  var CH_NAMES = ["はじまりの書架", "商いの回廊", "契約の大広間", "文書の迷宮", "高語彙の尖塔", "沈黙の玉座"];
  var CH_BOSS = ["b_dragon", "b_whale", "b_bird", "b_uni", "b_bat", "b_queen"];
  var POOLS = [
    ["v_blob_f", "v_blob_w", "v_blob_t"],
    ["v_blob_w", "v_blob_t", "v_bat"],
    ["v_blob_l", "v_bat", "v_pup"],
    ["v_pup", "v_cat", "v_bird"],
    ["v_cat", "v_serp", "v_bird"],
    ["v_serp", "v_bird", "v_blob_d", "v_cat"]
  ];
  var QUESTS = [];
  for (var ch = 0; ch < 6; ch++) {
    var level = 400 + ch * 100;
    for (var q = 0; q < 4; q++) {
      var isBoss = q === 3;
      var scale = 1 + ch * 1.15 + q * 0.22;
      var waves = [];
      var nWaves = isBoss ? 3 : 2 + (q > 0 ? 1 : 0);
      for (var w = 0; w < nWaves; w++) {
        var last = w === nWaves - 1;
        var wave = [];
        if (isBoss && last) {
          wave.push({ id: CH_BOSS[ch], scale: scale });
          if (ch >= 2) wave.push({ id: POOLS[ch][0], scale: scale * 0.7 });
        } else {
          var n = 1 + ((w + q + ch) % 2) + (ch >= 3 && last ? 1 : 0);
          for (var i = 0; i < Math.min(n, 3); i++) {
            wave.push({ id: POOLS[ch][(w + i + q) % POOLS[ch].length], scale: scale * (last ? 1.15 : 1) });
          }
        }
        waves.push(wave);
      }
      QUESTS.push({
        id: "q" + ch + "_" + q,
        ch: ch, chName: CH_NAMES[ch], no: q + 1,
        name: isBoss ? "BOSS: " + window.WENEMY_BY_ID[CH_BOSS[ch]].name : CH_NAMES[ch] + " " + (q + 1),
        level: level, waves: waves,
        mana: Math.round(80 * scale), exp: Math.round(26 * scale),
        gemsFirst: isBoss ? 80 : 40,
        stoneFirst: isBoss ? 1 : 0
      });
    }
  }
  window.QUESTS = QUESTS;
  window.QUEST_BY_ID = {};
  QUESTS.forEach(function (qq) { window.QUEST_BY_ID[qq.id] = qq; });

  // ---- gacha ----
  window.GACHA_COST = 100;
  window.gachaRoll = function () {
    var r = Math.random() * 100;
    var rarity = r < 3 ? 5 : r < 15 ? 4 : r < 45 ? 3 : 2;
    var pool = window.CARDS.filter(function (c) { return c.r === rarity; });
    return pool[(Math.random() * pool.length) | 0].id;
  };
})();
