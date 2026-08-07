#!/usr/bin/env node
// WORD QUEST - OP/ED movie assembler.
//
// Takes the raw Seedance clips dropped in movie/src/, applies the per-cut
// repairs described in movie/cuts.json, crossfades them together, lays the
// game's own BGM underneath and stamps the logo on the tail — then writes an
// App Store compliant mp4 (1080x1920 / 30fps / H.264 / yuv420p).
//
//   node tools/build_movie.js          # build every reel defined in cuts.json
//   node tools/build_movie.js op       # build just one
//
// Needs ffmpeg on PATH. Nothing else.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CFG = path.join(ROOT, "movie", "cuts.json");
const TMP = path.join(ROOT, "movie", "tmp");
const OUT = path.join(ROOT, "movie", "out");

const W = 1080, H = 1920, FPS = 30;

function sh(args) {
  try {
    return execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args), {
      encoding: "utf8", maxBuffer: 1 << 28
    });
  } catch (e) {
    console.error("\nffmpeg failed:\n" + (e.stderr || e.message));
    process.exit(1);
  }
}
function probe(file, entries) {
  return execFileSync("ffprobe", [
    "-v", "error", "-show_entries", entries, "-of", "default=noprint_wrappers=1:nokey=1", file
  ], { encoding: "utf8" }).trim();
}
function duration(file) { return parseFloat(probe(file, "format=duration")); }
function rel(p) { return path.relative(ROOT, p); }

// Every clip is forced onto the same canvas before anything else touches it,
// so a 720p cut and a 4K cut can sit in the same timeline.
const NORM = `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
             `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${FPS},format=yuv420p`;
const ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-an"];

// ---- one cut -> one normalized clip -------------------------------------
function buildCut(cut, i, reel) {
  const src = path.join(ROOT, cut.src);
  if (!fs.existsSync(src)) {
    console.error(`  ! 見つかりません: ${cut.src}`);
    return null;
  }
  const out = path.join(TMP, `${reel}_${i}.mp4`);
  const srcDur = duration(src);
  const speed = cut.speed || 1;
  let note = [];

  if (cut.skip) {
    // Something breaks mid-clip but the payoff is after it: dissolve straight
    // across the bad window instead of losing the tail.
    const [from, to] = cut.skip;
    const d = cut.dissolve || 0.5;
    const aEnd = from, bStart = to, bEnd = cut.trim ? cut.trim[1] : srcDur;
    const aLen = aEnd, bLen = bEnd - bStart;
    if (aLen <= d || bLen <= d) { console.error(`  ! skip範囲が短すぎます: ${cut.src}`); return null; }
    sh(["-i", src, "-filter_complex",
      `[0:v]trim=0:${aEnd},setpts=PTS-STARTPTS,${NORM}[a];` +
      `[0:v]trim=${bStart}:${bEnd},setpts=PTS-STARTPTS,${NORM}[b];` +
      `[a][b]xfade=transition=fade:duration=${d}:offset=${(aLen - d).toFixed(3)}[v]`,
      "-map", "[v]"].concat(ENC, [out]));
    note.push(`${from}〜${to}秒を${d}秒のディゾルブで飛ばし`);
  } else {
    const t = cut.trim || [0, srcDur];
    const vf = speed !== 1 ? `${NORM},setpts=${speed}*PTS` : NORM;
    sh(["-ss", String(t[0]), "-to", String(t[1]), "-i", src, "-vf", vf, "-map", "0:v:0"].concat(ENC, [out]));
    if (cut.trim) note.push(`${t[0]}〜${t[1]}秒を使用`);
    if (speed !== 1) note.push(`${speed}倍スロー`);
  }
  const d = duration(out);
  console.log(`  ${cut.name || path.basename(cut.src)}  →  ${d.toFixed(2)}秒${note.length ? "（" + note.join("・") + "）" : ""}`);
  return { file: out, dur: d };
}

// ---- crossfade the cuts into one sequence -------------------------------
function joinCuts(clips, xf, reel) {
  if (clips.length === 1) return clips[0];
  const inputs = [];
  clips.forEach(c => inputs.push("-i", c.file));
  let fc = "", prev = "0:v", acc = clips[0].dur;
  for (let i = 1; i < clips.length; i++) {
    const label = i === clips.length - 1 ? "v" : `x${i}`;
    fc += `[${prev}][${i}:v]xfade=transition=fade:duration=${xf}:offset=${(acc - xf).toFixed(3)}[${label}];`;
    prev = label;
    acc = acc - xf + clips[i].dur;
  }
  const out = path.join(TMP, `${reel}_seq.mp4`);
  sh(inputs.concat(["-filter_complex", fc.replace(/;$/, ""), "-map", "[v]"], ENC, [out]));
  return { file: out, dur: duration(out) };
}

// ---- logo / 完 on the tail ----------------------------------------------
function stampTail(seq, spec, reel) {
  if (!spec) return seq;
  const hold = spec.hold || 2.2;
  const st = Math.max(0, seq.dur - hold);
  const fade = Math.min(0.8, hold / 3);
  const logo = path.join(ROOT, spec.logo || "assets/ui/logo.png");
  const out = path.join(TMP, `${reel}_tail.mp4`);

  // The tail often lands on a blown-out frame, and a gold logo on gold reads as
  // mush — so the picture dips as the logo arrives.
  const scrim = spec.scrim != null ? spec.scrim : 0.22;
  const dip = scrim > 0
    ? `[0:v]eq=eval=frame:brightness='if(lt(t,${st.toFixed(3)}),0,-${scrim}*min(1,(t-${st.toFixed(3)})/${fade}))'` +
      `:saturation='if(lt(t,${st.toFixed(3)}),1,1-${(scrim * 0.5).toFixed(3)}*min(1,(t-${st.toFixed(3)})/${fade}))'[bg];`
    : "";
  const base = scrim > 0 ? "bg" : "0:v";

  // The still is shifted into the future so its own fade lands at `st`.
  let fc = dip +
    `[1:v]scale=${Math.round(W * (spec.scale || 0.78))}:-1,format=rgba,` +
    `fade=t=in:st=0:d=${fade}:alpha=1,setpts=PTS+${st.toFixed(3)}/TB[lg];` +
    `[${base}][lg]overlay=x=(W-w)/2:y=(H-h)*${spec.y != null ? spec.y : 0.42}:` +
    `enable='gte(t,${st.toFixed(3)})':eof_action=pass[v1]`;

  if (spec.text) {
    const font = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf";
    const tst = st + fade + 0.3;
    fc += `;[v1]drawtext=fontfile=${font}:text='${spec.text}':fontcolor=white@0.95:` +
          `fontsize=${spec.textSize || 88}:x=(w-text_w)/2:y=h*${spec.textY != null ? spec.textY : 0.62}:` +
          `shadowcolor=black@0.6:shadowx=0:shadowy=4:` +
          `alpha='if(lt(t,${tst.toFixed(3)}),0,min(1,(t-${tst.toFixed(3)})/0.6))'[v]`;
  } else {
    fc += `;[v1]null[v]`;
  }

  sh(["-i", seq.file, "-loop", "1", "-framerate", String(FPS), "-i", logo,
      "-filter_complex", fc, "-map", "[v]", "-t", String(seq.dur)].concat(ENC, [out]));
  return { file: out, dur: duration(out) };
}

// ---- BGM ----------------------------------------------------------------
function addBgm(vid, spec, reel) {
  const out = path.join(OUT, `${reel.toUpperCase()}.mp4`);
  if (!spec || !spec.file) {
    sh(["-i", vid.file, "-c", "copy", out]);
    return out;
  }
  const bgm = path.join(ROOT, spec.file);
  if (!fs.existsSync(bgm)) { console.error(`  ! BGMが見つかりません: ${spec.file}`); process.exit(1); }
  const start = spec.start || 0;
  const fin = spec.fadeIn != null ? spec.fadeIn : 0.6;
  const fout = spec.fadeOut != null ? spec.fadeOut : 1.8;
  const gain = spec.volume != null ? spec.volume : 0.85;
  sh(["-i", vid.file, "-ss", String(start), "-i", bgm,
      "-filter_complex",
      `[1:a]atrim=0:${vid.dur.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:st=0:d=${fin},afade=t=out:st=${Math.max(0, vid.dur - fout).toFixed(3)}:d=${fout},` +
      `volume=${gain}[a]`,
      "-map", "0:v:0", "-map", "[a]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
      "-movflags", "+faststart", "-shortest", out]);
  return out;
}

// ---- driver -------------------------------------------------------------
function build(reel, spec) {
  console.log(`\n▶ ${reel.toUpperCase()} を組み立てます`);
  const clips = spec.cuts.map((c, i) => buildCut(c, i, reel)).filter(Boolean);
  if (!clips.length) { console.log("  カットが1本もないのでスキップします。"); return null; }
  if (clips.length < spec.cuts.length) console.log(`  （${spec.cuts.length - clips.length}本 未着。あるぶんだけで組みます）`);

  const seq = joinCuts(clips, spec.crossfade != null ? spec.crossfade : 0.4, reel);
  const tail = stampTail(seq, spec.tail, reel);
  const out = addBgm(tail, spec.bgm, reel);

  const d = duration(out);
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  const ok = d >= 15 && d <= 30;
  console.log(`  完成: ${rel(out)}  ${d.toFixed(2)}秒 / ${W}x${H} / ${mb}MB`);
  console.log(`  App Store規定(15〜30秒): ${ok ? "OK" : "尺が範囲外 — カットを足すか尺を調整してください"}`);
  return out;
}

const cfg = JSON.parse(fs.readFileSync(CFG, "utf8"));
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const reels = only ? [only] : Object.keys(cfg);
for (const r of reels) {
  if (!cfg[r]) { console.error(`cuts.json に "${r}" がありません`); process.exit(1); }
  build(r, cfg[r]);
}
console.log("");
