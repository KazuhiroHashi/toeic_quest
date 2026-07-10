// TOEIC QUEST - enemy definitions (32 species)
// lv: TOEIC vocab level asked when fighting this enemy
// traits: double=attacks twice sometimes, heal=heals self, fire=strong breath,
//         hasty=quiz timer shortened, flee=often runs away, boss=boss flags
window.ENEMIES = [
  // ---- zone1 : TOEIC400 ----
  {id:"slime",    name:"ワードスライム",      icon:"🫠", lv:400, hp:8,   atk:5,  def:2,  exp:2,   gold:3,   traits:[]},
  {id:"bat",      name:"アルファベット・バット", icon:"🦇", lv:400, hp:10,  atk:6,  def:2,  exp:3,   gold:4,   traits:[]},
  {id:"rat",      name:"ペンシルラット",      icon:"🐀", lv:400, hp:13,  atk:7,  def:3,  exp:4,   gold:6,   traits:[]},
  {id:"mush",     name:"イレイザーだけ",      icon:"🍄", lv:400, hp:15,  atk:8,  def:6,  exp:6,   gold:7,   traits:[]},
  {id:"goblin",   name:"ノートゴブリン",      icon:"👺", lv:400, hp:18,  atk:10, def:4,  exp:8,   gold:10,  traits:[]},
  // ---- zone2 : TOEIC500 ----
  {id:"bee",      name:"スペルビー",          icon:"🐝", lv:500, hp:20,  atk:12, def:5,  exp:10,  gold:12,  traits:["double"]},
  {id:"worm",     name:"ブックワーム",        icon:"🐛", lv:500, hp:26,  atk:13, def:8,  exp:13,  gold:14,  traits:[]},
  {id:"snake",    name:"グラマースネーク",    icon:"🐍", lv:500, hp:28,  atk:15, def:9,  exp:16,  gold:17,  traits:[]},
  {id:"ghost",    name:"カンニングゴースト",  icon:"👻", lv:500, hp:30,  atk:17, def:11, exp:20,  gold:20,  traits:[]},
  {id:"wolf",     name:"リスニングウルフ",    icon:"🐺", lv:500, hp:36,  atk:19, def:11, exp:24,  gold:24,  traits:["double"]},
  // ---- zone3 : TOEIC600 ----
  {id:"owl",      name:"イディオムアウル",    icon:"🦉", lv:600, hp:40,  atk:21, def:13, exp:28,  gold:26,  traits:[]},
  {id:"twins",    name:"シノニムツインズ",    icon:"👯", lv:600, hp:44,  atk:23, def:14, exp:33,  gold:30,  traits:["double"]},
  {id:"lizard",   name:"リーディングリザード", icon:"🦎", lv:600, hp:50,  atk:25, def:16, exp:38,  gold:34,  traits:[]},
  {id:"clock",    name:"タイムイーター",      icon:"⏰", lv:600, hp:46,  atk:27, def:15, exp:44,  gold:38,  traits:["hasty"]},
  {id:"knight5",  name:"パートファイブナイト", icon:"♞",  lv:600, hp:58,  atk:29, def:22, exp:52,  gold:46,  traits:[]},
  // ---- zone4 : TOEIC700 ----
  {id:"golem",    name:"グラマーゴーレム",    icon:"🗿", lv:700, hp:70,  atk:33, def:28, exp:62,  gold:52,  traits:[]},
  {id:"demon",    name:"デッドラインデーモン", icon:"😈", lv:700, hp:66,  atk:36, def:24, exp:68,  gold:58,  traits:["hasty"]},
  {id:"mummy",    name:"マークシートマミー",  icon:"🧟", lv:700, hp:74,  atk:37, def:27, exp:74,  gold:62,  traits:[]},
  {id:"ogre",     name:"オーバーワークオーガ", icon:"👹", lv:700, hp:84,  atk:41, def:27, exp:84,  gold:70,  traits:["double"]},
  {id:"snight",   name:"サイレントナイト",    icon:"🛡️", lv:700, hp:88,  atk:43, def:34, exp:95,  gold:82,  traits:[]},
  // ---- zone5 : TOEIC800 ----
  {id:"harpy",    name:"ハイスコアハーピー",  icon:"🦅", lv:800, hp:90,  atk:50, def:34, exp:110, gold:92,  traits:["double"]},
  {id:"reaper",   name:"スコアリーパー",      icon:"💀", lv:800, hp:96,  atk:53, def:37, exp:122, gold:100, traits:[]},
  {id:"kraken",   name:"リスニングクラーケン", icon:"🐙", lv:800, hp:110, atk:56, def:40, exp:140, gold:115, traits:[]},
  {id:"phoenix",  name:"パラフレーズフェニックス", icon:"🐦‍🔥", lv:800, hp:100, atk:54, def:38, exp:135, gold:108, traits:["heal"]},
  {id:"dragon",   name:"ダブルパッセージドラゴン", icon:"🐉", lv:800, hp:130, atk:62, def:44, exp:170, gold:140, traits:["fire"]},
  // ---- zone6 : TOEIC900 (魔王城周辺) ----
  {id:"wizard",   name:"パーフェクトウィザード", icon:"🧙", lv:900, hp:105, atk:60, def:42, exp:160, gold:130, traits:["fire"]},
  {id:"shadow",   name:"ネイティブシャドー",  icon:"🥷", lv:900, hp:120, atk:66, def:47, exp:185, gold:150, traits:["double"]},
  {id:"mimic",    name:"リワードミミック",    icon:"🎁", lv:900, hp:100, atk:64, def:45, exp:200, gold:280, traits:["hasty"]},
  {id:"metal",    name:"メタルワード",        icon:"✨", lv:900, hp:12,  atk:35, def:120, exp:500, gold:8,  traits:["flee"]},
  // ---- bosses ----
  {id:"gen_r",    name:"リーディング将軍レクトス", icon:"🦁", lv:800, hp:240, atk:58, def:42, exp:450, gold:350, traits:["double","boss"]},
  {id:"gen_l",    name:"リスニング将軍ヒアロス",  icon:"🐲", lv:800, hp:280, atk:64, def:46, exp:550, gold:420, traits:["fire","boss"]},
  {id:"maou",     name:"魔王ヴォキャブロス",  icon:"👿", lv:900, hp:480, atk:74, def:52, exp:0,   gold:0,  traits:["double","fire","heal","boss","last"]}
];

window.ENEMY_BY_ID = {};
window.ENEMIES.forEach(function(e){ window.ENEMY_BY_ID[e.id] = e; });

// encounter tables per zone (weighted)
window.ZONE_TABLE = {
  1: [["slime",30],["bat",28],["rat",22],["mush",12],["goblin",8]],
  2: [["goblin",15],["bee",25],["worm",22],["snake",18],["ghost",12],["wolf",8]],
  3: [["wolf",12],["owl",24],["twins",20],["lizard",18],["clock",14],["knight5",12]],
  4: [["knight5",10],["golem",22],["demon",20],["mummy",18],["ogre",16],["snight",10],["metal",4]],
  5: [["snight",10],["harpy",22],["reaper",20],["kraken",16],["phoenix",16],["dragon",12],["metal",4]],
  6: [["wizard",26],["shadow",26],["mimic",18],["dragon",14],["phoenix",10],["metal",6]]
};

// ---- player growth ----
window.LEVEL_TABLE = (function(){
  var t = [];
  for (var lv = 1; lv <= 30; lv++) {
    t.push({
      lv: lv,
      exp: lv === 1 ? 0 : Math.round(7 * Math.pow(lv - 1, 2.35)),
      maxhp: 16 + Math.round((lv - 1) * 7.5),
      maxmp: lv < 3 ? 0 : Math.round((lv - 2) * 4.5),
      str: 5 + Math.round((lv - 1) * 2.6),
      vit: 4 + Math.round((lv - 1) * 2.0)
    });
  }
  return t;
})();

// spells: quizLv = TOEIC level question required to cast
window.SPELLS = [
  {id:"heal1",  name:"ヒール５００",   learnLv:4,  mp:4,  quizLv:500, type:"heal",   power:35,  desc:"HPを35回復"},
  {id:"fire1",  name:"ファイア６００", learnLv:7,  mp:5,  quizLv:600, type:"attack", power:28,  desc:"炎で28前後のダメージ"},
  {id:"return", name:"リターン",       learnLv:10, mp:8,  quizLv:600, type:"field",  power:0,   desc:"城へ瞬間移動"},
  {id:"heal2",  name:"ヒールラ７００", learnLv:13, mp:8,  quizLv:700, type:"heal",   power:90,  desc:"HPを90回復"},
  {id:"thun1",  name:"サンダー８００", learnLv:16, mp:10, quizLv:800, type:"attack", power:65,  desc:"雷で65前後のダメージ"},
  {id:"meteo",  name:"メテオ９００",   learnLv:20, mp:15, quizLv:900, type:"attack", power:120, desc:"隕石で120前後のダメージ"}
];

window.WEAPONS = [
  {id:"w0", name:"たけざお",         atk:1,  price:0},
  {id:"w1", name:"こんぼう",         atk:5,  price:60},
  {id:"w2", name:"どうのつるぎ",     atk:12, price:220},
  {id:"w3", name:"はがねのつるぎ",   atk:22, price:700},
  {id:"w4", name:"ほのおのつるぎ",   atk:34, price:2200},
  {id:"w5", name:"レジェンドソード", atk:48, price:0}
];
window.ARMORS = [
  {id:"a0", name:"ぬののふく",       def:1,  price:0},
  {id:"a1", name:"かわのよろい",     def:6,  price:150},
  {id:"a2", name:"くさりかたびら",   def:14, price:480},
  {id:"a3", name:"はがねのよろい",   def:24, price:1300},
  {id:"a4", name:"まほうのよろい",   def:36, price:3000},
  {id:"a5", name:"レジェンドアーマー", def:50, price:0}
];
window.ITEM_DEFS = {
  herb:  {name:"やくそう",     price:12,  desc:"HPを30回復"},
  wing:  {name:"リターンの羽", price:40,  desc:"城へ瞬間移動"},
  key:   {name:"まりょくのカギ", price:0,  desc:"魔王城の扉を開く"},
  elixir:{name:"けんじゃの雫", price:200, desc:"MPを40回復"}
};
