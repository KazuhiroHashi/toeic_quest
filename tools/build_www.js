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
var { execFileSync, spawnSync } = require("child_process");

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

// Toolchain detection.
//
// Two things have bitten us here, so nothing is taken on trust:
//   - Anaconda puts an x86_64 ffmpeg ahead of Homebrew's on PATH, and on Apple
//     Silicon its dylibs fail to load.
//   - Parsing `ffmpeg -encoders` for "libwebp" is unreliable across versions.
// So each candidate is probed by actually encoding something tiny.

var TMP = fs.mkdtempSync(path.join(require("os").tmpdir(), "wqbuild-"));
process.on("exit", function () { try { rmrf(TMP); } catch (e) {} });

function run(bin, args) {
  return spawnSync(bin, args, { encoding: "utf8", maxBuffer: 1 << 26 });
}
function lastLines(r, n) {
  var t = ((r.stderr || "") + (r.stdout || "")).trim().split("\n");
  return t.slice(-(n || 3)).join("\n      ").trim() || (r.error ? String(r.error.message) : "(出力なし)");
}

// an ffmpeg that can actually transcode audio
var FFMPEG = (function () {
  var tried = [];
  var cands = [process.env.FFMPEG, "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"].filter(Boolean);
  var seen = {};
  for (var i = 0; i < cands.length; i++) {
    var bin = cands[i];
    if (seen[bin]) continue;
    seen[bin] = 1;
    var probe = path.join(TMP, "probe.mp3");
    var r = run(bin, ["-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=0.1",
      "-c:a", "libmp3lame", "-b:a", "64k", probe]);
    if (r.status === 0 && fs.existsSync(probe)) return bin;
    tried.push("  - " + bin + "\n      " + lastLines(r));
  }
  console.error("\n音声を変換できる ffmpeg が見つかりません。");
  tried.forEach(function (t) { console.error(t); });
  console.error("\n  brew install ffmpeg");
  console.error("  ※ Anaconda 同梱の ffmpeg は Apple Silicon では動きません。\n");
  process.exit(1);
})();

// a way to produce WebP: ffmpeg's libwebp, ffmpeg's native webp, or cwebp
var WEBP = (function () {
  var png = path.join(TMP, "probe.png");
  var r0 = run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "color=c=red:s=16x16", "-frames:v", "1", png]);
  if (r0.status !== 0) { console.error("テスト画像を作れません:\n  " + lastLines(r0)); process.exit(1); }

  var tried = [];
  var out = path.join(TMP, "probe.webp");
  var encoders = ["libwebp", "webp"];
  for (var e = 0; e < encoders.length; e++) {
    try { fs.unlinkSync(out); } catch (err) {}
    var r = run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", png, "-c:v", encoders[e], out]);
    if (r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) {
      return { kind: "ffmpeg", enc: encoders[e] };
    }
    tried.push("  - ffmpeg -c:v " + encoders[e] + "\n      " + lastLines(r));
  }

  // cwebp ships with Homebrew's `webp` formula and is a fine standalone fallback
  var cw = [process.env.CWEBP, "/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp", "cwebp"].filter(Boolean);
  for (var i = 0; i < cw.length; i++) {
    try { fs.unlinkSync(out); } catch (e) {}
    var r2 = run(cw[i], ["-quiet", "-q", "80", png, "-o", out]);
    if (r2.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) return { kind: "cwebp", bin: cw[i] };
    tried.push("  - " + cw[i] + "\n      " + lastLines(r2));
  }

  console.error("\nWebP に変換できるツールが見つかりません。試したもの:");
  tried.forEach(function (t) { console.error(t); });
  console.error("\n  どちらかを入れてください:");
  console.error("    brew install webp        # cwebp（軽い・確実）");
  console.error("    brew reinstall ffmpeg    # libwebp 付きで入れ直す\n");
  process.exit(1);
})();

function ff(args) {
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y"].concat(args), { stdio: "pipe" });
}
function toWebp(src, dst) {
  if (WEBP.kind === "cwebp") {
    execFileSync(WEBP.bin, ["-quiet", "-q", String(WEBP_QUALITY), src, "-o", dst], { stdio: "pipe" });
  } else {
    ff(["-i", src, "-c:v", WEBP.enc, "-quality", String(WEBP_QUALITY), "-compression_level", "6", dst]);
  }
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
var alphaLost = [];

// Enemy sprites and the logo are transparent PNGs. A WebP encoder that
// silently flattens alpha would put black boxes behind every enemy, so the
// conversion is checked rather than trusted (PATH may hand us any cwebp).
function pngHasAlpha(file) {
  var fd = fs.openSync(file, "r");
  var buf = Buffer.alloc(4096);
  var n = fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);
  if (n < 26 || buf.toString("ascii", 1, 4) !== "PNG") return false;
  var colorType = buf[25];                       // IHDR: 4 = gray+alpha, 6 = RGBA
  if (colorType === 4 || colorType === 6) return true;
  return buf.slice(0, n).includes("tRNS");        // palette transparency
}
function webpHasAlpha(file) {
  var fd = fs.openSync(file, "r");
  var buf = Buffer.alloc(32);
  var n = fs.readSync(fd, buf, 0, 32, 0);
  fs.closeSync(fd);
  if (n < 24) return false;
  var fourcc = buf.toString("ascii", 12, 16);
  if (fourcc === "VP8X") return (buf[20] & 0x10) !== 0;   // extended header alpha flag
  if (fourcc === "VP8L") return true;                     // lossless carries alpha
  return false;
}

function placeAsset(src, dstDir, name) {
  var ext = path.extname(name).toLowerCase();
  var stem = name.slice(0, name.length - ext.length);
  var size = fs.statSync(src).size;
  var rel = path.relative(path.join(root, "assets"), src);

  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    var w = cached(src, rel + ".webp", toWebp);
    if (pngHasAlpha(src) && !webpHasAlpha(w)) alphaLost.push(rel);
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
console.log("  ffmpeg: " + FFMPEG);
console.log("  WebP  : " + (WEBP.kind === "cwebp" ? WEBP.bin : "ffmpeg -c:v " + WEBP.enc));
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
console.log("    透過チェック: " + (alphaLost.length ? alphaLost.length + "件 失敗" : "OK"));

if (alphaLost.length) {
  console.error("\n  ! 透過が失われた画像が " + alphaLost.length + " 件あります（敵の背景が黒くなります）:");
  alphaLost.slice(0, 8).forEach(function (f) { console.error("    " + f); });
  console.error("\n  使用中のWebPエンコーダが透過を潰しています: " +
    (WEBP.kind === "cwebp" ? WEBP.bin : "ffmpeg -c:v " + WEBP.enc));
  console.error("  別のものを指定して、キャッシュを作り直してください:");
  console.error("    CWEBP=/opt/homebrew/bin/cwebp npm run build:www -- --clean\n");
  process.exit(1);
}

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

// 本番モード（testing:false）なのに Google のテスト用広告IDが残っていたら止める。
// 見落とすと「公開したのに広告収入がゼロ」になり、しかも気づきにくい
(function () {
  var f = path.join(root, "party", "js", "pnative.js");
  if (!fs.existsSync(f)) return;
  var s = fs.readFileSync(f, "utf8");
  var line = /^(\s*testing:\s*)(?:true|false)(\s*,)/m.exec(s);
  var live = !!(line && /false/.test(line[0]));
  var ids = s.match(/^\s*\w+(?:Android|Ios):\s*"ca-app-pub-[^"]+"/gm) || [];
  var testIds = ids.filter(function (x) { return x.indexOf("ca-app-pub-3940256099942544") >= 0; })
                   .map(function (x) { return x.trim().split(":")[0]; });
  // 使われるIDはプラットフォームごとに分かれている（pnative.js が
  // platform === "ios" で振り分ける）。iOSを先に出すので、iOS側が
  // テスト用のままなら止め、Android側は警告にとどめる。
  // 両方で止めると、Androidを作っていない段階でiOSが出せなくなる
  var iosTest = testIds.filter(function (n) { return /Ios$/.test(n); });
  var androidTest = testIds.filter(function (n) { return /Android$/.test(n); });
  if (live && iosTest.length) {
    console.error("\n  ! 本番モード（testing: false）なのに iOSの広告IDが Googleのテスト用のままです");
    iosTest.forEach(function (n) { console.error("      " + n); });
    console.error("    このまま公開すると、その枠の広告収入はゼロになります。");
    console.error("    node tools/set_ads.js --show で確認してください\n");
    process.exit(1);
  }
  console.log("  広告  " + (live ? "本番モード" : "テストモード") +
    (testIds.length ? "" : "（全プラットフォーム 本番IDが揃っています）"));
  if (testIds.length) {
    console.log("        iOS " + (iosTest.length ? "★テスト用 " + iosTest.length + "件" : "本番ID") +
                " ／ Android " + (androidTest.length ? "テスト用 " + androidTest.length + "件" : "本番ID"));
    if (live && androidTest.length) {
      console.log("        ※ Android版を出すときは、上の枠のIDを作って差し替えること");
    }
  }
})();
console.log("  次: npx cap sync && npm run admob\n");
