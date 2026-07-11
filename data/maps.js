// TOEIC QUEST - map data
// tile legend:
//  . grass  t forest  m mountain  w water  s sand  b bridge
//  = wall   , floor   - dungeon floor  ^ exit/stairs  c chest(base floor)
//  C castle T town  D cave  U tower  X demon castle gate (overworld entrances)

(function () {
  "use strict";

  // ---------- overworld (code-built, 40 x 36) ----------
  var OW_W = 40, OW_H = 36;

  function buildOverworld() {
    var g = [];
    for (var y = 0; y < OW_H; y++) {
      g.push(new Array(OW_W).fill("w"));
    }
    function rect(x0, y0, x1, y1, ch) {
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) g[y][x] = ch;
    }
    function put(x, y, ch) { g[y][x] = ch; }

    // landmass
    rect(2, 2, 37, 33, ".");
    // rounded-ish coast corners
    rect(2, 2, 5, 3, "w"); rect(2, 2, 3, 5, "w");
    rect(34, 2, 37, 3, "w"); rect(36, 2, 37, 5, "w");
    rect(2, 30, 4, 33, "w"); rect(2, 32, 6, 33, "w");
    rect(35, 32, 37, 33, "w");

    // seeded decoration (deterministic)
    var seed = 20260710;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (var y = 2; y < 34; y++) {
      for (var x = 2; x < 38; x++) {
        if (g[y][x] !== ".") continue;
        var r = rnd();
        if (r < 0.16) g[y][x] = "t";
        else if (r < 0.19) g[y][x] = "s";
      }
    }

    // mountain ranges (impassable walls shaping the routes)
    rect(2, 14, 9, 15, "m");          // west ridge below castle area
    rect(22, 2, 23, 7, "m");          // north ridge
    rect(30, 12, 37, 13, "m");        // east ridge
    rect(16, 24, 17, 33, "m");        // south divider
    rect(24, 20, 25, 27, "m");        // south-east divider

    // rivers
    rect(18, 2, 18, 17, "w");         // vertical river NW/NE
    rect(18, 17, 37, 17, "w");        // horizontal river to east coast
    rect(2, 21, 13, 21, "w");         // west horizontal river
    rect(13, 21, 13, 33, "w");        // south vertical river

    // bridges
    put(18, 9, "b");
    put(28, 17, "b");
    put(10, 21, "b");
    put(13, 27, "b");

    // demon castle island (SE), ringed by mountains, one gate
    rect(29, 27, 37, 33, "m");
    rect(31, 29, 35, 32, "s");
    put(29, 30, "s");                  // gap in the ring (approach)
    put(30, 30, "s");
    put(33, 30, "X");                  // demon castle gate

    // clear paths around key points (keep them walkable grass)
    var keep = [[7,7],[11,9],[24,9],[33,22],[8,27],[20,31],[18,8],[18,10],[28,16],[28,18],[10,20],[10,22],[13,26],[13,28],[26,30],[27,30],[28,30]];
    keep.forEach(function (p) { if (g[p[1]][p[0]] !== "b") g[p[1]][p[0]] = "."; });

    // entrances
    put(7, 7, "C");    // レキシア城
    put(11, 9, "T");   // town1
    put(24, 9, "T");   // town2
    put(8, 27, "T");   // town3
    put(33, 22, "D");  // cave
    put(20, 31, "U");  // tower

    return g.map(function (row) { return row.join(""); });
  }

  // ---------- interiors (hand-authored) ----------
  var CASTLE_ROWS = [
    "====================",
    "=ccc,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,==,,,,,,,,,,==,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=========^=========="
  ];

  var TOWN_ROWS = [
    "====================",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,==,,,,,==,,,,==,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=========^=========="
  ];

  var CAVE_ROWS = [
    "====================",
    "=--------=---------=",
    "=-==-===-=-======--=",
    "=-=cc---=--------=-=",
    "=-=--====-======-=-=",
    "=-=--=---------=-=-=",
    "=-====-=======-=-=-=",
    "=------=-----=-=---=",
    "=-====-=-===-=-==--=",
    "=-=--=-=-=c=-=-----=",
    "=-=--=-=-=-=-=-==--=",
    "=-=--=-=-----------=",
    "=-=--=-==========--=",
    "=-=----------------=",
    "=^=================="
  ];

  var TOWER1_ROWS = [
    "====================",
    "=------------------=",
    "=-====-=======-===-=",
    "=-=--=-=-----=-=-=-=",
    "=-=--=-=-=-=-=-=-=-=",
    "=-=--=-=-=c=-=-=-=-=",
    "=-=--=-=-=^=-=-=-=-=",
    "=-=--=-=-====-=-=--=",
    "=-=-c=-=------=-==-=",
    "=-=--=-=-======-=--=",
    "=-=----------------=",
    "=========v=========="
  ];

  var TOWER2_ROWS = [
    "====================",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,c,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=========^=========="
  ];

  var MAOU_ROWS = [
    "====================",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,====,,,,,,====,,=",
    "=,,=cc=,,,,,,=cc=,,=",
    "=,,=,,=,,,,,,=,,=,,=",
    "=,,=,,=,,,,,,=,,=,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=,,,,,,,,,,,,,,,,,,=",
    "=========^=========="
  ];

  // ---------- events ----------
  // npc: {type:"npc", x,y, icon, text:[...] , shop:{kind,items}, inn:{price}}
  // chest:{type:"chest", x,y, id, loot:{gold|item|weapon|armor}}
  // boss: {type:"boss", x,y, icon, enemy, flag, pre:[...], drops:{...}, after:[...]}

  window.MAPS = {

    world: {
      id: "world", name: "レキシア大陸", kind: "world",
      rows: buildOverworld(),
      start: { x: 7, y: 8 },
      events: [
        { type: "enter", x: 7, y: 7, map: "castle", tx: 9, ty: 7 },
        { type: "enter", x: 11, y: 9, map: "town1", tx: 9, ty: 7 },
        { type: "enter", x: 24, y: 9, map: "town2", tx: 9, ty: 7 },
        { type: "enter", x: 8, y: 27, map: "town3", tx: 9, ty: 7 },
        { type: "enter", x: 33, y: 22, map: "cave", tx: 1, ty: 13 },
        { type: "enter", x: 20, y: 31, map: "tower1", tx: 9, ty: 10 },
        { type: "gate", x: 33, y: 30, needs: "key", map: "maou", tx: 9, ty: 10,
          lockedMsg: "扉は固く閉ざされている。\n『ことばのカギ』が必要だ。" }
      ]
    },

    castle: {
      id: "castle", name: "レキシア城", kind: "town",
      rows: CASTLE_ROWS,
      exit: { map: "world", x: 7, y: 8 },
      events: [
        { type: "npc", x: 9, y: 2, icon: "👑", king: true },
        { type: "npc", x: 6, y: 4, icon: "💂", text: ["東の橋を渡ると 敵が強くなるぞ。\nまずは 村で 装備を整えるのだ。"] },
        { type: "npc", x: 12, y: 4, icon: "💂", text: ["敵に攻撃するには『英単語』に\n5秒以内に 答えるのだ。\n2秒以内に答えると 会心の一撃だ！"] },
        { type: "npc", x: 15, y: 6, icon: "🧙", text: ["魔法にも 単語の試練がある。\n『ファイア６００』なら\nTOEIC600点レベルの単語だ。"] },
        { type: "chest", x: 1, y: 1, id: "castle_c1", loot: { gold: 50 } },
        { type: "chest", x: 2, y: 1, id: "castle_c2", loot: { item: "herb", n: 2 } },
        { type: "chest", x: 3, y: 1, id: "castle_c3", loot: { item: "wing", n: 1 } }
      ]
    },

    town1: {
      id: "town1", name: "スタディの村", kind: "town",
      rows: TOWN_ROWS,
      exit: { map: "world", x: 11, y: 10 },
      events: [
        { type: "npc", x: 3, y: 4, icon: "⚔️", shop: { kind: "weapon", items: ["w1", "w2", "a1"] },
          text: ["いらっしゃい！ 武器と防具だよ。"] },
        { type: "npc", x: 10, y: 4, icon: "🧴", shop: { kind: "item", items: ["herb", "wing"] },
          text: ["道具はいかが？"] },
        { type: "npc", x: 17, y: 4, icon: "🛏️", inn: { price: 10 },
          text: [] },
        { type: "npc", x: 5, y: 6, icon: "👵", text: ["昔は この大陸のみんなが\n英語を話せたんじゃよ…。\n魔王が『言葉の力』を奪うまではね。"] },
        { type: "npc", x: 13, y: 7, icon: "👦", text: ["まちがえた単語は メニューの\n『たんごちょう』で復習できるよ！"] }
      ]
    },

    town2: {
      id: "town2", name: "ミドルタウン", kind: "town",
      rows: TOWN_ROWS,
      exit: { map: "world", x: 24, y: 10 },
      events: [
        { type: "npc", x: 3, y: 4, icon: "⚔️", shop: { kind: "weapon", items: ["w2", "w3", "a2"] },
          text: ["東の川を越えるなら\nもっと強い剣が 欲しいところだね。"] },
        { type: "npc", x: 10, y: 4, icon: "🧴", shop: { kind: "item", items: ["herb", "wing", "elixir"] },
          text: ["しゅうちゅうコーヒーは\nMPを回復するよ。"] },
        { type: "npc", x: 17, y: 4, icon: "🛏️", inn: { price: 25 }, text: [] },
        { type: "npc", x: 6, y: 6, icon: "🧔", text: ["南東の洞窟には リーディング将軍\nレクトスが 住みついている。\n『ハイライトセイバー』を\n守っているらしい。"] },
        { type: "npc", x: 14, y: 7, icon: "👩", text: ["レベルが上がると 魔法を覚えるよ。\n回復魔法『ヒール５００』は\n旅の必需品ね。"] }
      ]
    },

    town3: {
      id: "town3", name: "ハイスコアの街", kind: "town",
      rows: TOWN_ROWS,
      exit: { map: "world", x: 8, y: 28 },
      events: [
        { type: "npc", x: 3, y: 4, icon: "⚔️", shop: { kind: "weapon", items: ["w3", "w4", "a3", "a4"] },
          text: ["魔王城へ行くつもりかい？\nなら 最高の装備を持っていきな。"] },
        { type: "npc", x: 10, y: 4, icon: "🧴", shop: { kind: "item", items: ["herb", "wing", "elixir"] },
          text: ["準備は 入念にね。"] },
        { type: "npc", x: 17, y: 4, icon: "🛏️", inn: { price: 60 }, text: [] },
        { type: "npc", x: 6, y: 6, icon: "🧙", text: ["南の塔の頂上に リスニング将軍\nヒアロスがいる。\n奴が『ことばのカギ』を持っている。"] },
        { type: "npc", x: 14, y: 7, icon: "👴", text: ["魔王ヴォキャブロスには\nTOEIC900点レベルの単語で\n挑むことになるじゃろう…。"] }
      ]
    },

    cave: {
      id: "cave", name: "リーディングの洞窟", kind: "dungeon", dark: true,
      rows: CAVE_ROWS,
      zone: 4,
      exit: { map: "world", x: 33, y: 23 },
      events: [
        { type: "chest", x: 3, y: 3, id: "cave_c1", loot: { gold: 300 } },
        { type: "chest", x: 4, y: 3, id: "cave_c2", loot: { item: "elixir", n: 1 } },
        { type: "chest", x: 10, y: 9, id: "cave_c3", loot: { weapon: "w4" } },
        { type: "boss", x: 17, y: 11, icon: "🦁", enemy: "gen_r", flag: "gen_r_down",
          pre: ["リーディング将軍レクトス\n『我が書庫を荒らす者は誰だ！\n　長文の海に 沈めてくれよう！』"],
          after: ["レクトスを倒した！\n洞窟に 静けさが戻った。"] }
      ]
    },

    tower1: {
      id: "tower1", name: "リスニングの塔", kind: "dungeon", dark: false,
      rows: TOWER1_ROWS,
      zone: 5,
      exit: { map: "world", x: 20, y: 32 },
      events: [
        { type: "chest", x: 4, y: 8, id: "tw_c1", loot: { gold: 500 } },
        { type: "chest", x: 10, y: 5, id: "tw_c2", loot: { item: "herb", n: 3 } },
        { type: "stairs", x: 10, y: 6, map: "tower2", tx: 9, ty: 6 }
      ]
    },

    tower2: {
      id: "tower2", name: "リスニングの塔・最上階", kind: "dungeon", dark: false,
      rows: TOWER2_ROWS,
      zone: 5,
      exit: { map: "tower1", x: 10, y: 6 },
      events: [
        { type: "chest", x: 9, y: 4, id: "tw_c3", loot: { armor: "a4" } },
        { type: "boss", x: 9, y: 2, icon: "🐲", enemy: "gen_l", flag: "gen_l_down",
          pre: ["リスニング将軍ヒアロス\n『ここまで来るとは…。\n　だが 我が早口の咆哮を\n　聞き取れるかな！？』"],
          drops: { item: "key" },
          after: ["ヒアロスを倒した！\n『ことばのカギ』を手に入れた！"] }
      ]
    },

    maou: {
      id: "maou", name: "魔王城", kind: "dungeon", dark: false,
      rows: MAOU_ROWS,
      zone: 6,
      exit: { map: "world", x: 33, y: 31 },
      events: [
        { type: "chest", x: 4, y: 4, id: "mc_c1", loot: { weapon: "w5" } },
        { type: "chest", x: 5, y: 4, id: "mc_c2", loot: { gold: 1000 } },
        { type: "chest", x: 14, y: 4, id: "mc_c3", loot: { armor: "a5" } },
        { type: "chest", x: 15, y: 4, id: "mc_c4", loot: { item: "elixir", n: 2 } },
        { type: "boss", x: 9, y: 2, icon: "👿", enemy: "maou", flag: "maou_down",
          pre: ["魔王ヴォキャブロス\n『よくぞ来た 小さき勇者よ。\n　この世界の《言葉の力》は\n　すべて 私のものだ！\n　私を倒したくば――\n　900点の語彙で 語ってみせよ！』"],
          after: [] }
      ]
    }
  };

  // sanity check: all rows in a map must share the same width
  Object.keys(window.MAPS).forEach(function (k) {
    var m = window.MAPS[k];
    var w = m.rows[0].length;
    m.rows.forEach(function (r, i) {
      if (r.length !== w) throw new Error("map " + k + " row " + i + " width " + r.length + " != " + w);
    });
    m.w = w; m.h = m.rows.length;
  });
})();
