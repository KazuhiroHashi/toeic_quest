#!/usr/bin/env node
// 手元の動画を App Store Connect の「App プレビュー」の条件に合わせる。
//
//   node tools/make_preview.js <入力動画> [--start 5] [--len 29.5] [--out 出力先]
//
// App Store Connect は寸法にうるさく、886×1920（縦）か 1920×886（横）しか
// 受け付けない。1080×1920 は「解像度が違う」と言われて弾かれる。
// 長さも 15〜30秒の外は弾かれる。ここを人力で合わせるのは無理があるので道具にした。
//
// 縦横比が 9:16 でない素材は、はみ出す分を中央基準で切り落とす。
// 大事なものが端にある場合は --start と組み合わせて場面を選び直すこと。
"use strict";
var cp = require("child_process");
var fs = require("fs");
var path = require("path");

var W = 886, H = 1920;
var MIN_LEN = 15, MAX_LEN = 30;

var args = process.argv.slice(2);
var src = null, start = 0, len = 29.5, out = null;
for (var i = 0; i < args.length; i++) {
  var a = args[i];
  if (a === "--start") start = parseFloat(args[++i]);
  else if (a === "--len") len = parseFloat(args[++i]);
  else if (a === "--out") out = args[++i];
  else if (a[0] === "-") { console.error("知らない指定: " + a); process.exit(1); }
  else src = a;
}
if (!src) {
  console.error("使い方: node tools/make_preview.js <入力動画> [--start 秒] [--len 秒] [--out 出力先]");
  process.exit(1);
}
if (!fs.existsSync(src)) { console.error("見つかりません: " + src); process.exit(1); }
if (!(len > MIN_LEN && len <= MAX_LEN)) {
  console.error("--len は " + MIN_LEN + "より大きく" + MAX_LEN + "以下にしてください（指定: " + len + "）");
  process.exit(1);
}

function have(cmd) {
  try { cp.execFileSync(cmd, ["-version"], { stdio: "ignore" }); return true; }
  catch (e) { return false; }
}
if (!have("ffmpeg") || !have("ffprobe")) {
  console.error("\nffmpeg が入っていません。Mac なら次の1行で入ります:");
  console.error("  brew install ffmpeg\n");
  process.exit(1);
}

function probe(f, fields) {
  return cp.execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0",
    "-show_entries", fields, "-of", "csv=p=0", f]).toString().trim();
}

var info = probe(src, "stream=width,height,r_frame_rate").split(",");
var dur = parseFloat(cp.execFileSync("ffprobe", ["-v", "error", "-show_entries",
  "format=duration", "-of", "csv=p=0", src]).toString().trim());

console.log("\n元の動画");
console.log("  " + path.basename(src));
console.log("  寸法    " + info[0] + " x " + info[1]);
console.log("  長さ    " + dur.toFixed(1) + "秒");
console.log("  容量    " + (fs.statSync(src).size / 1048576).toFixed(1) + "MB");

if (start + len > dur + 0.05) {
  console.error("\n! --start " + start + " から " + len + "秒 取ろうとしていますが、元は "
    + dur.toFixed(1) + "秒しかありません");
  process.exit(1);
}

out = out || path.join(path.dirname(src), "preview_886x1920.mp4");
fs.mkdirSync(path.dirname(out), { recursive: true });

// はみ出す分を切る。9:16 より横長なら左右、縦長なら上下が落ちる
var vf = "scale=" + W + ":" + H + ":force_original_aspect_ratio=increase," +
         "crop=" + W + ":" + H;

console.log("\n変換中…（1〜2分かかります）");
cp.execFileSync("ffmpeg", ["-y", "-loglevel", "error",
  "-ss", String(start), "-i", src, "-t", String(len),
  "-r", "30", "-vf", vf,
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "22",
  "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
  "-movflags", "+faststart", out], { stdio: "inherit" });

var oInfo = probe(out, "stream=width,height").split(",");
var oDur = parseFloat(cp.execFileSync("ffprobe", ["-v", "error", "-show_entries",
  "format=duration", "-of", "csv=p=0", out]).toString().trim());
var oMB = fs.statSync(out).size / 1048576;

var ok = (+oInfo[0] === W && +oInfo[1] === H) && oDur > MIN_LEN && oDur <= MAX_LEN && oMB < 500;
console.log("\nできあがり");
console.log("  " + out);
console.log("  寸法    " + oInfo[0] + " x " + oInfo[1] + (+oInfo[0] === W && +oInfo[1] === H ? "  OK" : "  ← ちがう"));
console.log("  長さ    " + oDur.toFixed(1) + "秒" + (oDur > MIN_LEN && oDur <= MAX_LEN ? "  OK（15〜30秒）" : "  ← 範囲外"));
console.log("  容量    " + oMB.toFixed(1) + "MB" + (oMB < 500 ? "  OK（上限500MB）" : "  ← 超過"));
console.log(ok ? "\nApp Store Connect にそのまま上げられます。\n"
               : "\n! 条件を満たしていません。上の「← 」の行を直してください。\n");
process.exit(ok ? 0 : 1);
