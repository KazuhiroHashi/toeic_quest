// Inject the AdMob App IDs into the generated native projects.
// Run after `npx cap add android` / `npx cap sync` (npm run cap:sync does it automatically).
// Safe to run repeatedly — it replaces an existing entry instead of duplicating.
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var ANDROID_APP_ID = "ca-app-pub-3056251560404390~1913457246"; // Bridge AI / WORD QUEST (Android)
var IOS_APP_ID = "ca-app-pub-3056251560404390~6974212233";     // Bridge AI / WORD QUEST (iOS)

// ---------- Android: AndroidManifest.xml ----------
(function () {
  var f = path.join(root, "android/app/src/main/AndroidManifest.xml");
  if (!fs.existsSync(f)) { console.log("skip android (not generated yet): run `npx cap add android` first"); return; }
  var s = fs.readFileSync(f, "utf8");
  var metaRe = /\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[\s\S]*?\/>/;
  var meta =
    '\n        <meta-data\n' +
    '            android:name="com.google.android.gms.ads.APPLICATION_ID"\n' +
    '            android:value="' + ANDROID_APP_ID + '" />';
  if (metaRe.test(s)) {
    s = s.replace(metaRe, meta);
  } else {
    // insert just before </application>
    s = s.replace(/(\n\s*<\/application>)/, meta + "$1");
  }
  fs.writeFileSync(f, s);
  console.log("android: AdMob APPLICATION_ID set ->", ANDROID_APP_ID);
})();

// ---------- iOS: Info.plist ----------
(function () {
  if (!IOS_APP_ID) { console.log("skip ios (no IOS_APP_ID set yet)"); return; }
  var f = path.join(root, "ios/App/App/Info.plist");
  if (!fs.existsSync(f)) { console.log("skip ios (not generated yet): run `npx cap add ios` first"); return; }
  var s = fs.readFileSync(f, "utf8");
  if (/<key>GADApplicationIdentifier<\/key>/.test(s)) {
    s = s.replace(/(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/, "$1" + IOS_APP_ID + "$2");
  } else {
    s = s.replace(/<dict>/, "<dict>\n\t<key>GADApplicationIdentifier</key>\n\t<string>" + IOS_APP_ID + "</string>");
  }
  // ATT prompt text (required if personalised ads are used)
  // Export compliance: the app only uses standard HTTPS, which is exempt.
  // Declaring it here avoids being asked on every single upload.
  if (!/ITSAppUsesNonExemptEncryption/.test(s)) {
    s = s.replace(/<dict>/, "<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>");
    console.log("ios: ITSAppUsesNonExemptEncryption = false");
  }
  // No NSUserTrackingUsageDescription: the app never calls ATT and serves
  // non-personalised ads only, so Apple's privacy answers stay "does not track".
  s = s.replace(/\n?\t*<key>NSUserTrackingUsageDescription<\/key>\s*\n?\t*<string>[^<]*<\/string>/, "");
  console.log("ios: GADApplicationIdentifier set ->", IOS_APP_ID);
})();
