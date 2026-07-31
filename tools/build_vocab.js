// Build data/vocab_jhs.js and data/vocab_hs.js from tools/vocabsrc/*.txt
// Source format: word|meaning|pos  (one per line)
// Dedupes across files (earlier level wins), validates, prints stats.
"use strict";
var fs = require("fs"), path = require("path");
var root = path.join(__dirname, "..");
var SRC = path.join(__dirname, "vocabsrc");

function load(file) {
  var out = [], bad = [];
  fs.readFileSync(path.join(SRC, file), "utf8").split("\n").forEach(function (line, i) {
    line = line.trim();
    if (!line) return;
    var p = line.split("|");
    if (p.length !== 3) { bad.push(file + ":" + (i + 1) + " " + line); return; }
    var w = p[0].trim(), m = p[1].trim(), pos = p[2].trim();
    // reject entries that are not real English words / have placeholder meanings
    if (!/^[a-zA-Z][a-zA-Z' .-]*$/.test(w) || m === "" || m === "—") { bad.push(file + ":" + (i + 1) + " " + line); return; }
    out.push({ w: w, m: m, p: pos });
  });
  if (bad.length) { console.log("  skipped " + bad.length + " invalid line(s) in " + file); bad.slice(0,5).forEach(function(b){console.log("    "+b);}); }
  return out;
}

function dedupe(groups) { // groups: [[name, entries], ...]; earlier wins
  var seen = {}, res = [];
  groups.forEach(function (g) {
    var kept = [];
    g[1].forEach(function (e) {
      var k = e.w.toLowerCase();
      if (seen[k]) return;
      seen[k] = 1; kept.push(e);
    });
    res.push([g[0], kept]);
  });
  return res;
}

function emit(file, globalName, groups, header) {
  var s = header + "\nwindow." + globalName + " = window." + globalName + " || {};\n\n";
  var all = [];
  groups.forEach(function (g) {
    s += "window." + globalName + "[" + JSON.stringify(g[0]) + "] = [\n";
    s += g[1].map(function (e) { return JSON.stringify(e).replace(/"(\w)":/g, "$1:"); }).join(",\n");
    s += "\n];\n\n";
    all = all.concat(g[1]);
  });
  s += "// 全レベル結合（出題プール用の入口）\nwindow." + globalName + ".all = [].concat(" +
       groups.map(function (g) { return "window." + globalName + "[" + JSON.stringify(g[0]) + "]"; }).join(", ") + ");\n";
  fs.writeFileSync(path.join(root, "data", file), s);
  console.log(file + ": " + all.length + " words  [" + groups.map(function(g){return g[0]+":"+g[1].length;}).join(", ") + "]");
  return all;
}

console.log("--- building ---");
var jhs = dedupe([["basic", load("jhs1.txt")], ["advanced", load("jhs2.txt")]]);
var jhsAll = emit("vocab_jhs.js", "VOCAB_JHS", jhs,
  "// 中学英単語（学習指導要領: 中学で1600〜1800語）\n// basic=中1〜中2中心 / advanced=中2〜中3・高校入試\n// 形式は既存VOCABと同じ {w:単語, m:意味, p:品詞}");

// high school: exclude words already in JHS so the sets don't overlap
var jhsSet = {}; jhsAll.forEach(function (e) { jhsSet[e.w.toLowerCase()] = 1; });
function notInJhs(list) { return list.filter(function (e) { return !jhsSet[e.w.toLowerCase()]; }); }
var hs = dedupe([
  ["standard", notInJhs(load("hs1.txt"))],
  ["advanced", notInJhs(load("hs2.txt"))],
  ["idiom", notInJhs(load("phrase.txt"))]
]);
var hsAll = emit("vocab_hs.js", "VOCAB_HS", hs,
  "// 高校英単語（学習指導要領: 高校で1800〜2500語 / 大学受験は総語彙4000〜5000語）\n// standard=共通テスト基礎〜標準 / advanced=難関大 / idiom=入試頻出熟語\n// 中学データ(VOCAB_JHS)と重複しないよう除外済み");

console.log("--- totals ---");
console.log("中学: " + jhsAll.length + " 語");
console.log("高校: " + hsAll.length + " 語（うち熟語 " + hs[2][1].length + "）");
console.log("合計: " + (jhsAll.length + hsAll.length) + " 語  → 大学受験の目安4000〜5000語に対する充足度: " +
  Math.round((jhsAll.length + hsAll.length) / 4500 * 100) + "%");
