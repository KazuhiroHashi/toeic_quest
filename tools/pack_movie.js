#!/usr/bin/env node
// WORDRIA - 組み上げたムービーを、アプリに積む形に縮める。
//
//   node tools/pack_movie.js ed      # movie/out/ED.mp4 → assets/movie/ed.mp4
//   node tools/pack_movie.js op
//   node tools/pack_movie.js         # 両方
//
// ── なぜこの道具が要るのか ──────────────────────────────────
// build_movie.js が作るのは「原盤」で、1080x1920 / 約7Mbps ある。
// アプリに積むのはそれを 720x1280 / 約1.7Mbps に縮めたもので、
// ED なら 16.6MB → 4.4MB になる。アプリ本体が106MBあるので、
// この差は無視できない。
//
// ところが、この縮める工程がどのツールにも入っていなかった。過去に手作業で
// やったきり記録が残らず、2026-09-15 にエンディングを組み直したとき、
// 原盤をそのまま assets/ に置きそうになった（3倍に太るところだった）。
// 気づけたのは、たまたま元のファイルの大きさを見比べたからで、運が良かった。
// 手順は道具にしておかないと必ず失われる。
//
// ── 数字の根拠 ────────────────────────────────────────────
// 720x1280 と 1.7Mbps は、もともと積まれていたファイルから読み取った値。
//   配信中の ed.mp4  720x1280 / 映像 1,702,776 bps / 音声 AAC 128k / 44.1kHz
//   配信中の op.mp4  720x1280 / 映像 1,907,760 bps / 音声 AAC 128k / 44.1kHz
// crf 23 で撮り直したところ 1,734,304 bps に落ち着いたので、この設定で揃える。
// 縦720は、いまのスマホなら十分。原盤は movie/out/ に残るので、あとから
// 大きい版が要るようになっても作り直せる。
"use strict";
var fs = require("fs");
var path = require("path");
var execFileSync = require("child_process").execFileSync;

var ROOT = path.resolve(__dirname, "..");
var W = 720, H = 1280, CRF = 23, ABR = "128k";

function pack(reel) {
  var src = path.join(ROOT, "movie", "out", reel.toUpperCase() + ".mp4");
  var dst = path.join(ROOT, "assets", "movie", reel.toLowerCase() + ".mp4");
  if (!fs.existsSync(src)) {
    console.error("  ! " + path.relative(ROOT, src) + " がありません（先に node tools/build_movie.js " + reel + "）");
    process.exit(1);
  }
  var before = fs.existsSync(dst) ? fs.statSync(dst).size : 0;
  try {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
      "-i", src,
      "-vf", "scale=" + W + ":" + H + ":flags=lanczos",
      "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-preset", "slow", "-crf", String(CRF),
      "-movflags", "+faststart",
      "-c:a", "aac", "-b:a", ABR, "-ar", "44100",
      dst], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    console.error("\nffmpeg に失敗しました:\n" + (e.stderr || e.message));
    process.exit(1);
  }
  var mb = function (n) { return (n / 1048576).toFixed(1) + "MB"; };
  console.log("  " + reel.toUpperCase() + ": " + mb(fs.statSync(src).size) + " → " + mb(fs.statSync(dst).size) +
              (before ? "（前は " + mb(before) + "）" : ""));
}

var only = process.argv[2];
var reels = only ? [only] : ["op", "ed"];
console.log("▶ アプリに積む形に縮めます（" + W + "x" + H + " / crf " + CRF + "）");
reels.forEach(pack);
console.log("  次: npm run build:www");
