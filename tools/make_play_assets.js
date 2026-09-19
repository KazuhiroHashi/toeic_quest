#!/usr/bin/env node
// Google Play ストアに出す画像を作る。
//
//   node tools/make_play_assets.js
//   → store/play/ に アイコン・フィーチャーグラフィック・スクリーンショット
//
// なぜ App Store 用を流用できないか
//   Play は「長辺は短辺の2倍まで」と決めている。iPhone の 1290x2796 は
//   2.17倍で、そのまま上げると弾かれる。ここでは 1080x1920（ちょうど9:16）
//   に収め、余った左右をゲームの地の色で埋める。切り取らないので、
//   十字キーもメニューも欠けない。
//
// 透過は禁止（24bit PNG のみ）。ffmpeg の出力は rgb24 に固定してある。
"use strict";
var fs = require("fs");
var path = require("path");
var { execFileSync } = require("child_process");

var ROOT = path.resolve(__dirname, "..");
var OUT = path.join(ROOT, "store", "play");
var BG = "#0b1131";                       // タイトル画面の地の色に合わせる
var SHOT_W = 1080, SHOT_H = 1920;

// Play は1つの端末種別につき最大8枚。並びは App Store と揃える。
// 1枚目はコマンド選択（2026-09-19 変更）。以前はクイズを先頭に置いていたが、
// それだと「単語クイズのアプリ」に見えるという指摘があった。
// コマンドと4人パーティを先に見せ、2枚目のクイズで「単語で戦う」と分かる並びにする。
var SHOTS = [
  ["01_boss_command.png", "01_boss_command.png"],
  ["02_quiz.png", "02_quiz.png"],
  // ボス戦のクイズは外した。1枚目と同じ四天王ハウルで、同じ敵が2回出てしまうため
  ["03_title.png", "03_title.png"],
  ["04_grades.png", "04_grades.png"],
  ["05_wordbook.png", "05_wordbook.png"],
  ["06_records.png", "06_records.png"],
  ["07_ost.png", "07_ost.png"]
];

function ff(args) {
  try {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args),
      { encoding: "utf8", maxBuffer: 1 << 26 });
  } catch (e) {
    console.error("\nffmpeg failed:\n" + (e.stderr || e.message));
    process.exit(1);
  }
}
function size(f) {
  return execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height",
    "-of", "csv=p=0:s=x", f], { encoding: "utf8" }).trim().split("\n")[0];
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });

// ---- アプリアイコン 512x512 ----
// Play は角丸を自分で付けるので、こちらは四角のまま渡す。
var iconSrc = path.join(ROOT, "appicon", "icon-only.png");
var icon = path.join(OUT, "icon_512.png");
ff(["-i", iconSrc, "-vf", "scale=512:512:flags=lanczos,format=rgb24", icon]);

// ---- フィーチャーグラフィック 1024x500 ----
// タイトル背景の見せ場（城と草原の帯）を切り出し、その上にロゴを置く。
// 縦長の絵から横長を取るので、上下は大きく落ちる。y の値はその取り位置。
var fgBase = path.join(ROOT, "assets", "ui", "title_bg.png");
var logo = path.join(ROOT, "assets", "ui", "logo.png");
var fg = path.join(OUT, "feature_1024x500.png");
ff(["-i", fgBase, "-i", logo, "-filter_complex",
  // 幅を1024に合わせてから、城と草原が入る帯を切り出す
  "[0:v]scale=1024:-1:flags=lanczos,crop=1024:500:0:ih*0.42," +
  // 文字を読ませるために、絵をすこし沈める
  "eq=brightness=-0.10:saturation=0.92[bg];" +
  "[1:v]scale=660:-1:flags=lanczos[lg];" +
  "[bg][lg]overlay=(W-w)/2:(H-h)/2,format=rgb24[v]",
  "-map", "[v]", "-frames:v", "1", fg]);

// ---- スクリーンショット ----
var SRC = path.join(ROOT, "store", "upload", "6.9inch");
var made = [];
SHOTS.forEach(function (p) {
  var s = path.join(SRC, p[0]);
  if (!fs.existsSync(s)) { console.error("  ! ありません: " + p[0]); return; }
  var d = path.join(OUT, "screenshots", p[1]);
  ff(["-i", s, "-vf",
    "scale=" + SHOT_W + ":" + SHOT_H + ":force_original_aspect_ratio=decrease:flags=lanczos," +
    "pad=" + SHOT_W + ":" + SHOT_H + ":(ow-iw)/2:(oh-ih)/2:color=" + BG + ",format=rgb24", d]);
  made.push(p[1]);
});

// ---- 確認 ----
console.log("\nGoogle Play 用に書き出しました → store/play/");
console.log("  アイコン              " + size(icon) + "   (要 512x512)");
console.log("  フィーチャーグラフィック " + size(fg) + "  (要 1024x500)");
made.forEach(function (f) {
  var wh = size(path.join(OUT, "screenshots", f)).split("x").map(Number);
  var ratio = Math.max(wh[0], wh[1]) / Math.min(wh[0], wh[1]);
  console.log("  " + f.padEnd(20) + wh.join("x") + "  長辺/短辺 " + ratio.toFixed(2) +
    (ratio <= 2 ? "  OK" : "  ★2.00を超えています"));
});
console.log("\n透過なし(rgb24)で書き出しています。Play はアルファ付きを受け付けません。");
