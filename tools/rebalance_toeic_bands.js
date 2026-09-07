#!/usr/bin/env node
// TOEIC語彙6帯（data/vocab_400〜900.js）を作り直す。
//
// 問題：帯ごとに独立して出題する作りなのに、元データは帯をまたいで
// 大量に重複していた（500点台の47%・600点台の57%が下の帯の使い回し）。
// 「600点台」を選んでも、出る語の半分以上が400〜500点台の語だった。
// これが「600〜800点台が簡単に感じる」の正体。
//
// やること：
//   1. 6帯をまとめて、同じ語は1つだけ残す（1,907語になる）
//   2. 難易度を score() で決めて並べ替え、6等分（約318語ずつ）に切り直す
//
// 難易度の決め方（優先順）：
//   a) 元々どの帯で最初に出てきたか（最小の帯）＝人が最初に判定した難易度。
//      これを主軸にする。学校語彙の有無だけで決めると、"visa"や"memo"のような
//      TOEIC頻出の基礎語が、学校教科書に無いというだけで難しい側に流れてしまう
//   b) 中学・高校の語彙リストにあるか（あれば、同じ元の帯の中でより易しい側へ）
//   c) 語の長さ（弱い目安。同点のときだけ効く）
//   d) 元のリストでの並び順（同点のときの最後の決め手）
//
// 実行：
//   node tools/rebalance_toeic_bands.js         # 書き出す
//   node tools/rebalance_toeic_bands.js --check  # 書き出さず、結果だけ表示
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var DATA = path.join(root, "data");
var BANDS = ["400", "500", "600", "700", "800", "900"];
var CHECK = process.argv.includes("--check");

function loadVocab(file) {
  var sandbox = { window: { VOCAB: {}, VOCAB_JHS: {}, VOCAB_HS: {} } };
  var code = fs.readFileSync(path.join(DATA, file), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("window", code)(sandbox.window);
  return sandbox.window;
}

// ---- 読み込み ----
var vocab = {};
BANDS.forEach(function (b) {
  vocab[b] = loadVocab("vocab_" + b + ".js").VOCAB[b] || [];
});
var jhsWin = loadVocab("vocab_jhs.js");
var hsWin = loadVocab("vocab_hs.js");
var JHS_ORDER = ["g1", "g2", "g3"];
var HS_ORDER = ["lv1", "lv2", "lv3"];

var jhsTier = {}, hsTier = {};
JHS_ORDER.forEach(function (k, i) {
  (jhsWin.VOCAB_JHS[k] || []).forEach(function (e) { if (jhsTier[e.w] === undefined) jhsTier[e.w] = i; });
});
HS_ORDER.forEach(function (k, i) {
  (hsWin.VOCAB_HS[k] || []).forEach(function (e) { if (hsTier[e.w] === undefined) hsTier[e.w] = i; });
});

// ---- 重複除去。同じ語は、最初に出てきた（＝最も低い）帯の表記を残す ----
var entries = {};
BANDS.forEach(function (b, bi) {
  vocab[b].forEach(function (e, pos) {
    if (!entries[e.w]) entries[e.w] = { w: e.w, m: e.m, p: e.p, band: bi, pos: pos };
  });
});
var list = Object.keys(entries).map(function (w) { return entries[w]; });

// ---- 難易度スコア ----
list.forEach(function (e) {
  var jt = jhsTier[e.w], ht = hsTier[e.w];
  var eduTier = jt !== undefined ? jt : (ht !== undefined ? 3 + ht : 6);
  e.eduTier = eduTier;
  e.score = e.band * 100000 + eduTier * 1000 + e.w.length * 10 + Math.min(e.pos, 9);
});
list.sort(function (a, b) { return a.score - b.score; });

// ---- 6等分。割り切れない分は前の帯から順に1語ずつ多く持つ ----
var n = list.length;
var per = Math.floor(n / BANDS.length);
var rem = n % BANDS.length;
var out = {}, idx = 0;
BANDS.forEach(function (b, i) {
  var take = per + (i < rem ? 1 : 0);
  out[b] = list.slice(idx, idx + take);
  idx += take;
});

// ---- 表示・確認 ----
console.log("元の総語数（重複込み）: " + BANDS.reduce(function (s, b) { return s + vocab[b].length; }, 0));
console.log("重複を除いた実語数    : " + n);
console.log("");
BANDS.forEach(function (b) {
  var slice = out[b];
  var fromOrig = {};
  slice.forEach(function (e) { fromOrig[BANDS[e.band]] = (fromOrig[BANDS[e.band]] || 0) + 1; });
  console.log(b + "点台  " + slice.length + "語   元の内訳: " + JSON.stringify(fromOrig));
});

if (CHECK) { console.log("\n--check のため書き出しはしていません。"); process.exit(0); }

// ---- 書き出し ----
BANDS.forEach(function (b) {
  var slice = out[b];
  var lines = slice.map(function (e) {
    return "{w:" + JSON.stringify(e.w) + ",m:" + JSON.stringify(e.m) + ",p:" + JSON.stringify(e.p) + "}";
  });
  var body =
    "// TOEIC " + b + " level vocabulary (" + slice.length + " words)\n" +
    "// 2026-09-07 に作り直した。帯をまたぐ重複を除き、6等分に割り直したもの\n" +
    "// （経緯は tools/rebalance_toeic_bands.js を参照）。出題は重み付き抽選で\n" +
    "// 選ぶので、このリストの並び順は結果に影響しない。\n" +
    "window.VOCAB = window.VOCAB || {};\n" +
    "window.VOCAB[" + b + "] = [\n" +
    lines.join(",\n") +
    "\n];\n";
  fs.writeFileSync(path.join(DATA, "vocab_" + b + ".js"), body);
});
console.log("\ndata/vocab_400.js 〜 vocab_900.js を書き直しました。");
