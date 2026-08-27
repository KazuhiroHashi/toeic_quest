// App Store Connect に貼る素材を書き出す
//
// スクリーンショットは 1290×2796（iPhone 6.9インチ）で撮ってある。App Store Connect
// は端末サイズごとに枠が分かれていて、6.5インチの枠は 1242×2688 か 1284×2778 しか
// 受け付けない。縦横比がわずかに違う（0.4613 対 0.4622）ので、引き伸ばさずに
// 「はみ出させてから中央で切る」で合わせる。0.2% ぶんの切り落としなので見た目は変わらない。
//
// App プレビュー（動画）は 15〜30秒・30fps でないと弾かれる。OP は 27.1秒なので
// 長さは問題ない。寸法は 886×1920（縦）か 1920×886（横）だけで、**1080×1920 は
// 受け付けられない**。App Store Connect に「1個以上のプレビューの寸法が正しく
// ありません」と出て気づいた。
//
// OP は 1080×1920（9:16）なので、左右を 97px ずつ落として 886×1920 にする。
// 引き伸ばすと人物が縦長になるし、上下に黒帯を足すと自動再生で目立つ。
// 全カットの構図が中央寄りで、タイトルロゴも切らずに収まることを確認済み。
//
//   node tools/make_store_assets.js
"use strict";
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var root = path.join(__dirname, "..");
var SRC = path.join(root, "store", "screenshots");
var OUT = path.join(root, "store", "upload");

// 掲載順。1枚目が最重要で、ストアでは3枚目までしか見られないことが多い
var ORDER = ["02_quiz", "03_boss", "01_title", "06_grades", "04_wordbook", "05_records"];

var SIZES = [
  { name: "6.9inch", w: 1290, h: 2796 },
  { name: "6.5inch", w: 1284, h: 2778 }
];

function probe(f) {
  var s = cp.execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "csv=p=0", f]).toString().trim();
  return s;
}

SIZES.forEach(function (sz) {
  var dir = path.join(OUT, sz.name);
  fs.mkdirSync(dir, { recursive: true });
  ORDER.forEach(function (base, i) {
    var src = path.join(SRC, base + ".png");
    if (!fs.existsSync(src)) { console.log("skip", base); return; }
    var dst = path.join(dir, String(i + 1).padStart(2, "0") + "_" + base.replace(/^\d+_/, "") + ".png");
    // increase して覆ってから中央で切る。引き伸ばさない
    cp.execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src,
      "-vf", "scale=" + sz.w + ":" + sz.h + ":force_original_aspect_ratio=increase," +
             "crop=" + sz.w + ":" + sz.h, dst]);
    console.log(sz.name, path.basename(dst), probe(dst));
  });
});

// ---------- App プレビュー ----------
(function () {
  var src = path.join(root, "movie", "out", "OP.mp4");
  if (!fs.existsSync(src)) { console.log("skip preview (movie/out/OP.mp4 が無い)"); return; }
  var dir = path.join(OUT, "preview");
  fs.mkdirSync(dir, { recursive: true });
  var dst = path.join(dir, "op_preview_886x1920.mp4");
  // 音声も残す。プレビューは既定で消音再生だが、音を出す人もいる
  cp.execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src,
    "-t", "29.5", "-r", "30",
    "-vf", "crop=886:1920:97:0",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", dst]);
  var d = cp.execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
    "-of", "csv=p=0", dst]).toString().trim();
  console.log("preview", path.basename(dst), probe(dst), d + "s",
    (fs.statSync(dst).size / 1048576).toFixed(1) + "MB");
})();
