#!/usr/bin/env node
// WORDRIA - make a BGM track loop seamlessly.
//
// Suno always fades the last few seconds out, so a looped track dips to silence
// and then jumps back to the top. This trims the fade and crossfades the tail
// into the head, so the end of the file flows straight into its own beginning.
//
//   node tools/loop_bgm.js assets/bgm/king1.mp3          # overwrite in place
//   node tools/loop_bgm.js assets/bgm/king1.mp3 -o out.mp3
//   node tools/loop_bgm.js assets/bgm/*.mp3              # batch
//   node tools/loop_bgm.js king1.mp3 --xf 2.0            # longer crossfade
//   node tools/loop_bgm.js king1.mp3 --min 150           # repeat until >=150s
//
// Needs ffmpeg on PATH.

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const XF_DEFAULT = 0.6;   // seconds of tail→head crossfade
const FADE_DEFAULT = 0.30; // --reseam でつける末尾フェードアウトの長さ（秒）
const BITRATE = "192k";

function ff(args) {
  return execFileSync("ffmpeg", ["-hide_banner", "-nostats", "-y"].concat(args),
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
// volumedetect reports on stderr, so both streams have to be read back
function ffCapture(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats"].concat(args),
    { encoding: "utf8", maxBuffer: 1 << 26 });
  return (r.stdout || "") + (r.stderr || "");
}
function duration(f) {
  return parseFloat(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
    { encoding: "utf8" }).trim());
}
// mean volume (dBFS) of a window; -inf comes back as -120
function level(f, ss, len) {
  const out = ffCapture(["-ss", String(ss), "-t", String(len), "-i", f, "-af", "volumedetect", "-f", "null", "-"]);
  const m = out.match(/mean_volume:\s*(-?[\d.]+|-inf)/);
  if (!m) return -120;
  return m[1] === "-inf" ? -120 : parseFloat(m[1]);
}

// Walk back from the end until the audio is within `tol` dB of the body level.
// That point is where the fade-out begins.
function findFadeStart(f, dur, body, tol) {
  const step = 0.5, maxScan = Math.min(40, dur * 0.5);
  let t = dur - 1.0;
  while (dur - t < maxScan) {
    if (level(f, Math.max(0, t - 1.0), 1.0) >= body - tol) return Math.min(dur, t + 0.3);
    t -= step;
  }
  return dur;   // no fade detected
}

function makeSeamless(src, opts) {
  const dur = duration(src);
  const body = level(src, dur * 0.35, Math.min(20, dur * 0.3));
  const fadeAt = findFadeStart(src, dur, body, opts.tol);
  const trimmed = dur - fadeAt;
  let xf = opts.xf;
  if (fadeAt < xf * 4) { console.error(`  ! ${path.basename(src)}: 短すぎて処理できません`); return null; }

  const tmp = path.join(require("os").tmpdir(), "loop_" + path.basename(src));
  // body = [0 .. fadeAt]; its tail is crossfaded with the head [0 .. xf], so the
  // end of the file flows back into its own beginning.
  //
  // Taking [xf .. fadeAt] instead gives a mathematically perfect seam — the file
  // then wraps onto [xf ...] with no repeat — but it ROTATES the track: the song
  // starts xf seconds in and its opening is only ever heard at the very end.
  // That cost every battle theme its intro, which is heard on every encounter,
  // to fix a seam that a player reaches once every few minutes. Never again.
  ff(["-i", src, "-i", src, "-filter_complex",
      `[0:a]atrim=0:${fadeAt.toFixed(3)},asetpts=N/SR/TB[a];` +
      `[1:a]atrim=0:${xf.toFixed(3)},asetpts=N/SR/TB[b];` +
      `[a][b]acrossfade=d=${xf.toFixed(3)}:c1=tri:c2=tri` + (opts.gain ? `,volume=${opts.gain.toFixed(2)}dB` + (opts.gain > 0 ? ",alimiter=limit=0.977:attack=2:release=60:level=false" : "") : "") + `[out]`,
      "-map", "[out]", "-c:a", "libmp3lame", "-b:a", BITRATE, tmp]);

  let outLen = duration(tmp);
  let finalTmp = tmp;

  // optional: repeat the (now seamless) loop until it reaches a target length
  if (opts.min && outLen < opts.min) {
    const times = Math.ceil(opts.min / outLen);
    const rep = tmp.replace(/\.mp3$/, "_rep.mp3");
    const listFile = tmp + ".txt";
    fs.writeFileSync(listFile, Array(times).fill(`file '${tmp}'`).join("\n") + "\n");
    ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c:a", "libmp3lame", "-b:a", BITRATE, rep]);
    fs.unlinkSync(listFile);
    finalTmp = rep;
    outLen = duration(rep);
  }

  const dst = opts.out || src;
  fs.copyFileSync(finalTmp, dst);
  fs.unlinkSync(tmp);
  if (finalTmp !== tmp) fs.unlinkSync(finalTmp);

  const after = level(dst, Math.max(0, duration(dst) - 2), 2);
  console.log(`  ${path.basename(src)}`);
  console.log(`    フェードアウト ${trimmed.toFixed(1)}秒 を除去 → ${outLen.toFixed(1)}秒`);
  console.log(`    末尾の音量 ${level(src, dur - 2, 2).toFixed(1)}dB → ${after.toFixed(1)}dB（曲中 ${body.toFixed(1)}dB）`);
  return dst;
}

// すでに「末尾を曲の頭とクロスフェード」した曲を、静かな継ぎ目に作り直す。
//
// makeSeamless の作りでは、最後の xf 秒に曲の頭が薄く混ざる。<audio loop> は
// 0秒に戻って再生し直すので、聴くほうは「頭が0.6秒鳴って、また頭から鳴る」
// という二度打ちになる。実機で四天王ハウルの曲（king1）でそれが聞こえた。
//
// 混ざった区間を切り落とし、代わりに短いフェードアウトで閉じる。
// 継ぎ目は「すっと引いて、また始まる」になり、イントロは失われない。
// 元のSuno音源が無くても、加工済みのファイルだけで直せる。
function reseam(src, opts) {
  const dur = duration(src);
  const cut = dur - opts.xf;                    // 混ざっている区間を落とす
  const fade = Math.min(opts.fade, cut * 0.05);
  if (cut <= opts.fade * 2) { console.error(`  ! ${path.basename(src)}: 短すぎて処理できません`); return null; }

  const tmp = path.join(require("os").tmpdir(), "reseam_" + path.basename(src));
  ff(["-i", src, "-af",
      `atrim=0:${cut.toFixed(3)},asetpts=N/SR/TB,` +
      `afade=t=out:st=${(cut - fade).toFixed(3)}:d=${fade.toFixed(3)}:curve=qsin`,
      "-c:a", "libmp3lame", "-b:a", BITRATE, tmp]);

  const dst = opts.out || src;
  fs.copyFileSync(tmp, dst);
  fs.unlinkSync(tmp);
  console.log(`  ${path.basename(src)}`);
  console.log(`    頭が混ざった ${opts.xf.toFixed(2)}秒 を除去 → ${duration(dst).toFixed(2)}秒`);
  console.log(`    末尾 ${fade.toFixed(2)}秒 をフェードアウト（曲中 ${level(dst, dur * 0.4, 3).toFixed(1)}dB）`);
  return dst;
}

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { files: [], xf: XF_DEFAULT, tol: 4, min: 0, out: null, gain: 0,
              reseam: false, fade: FADE_DEFAULT };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--xf") o.xf = parseFloat(a[++i]);
    else if (a[i] === "--reseam") o.reseam = true;
    else if (a[i] === "--fade") o.fade = parseFloat(a[++i]);
    else if (a[i] === "--tol") o.tol = parseFloat(a[++i]);
    else if (a[i] === "--min") o.min = parseFloat(a[++i]);
    else if (a[i] === "--gain") o.gain = parseFloat(a[++i]);
    else if (a[i] === "-o") o.out = a[++i];
    else o.files.push(a[i]);
  }
  return o;
}
const args = parseArgs();

if (!args.files.length) {
  console.log("使い方: node tools/loop_bgm.js <mp3...> [--xf 1.2] [--min 150] [--gain -1.3] [-o out.mp3]");
  console.log("       node tools/loop_bgm.js <mp3...> --reseam [--fade 0.30]");
  console.log("         --reseam は、すでにループ化した曲の継ぎ目を静かに作り直します");
  process.exit(1);
}
if (args.out && args.files.length > 1) {
  console.error("-o は1ファイルのときだけ使えます");
  process.exit(1);
}
console.log(args.reseam ? "\n継ぎ目の作り直し" : "\nループ化");
for (const f of args.files) {
  if (!fs.existsSync(f)) { console.error(`  ! 見つかりません: ${f}`); continue; }
  (args.reseam ? reseam : makeSeamless)(f, args);
}
console.log("");
