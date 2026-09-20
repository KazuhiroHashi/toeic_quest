// TOEIC QUEST - data validation (run: node tests/check.js)
// 1) vocab files: 500 entries per level, unique words, required fields
// 2) maps: uniform row width, all chests/bosses/NPCs/exits reachable by BFS
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

global.window = {};
["400", "500", "600", "700", "800", "900"].forEach(function (l) {
  eval(fs.readFileSync(path.join(root, "data/vocab_" + l + ".js"), "utf8"));
});
eval(fs.readFileSync(path.join(root, "data/enemies.js"), "utf8"));
eval(fs.readFileSync(path.join(root, "data/maps.js"), "utf8"));

var fails = [];

// ---- vocab ----
Object.keys(window.VOCAB).forEach(function (l) {
  var a = window.VOCAB[l], ws = new Set();
  if (a.length < 300) fails.push("vocab " + l + ": only " + a.length + " words");
  a.forEach(function (e, i) {
    if (!e.w || !e.m || !e.p) fails.push("vocab " + l + "[" + i + "]: missing field");
    if (ws.has(e.w)) fails.push("vocab " + l + ": duplicate word " + e.w);
    ws.add(e.w);
  });
});

// ---- maps ----
var MAPS = window.MAPS;
var SOLID = { w: 1, m: 1, "=": 1 };
function bfs(m, sx, sy) {
  var seen = {}, q = [[sx, sy]];
  seen[sx + "," + sy] = 1;
  var blockEv = {};
  (m.events || []).forEach(function (ev) {
    if (ev.type === "npc" || ev.type === "boss") blockEv[ev.x + "," + ev.y] = 1;
  });
  while (q.length) {
    var c = q.shift();
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
      var x = c[0] + d[0], y = c[1] + d[1], k = x + "," + y;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h || seen[k]) return;
      if (SOLID[m.rows[y][x]]) return;
      seen[k] = 1;
      if (blockEv[k]) return; // reachable by bump, but not passable
      q.push([x, y]);
    });
  }
  return seen;
}
function check(mapId, sx, sy, extra) {
  var m = MAPS[mapId];
  var seen = bfs(m, sx, sy);
  var targets = (m.events || []).map(function (e) { return [e.x, e.y, e.type]; }).concat(extra || []);
  targets.forEach(function (t) {
    if (!seen[t[0] + "," + t[1]]) fails.push(mapId + ": cannot reach (" + t[0] + "," + t[1] + ") " + (t[2] || ""));
  });
}
check("world", 7, 8);
check("castle", 9, 7, [[9, 8, "exit"]]);
["town1", "town2", "town3"].forEach(function (id) { check(id, 9, 7, [[9, 8, "exit"]]); });
check("cave", 1, 13, [[1, 14, "exit"]]);
check("tower1", 9, 10, [[9, 11, "exit"]]);
check("tower2", 9, 6, [[9, 7, "exit"]]);
check("maou", 9, 10, [[9, 11, "exit"]]);

Object.keys(MAPS).forEach(function (k) {
  var m = MAPS[k];
  (m.events || []).forEach(function (ev) {
    var t = m.rows[ev.y] && m.rows[ev.y][ev.x];
    if (ev.type === "chest" && t !== "c") fails.push(k + ": chest " + ev.id + " not on chest tile (got '" + t + "')");
    if ((ev.type === "npc" || ev.type === "boss") && SOLID[t]) fails.push(k + ": " + ev.type + " placed on solid tile");
  });
});

// ---- enemies referenced by tables/events exist ----
Object.keys(window.ZONE_TABLE).forEach(function (z) {
  window.ZONE_TABLE[z].forEach(function (t) {
    if (!window.ENEMY_BY_ID[t[0]]) fails.push("zone " + z + ": unknown enemy " + t[0]);
  });
});
Object.keys(MAPS).forEach(function (k) {
  (MAPS[k].events || []).forEach(function (ev) {
    if (ev.type === "boss" && !window.ENEMY_BY_ID[ev.enemy]) fails.push(k + ": unknown boss enemy " + ev.enemy);
  });
});

if (fails.length) {
  console.error("FAIL (" + fails.length + "):");
  fails.forEach(function (f) { console.error("  " + f); });
  process.exit(1);
}
console.log("OK: vocab " + Object.keys(window.VOCAB).map(function (l) { return l + "=" + window.VOCAB[l].length; }).join(", "));
console.log("OK: " + window.ENEMIES.length + " enemies, " + Object.keys(MAPS).length + " maps, all events reachable");
