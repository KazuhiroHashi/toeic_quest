#!/usr/bin/env node
// TOEIC語彙に新しい語を足し、6帯を作り直す。
//
// tools/rebalance_toeic_bands.js の続き。あちらは「既にある語の重複を除いて
// 割り直す」道具で、これは「新しい語を足してから、同じやり方で割り直す」道具。
// 新しい語には元の帯（このアプリで最初にどの帯に置かれていたか）が無いので、
// その代わりを推定する必要がある。
//
// 推定のしかた：
//   - 中学・高校の語彙リストにあれば、そこから帯を決める
//     （中1〜中3 → 400〜500点台寄り、高校基礎〜難関大 → 600〜900点台寄り）
//   - どちらにも無ければ、語の長さと熟語かどうかから見積もる
//     （短い語・易しい熟語ほど低い帯、長い語ほど高い帯）
// これは既存語の「元々どの帯にあったか」という強い手がかりに比べると弱い
// 目安でしかないので、既存語の並びを主に、新語はその隙間に混ざる形になる。
//
// 入力：
//   tools/toeic_word_candidates/*.js に window.NEW = [...] の形で追加候補を置く
//   （build/ ではなくここに置く。build/ はキャッシュとしてgit管理外だが、
//    この候補リストは中身そのものなので、次に語を足すときのために残す）
//   今の6帯と重複する語は、実行時に自動で確認・除外される
//
// 実行：
//   node tools/add_toeic_words.js --check   # 書き出さず、結果だけ表示
//   node tools/add_toeic_words.js           # 書き出す
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var DATA = path.join(root, "data");
var CAND = path.join(root, "tools", "toeic_word_candidates");
var BANDS = ["400", "500", "600", "700", "800", "900"];
var CHECK = process.argv.includes("--check");

function loadIn(file, dir) {
  var sandbox = { window: { VOCAB: {}, VOCAB_JHS: {}, VOCAB_HS: {}, NEW: [] } };
  var code = fs.readFileSync(path.join(dir, file), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("window", code)(sandbox.window);
  return sandbox.window;
}

// ---- 既存の6帯（重複はもう無い前提。rebalance_toeic_bands.js の出力）----
var entries = {};
BANDS.forEach(function (b, bi) {
  loadIn("vocab_" + b + ".js", DATA).VOCAB[b].forEach(function (e, pos) {
    entries[e.w] = { w: e.w, m: e.m, p: e.p, band: bi, pos: pos, isNew: false };
  });
});
var beforeCount = Object.keys(entries).length;

// ---- 中学・高校の語彙（帯の見積もりに使う）----
var jhsWin = loadIn("vocab_jhs.js", DATA);
var hsWin = loadIn("vocab_hs.js", DATA);
var JHS_ORDER = ["g1", "g2", "g3"];
var HS_ORDER = ["lv1", "lv2", "lv3"];
var jhsTier = {}, hsTier = {};
JHS_ORDER.forEach(function (k, i) {
  (jhsWin.VOCAB_JHS[k] || []).forEach(function (e) { if (jhsTier[e.w] === undefined) jhsTier[e.w] = i; });
});
HS_ORDER.forEach(function (k, i) {
  (hsWin.VOCAB_HS[k] || []).forEach(function (e) { if (hsTier[e.w] === undefined) hsTier[e.w] = i; });
});

// ---- 追加候補を読み込み、既存と重複しないものだけ採用 ----
var candFiles = fs.existsSync(CAND) ? fs.readdirSync(CAND).filter(function (f) { return /\.js$/.test(f); }).sort() : [];
var newRaw = [];
candFiles.forEach(function (f) { newRaw = newRaw.concat(loadIn(f, CAND).NEW); });

var added = 0, skippedDup = 0;
newRaw.forEach(function (e) {
  if (!e || !e.w) return;
  if (entries[e.w]) { skippedDup++; return; }        // 既存と重複
  entries[e.w] = { w: e.w, m: e.m, p: e.p, isNew: true };
  added++;
});

console.log("候補ファイル: " + candFiles.length + "件");
console.log("既存語（重複除去済み）: " + beforeCount);
console.log("追加候補（重複込み）: " + newRaw.length + "  → 採用 " + added + "  → 既存と重複のため除外 " + skippedDup);
console.log("合計: " + Object.keys(entries).length);
console.log("");

// ---- 難易度スコア。既存語は元の帯を主軸に、新語は見積もった帯を主軸にする ----
var list = Object.keys(entries).map(function (w) { return entries[w]; });
list.forEach(function (e) {
  var jt = jhsTier[e.w], ht = hsTier[e.w];
  var eduTier = jt !== undefined ? jt : (ht !== undefined ? 3 + ht : 6);
  e.eduTier = eduTier;

  if (e.band === undefined) {
    // 新語の帯を見積もる。中学・高校の語彙にあればそこから、無ければ
    // 語の長さ（熟語はやや割り引く）から。0(400点台寄り)〜5(900点台寄り)
    var est;
    if (jt !== undefined) est = jt * 0.7;                       // 中学語彙 → 低め
    else if (ht !== undefined) est = 2 + ht * 1.0;               // 高校語彙 → 中〜高め
    else {
      var isPhrase = e.w.indexOf(" ") >= 0;
      var len = e.w.replace(/ /g, "").length;
      est = Math.min(5, Math.max(0, (len - 4) / 2.3)) - (isPhrase ? 0.8 : 0);
    }
    e.band = Math.min(5, Math.max(0, Math.round(est)));
  }
  e.score = e.band * 100000 + e.eduTier * 1000 + e.w.length * 10 + Math.min(e.pos || 0, 9);
});
list.sort(function (a, b) { return a.score - b.score; });

// ---- 6等分 ----
var n = list.length;
var per = Math.floor(n / BANDS.length);
var rem = n % BANDS.length;
var out = {}, idx = 0;
BANDS.forEach(function (b, i) {
  var take = per + (i < rem ? 1 : 0);
  out[b] = list.slice(idx, idx + take);
  idx += take;
});

BANDS.forEach(function (b) {
  var slice = out[b];
  var newInSlice = slice.filter(function (e) { return e.isNew; }).length;
  console.log(b + "点台  " + slice.length + "語  （うち新規 " + newInSlice + "語）");
});

if (CHECK) { console.log("\n--check のため書き出しはしていません。"); process.exit(0); }

BANDS.forEach(function (b) {
  var slice = out[b];
  var lines = slice.map(function (e) {
    return "{w:" + JSON.stringify(e.w) + ",m:" + JSON.stringify(e.m) + ",p:" + JSON.stringify(e.p) + "}";
  });
  var body =
    "// TOEIC " + b + " level vocabulary (" + slice.length + " words)\n" +
    "// 2026-09-07 に語を追加して作り直した（tools/add_toeic_words.js）。\n" +
    "// 出題は重み付き抽選で選ぶので、このリストの並び順は結果に影響しない。\n" +
    "window.VOCAB = window.VOCAB || {};\n" +
    "window.VOCAB[" + b + "] = [\n" +
    lines.join(",\n") +
    "\n];\n";
  fs.writeFileSync(path.join(DATA, "vocab_" + b + ".js"), body);
});
console.log("\ndata/vocab_400.js 〜 vocab_900.js を書き直しました。");
console.log("次: node tools/build_voice_list.js && python3 tools/gen_voice_local.py");
