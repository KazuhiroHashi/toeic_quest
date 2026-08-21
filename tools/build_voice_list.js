#!/usr/bin/env node
// WORD QUEST - リスニング音声の割り当てと生成バッチを作る
//
//   node tools/build_voice_list.js            # build/voice_plan.json を書き出す
//   node tools/build_voice_list.js --show 3   # バッチを3つ表示（貼り付け用）
//
// 方針
// - 全単語（重複なし）を男性／女性に振り分ける。1語につき1つの声だけを録るので、
//   音声データは2倍にならない
// - 割り当ては単語名から機械的に決める。乱数にすると復習のたびに声が変わり、
//   「あの声のあの単語」という記憶の手がかりを壊してしまう
// - 生成は1語ずつではなく、同じ声の単語を40語まとめて1回で作り、
//   無音で切り分ける（8語で検証済み：区切りが1:1で取れる）
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var PER_BATCH = 40;      // 1回の生成に入れる語数
var SEP = ".\n\n";       // 語の区切り。無音が0.3秒前後できるので切り分けられる

// ---- 単語を集める（TOEIC・中学・高校をまとめ、重複は落とす） ----
global.window = {};
["400", "500", "600", "700", "800", "900"].forEach(function (f) {
  eval(fs.readFileSync(path.join(root, "data", "vocab_" + f + ".js"), "utf8"));
});
["jhs", "hs"].forEach(function (f) {
  eval(fs.readFileSync(path.join(root, "data", "vocab_" + f + ".js"), "utf8"));
});

var seen = {}, words = [];
function add(list) {
  (list || []).forEach(function (e) {
    if (!e || !e.w || seen[e.w]) return;
    seen[e.w] = 1;
    words.push(e.w);
  });
}
[400, 500, 600, 700, 800, 900].forEach(function (l) { add(window.VOCAB[l]); });
["g1", "g2", "g3"].forEach(function (k) { add((window.VOCAB_JHS || {})[k]); });
["lv1", "lv2", "lv3"].forEach(function (k) { add((window.VOCAB_HS || {})[k]); });
words.sort();

// ---- 声の割り当て（FNV-1a、単語が同じなら常に同じ結果） ----
function hash(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
}
function voiceOf(w) { return (hash(w) & 1) ? "m" : "f"; }

// ---- ファイル名（熟語は空白をハイフンに。ファイル名に使えない字は落とす） ----
function slug(w) {
  return w.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

var assign = {}, bySlug = {}, dupes = [];
words.forEach(function (w) {
  var s = slug(w);
  if (bySlug[s]) { dupes.push([bySlug[s], w, s]); return; }
  bySlug[s] = w;
  assign[w] = { v: voiceOf(w), f: s + ".mp3" };
});

// ---- 生成バッチ（声ごとに分け、40語ずつ） ----
var batches = [];
["f", "m"].forEach(function (v) {
  var list = words.filter(function (w) { return assign[w] && assign[w].v === v; });
  for (var i = 0; i < list.length; i += PER_BATCH) {
    var chunk = list.slice(i, i + PER_BATCH);
    batches.push({
      id: v + String(batches.length).padStart(3, "0"),
      voice: v,
      words: chunk,
      prompt: chunk.join(SEP) + "."
    });
  }
});

var nf = words.filter(function (w) { return assign[w] && assign[w].v === "f"; }).length;
var nm = words.filter(function (w) { return assign[w] && assign[w].v === "m"; }).length;

var out = {
  builtFrom: "data/vocab_400..900.js, vocab_jhs.js, vocab_hs.js",
  total: Object.keys(assign).length,
  female: nf,
  male: nm,
  perBatch: PER_BATCH,
  batches: batches.length,
  assign: assign
};

var showN = 0;
var si = process.argv.indexOf("--show");
if (si >= 0) showN = parseInt(process.argv[si + 1], 10) || 1;

fs.mkdirSync(path.join(root, "build"), { recursive: true });
fs.writeFileSync(path.join(root, "build", "voice_plan.json"), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(root, "build", "voice_batches.json"), JSON.stringify(batches, null, 1));

console.log("単語        " + out.total + "語（重複なし）");
console.log("女性        " + nf + "語  (" + (nf / out.total * 100).toFixed(1) + "%)");
console.log("男性        " + nm + "語  (" + (nm / out.total * 100).toFixed(1) + "%)");
console.log("生成バッチ   " + batches.length + "回（1回 " + PER_BATCH + "語）");
if (dupes.length) {
  console.log("\n! ファイル名が衝突した語 " + dupes.length + "件（後勝ちで除外済み）");
  dupes.slice(0, 5).forEach(function (d) { console.log("   " + d[0] + " / " + d[1] + " -> " + d[2]); });
}
console.log("\n書き出し: build/voice_plan.json, build/voice_batches.json");

for (var b = 0; b < showN && b < batches.length; b++) {
  console.log("\n--- バッチ " + batches[b].id + "（" + (batches[b].voice === "f" ? "女性" : "男性") +
              " / " + batches[b].words.length + "語）---");
  console.log(batches[b].prompt);
}
