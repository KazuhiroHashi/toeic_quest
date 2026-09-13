#!/usr/bin/env node
// タイトルの項目アイコンを、軽くてそろった形に整える。
//
//   node tools/make_icons.js
//   → art/icons/*.png（原寸）から assets/ui/icons/*.png（128px）を作る
//
// 原寸を assets/ の外に置いてあるのは、build_www.js が assets/ 配下を
// まるごとアプリに同梱するから。中に置くと、画面に出ない1辺1200pxの絵まで
// 端末へ運ぶことになる。
//
// ── なぜ縮めるのか ──────────────────────────────────────
// 生成AIの出力は1辺1200px以上・1枚500KB超で届く。ところが画面に出るのは
// 20×20 CSSピクセル。いちばん精細な端末（4倍）でも80px。128あれば足りる。
// 500KB → 10KB前後。7枚で3.5MB → 70KB。中身は1ドットも変わらない。
//
// ── なぜ位置をそろえるのか ──────────────────────────────
// 生成AIは余白の取り方がばらばらで、そのまま並べると大きさが揃わない。
// 絵の中身（不透明な部分）を測って切り出し、正方形に整えてから、
// 上下左右に同じ余白を付け直す。こうすると7枚が同じ大きさに見える。
//
// ── なぜ透過を検査するのか ──────────────────────────────
// 「背景は透過で」と頼んでも、市松模様や白を絵として塗り込んでくることが
// ある。logo.png で実際に起きて、気づかずに動画へ焼き込みかけた。
// 透過が無いものは、ここで止める。
"use strict";
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..");
var DIR = path.join(ROOT, "assets", "ui", "icons");   // 書き出し先（アプリが読む）
var SRC = path.join(ROOT, "art", "icons");            // 原寸の置き場（同梱されない）

var SIZE = 128;         // 書き出す1辺
var MARGIN = 0.08;      // 上下左右の余白（1辺に対する割合）
var ALPHA_MIN = 8;      // これより濃ければ「絵がある」とみなす

// タイトルの7項目。ここに無い名前のファイルは無視する
var WANT = ["ic_adventure", "ic_tower", "ic_stats", "ic_books", "ic_gear", "ic_wordbook", "ic_medal"];

function ff(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args),
    { maxBuffer: 1 << 28 });
}
function probe(f, entries) {
  return execFileSync("ffprobe", ["-v", "error", "-show_entries", entries,
    "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).trim().split("\n");
}
function kb(f) { return (fs.statSync(f).size / 1024).toFixed(1) + "KB"; }

// 不透明な部分の外接矩形を測る。透過がまったく無ければ null を返す
function alphaBox(file, w, h) {
  var raw = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error",
    "-i", file, "-vf", "format=rgba,extractplanes=a", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
    { maxBuffer: 1 << 28 });
  var x0 = w, y0 = h, x1 = -1, y1 = -1, clear = 0;
  for (var y = 0; y < h; y++) {
    var row = y * w;
    for (var x = 0; x < w; x++) {
      if (raw[row + x] < ALPHA_MIN) { clear++; continue; }
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;                       // 全部が透明＝空の絵
  if (clear / (w * h) < 0.02) return { opaque: true };  // ほぼ全面が不透明＝透過されていない
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// ---- 置き場所を整える -----------------------------------------------------
// src/ が無ければ作り、icons/ 直下に置かれた原寸をそこへ移す。
// 「言われた場所と違うところに置いた」で止めないため
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(DIR, { recursive: true });
// assets/ui/icons/ に原寸が直接置かれていたら、art/icons/ へ逃がす。
// 「言われた場所と違うところに置いた」で止めないため
WANT.forEach(function (name) {
  var flat = path.join(DIR, name + ".png");
  if (!fs.existsSync(flat) || fs.existsSync(path.join(SRC, name + ".png"))) return;
  var wh = probe(flat, "stream=width,height");
  if (+wh[0] <= SIZE && +wh[1] <= SIZE) return;   // すでに小さい＝加工済み
  fs.renameSync(flat, path.join(SRC, name + ".png"));
  console.log("  原寸を art/icons/ へ移動: " + name + ".png");
});

// ---- 書き出し -------------------------------------------------------------
var inner = Math.round(SIZE * (1 - MARGIN * 2));   // 絵そのものの大きさの目安
var done = 0, missing = [], saved = 0, before = 0;

console.log("\n" + SIZE + "×" + SIZE + " に書き出します（余白 " + Math.round(MARGIN * 100) + "%）\n");

WANT.forEach(function (name) {
  var src = path.join(SRC, name + ".png");
  if (!fs.existsSync(src)) { missing.push(name); return; }

  var wh = probe(src, "stream=width,height");
  var w = +wh[0], h = +wh[1];
  var box = alphaBox(src, w, h);

  if (!box) {
    console.error("  ! " + name + " … 中身がありません（全面が透明）");
    process.exitCode = 1; return;
  }
  if (box.opaque) {
    console.error("  ! " + name + " … 透過されていません（全面が不透明）");
    console.error("      背景に白や市松模様が絵として描き込まれています。作り直してください。");
    process.exitCode = 1; return;
  }

  // 絵を切り出し → 大きさをそろえて縮小 → 中央に置いて SIZE に収める
  //
  // 「長辺を inner にそろえる」だと、縦長の絵だけ小さく見える。実際に
  // 塔（縦横比 0.47）と勲章（0.53）が、城や本の半分の幅になって沈んだ。
  // そこで、縦横の相乗平均 √(w×h) を inner にそろえる。こうすると
  // 「画面が絵で埋まる量」がだいたい同じになり、並べたとき揃って見える。
  //   ・正方形の絵（城・記録・本・歯車）は、これまでと同じ大きさのまま
  //   ・縦長・横長の絵だけが、余っていたぶん大きくなる
  // ただし枠からはみ出させない。長辺が SIZE を超えるときは、そこで頭打ち
  // にする（縦長の絵は左右にたっぷり余白が残るので、上下が枠いっぱいでも
  // 詰まって見えない）
  var k = inner / Math.sqrt(box.w * box.h);
  k = Math.min(k, SIZE / Math.max(box.w, box.h));
  var ow = Math.max(1, Math.round(box.w * k));
  var oh = Math.max(1, Math.round(box.h * k));

  var out = path.join(DIR, name + ".png");
  ff(["-i", src, "-vf",
    "format=rgba," +
    "crop=" + box.w + ":" + box.h + ":" + box.x + ":" + box.y + "," +
    "scale=" + ow + ":" + oh + ":flags=lanczos," +
    "pad=" + SIZE + ":" + SIZE + ":(ow-iw)/2:(oh-ih)/2:color=#00000000",
    "-frames:v", "1", out]);

  var b = fs.statSync(src).size, a = fs.statSync(out).size;
  before += b; saved += a; done++;
  console.log("  " + name.padEnd(14) + w + "×" + h + " " + kb(src).padStart(8) +
    "  →  " + SIZE + "×" + SIZE + " " + kb(out).padStart(7) +
    "   (" + Math.round(100 - a / b * 100) + "% 減)" +
    "   絵は " + ow + "×" + oh);
});

if (missing.length) {
  console.log("\n  まだ届いていないもの: " + missing.join(", "));
}
if (done) {
  console.log("\n  合計 " + (before / 1024 / 1024).toFixed(2) + "MB → " +
    (saved / 1024).toFixed(0) + "KB");
  console.log("  ※ www に入るときは build_www.js が WebP にするので、さらに小さくなります");
}
if (done === WANT.length) {
  console.log("\n  7枚そろいました。index.html の絵文字と差し替えられます。");
}
