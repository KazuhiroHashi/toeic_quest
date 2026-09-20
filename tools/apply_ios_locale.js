// iOS に「このアプリの言語は日本語です」と書き込む。
//
//   node tools/apply_ios_locale.js   （npm run cap:sync が自動で呼ぶ）
//
// ── なぜこの道具が要るのか ──────────────────────────────────
// App Store の製品ページには「言語」という行があり、そこに
// **EN 英語** とだけ出ていた。画面もメッセージも全部日本語のアプリなので、
// 利用者から見れば明らかに間違っている。
//
// この行は、ストアの入力欄から来ているのではない。**アップロードした
// ビルドの Info.plist** を Apple が読んで出している。つまり App Store
// Connect の画面をいくら探しても直せない。ビルドし直すしかない。
//
// 英語になっていたのは、Capacitor が作る Info.plist に
// CFBundleDevelopmentRegion = en しか入っていないため。Xcode の既定値。
//
// ── なぜ手で直さないのか ────────────────────────────────────
// ios/ はリポジトリに入れていない（Mac 側で npx cap add ios して作る）。
// 手で直すと、作り直したとき静かに元へ戻り、気づかないまま
// また「英語のみ」で出てしまう。apply_appid.js と同じ理由でここに置く。
//
// ── 何を書くか ────────────────────────────────────────────
// CFBundleDevelopmentRegion   ja    ← 既定の言語
// CFBundleLocalizations       [ja]  ← 対応している言語の一覧
//
// 一覧に en を入れていないのは、UI に英語版が無いから。出てくる英単語は
// 学習の中身であって、アプリの言語ではない。英語も出したくなったら
// 下の LOCALIZATIONS に "en" を足せばよい。
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var REGION = "ja";
var LOCALIZATIONS = ["ja"];

var f = path.join(root, "ios/App/App/Info.plist");
if (!fs.existsSync(f)) {
  console.log("skip ios (not generated yet): run `npx cap add ios` first");
  process.exit(0);
}

var s = fs.readFileSync(f, "utf8");
var orig = s;

// 一番外側の <dict> の直後。ここに差し込む。
var head = s.match(/<plist[^>]*>\s*<dict>/);
if (!head) {
  console.error("  ! ios: Info.plist の形が読めません（<plist><dict> が見つかりません）");
  console.error("    " + f);
  process.exit(1);
}
var at = head.index + head[0].length;

// すでにある同じ項目は、値ごと消してから入れ直す。
// 何度走らせても同じ結果になるようにしておく（cap add ios のたびに走るため）。
function drop(key, kind) {
  var re = new RegExp("\\s*<key>" + key + "</key>\\s*<" + kind + ">[\\s\\S]*?</" + kind + ">", "g");
  var was = s;
  s = s.replace(re, "");
  return was !== s;
}
function dropEmptyArray(key) {
  var re = new RegExp("\\s*<key>" + key + "</key>\\s*<array\\s*/>", "g");
  var was = s;
  s = s.replace(re, "");
  return was !== s;
}

var hadRegion = drop("CFBundleDevelopmentRegion", "string");
var hadLoc = drop("CFBundleLocalizations", "array") || dropEmptyArray("CFBundleLocalizations");

// 消したぶん位置がずれるので、取り直す。
head = s.match(/<plist[^>]*>\s*<dict>/);
at = head.index + head[0].length;

var block = "\n\t<key>CFBundleDevelopmentRegion</key>\n\t<string>" + REGION + "</string>" +
            "\n\t<key>CFBundleLocalizations</key>\n\t<array>" +
            LOCALIZATIONS.map(function (l) { return "\n\t\t<string>" + l + "</string>"; }).join("") +
            "\n\t</array>";

s = s.slice(0, at) + block + s.slice(at);

if (s === orig) {
  console.log("ios:     言語 " + REGION + " （変更なし）");
  process.exit(0);
}
fs.writeFileSync(f, s);
console.log("ios:     言語 -> " + REGION + " / 対応 [" + LOCALIZATIONS.join(", ") + "]" +
            (hadRegion || hadLoc ? "（既存の指定を置き換え）" : "（新規に追加）"));
