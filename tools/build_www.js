#!/usr/bin/env node
// Assemble www/ for the Capacitor (App Store / Google Play) build.
//
// Two jobs:
//
// 1. Flatten the tree. The game lives in party/ and reaches up one level for
//    shared code and art ("../js/bgm.js", "../assets/bg/zone1.png"). Capacitor
//    serves webDir's root, so nothing can sit above it.
//
// 2. Shrink it. The raw assets are ~226MB, over Google Play's 200MB APK limit.
//    PNG masters become WebP (7-15% of the original) and BGM is re-encoded to
//    128kbps. The repo keeps the full-quality originals — only the shipped
//    bundle is compressed, so nothing is lost and the conversion is repeatable.
//
// Converted files are cached in build/cache/, so re-runs are fast.
//
//   node tools/build_www.js            # incremental
//   node tools/build_www.js --clean    # ignore the cache
//
"use strict";
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var root = path.join(__dirname, "..");
var www = path.join(root, "www");
var cacheDir = path.join(root, "build", "cache");
var clean = process.argv.includes("--clean");

// movie_src: Seedance start frames, build-time only.
// field: art for the unfinished story mode, which release builds do not expose.
var SKIP_ASSET_DIRS = ["movie_src", "field"];
// BGM used only by that story mode
var SKIP_BGM = ["field", "town", "dungeon", "battle_dungeon"];
var WEBP_QUALITY = 82;
var BGM_BITRATE = "128k";

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdir(p) { fs.mkdirSync(p, { recursive: true }); }
function ff(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args), { stdio: "pipe" });
}

// Convert once, reuse until the source changes.
function cached(src, key, produce) {
  var dst = path.join(cacheDir, key);
  mkdir(path.dirname(dst));
  if (!clean && fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) return dst;
  produce(src, dst);
  return dst;
}

var stats = { imgIn: 0, imgOut: 0, audIn: 0, audOut: 0, copied: 0 };

function placeAsset(src, dstDir, name) {
  var ext = path.extname(name).toLowerCase();
  var stem = name.slice(0, name.length - ext.length);
  var size = fs.statSync(src).size;
  var rel = path.relative(path.join(root, "assets"), src);

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    var w = cached(src, rel + ".webp", function (s, d) {
      ff(["-i", s, "-c:v", "libwebp", "-quality", String(WEBP_QUALITY), "-compression_level", "6", d]);
    });
    fs.copyFileSync(w, path.join(dstDir, stem + ".webp"));
    stats.imgIn += size; stats.imgOut += fs.statSync(w).size;
    return;
  }
  // BGM is long and loops; sfx are tiny one-shots not worth re-encoding
  if (ext === ".mp3" && rel.indexOf("bgm" + path.sep) === 0) {
    if (SKIP_BGM.indexOf(stem) >= 0) return;
    var a = cached(src, rel, function (s, d) {
      ff(["-i", s, "-c:a", "libmp3lame", "-b:a", BGM_BITRATE, d]);
    });
    fs.copyFileSync(a, path.join(dstDir, name));
    stats.audIn += size; stats.audOut += fs.statSync(a).size;
    return;
  }
  fs.copyFileSync(src, path.join(dstDir, name));
  stats.copied += size;
}

function copyAssets(src, dst) {
  mkdir(dst);
  for (var name of fs.readdirSync(src)) {
    if (SKIP_ASSET_DIRS.indexOf(name) >= 0) continue;
    var s = path.join(src, name);
    if (fs.statSync(s).isDirectory()) copyAssets(s, path.join(dst, name));
    else placeAsset(s, dst, name);
  }
}

// party/js/*.js hard-code "../assets/...", window.ASSET_BASE = "../" and .png
// filenames; flattened and re-encoded, all three need rewriting.
function copyScript(src, dst) {
  var s = fs.readFileSync(src, "utf8");
  s = s.replace(/(["'])\.\.\/assets\//g, "$1assets/");
  s = s.replace(/window\.ASSET_BASE\s*=\s*"\.\.\/"/, 'window.ASSET_BASE = ""');
  s = s.replace(/var BASE\s*=\s*"\.\.\/"/, 'var BASE = ""');
  s = s.replace(/\.png"/g, '.webp"');       // every .png in these files is an assets/ path
  fs.writeFileSync(dst, s);
}

console.log("\nwww/ を組み立てます" + (clean ? "（キャッシュ無視）" : ""));
rmrf(www);
mkdir(www);
mkdir(cacheDir);

// ---- index.html + css ---------------------------------------------------
var htmlSrc = path.join(root, "party", "index.html");
var html = fs.readFileSync(htmlSrc, "utf8").replace(/(href|src)="\.\.\//g, '$1="');
// drop the "ストーリーモードは制作中" entry — the mode is unfinished and its art
// is excluded above, so it must not be reachable in a shipped build
var footBefore = html;
html = html.replace(/[ \t]*<div id="ptitle-foot">[\s\S]*?<\/div>\r?\n/, "");
if (html === footBefore) { console.error("  ! ptitle-foot が見つかりません（index.html の構造が変わった？）"); process.exit(1); }
fs.writeFileSync(path.join(www, "index.html"), html);
fs.copyFileSync(path.join(root, "party", "party.css"), path.join(www, "party.css"));
mkdir(path.join(www, "css"));
fs.copyFileSync(path.join(root, "css", "style.css"), path.join(www, "css", "style.css"));

// ---- only the scripts/data index.html actually references ---------------
var refs = [], m, re = /<script src="([^"]+)"><\/script>/g;
while ((m = re.exec(html))) refs.push(m[1]);
mkdir(path.join(www, "js"));
mkdir(path.join(www, "data"));
refs.forEach(function (rel) {
  // resolve against the ORIGINAL location (party/), since html paths are rewritten
  var orig = rel.replace(/^js\//, "party/js/").replace(/^data\//, "party/data/");
  var src = fs.existsSync(path.join(root, orig)) ? path.join(root, orig) : path.join(root, rel);
  if (!fs.existsSync(src)) { console.error("  ! 見つかりません: " + rel); process.exit(1); }
  var dst = path.join(www, rel);
  mkdir(path.dirname(dst));
  if (/\.js$/.test(rel) && rel.indexOf("data/") !== 0) copyScript(src, dst);
  else fs.copyFileSync(src, dst);
});
console.log("  index.html / css / " + refs.length + " スクリプト");

// ---- assets -------------------------------------------------------------
process.stdout.write("  assets を変換中… ");
copyAssets(path.join(root, "assets"), path.join(www, "assets"));
console.log("完了");
console.log("    画像  " + (stats.imgIn / 1048576).toFixed(0) + "MB → " + (stats.imgOut / 1048576).toFixed(1) + "MB  (WebP q" + WEBP_QUALITY + ")");
console.log("    BGM   " + (stats.audIn / 1048576).toFixed(0) + "MB → " + (stats.audOut / 1048576).toFixed(1) + "MB  (" + BGM_BITRATE + ")");
console.log("    その他 " + (stats.copied / 1048576).toFixed(1) + "MB（効果音・動画はそのまま）");

// ---- verify no reference escapes the web root or points at a missing file
var bad = [];
["index.html"].concat(refs.filter(function (r) { return /^js\//.test(r); })).forEach(function (rel) {
  var t = fs.readFileSync(path.join(www, rel), "utf8");
  var esc = t.match(/["'`]\.\.\/(assets|js|data|css)\//g);
  if (esc) bad.push(rel + " → " + Array.from(new Set(esc)).join(", "));
  // only string literals matter — comments still mention the .png masters
  var png = t.match(/["'][^"'\n]*\.png["']/g);
  if (png) bad.push(rel + " → 未変換のpng参照 " + Array.from(new Set(png)).join(", "));
});
if (bad.length) {
  console.error("\n  ! 参照に問題があります:");
  bad.forEach(function (b) { console.error("    " + b); });
  process.exit(1);
}

function dirSize(p) {
  var t = 0;
  for (var f of fs.readdirSync(p)) {
    var s = path.join(p, f), st = fs.statSync(s);
    t += st.isDirectory() ? dirSize(s) : st.size;
  }
  return t;
}
var total = dirSize(www) / 1048576;
console.log("\n  合計 " + total.toFixed(1) + " MB → www/");
console.log("  Google Play の上限200MB: " + (total < 200 ? "OK" : "超過！") );
console.log("  次: npx cap sync && npm run admob\n");
