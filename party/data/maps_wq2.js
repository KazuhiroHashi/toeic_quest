// WORD QUEST II - map data (chapter 1-2 scope)
// Same tile legend as ../data/maps.js so the existing field renderer can be reused:
//  . grass  t forest  m mountain  w water  s sand(/snow placeholder)  b bridge
//  = wall   , floor   - dungeon floor  ^ stairs up/exit  v stairs down/exit
//  c chest  C castle-entrance  T town-entrance  D cave-entrance  U tower-entrance
//
// Maps: world (96x80), castle 王都グロッサ (40x30), village 鋼の村 (30x24),
//       cave1_f1..f3 旅立ちの洞窟 (40x40 x3), tower_f1..f4 音の塔 (36x36 x4)
// Every map: { id, name, kind, w, h, grid, rows, entry, exit, events }
// (grid === rows: both point at the same array of row strings.)
// Validate with: node party/tools/check_wq2.js

(function () {
  "use strict";

  // ---------- generic helpers ----------
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }
  function newGrid(w, h, ch) {
    var g = [];
    for (var y = 0; y < h; y++) g.push(new Array(w).fill(ch));
    return g;
  }
  function rect(g, x0, y0, x1, y1, ch) {
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) g[y][x] = ch;
  }
  function put(g, x, y, ch) { g[y][x] = ch; }

  var SOLID = { w: 1, m: 1, "=": 1 };
  function walkable(ch) { return !SOLID[ch]; }

  // carve an L-shaped road along a polyline; never overwrites water/bridges
  function road(g, pts, ch) {
    function seg(x0, y0, x1, y1) {
      var x = x0, y = y0;
      while (true) {
        var t = g[y][x];
        if (t !== "w" && t !== "b") g[y][x] = ch;
        if (x === x1 && y === y1) break;
        if (x !== x1) x += (x1 > x) ? 1 : -1;
        else y += (y1 > y) ? 1 : -1;
      }
    }
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1];
      seg(a[0], a[1], b[0], a[1]);   // horizontal first
      seg(b[0], a[1], b[0], b[1]);   // then vertical
    }
  }

  // BFS from entry; blocked tiles (npc/boss/gate) are bump-reachable but not
  // passable. Any walkable tile NOT reached is sealed with `fill` so the
  // "every walkable tile is reachable" invariant always holds.
  function seal(g, sx, sy, fill, blocked) {
    var h = g.length, w = g[0].length;
    var seen = {};
    var q = [[sx, sy]];
    seen[sx + "," + sy] = 1;
    while (q.length) {
      var c = q.shift();
      var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (var i = 0; i < dirs.length; i++) {
        var x = c[0] + dirs[i][0], y = c[1] + dirs[i][1], k = x + "," + y;
        if (x < 0 || y < 0 || x >= w || y >= h || seen[k]) continue;
        if (SOLID[g[y][x]]) continue;
        seen[k] = 1;
        if (blocked && blocked[k]) continue;
        q.push([x, y]);
      }
    }
    for (var yy = 0; yy < h; yy++)
      for (var xx = 0; xx < w; xx++)
        if (walkable(g[yy][xx]) && !seen[xx + "," + yy]) g[yy][xx] = fill;
  }

  // ---------- overworld: グロッサリア大陸 (96 x 80) ----------
  // 4 regions around a central sea:
  //   NW snow/rock  | NE forest/mountain (鋼の村, 音の塔)
  //   --------------+---------------------------------
  //   SW plains (王都グロッサ, 旅立ちの洞窟) | SE desert
  // Rivers run N/S/E/W from the central sea; one bridge per river = chokepoints.
  var OW_W = 96, OW_H = 80;

  function buildWorld() {
    var g = newGrid(OW_W, OW_H, "w");
    var rnd = makeRng(20260719);

    // continent
    rect(g, 4, 3, 91, 76, ".");

    // coastline shaping (bays + trimmed corners)
    rect(g, 4, 3, 14, 6, "w"); rect(g, 4, 3, 7, 10, "w");        // NW corner
    rect(g, 80, 3, 91, 5, "w"); rect(g, 88, 3, 91, 12, "w");     // NE corner
    rect(g, 4, 70, 10, 76, "w"); rect(g, 4, 66, 6, 76, "w");     // SW corner
    rect(g, 84, 70, 91, 76, "w"); rect(g, 88, 62, 91, 76, "w");  // SE corner
    rect(g, 4, 20, 6, 32, "w");                                   // west bay
    rect(g, 89, 28, 91, 46, "w");                                 // east bay
    rect(g, 42, 74, 58, 76, "w");                                 // south bay
    rect(g, 44, 3, 52, 4, "w");                                   // north river mouth

    // region terrain (seeded scatter; only decorates base grass)
    function scatter(x0, y0, x1, y1, fn) {
      for (var y = y0; y <= y1; y++)
        for (var x = x0; x <= x1; x++) {
          if (g[y][x] !== ".") continue;
          var ch = fn(rnd());
          if (ch) g[y][x] = ch;
        }
    }
    // NW: snowfield (s) + rock (m) + sparse dead trees
    scatter(4, 3, 47, 39, function (r) {
      return r < 0.30 ? "s" : r < 0.40 ? "m" : r < 0.45 ? "t" : null;
    });
    // NE: deep forest + mountains
    scatter(48, 3, 91, 39, function (r) {
      return r < 0.36 ? "t" : r < 0.46 ? "m" : null;
    });
    // SW: green plains, light woods
    scatter(4, 40, 47, 76, function (r) {
      return r < 0.13 ? "t" : r < 0.17 ? "s" : null;
    });
    // SE: desert - sand base with dunes and rare oases
    rect(g, 48, 41, 91, 76, "s");
    for (var y = 41; y <= 76; y++)
      for (var x = 48; x <= 91; x++) {
        if (g[y][x] !== "s") continue;
        var r = rnd();
        if (r < 0.06) g[y][x] = ".";
        else if (r < 0.12) g[y][x] = "m";
      }

    // mountain ridges shaping routes
    rect(g, 10, 18, 26, 19, "m");                       // NW ridge (road cuts a pass)
    rect(g, 30, 8, 42, 9, "m");                          // NW north ridge
    rect(g, 20, 26, 34, 27, "m");                        // NW south ridge
    rect(g, 58, 20, 67, 21, "m");                        // NE ridge west half
    rect(g, 73, 20, 88, 21, "m");                        // NE ridge east half (pass at x68-72)
    rect(g, 54, 28, 60, 34, "m");                        // NE massif
    rect(g, 82, 24, 88, 25, "m");                        // ridge above the tower
    rect(g, 24, 64, 26, 74, "m");                        // SW divider near the cave
    rect(g, 56, 54, 58, 62, "m");                        // SE dune ridges
    rect(g, 66, 48, 74, 49, "m");
    rect(g, 70, 58, 78, 59, "m");

    // central sea (ellipse) + four rivers (1 tile wide)
    for (var sy = 27; sy <= 53; sy++)
      for (var sx = 30; sx <= 66; sx++) {
        var dx = (sx - 48) / 17, dy = (sy - 40) / 12;
        if (dx * dx + dy * dy <= 1) g[sy][sx] = "w";
      }
    rect(g, 4, 40, 31, 40, "w");    // west river
    rect(g, 65, 40, 91, 40, "w");   // east river
    rect(g, 48, 3, 48, 28, "w");    // north river
    rect(g, 48, 52, 48, 76, "w");   // south river

    // bridges = chokepoints between the 4 regions
    put(g, 14, 40, "b");   // SW <-> NW
    put(g, 48, 12, "b");   // NW <-> NE
    put(g, 48, 64, "b");   // SW <-> SE
    put(g, 80, 40, "b");   // SE <-> NE

    // roads connecting castle / village / cave / tower through the bridges
    road(g, [[18, 57], [18, 44], [14, 44], [14, 34]], ".");            // castle -> west bridge
    road(g, [[14, 34], [14, 12], [47, 12]], ".");                       // NW -> north bridge
    road(g, [[49, 12], [70, 12]], ".");                                 // north bridge -> village
    road(g, [[70, 13], [70, 26], [86, 26], [86, 29]], ".");             // village -> tower (ridge pass)
    road(g, [[18, 59], [18, 60], [44, 60], [44, 64], [47, 64]], ".");   // castle -> south bridge
    road(g, [[49, 64], [80, 64], [80, 41]], ".");                       // desert road -> east bridge
    road(g, [[80, 39], [80, 36], [86, 36], [86, 31]], ".");             // east bridge -> tower
    road(g, [[18, 60], [30, 60], [30, 70], [37, 70]], ".");             // castle -> cave

    // keep exit landings walkable
    [[18, 59], [70, 13], [38, 71], [86, 31]].forEach(function (p) {
      g[p[1]][p[0]] = ".";
    });

    // entrances
    put(g, 18, 58, "C");   // 王都グロッサ
    put(g, 70, 12, "T");   // 鋼の村
    put(g, 38, 70, "D");   // 旅立ちの洞窟 (chapter 1)
    put(g, 86, 30, "U");   // 音の塔 (chapter 2)

    return g;
  }

  // ---------- town builder helpers ----------
  function buildCastle() {
    var W = 40, H = 30;
    var g = newGrid(W, H, ",");
    rect(g, 0, 0, W - 1, 0, "=");
    rect(g, 0, H - 1, W - 1, H - 1, "=");
    rect(g, 0, 0, 0, H - 1, "=");
    rect(g, W - 1, 0, W - 1, H - 1, "=");

    // castle keep (north) with a 2-tile gate
    rect(g, 2, 2, 37, 11, "=");
    rect(g, 3, 3, 36, 10, ",");
    put(g, 19, 11, ","); put(g, 20, 11, ",");
    rect(g, 12, 2, 12, 6, "=");   // west wing wall
    rect(g, 27, 2, 27, 6, "=");   // east wing wall
    // treasure alcove
    put(g, 4, 4, "c"); put(g, 5, 4, "c"); put(g, 6, 4, "c");

    // town blocks (south, solid buildings)
    rect(g, 5, 15, 10, 18, "=");
    rect(g, 15, 15, 20, 18, "=");
    rect(g, 25, 15, 30, 18, "=");
    rect(g, 5, 22, 10, 25, "=");
    rect(g, 25, 22, 30, 25, "=");

    put(g, 20, 29, "^");   // town gate -> world
    return g;
  }

  function buildVillage() {
    var W = 30, H = 24;
    var g = newGrid(W, H, ",");
    rect(g, 0, 0, W - 1, 0, "=");
    rect(g, 0, H - 1, W - 1, H - 1, "=");
    rect(g, 0, 0, 0, H - 1, "=");
    rect(g, W - 1, 0, W - 1, H - 1, "=");

    // houses / forge (solid blocks)
    rect(g, 4, 4, 9, 7, "=");
    rect(g, 13, 4, 18, 7, "=");
    rect(g, 22, 4, 26, 7, "=");
    rect(g, 4, 12, 9, 15, "=");
    rect(g, 20, 12, 25, 15, "=");

    put(g, 15, 23, "^");   // gate -> world
    return g;
  }

  // ---------- dungeon builder (wide corridors + open rooms + loops) ----------
  // Player feedback was that the old 1-tile recursive-backtracker maze felt like
  // an endless single-file tunnel. Instead we place OPEN ROOMS (4x4..8x8) on a
  // coarse slot grid, link neighbouring rooms with 3-tile-wide L-corridors
  // (spanning tree + extra loop edges => multiple routes, not a pure tree), then
  // poke a few narrow dead-end nooks that hold the chests. Fixed feature tiles
  // (entries / stairs / gates / boss / treasure) are wired into the network with
  // linkPoint() so they always stay walkable and reachable through seal().

  // Carve an L-path of the given (odd) width. Keeps the 1-tile map border as
  // wall and never overwrites water/bridge tiles.
  function wideCarve(g, x0, y0, x1, y1, width) {
    var W = g[0].length, H = g.length, r = (width - 1) >> 1;
    function cell(x, y) {
      if (x >= 1 && x < W - 1 && y >= 1 && y < H - 1 &&
          g[y][x] !== "w" && g[y][x] !== "b") g[y][x] = "-";
    }
    var lo, hi, i, d;
    lo = Math.min(x0, x1); hi = Math.max(x0, x1);
    for (i = lo; i <= hi; i++) for (d = -r; d <= r; d++) cell(i, y0 + d);   // horizontal @ y0
    lo = Math.min(y0, y1); hi = Math.max(y0, y1);
    for (i = lo; i <= hi; i++) for (d = -r; d <= r; d++) cell(x1 + d, i);   // vertical @ x1
    return g;
  }

  // Build one dungeon floor: a grid of open rooms joined by wide corridors.
  function dungeonFloor(w, h, seed, opts) {
    var g = newGrid(w, h, "=");
    var rnd = makeRng(seed);
    var cols = opts.cols, rows = opts.rows;
    var cellW = Math.floor((w - 2) / cols), cellH = Math.floor((h - 2) / rows);
    var grid = [], roomList = [];
    for (var ry = 0; ry < rows; ry++) {
      grid.push([]);
      for (var rx = 0; rx < cols; rx++) {
        var ox = 1 + rx * cellW, oy = 1 + ry * cellH;
        var maxW = Math.max(4, Math.min(8, cellW - 1));
        var maxH = Math.max(4, Math.min(8, cellH - 1));
        var rw = Math.min(cellW - 1, 4 + Math.floor(rnd() * (maxW - 3)));
        var rh = Math.min(cellH - 1, 4 + Math.floor(rnd() * (maxH - 3)));
        var rx0 = ox + Math.floor(rnd() * Math.max(1, cellW - rw));
        var ry0 = oy + Math.floor(rnd() * Math.max(1, cellH - rh));
        rect(g, rx0, ry0, rx0 + rw - 1, ry0 + rh - 1, "-");
        var c = [rx0 + (rw >> 1), ry0 + (rh >> 1)];
        grid[ry].push(c); roomList.push(c);
      }
    }
    // spanning tree over the slot grid (randomised DFS) => every room connected
    var DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    var seen = { "0,0": 1 }, stack = [[0, 0]];
    while (stack.length) {
      var cur = stack[stack.length - 1], cand = [];
      for (var di = 0; di < 4; di++) {
        var nx = cur[0] + DIRS[di][0], ny = cur[1] + DIRS[di][1];
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[nx + "," + ny]) cand.push([nx, ny]);
      }
      if (!cand.length) { stack.pop(); continue; }
      var nb = cand[Math.floor(rnd() * cand.length)];
      seen[nb[0] + "," + nb[1]] = 1;
      var a = grid[cur[1]][cur[0]], b = grid[nb[1]][nb[0]];
      wideCarve(g, a[0], a[1], b[0], b[1], 3);
      stack.push(nb);
    }
    // extra loop corridors so there are multiple routes (not a tree)
    for (var li = 0; li < (opts.loops || 0); li++) {
      var arx = Math.floor(rnd() * cols), ary = Math.floor(rnd() * rows);
      var dd = DIRS[Math.floor(rnd() * 4)];
      var brx = arx + dd[0], bry = ary + dd[1];
      if (brx < 0 || bry < 0 || brx >= cols || bry >= rows) continue;
      var ea = grid[ary][arx], eb = grid[bry][brx];
      wideCarve(g, ea[0], ea[1], eb[0], eb[1], 3);
    }
    return { g: g, rooms: roomList, grid: grid, rnd: rnd };
  }

  function nearestRoom(rooms, x, y) {
    var best = rooms[0], bd = Infinity;
    for (var i = 0; i < rooms.length; i++) {
      var dx = rooms[i][0] - x, dy = rooms[i][1] - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = rooms[i]; }
    }
    return best;
  }
  // Wire a fixed tile into the room network with a 3-wide corridor.
  function linkPoint(g, rooms, x, y) {
    var c = nearestRoom(rooms, x, y);
    wideCarve(g, x, y, c[0], c[1], 3);
  }
  function linkPoints(g, rooms, pts) {
    pts.forEach(function (p) { linkPoint(g, rooms, p[0], p[1]); });
  }

  // Poke narrow (1-wide) dead-end nooks off rooms so chests have real hiding spots.
  function addNooks(g, rooms, n, rnd) {
    var W = g[0].length, H = g.length;
    var DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    var made = 0, tries = 0;
    while (made < n && tries < 600) {
      tries++;
      var c = rooms[Math.floor(rnd() * rooms.length)];
      var dir = DIRS[Math.floor(rnd() * 4)];
      var x = c[0], y = c[1], steps = 0;
      while (steps < 12 && g[y] && g[y][x] === "-") { x += dir[0]; y += dir[1]; steps++; } // walk to first wall
      var len = 2 + Math.floor(rnd() * 2), cells = [], ok = true, cx = x, cy = y;
      for (var i = 0; i < len; i++) {
        if (cx < 1 || cy < 1 || cx >= W - 1 || cy >= H - 1 || g[cy][cx] !== "=") { ok = false; break; }
        cells.push([cx, cy]); cx += dir[0]; cy += dir[1];
      }
      if (!ok || !cells.length) continue;
      cells.forEach(function (p) { g[p[1]][p[0]] = "-"; });
      made++;
    }
  }

  // dead ends = '-' tiles with exactly one open neighbour (chest spots)
  function deadEnds(g, avoid) {
    var out = [];
    for (var y = 1; y < g.length - 1; y++)
      for (var x = 1; x < g[0].length - 1; x++) {
        if (g[y][x] !== "-") continue;
        if (avoid[x + "," + y]) continue;
        var open = 0;
        if (g[y - 1][x] !== "=") open++;
        if (g[y + 1][x] !== "=") open++;
        if (g[y][x - 1] !== "=") open++;
        if (g[y][x + 1] !== "=") open++;
        if (open === 1) out.push([x, y]);
      }
    return out;
  }

  // place n chests spread across the dead-end list; returns [[x,y],...]
  function placeChests(g, n, avoid) {
    var spots = deadEnds(g, avoid);
    if (spots.length < n) { // fallback: also allow corridor tiles (rare)
      for (var y = 1; y < g.length - 1 && spots.length < n * 3; y++)
        for (var x = 1; x < g[0].length - 1; x++)
          if (g[y][x] === "-" && !avoid[x + "," + y]) spots.push([x, y]);
    }
    var picked = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.floor(i * (spots.length - 1) / Math.max(1, n - 1));
      var p = spots[idx];
      picked.push(p);
      put(g, p[0], p[1], "c");
    }
    return picked;
  }

  function avoidSet(list) {
    var s = {};
    list.forEach(function (p) { s[p[0] + "," + p[1]] = 1; });
    return s;
  }

  // ---------- cave1: 旅立ちの洞窟 (3 floors, 40x40) ----------
  // 4x4 grid of open rooms joined by 3-wide corridors + loop edges. Floor 1 has
  // a locked shortcut ring (row/col 37, gate needs cave_key found on B2) from the
  // entrance to the down-stairs. Boss (placeholder wolf) waits in an open chamber
  // on floor 3. Chests live in the dead-end nooks.
  var CAVE_W = 40, CAVE_H = 40;

  function buildCaveF1() {
    var d = dungeonFloor(CAVE_W, CAVE_H, 11001, { cols: 4, rows: 4, loops: 7 });
    var g = d.g, rooms = d.rooms;
    linkPoints(g, rooms, [[1, 34], [34, 1], [35, 1]]);
    put(g, 1, 35, "^");  put(g, 1, 34, "-");   // exit -> world / entry landing
    put(g, 35, 1, "v");  put(g, 34, 1, "-");   // down -> B2 / landing
    // locked shortcut ring: bottom row 37 + east col 37, corner-linked (1-wide,
    // so the gate at (19,37) really does bar the shortcut).
    rect(g, 1, 37, 37, 37, "-");
    rect(g, 37, 1, 37, 37, "-");
    put(g, 1, 36, "-");  put(g, 36, 1, "-");   // (1,37)-(1,36)-(1,35^)-(1,34) & (37,1)-(36,1)-(35,1v)
    addNooks(g, rooms, 8, makeRng(11091));
    var chests = placeChests(g, 3, avoidSet([[1, 34], [34, 1], [35, 1], [1, 36], [36, 1]]));
    return { g: g, chests: chests };
  }

  function buildCaveF2() {
    var d = dungeonFloor(CAVE_W, CAVE_H, 11002, { cols: 4, rows: 4, loops: 7 });
    var g = d.g, rooms = d.rooms;
    linkPoints(g, rooms, [[35, 1], [34, 1], [1, 35], [1, 34]]);
    put(g, 35, 1, "^");  put(g, 34, 1, "-");   // up -> B1
    put(g, 1, 35, "v");  put(g, 1, 34, "-");   // down -> B3
    addNooks(g, rooms, 8, makeRng(11092));
    var chests = placeChests(g, 3, avoidSet([[34, 1], [1, 34], [35, 1], [1, 35]]));
    return { g: g, chests: chests };
  }

  function buildCaveF3() {
    var d = dungeonFloor(CAVE_W, CAVE_H, 11003, { cols: 4, rows: 4, loops: 6 });
    var g = d.g, rooms = d.rooms;
    rect(g, 26, 2, 34, 8, "-");                 // boss chamber (open, top-right)
    linkPoint(g, rooms, 30, 5);                 // wire chamber to the network
    rooms.push([30, 5]);
    linkPoints(g, rooms, [[1, 35], [1, 34]]);
    put(g, 1, 35, "^");  put(g, 1, 34, "-");   // up -> B2
    put(g, 33, 3, "c");                         // treasure in the boss chamber
    addNooks(g, rooms, 8, makeRng(11093));
    var chests = placeChests(g, 2, avoidSet([[1, 34], [1, 35], [30, 5], [33, 3]]));
    chests.push([33, 3]);
    return { g: g, chests: chests };
  }

  // ---------- tower_sound: 音の塔 (4 floors, 36x36) ----------
  // Same wide-room generator (4x4 grid). Floor 1 has a locked shortcut ring
  // (row/col 33, gate needs tower_key found on 3F). 四天王ハウル waits in an open
  // chamber on 4F.
  var TW_W = 36, TW_H = 36;

  function buildTowerF1() {
    var d = dungeonFloor(TW_W, TW_H, 22001, { cols: 4, rows: 4, loops: 6 });
    var g = d.g, rooms = d.rooms;
    linkPoints(g, rooms, [[1, 30], [31, 1], [30, 1]]);
    put(g, 1, 31, "v");  put(g, 1, 30, "-");   // exit -> world / entry landing
    put(g, 31, 1, "^");  put(g, 30, 1, "-");   // up -> 2F / landing
    // locked shortcut ring: row 33 + col 33, corner-linked (gate at (17,33))
    rect(g, 1, 33, 33, 33, "-");
    rect(g, 33, 1, 33, 33, "-");
    put(g, 1, 32, "-");  put(g, 32, 1, "-");   // (1,33)-(1,32)-(1,31v)-(1,30) & (33,1)-(32,1)-(31,1^)
    addNooks(g, rooms, 6, makeRng(22091));
    var chests = placeChests(g, 2, avoidSet([[1, 30], [31, 1], [30, 1], [1, 32], [32, 1]]));
    return { g: g, chests: chests };
  }

  function buildTowerF2() {
    var d = dungeonFloor(TW_W, TW_H, 22002, { cols: 4, rows: 4, loops: 6 });
    var g = d.g, rooms = d.rooms;
    linkPoints(g, rooms, [[31, 1], [30, 1], [1, 31], [1, 30]]);
    put(g, 31, 1, "v");  put(g, 30, 1, "-");   // down -> 1F
    put(g, 1, 31, "^");  put(g, 1, 30, "-");   // up -> 3F
    addNooks(g, rooms, 6, makeRng(22092));
    var chests = placeChests(g, 2, avoidSet([[30, 1], [1, 30], [31, 1], [1, 31]]));
    return { g: g, chests: chests };
  }

  function buildTowerF3() {
    var d = dungeonFloor(TW_W, TW_H, 22003, { cols: 4, rows: 4, loops: 6 });
    var g = d.g, rooms = d.rooms;
    linkPoints(g, rooms, [[1, 31], [1, 30], [31, 1], [30, 1]]);
    put(g, 1, 31, "v");  put(g, 1, 30, "-");   // down -> 2F
    put(g, 31, 1, "^");  put(g, 30, 1, "-");   // up -> 4F
    addNooks(g, rooms, 6, makeRng(22093));
    var chests = placeChests(g, 2, avoidSet([[1, 30], [31, 1], [1, 31], [30, 1]]));
    return { g: g, chests: chests };
  }

  function buildTowerF4() {
    var d = dungeonFloor(TW_W, TW_H, 22004, { cols: 4, rows: 4, loops: 5 });
    var g = d.g, rooms = d.rooms;
    rect(g, 12, 2, 20, 8, "-");                 // boss chamber (open, top center)
    linkPoint(g, rooms, 16, 5);                 // wire chamber to the network
    rooms.push([16, 5]);
    linkPoints(g, rooms, [[31, 1], [30, 1]]);
    put(g, 31, 1, "v");  put(g, 30, 1, "-");   // down -> 3F
    put(g, 19, 3, "c");                         // treasure behind Howl
    addNooks(g, rooms, 6, makeRng(22094));
    var chests = placeChests(g, 1, avoidSet([[30, 1], [31, 1], [16, 5], [19, 3]]));
    chests.push([19, 3]);
    return { g: g, chests: chests };
  }

  // ---------- assemble maps ----------
  var world = buildWorld();
  var castleG = buildCastle();
  var villageG = buildVillage();
  var c1 = buildCaveF1(), c2 = buildCaveF2(), c3 = buildCaveF3();
  var t1 = buildTowerF1(), t2 = buildTowerF2(), t3 = buildTowerF3(), t4 = buildTowerF4();

  function chestEvents(prefix, chests, loots) {
    return chests.map(function (p, i) {
      return { type: "chest", x: p[0], y: p[1], id: prefix + "_c" + (i + 1), loot: loots[i] };
    });
  }

  var MAPS = {

    world: {
      id: "world", name: "グロッサリア大陸", kind: "world",
      g: world,
      start: { x: 18, y: 59 },
      entry: { x: 18, y: 59 },
      events: [
        { type: "enter", x: 18, y: 58, map: "castle", tx: 20, ty: 28 },
        { type: "enter", x: 70, y: 12, map: "village", tx: 15, ty: 22 },
        { type: "enter", x: 38, y: 70, map: "cave1_f1", tx: 1, ty: 34 },
        { type: "enter", x: 86, y: 30, map: "tower_f1", tx: 1, ty: 30 }
      ]
    },

    castle: {
      id: "castle", name: "王都グロッサ", kind: "town",
      g: castleG,
      entry: { x: 20, y: 28 },
      exit: { map: "world", x: 18, y: 59 },
      events: [
        { type: "npc", x: 20, y: 4, icon: "👑",
          text: ["国王グロッサ\n『勇者ユウよ…この都から\n　人々の《声》が消えていく。\n　沈黙王ミュートスの仕業だ。\n　まずは南東の洞窟へ向かい\n　旅の心得を身につけるのだ！』"] },
        { type: "npc", x: 16, y: 8, icon: "💂",
          text: ["攻撃するには『英単語』に\n5秒以内に答えるのだ。\n2秒以内なら 会心の一撃だぞ！"] },
        { type: "npc", x: 24, y: 8, icon: "💂",
          text: ["仲間が続けて正解すると\n『パーティチェイン』で\nダメージが上がっていくらしい。"] },
        { type: "npc", x: 31, y: 8, icon: "🧙",
          text: ["北東の『音の塔』には四天王\n轟嵐のハウルが棲みつき\n大陸の《聞く力》を封じておる。\n挑むのは 洞窟を抜けてからじゃ。"] },
        { type: "npc", x: 7, y: 20, icon: "⚔️",
          shop: { kind: "weapon", items: ["w1", "w2", "a1"] },
          text: ["いらっしゃい！\n旅立ちの装備はここで。"] },
        { type: "npc", x: 17, y: 20, icon: "🧴",
          shop: { kind: "item", items: ["herb", "wing"] },
          text: ["やくそうは多めに持っていきな。"] },
        { type: "npc", x: 27, y: 20, icon: "🛏️", inn: { price: 10 }, text: [] },
        { type: "npc", x: 13, y: 24, icon: "👦",
          text: ["ぼくのママ 声が出なくなっちゃった…。\nはやく元にもどしてね。"] },
        { type: "npc", x: 20, y: 24, icon: "👩",
          text: ["南東の洞窟は 迷いやすいの。\n行き止まりには宝箱があるって\nうわさよ。"] },
        { type: "npc", x: 33, y: 17, icon: "👴",
          text: ["川にかかる橋は 4つだけじゃ。\n橋を渡れば となりの地方…\n敵も強くなるでのう。"] },
        { type: "chest", x: 4, y: 4, id: "castle_c1", loot: { gold: 50 } },
        { type: "chest", x: 5, y: 4, id: "castle_c2", loot: { item: "herb", n: 2 } },
        { type: "chest", x: 6, y: 4, id: "castle_c3", loot: { item: "wing", n: 1 } }
      ]
    },

    village: {
      id: "village", name: "鋼の村", kind: "town",
      g: villageG,
      entry: { x: 15, y: 22 },
      exit: { map: "world", x: 70, y: 13 },
      events: [
        { type: "npc", x: 6, y: 8, icon: "⚔️",
          shop: { kind: "weapon", items: ["w2", "w3", "a2"] },
          text: ["鋼の村の鍛冶は大陸一だ。\n音の塔に行くなら\n良い剣を持っていけ。"] },
        { type: "npc", x: 15, y: 8, icon: "🧴",
          shop: { kind: "item", items: ["herb", "wing", "elixir"] },
          text: ["塔は長丁場だよ。\n道具をしっかり準備してね。"] },
        { type: "npc", x: 24, y: 8, icon: "🛏️", inn: { price: 25 }, text: [] },
        { type: "npc", x: 12, y: 17, icon: "🧔",
          text: ["おれはガイ。妹の声が\n奪われちまった…。\n四天王ハウルは絶対に許さねえ。\n（※2章で仲間になる予定）"] },
        { type: "npc", x: 17, y: 16, icon: "👦",
          text: ["東の塔から 変な音が\nずーっと聞こえてくるんだ。\nゴォーッて 嵐みたいな音…。"] },
        { type: "npc", x: 8, y: 17, icon: "👵",
          text: ["塔の1階には 閉ざされた\n近道があるそうじゃ。\nカギは塔の上のほうに\nあるらしいがのう。"] }
      ]
    },

    cave1_f1: {
      id: "cave1_f1", name: "旅立ちの洞窟 B1", kind: "dungeon", dark: true,
      g: c1.g, zone: 1,
      entry: { x: 1, y: 34 },
      exit: { map: "world", x: 38, y: 71 },
      events: [
        { type: "stairs", x: 35, y: 1, map: "cave1_f2", tx: 34, ty: 1 },
        { type: "gate", x: 19, y: 37, needs: "cave_key",
          lockedMsg: "がんじょうな扉だ。\n『洞窟のカギ』が必要らしい。" }
      ].concat(chestEvents("cave1_f1", c1.chests, [
        { gold: 120 }, { item: "herb", n: 2 }, { item: "wing", n: 1 }
      ]))
    },

    cave1_f2: {
      id: "cave1_f2", name: "旅立ちの洞窟 B2", kind: "dungeon", dark: true,
      g: c2.g, zone: 1,
      entry: { x: 34, y: 1 },
      exit: { map: "cave1_f1", x: 34, y: 1 },
      events: [
        { type: "stairs", x: 35, y: 1, map: "cave1_f1", tx: 34, ty: 1 },
        { type: "stairs", x: 1, y: 35, map: "cave1_f3", tx: 1, ty: 34 }
      ].concat(chestEvents("cave1_f2", c2.chests, [
        { gold: 260 }, { item: "cave_key", n: 1 }, { item: "elixir", n: 1 }
      ]))
    },

    cave1_f3: {
      id: "cave1_f3", name: "旅立ちの洞窟 B3", kind: "dungeon", dark: true,
      g: c3.g, zone: 1,
      entry: { x: 1, y: 34 },
      exit: { map: "cave1_f2", x: 1, y: 34 },
      events: [
        { type: "stairs", x: 1, y: 35, map: "cave1_f2", tx: 1, ty: 34 },
        { type: "boss", x: 30, y: 5, icon: "🐺", enemy: "wolf", flag: "cave1_boss_down",
          pre: ["洞窟の主 あらしオオカミが\nうなり声をあげた！\n（※ボスは仮。1章チュートリアル用）"],
          after: ["あらしオオカミを倒した！\n洞窟の奥から 外の光が見える。\nこれで旅の心得は 身についた。"] }
      ].concat(chestEvents("cave1_f3", c3.chests, [
        { weapon: "w2" }, { gold: 400 }, { armor: "a2" }
      ]))
    },

    tower_f1: {
      id: "tower_f1", name: "音の塔 1F", kind: "dungeon", dark: false,
      g: t1.g, zone: 2,
      entry: { x: 1, y: 30 },
      exit: { map: "world", x: 86, y: 31 },
      events: [
        { type: "stairs", x: 31, y: 1, map: "tower_f2", tx: 30, ty: 1 },
        { type: "gate", x: 17, y: 33, needs: "tower_key",
          lockedMsg: "風のうなりに閉ざされた扉だ。\n『音の塔のカギ』が必要らしい。" }
      ].concat(chestEvents("tower_f1", t1.chests, [
        { gold: 300 }, { item: "herb", n: 3 }
      ]))
    },

    tower_f2: {
      id: "tower_f2", name: "音の塔 2F", kind: "dungeon", dark: false,
      g: t2.g, zone: 2,
      entry: { x: 30, y: 1 },
      exit: { map: "tower_f1", x: 30, y: 1 },
      events: [
        { type: "stairs", x: 31, y: 1, map: "tower_f1", tx: 30, ty: 1 },
        { type: "stairs", x: 1, y: 31, map: "tower_f3", tx: 1, ty: 30 }
      ].concat(chestEvents("tower_f2", t2.chests, [
        { item: "elixir", n: 1 }, { gold: 450 }
      ]))
    },

    tower_f3: {
      id: "tower_f3", name: "音の塔 3F", kind: "dungeon", dark: false,
      g: t3.g, zone: 2,
      entry: { x: 1, y: 30 },
      exit: { map: "tower_f2", x: 1, y: 30 },
      events: [
        { type: "stairs", x: 1, y: 31, map: "tower_f2", tx: 1, ty: 30 },
        { type: "stairs", x: 31, y: 1, map: "tower_f4", tx: 30, ty: 1 }
      ].concat(chestEvents("tower_f3", t3.chests, [
        { item: "tower_key", n: 1 }, { weapon: "w3" }
      ]))
    },

    tower_f4: {
      id: "tower_f4", name: "音の塔 4F", kind: "dungeon", dark: false,
      g: t4.g, zone: 2,
      entry: { x: 30, y: 1 },
      exit: { map: "tower_f3", x: 30, y: 1 },
      events: [
        { type: "stairs", x: 31, y: 1, map: "tower_f3", tx: 30, ty: 1 },
        { type: "boss", x: 16, y: 5, icon: "🦅", enemy: "gen_r", flag: "howl_down",
          pre: ["四天王その一 轟嵐のハウル\n『よくぞ登ってきた 小僧ども。\n　この塔の頂で 大陸の\n　《聞く力》は封じた！\n　我が嵐の咆哮…\n　聞き取れるものなら聞くがいい！』"],
          after: ["轟嵐のハウルを倒した！\n塔を包んでいた嵐がやみ――\n大陸に《聞く力》が戻っていく！"] }
      ].concat(chestEvents("tower_f4", t4.chests, [
        { item: "wing", n: 2 }, { armor: "a3" }
      ]))
    }
  };

  // ---------- finalize: seal unreachable pockets, join rows, set w/h ----------
  Object.keys(MAPS).forEach(function (k) {
    var m = MAPS[k];
    var blocked = {};
    (m.events || []).forEach(function (ev) {
      if (ev.type === "npc" || ev.type === "boss" || ev.type === "gate")
        blocked[ev.x + "," + ev.y] = 1;
    });
    var fill = (m.kind === "world") ? "w" : "=";
    seal(m.g, m.entry.x, m.entry.y, fill, blocked);
    var rows = m.g.map(function (r) { return r.join(""); });
    delete m.g;
    m.rows = rows;      // renderer format (same as data/maps.js)
    m.grid = rows;      // alias, same array
    m.w = rows[0].length;
    m.h = rows.length;
    rows.forEach(function (r, i) {
      if (r.length !== m.w)
        throw new Error("WQ2 map " + k + " row " + i + " width " + r.length + " != " + m.w);
    });
  });

  window.WQ2_MAPS = MAPS;
})();
