#!/usr/bin/env node
// WORDRIA - まとめて生成した音声を1語ずつに切り分ける
//
//   node tools/split_voice.js <音声ファイル> <語1> <語2> ...
//   node tools/split_voice.js batch.wav --batch f000     # build/voice_batches.json から語を引く
//   node tools/split_voice.js batch.wav --batch f000 --out assets/voice
//
// 1語ずつ生成すると4,883回になるので、40語を1回で作って無音で切る。
// 区切りが語数と合わなければ**何も書き出さずに失敗させる**。ここでずれると
// 全部の単語に別の単語の音声が付くので、黙って進めてはいけない。
"use strict";
var fs = require("fs");
var path = require("path");
var { execFileSync, spawnSync } = require("child_process");

var root = path.join(__dirname, "..");
var NOISE = "-38dB";   // これ以下を無音とみなす
var MINSIL = 0.20;     // 0.2秒以上続いたら区切り
var PAD_IN = 0.05;     // 切り出しの前後に少しだけ余白を残す
var PAD_OUT = 0.08;
var BITRATE = "32k";
var SR = "24000";

function ff(args) {
  return spawnSync("ffmpeg", ["-hide_banner", "-nostats"].concat(args), { encoding: "utf8" });
}
function duration(f) {
  return parseFloat(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
}
function slug(w) {
  return w.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

var args = process.argv.slice(2);
var src = args.shift();
if (!src || !fs.existsSync(src)) {
  console.error("使い方: node tools/split_voice.js <音声> [--batch f000 | 語...] [--out assets/voice]");
  process.exit(1);
}
var outDir = path.join(root, "assets", "voice");
var oi = args.indexOf("--out");
if (oi >= 0) { outDir = path.resolve(args[oi + 1]); args.splice(oi, 2); }

var words;
var bi = args.indexOf("--batch");
if (bi >= 0) {
  var id = args[bi + 1];
  var all = JSON.parse(fs.readFileSync(path.join(root, "build", "voice_batches.json"), "utf8"));
  var b = all.filter(function (x) { return x.id === id; })[0];
  if (!b) { console.error("バッチが見つかりません: " + id); process.exit(1); }
  words = b.words;
} else {
  words = args;
}
if (!words.length) { console.error("語が指定されていません"); process.exit(1); }

// ---- 無音の位置を拾う ----
var log = ff(["-i", src, "-af", "silencedetect=noise=" + NOISE + ":d=" + MINSIL, "-f", "null", "-"]);
var out = (log.stdout || "") + (log.stderr || "");
var starts = (out.match(/silence_start: [\d.]+/g) || []).map(function (s) { return parseFloat(s.split(" ")[1]); });
var ends = (out.match(/silence_end: [\d.]+/g) || []).map(function (s) { return parseFloat(s.split(" ")[1]); });
var dur = duration(src);

// 無音の「あと」から次の無音の「はじめ」までが1語
var segs = [];
for (var i = 0; i < ends.length; i++) {
  var a = ends[i];
  var b2 = (i + 1 < starts.length) ? starts[i + 1] : dur;
  if (b2 - a < 0.06) continue;   // 短すぎるものはノイズとみなす
  segs.push([Math.max(0, a - PAD_IN), Math.min(dur, b2 + PAD_OUT)]);
}

console.log(path.basename(src) + "  " + dur.toFixed(2) + "秒");
console.log("区切り " + segs.length + " / 語数 " + words.length);

if (segs.length !== words.length) {
  console.error("\n! 区切りの数が語数と合いません。1語ずれるとすべての単語に別の音声が付くので中止します。");
  console.error("  対処：--noise / --minsil を変える、この語だけ単独で生成し直す、バッチを分割する");
  segs.forEach(function (s, k) {
    console.error("   " + String(k).padStart(3) + "  " + s[0].toFixed(2) + " → " + s[1].toFixed(2) +
      "  (" + (s[1] - s[0]).toFixed(2) + "秒)  " + (words[k] || "―"));
  });
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });
var total = 0;
segs.forEach(function (s, k) {
  var f = path.join(outDir, slug(words[k]) + ".mp3");
  var r = ff(["-y", "-ss", String(s[0]), "-to", String(s[1]), "-i", src,
              "-ac", "1", "-ar", SR, "-c:a", "libmp3lame", "-b:a", BITRATE, "-loglevel", "error", f]);
  if (r.status !== 0) { console.error("変換に失敗: " + words[k]); process.exit(3); }
  total += fs.statSync(f).size;
});
console.log("書き出し " + segs.length + "語  " + (total / 1024).toFixed(0) + "KB  → " +
  path.relative(root, outDir));
console.log("1語あたり平均 " + (total / segs.length / 1024).toFixed(1) + "KB");
