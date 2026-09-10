// iOS のバンドルIDを、Android とは別の値に戻す。
//
//   node tools/apply_appid.js        （npm run cap:sync が自動で呼ぶ）
//
// ── なぜ2つに分かれているのか ────────────────────────────────
// Android : com.bridgeai.wordria   ← Google Play に登録した値
// iOS     : com.bridgeai.wordquest ← App Store に登録済みの値（変えられない）
//
// iOS は改名前に App Store Connect でアプリを作ってしまっているので、
// バンドルIDを変えると別アプリ扱いになり、記録も購読も全部切れる。
// 一方 Android はまだ一度も出していなかったので、公開URLに出る
// パッケージ名を新しい名前にできた。
//   play.google.com/store/apps/details?id=com.bridgeai.wordria
//
// Apple と Google は互いのIDを見ていないので、揃っていなくても問題ない。
//
// ── なぜこの道具が要るのか ──────────────────────────────────
// capacitor.config.json の appId は1つしか持てず、Android と iOS の
// 両方に同じ値が入る。そこで appId には Android 用の値を入れておき、
// iOS 側だけこの道具で書き戻す。iOS が触るのは project.pbxproj の
// PRODUCT_BUNDLE_IDENTIFIER だけなので、書き換え箇所が少なくて済む。
//
// npx cap add ios のあとに走らせること。cap sync は pbxproj を
// 書き換えないので、何度実行しても同じ結果になる。
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var IOS_BUNDLE_ID = "com.bridgeai.wordquest";      // App Store 登録済み。変えないこと
var ANDROID_APP_ID = "com.bridgeai.wordria";       // Google Play 登録済み。変えないこと

var bad = false;

// ---------- iOS: project.pbxproj ----------
(function () {
  var f = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
  if (!fs.existsSync(f)) { console.log("skip ios (not generated yet): run `npx cap add ios` first"); return; }
  var s = fs.readFileSync(f, "utf8");
  var re = /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g;
  var before = (s.match(re) || []).length;
  if (!before) { console.error("  ! ios: PRODUCT_BUNDLE_IDENTIFIER が見つかりません"); bad = true; return; }
  s = s.replace(re, "PRODUCT_BUNDLE_IDENTIFIER = " + IOS_BUNDLE_ID + ";");
  fs.writeFileSync(f, s);
  console.log("ios:     bundle id -> " + IOS_BUNDLE_ID + "  (" + before + "箇所)");
})();

// ---------- Android: 生成された値を確かめるだけ ----------
// ここは capacitor.config.json の appId がそのまま入るので、書き換えない。
// 食い違っていたら Play Console がアップロードを弾くので、先に気づけるようにする。
(function () {
  var f = path.join(root, "android/app/build.gradle");
  if (!fs.existsSync(f)) { console.log("skip android (not generated yet): run `npx cap add android` first"); return; }
  var m = fs.readFileSync(f, "utf8").match(/applicationId\s+"([^"]+)"/);
  var got = m ? m[1] : "(見つからず)";
  if (got !== ANDROID_APP_ID) {
    console.error("  ! android: applicationId が " + got + " になっています");
    console.error("    期待値は " + ANDROID_APP_ID + "。capacitor.config.json の appId を確認してください。");
    console.error("    このまま作った AAB は Play Console に受け付けてもらえません。");
    bad = true;
    return;
  }
  console.log("android: applicationId " + got + "  OK");
})();

if (bad) process.exit(1);
