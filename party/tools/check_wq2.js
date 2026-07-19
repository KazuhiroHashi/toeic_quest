// WORD QUEST II - map validation (run: node party/tools/check_wq2.js)
// For every map in window.WQ2_MAPS:
//   * uniform row width, grid === rows alias, entry on a walkable tile
//   * BFS from entry (npc/boss/gate tiles are bump-reachable but not passable):
//       - EVERY walkable tile must be reached
//       - every event position must be reached
//   * chest events sit on 'c' tiles and every 'c' tile has a chest event
//   * stairs/enter targets exist and their tx/ty land on walkable tiles
//   * exit targets exist and their x/y are walkable on the target map
// Prints PASS/FAIL per map; exits 1 on any failure.
"use strict";

var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..", "..");

global.window = {};
eval(fs.readFileSync(path.join(root, "party", "data", "maps_wq2.js"), "utf8"));

var MAPS = window.WQ2_MAPS;
var SOLID = { w: 1, m: 1, "=": 1 };
function walkable(ch) { return ch !== undefined && !SOLID[ch]; }

function bfs(m) {
  var seen = {};
  var blocked = {};
  (m.events || []).forEach(function (ev) {
    if (ev.type === "npc" || ev.type === "boss" || ev.type === "gate")
      blocked[ev.x + "," + ev.y] = 1;
  });
  var q = [[m.entry.x, m.entry.y]];
  seen[m.entry.x + "," + m.entry.y] = 1;
  while (q.length) {
    var c = q.shift();
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
      var x = c[0] + d[0], y = c[1] + d[1], k = x + "," + y;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h || seen[k]) return;
      if (SOLID[m.rows[y][x]]) return;
      seen[k] = 1;
      if (blocked[k]) return; // reachable by bump, not passable
      q.push([x, y]);
    });
  }
  return seen;
}

var anyFail = false;
var chestTotals = {};

Object.keys(MAPS).forEach(function (k) {
  var m = MAPS[k];
  var errs = [];

  // shape
  if (!m.rows || !m.rows.length) errs.push("no rows");
  else {
    if (m.grid !== m.rows) errs.push("grid is not an alias of rows");
    m.rows.forEach(function (r, i) {
      if (r.length !== m.w) errs.push("row " + i + " width " + r.length + " != " + m.w);
    });
    if (m.rows.length !== m.h) errs.push("h mismatch");
  }
  if (!m.entry) errs.push("no entry");
  else if (!walkable(m.rows[m.entry.y] && m.rows[m.entry.y][m.entry.x]))
    errs.push("entry (" + m.entry.x + "," + m.entry.y + ") not walkable");

  if (errs.length) {
    anyFail = true;
    console.log("FAIL " + k + "\n  " + errs.join("\n  "));
    return;
  }

  var seen = bfs(m);

  // 1) every walkable tile reachable
  var totalWalk = 0, unreach = [];
  for (var y = 0; y < m.h; y++)
    for (var x = 0; x < m.w; x++)
      if (walkable(m.rows[y][x])) {
        totalWalk++;
        if (!seen[x + "," + y]) unreach.push("(" + x + "," + y + ")'" + m.rows[y][x] + "'");
      }
  if (unreach.length)
    errs.push(unreach.length + " unreachable walkable tiles: " +
      unreach.slice(0, 8).join(" ") + (unreach.length > 8 ? " ..." : ""));

  // 2) events on walkable, reachable tiles
  var chestEvPos = {};
  var chestCount = 0;
  (m.events || []).forEach(function (ev) {
    var t = m.rows[ev.y] && m.rows[ev.y][ev.x];
    var tag = ev.type + (ev.id ? " " + ev.id : "") + " (" + ev.x + "," + ev.y + ")";
    if (!walkable(t)) errs.push(tag + " on solid/off-map tile '" + t + "'");
    else if (!seen[ev.x + "," + ev.y]) errs.push(tag + " not reachable");
    if (ev.type === "chest") {
      chestCount++;
      chestEvPos[ev.x + "," + ev.y] = 1;
      if (t !== "c") errs.push(tag + " not on 'c' tile (got '" + t + "')");
      if (!ev.loot) errs.push(tag + " has no loot");
    }
    // transfers: target map + landing tile
    if (ev.type === "stairs" || ev.type === "enter") {
      var dst = MAPS[ev.map];
      if (!dst) errs.push(tag + " -> unknown map '" + ev.map + "'");
      else {
        var dt = dst.rows[ev.ty] && dst.rows[ev.ty][ev.tx];
        if (!walkable(dt))
          errs.push(tag + " lands on solid tile (" + ev.tx + "," + ev.ty + ")='" + dt + "' in " + ev.map);
      }
    }
    if (ev.type === "boss" && !ev.enemy) errs.push(tag + " has no enemy id");
  });

  // 3) every 'c' tile has a chest event
  for (var cy = 0; cy < m.h; cy++)
    for (var cx = 0; cx < m.w; cx++)
      if (m.rows[cy][cx] === "c" && !chestEvPos[cx + "," + cy])
        errs.push("'c' tile (" + cx + "," + cy + ") has no chest event");

  // 4) exit target
  if (m.exit) {
    var xm = MAPS[m.exit.map];
    if (!xm) errs.push("exit -> unknown map '" + m.exit.map + "'");
    else {
      var xt = xm.rows[m.exit.y] && xm.rows[m.exit.y][m.exit.x];
      if (!walkable(xt))
        errs.push("exit lands on solid tile (" + m.exit.x + "," + m.exit.y + ")='" + xt + "' in " + m.exit.map);
    }
  }

  chestTotals[k] = chestCount;

  if (errs.length) {
    anyFail = true;
    console.log("FAIL " + k + " (" + m.w + "x" + m.h + ")\n  " + errs.join("\n  "));
  } else {
    console.log("PASS " + k + " (" + m.w + "x" + m.h + "): " +
      totalWalk + " walkable tiles all reachable, " +
      (m.events || []).length + " events ok" +
      (chestCount ? ", " + chestCount + " chests" : ""));
  }
});

// dungeon-wide chest minimums
var caveChests = (chestTotals.cave1_f1 || 0) + (chestTotals.cave1_f2 || 0) + (chestTotals.cave1_f3 || 0);
var towerChests = (chestTotals.tower_f1 || 0) + (chestTotals.tower_f2 || 0) +
                  (chestTotals.tower_f3 || 0) + (chestTotals.tower_f4 || 0);
if (caveChests < 8) { anyFail = true; console.log("FAIL cave1 total chests " + caveChests + " < 8"); }
else console.log("PASS cave1 total chests: " + caveChests + " (>= 8)");
if (towerChests < 8) { anyFail = true; console.log("FAIL tower total chests " + towerChests + " < 8"); }
else console.log("PASS tower total chests: " + towerChests + " (>= 8)");

if (anyFail) {
  console.log("RESULT: FAIL");
  process.exit(1);
}
console.log("RESULT: ALL PASS (" + Object.keys(MAPS).length + " maps)");
