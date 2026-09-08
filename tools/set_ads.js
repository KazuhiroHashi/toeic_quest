#!/usr/bin/env node
// 広告の設定を書き換える。深夜に「Claudeに頼まないと切り替えられない」状態を
// 作らないための道具。party/js/pnative.js を直接編集する。
//
//   node tools/set_ads.js --show
//   node tools/set_ads.js --interstitial-ios ca-app-pub-xxx/yyy
//   node tools/set_ads.js --live      # testing: false（本番広告）
//   node tools/set_ads.js --test      # testing: true（テスト広告）
"use strict";
var fs = require("fs");
var path = require("path");
var F = path.join(__dirname, "..", "party", "js", "pnative.js");
var TEST_PREFIX = "ca-app-pub-3940256099942544";   // Google のテスト用アカウント
// 設定行だけに一致させる。コメントにも "testing:false" の字が出てくるので、
// 素朴に /testing:\s*false/ で見ると、書き換えていないのに本番だと誤判定する
var LINE = /^(\s*testing:\s*)(?:true|false)(\s*,)/m;

var KEYS = {
  "--rewarded-android": "rewardedAndroid", "--rewarded-ios": "rewardedIos",
  "--interstitial-android": "interstitialAndroid", "--interstitial-ios": "interstitialIos"
};

var src = fs.readFileSync(F, "utf8");
var args = process.argv.slice(2);
var changed = false;

function get(key) {
  var m = new RegExp(key + ':\\s*"([^"]*)"').exec(src);
  return m ? m[1] : null;
}
function set(key, val) {
  var re = new RegExp("(" + key + ':\\s*")[^"]*(")');
  if (!re.test(src)) { console.error("見つかりません: " + key); process.exit(1); }
  src = src.replace(re, "$1" + val + "$2");
  changed = true;
}

for (var i = 0; i < args.length; i++) {
  var a = args[i];
  if (KEYS[a]) {
    var v = args[++i];
    if (!/^ca-app-pub-\d+\/\d+$/.test(v || "")) {
      console.error("広告ユニットIDの形式が違います: " + v);
      console.error("  正しい形: ca-app-pub-3056251560404390/1234567890");
      process.exit(1);
    }
    set(KEYS[a], v);
  } else if (a === "--live") {
    src = src.replace(LINE, "$1false$2"); changed = true;
  } else if (a === "--test") {
    src = src.replace(LINE, "$1true$2"); changed = true;
  } else if (a !== "--show") {
    console.error("知らない指定: " + a); process.exit(1);
  }
}
if (changed) fs.writeFileSync(F, src);

var m = LINE.exec(src);
if (!m) { console.error("testing の行が見つかりません"); process.exit(1); }
var live = /false/.test(m[0]);
console.log("\n広告の設定");
console.log("  モード  " + (live ? "本番（testing: false）" : "テスト（testing: true）"));
var testIds = [];
Object.keys(KEYS).forEach(function (k) {
  var name = KEYS[k], v = get(name);
  var isTest = v && v.indexOf(TEST_PREFIX) === 0;
  if (isTest) testIds.push(name);
  console.log("  " + name.padEnd(20) + " " + v + (isTest ? "   ← Googleのテスト用" : ""));
});
if (live && testIds.length) {
  console.log("\n★ 本番モードなのにテスト用IDが残っています: " + testIds.join(", "));
  console.log("  このまま公開すると、その枠の広告収入はゼロになります。");
  process.exitCode = 2;
} else if (live) {
  console.log("\n本番の広告IDが揃っています。");
}
console.log("");
