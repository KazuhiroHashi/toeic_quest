// アプリの版番号を、生成された android/ ios/ に書き込む。
//
//   node tools/apply_version.js          （npm run cap:sync が自動で呼ぶ）
//   node tools/apply_version.js --bump   （版番号を1つ上げてから書き込む）
//
// ── なぜこの道具が要るのか ──────────────────────────────────
// Google Play は、同じ versionCode のファイルを二度は受け付けない。
// 出し直すたびに 1つずつ上げる必要がある。
//
// ところが `npx cap add android` で作り直すと、versionCode は必ず 1 に
// 戻る。Capacitor 8 に上げたときのように android/ を作り直すことがあるので、
// 手で直していると、そのたびに戻ってしまい、気づかずアップロードして
// 弾かれる。
//
// そこで番号を version.json に置き、毎回そこから書き戻す。
// android/ を何度作り直しても、番号は version.json のものになる。
//
// ── 2つの番号の違い ────────────────────────────────────────
//   code : Play が「どちらが新しいか」を判断する番号。利用者には見えない。
//          出し直すたびに必ず上げる。飛んでも構わないが、下げてはいけない
//   name : ストアとアプリ内に出る表示用の文字列（1.0 など）。
//          中身が変わらない作り直しなら、据え置いてよい
//
// ── 使い方 ────────────────────────────────────────────────
// 出し直す前に一度だけ：
//     npm run bump          ← code が 1つ上がる
//     npm run cap:sync      ← android/ に書き込まれる
// bump を忘れると、Play が「このバージョンコードは既に使用されています」
// と言って弾く。そのときは bump してから作り直せばよい。
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var VFILE = path.join(root, "version.json");

if (!fs.existsSync(VFILE)) {
  console.error("  ! version.json がありません: " + VFILE);
  process.exit(1);
}
var v = JSON.parse(fs.readFileSync(VFILE, "utf8"));
if (typeof v.code !== "number" || !v.name) {
  console.error("  ! version.json の中身が正しくありません（code は数値、name は文字列）");
  process.exit(1);
}

if (process.argv.indexOf("--bump") >= 0) {
  v.code += 1;
  fs.writeFileSync(VFILE, JSON.stringify(v, null, 2) + "\n");
  console.log("version: code を " + (v.code - 1) + " → " + v.code + " に上げました");
}

var bad = false;

// ---------- Android: app/build.gradle ----------
(function () {
  var f = path.join(root, "android/app/build.gradle");
  if (!fs.existsSync(f)) { console.log("skip android (not generated yet): run `npx cap add android` first"); return; }
  var s = fs.readFileSync(f, "utf8");
  var reC = /versionCode\s+\d+/, reN = /versionName\s+"[^"]*"/;
  if (!reC.test(s) || !reN.test(s)) {
    console.error("  ! android: versionCode / versionName が見つかりません（build.gradle の形が変わった？）");
    bad = true; return;
  }
  s = s.replace(reC, "versionCode " + v.code).replace(reN, 'versionName "' + v.name + '"');
  fs.writeFileSync(f, s);
  console.log("android: versionCode " + v.code + " / versionName " + v.name);
})();

// ---------- iOS: project.pbxproj ----------
// MARKETING_VERSION が表示用、CURRENT_PROJECT_VERSION が Play の code にあたるもの
(function () {
  var f = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
  if (!fs.existsSync(f)) { console.log("skip ios (not generated yet): run `npx cap add ios` first"); return; }
  var s = fs.readFileSync(f, "utf8");
  var n = 0;
  s = s.replace(/MARKETING_VERSION = [^;]+;/g, function () { n++; return "MARKETING_VERSION = " + v.name + ";"; });
  s = s.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, function () { return "CURRENT_PROJECT_VERSION = " + v.code + ";"; });
  if (!n) { console.log("  ! ios: MARKETING_VERSION が見つかりません（Xcode で設定を確認してください）"); return; }
  fs.writeFileSync(f, s);
  console.log("ios:     version " + v.name + " (" + v.code + ")  (" + n + "箇所)");
})();

if (bad) process.exit(1);
