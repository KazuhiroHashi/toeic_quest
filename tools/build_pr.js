#!/usr/bin/env node
// WORDRIA - PR（宣伝）動画の組み立て。
//
// OP/ED の素材クリップ（movie/src/）と、実機のスクリーンショット
// （store/screenshots/）を、相手別のコピーと一緒に 30 秒前後にまとめる。
// 定義は movie/pr.json。最後は必ず「単語帳を開くより、冒険しよう。」＋ロゴ。
//
//   node tools/build_pr.js              # pr.json のリールを全部
//   node tools/build_pr.js toeic jhs    # 名前を指定して一部だけ
//
// 出力は 1080x1920 / 30fps / H.264 / AAC。App Store のプレビュー動画にも
// X（旧Twitter）にもそのまま出せる形式。
//
// ffmpeg が要る。PATH に無ければ環境変数 FFMPEG で場所を渡せる。
//   FFMPEG=/path/to/ffmpeg node tools/build_pr.js

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CFG = path.join(ROOT, "movie", "pr.json");
const TMP = path.join(ROOT, "movie", "tmp");
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const W = 1080, H = 1920, FPS = 30;

// ---- ffmpeg -------------------------------------------------------------
function ff(args) {
  try {
    return execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y"].concat(args), {
      encoding: "utf8", maxBuffer: 1 << 28
    });
  } catch (e) {
    console.error("\nffmpeg failed:\n" + (e.stderr || e.message));
    process.exit(1);
  }
}

// ffprobe を前提にしない（静的ビルドの ffmpeg には付いてこないことがある）。
// `ffmpeg -i` が吐く Duration 行を読む。0.01 秒あれば足りる用途。
function duration(file) {
  let out = "";
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    out = e.stderr || "";
  }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) { console.error(`  ! 長さが読めません: ${rel(file)}`); process.exit(1); }
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

function rel(p) { return path.relative(ROOT, p); }
function abs(p) { return path.isAbsolute(p) ? p : path.join(ROOT, p); }
function need(p, what) {
  if (!fs.existsSync(abs(p))) { console.error(`  ! ${what}が見つかりません: ${p}`); process.exit(1); }
  return abs(p);
}

// 動画・静止画のどちらも、まずこの一枚のキャンバスに載せてから扱う。
// 素材は 720p も 4K も混ざっている。
const NORM = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
             `setsar=1,fps=${FPS},format=yuv420p`;
const ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-an"];

// ---- 1カット ------------------------------------------------------------
function buildCut(cut, i, reel) {
  const out = path.join(TMP, `${reel}_${i}.mp4`);

  if (cut.img) {
    // スクリーンショットは 1290x2796。9:16 に切り落としたうえで、
    // ゆっくり寄る（寄り幅は zoom、切り出す高さの位置は yoff）。
    const src = need(cut.img, "スクリーンショット");
    const dur = cut.dur || 3.2;
    const frames = Math.round(dur * FPS);
    const z = cut.zoom || 1.08;
    const yoff = cut.yoff == null ? 0.5 : cut.yoff;
    // keep: 元の絵の縦の一部だけを使う（0.0〜1.0）。画面の下にある
    // 価格表示のように、動画に写したくない帯を落とすためのもの。
    const keep = cut.keep
      ? `crop=iw:ih*${(cut.keep[1] - cut.keep[0]).toFixed(4)}:0:ih*${cut.keep[0].toFixed(4)},`
      : "";
    // 2倍の作業キャンバスで寄ってから 1080x1920 に落とす（拡大のアラを出さない）
    const vf = keep +
      `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,` +
      `crop=${W * 2}:${H * 2}:(iw-${W * 2})/2:(ih-${H * 2})*${yoff},fps=${FPS},` +
      `zoompan=z='1+${(z - 1).toFixed(4)}*on/${frames - 1}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=1:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p`;
    ff(["-loop", "1", "-t", String(dur), "-i", src, "-vf", vf].concat(ENC, [out]));
  } else {
    const src = need(cut.src, "素材クリップ");
    const t = cut.trim || [0, duration(src)];
    const speed = cut.speed || 1;
    const vf = speed !== 1 ? `${NORM},setpts=${speed}*PTS` : NORM;
    ff(["-ss", String(t[0]), "-to", String(t[1]), "-i", src, "-vf", vf, "-map", "0:v:0"].concat(ENC, [out]));
  }

  const d = duration(out);
  console.log(`    ${cut.name || cut.img || cut.src}  →  ${d.toFixed(2)}秒`);
  return { file: out, dur: d };
}

// ---- カットをつなぐ -----------------------------------------------------
function joinCuts(clips, xf, reel) {
  if (clips.length === 1) return Object.assign({ starts: [0] }, clips[0]);
  const inputs = [];
  clips.forEach(c => inputs.push("-i", c.file));
  const starts = [0];
  let fc = "", prev = "0:v", acc = clips[0].dur;
  for (let i = 1; i < clips.length; i++) {
    starts.push(acc - xf);
    const label = i === clips.length - 1 ? "v" : `x${i}`;
    fc += `[${prev}][${i}:v]xfade=transition=fade:duration=${xf}:offset=${(acc - xf).toFixed(3)}[${label}];`;
    prev = label;
    acc = acc - xf + clips[i].dur;
  }
  const out = path.join(TMP, `${reel}_seq.mp4`);
  ff(inputs.concat(["-filter_complex", fc.replace(/;$/, ""), "-map", "[v]"], ENC, [out]));
  return { file: out, dur: duration(out), starts };
}

// ---- 字幕（ASS） --------------------------------------------------------
// drawtext を持たない ffmpeg ビルドがあるので、文字は libass で焼く。
// そのほうが縁取り・影・フェードの自由も利く。
const GOLD = "&H004AD2FF&";        // #FFD24A（ASSはBGR順）
const ASS_HEAD = (font) => `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Top,${font},72,&H00FFFFFF,&H00FFFFFF,&H00201005,&HA0000000,0,0,0,0,100,100,1,0,1,6,4,8,70,70,190,1
Style: Bottom,${font},72,&H00FFFFFF,&H00FFFFFF,&H00201005,&HA0000000,0,0,0,0,100,100,1,0,1,6,4,2,70,70,250,1
Style: Catch,${font},64,&H00FFFFFF,&H00FFFFFF,&H00201005,&HA0000000,0,0,0,0,100,100,2,0,1,6,4,8,70,70,470,1
Style: Sub,${font},52,&H004AD2FF,&H00FFFFFF,&H00201005,&HA0000000,0,0,0,0,100,100,1,0,1,5,3,8,70,70,1180,1
Style: Note,${font},26,&H00C8C8C8,&H00FFFFFF,&H00201005,&HA0000000,0,0,0,0,100,100,0,0,1,3,1,2,60,60,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

function ts(sec) {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

// {g}…{/} で囲んだところを金色にする
function markup(line) {
  return line.replace(/\{g\}/g, `{\\c${GOLD}}`).replace(/\{\/\}/g, "{\\c&H00FFFFFF&}");
}

function writeAss(reel, cuts, starts, total, endcard, font) {
  let s = ASS_HEAD(font);
  const ev = (style, from, to, text, extra) =>
    s += `Dialogue: 0,${ts(from)},${ts(to)},${style},,0,0,0,,${extra || ""}${markup(text)}\n`;

  cuts.forEach((cut, i) => {
    const lines = (cut.text || []).filter(Boolean);
    if (!lines.length) return;
    const st = starts[i] + (cut.textIn == null ? 0.35 : cut.textIn);
    const en = starts[i] + (cut.dur || 0) - 0.2;
    if (en <= st) return;
    // 下からすこし上げながら出す。止まった絵に動きを足すのはこれで足りる。
    const style = cut.pos === "top" ? "Top" : "Bottom";
    ev(style, st, en, lines.join("\\N"), "{\\fad(260,240)}");
  });

  // エンドカード
  if (endcard) {
    const st = total - (endcard.hold || 5.5);
    ev("Catch", st + 0.45, total, (endcard.catch || "単語帳を開くより、冒険しよう。"), "{\\fad(420,0)}");
    if (endcard.text && endcard.text.length)
      ev("Sub", st + 1.15, total, endcard.text.join("\\N"), "{\\fad(420,0)}");
    if (endcard.note)
      ev("Note", st + 1.4, total, endcard.note, "{\\fad(420,0)}");
  }

  const out = path.join(TMP, `${reel}.ass`);
  fs.writeFileSync(out, s, "utf8");
  return out;
}

// ---- 仕上げ（ロゴ・字幕・音）-------------------------------------------
// gradients フィルタは時間とともに色が動く（speed）。1枚だけ書き出して
// 静止画として使う。動画の長さに関係なく同じ沈み方になる。
function makeBand(reel, which, height, alpha) {
  const out = path.join(TMP, `${reel}_band_${which}.png`);
  const c0 = which === "top" ? `black@${alpha.toFixed(2)}` : "black@0";
  const c1 = which === "top" ? "black@0" : `black@${alpha.toFixed(2)}`;
  ff(["-f", "lavfi", "-i",
    `gradients=s=${W}x${height}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=0:y1=${height}:speed=0:d=1`,
    "-frames:v", "1", out]);
  return out;
}

function finish(reel, seq, cfg, assFile) {
  const total = seq.dur;
  const ec = cfg.endcard || {};
  const hold = ec.hold || 5.5;
  const ecStart = total - hold;
  const logo = ec.logo ? need(ec.logo, "ロゴ") : null;
  const logoW = Math.round(W * (ec.scale || 0.78));
  const still = ["-loop", "1", "-framerate", String(FPS), "-t", total.toFixed(2), "-i"];

  const inputs = ["-i", seq.file];
  const ni = () => inputs.filter(a => a === "-i").length - 1;   // いま足した入力の番号
  let fc = "";
  let v = "0:v";

  // 上下のうっすらした沈み込み。文字を読ませるためと、切り替えの多い絵を
  // ひとつの画面に見せるため。
  const band = cfg.band === undefined ? 0.5 : cfg.band;
  if (band > 0) {
    const bt = makeBand(reel, "top", 560, 0.80 * band);
    const bb = makeBand(reel, "bottom", 620, 0.86 * band);
    inputs.push.apply(inputs, still.concat([bt]));
    const ti = ni();
    inputs.push.apply(inputs, still.concat([bb]));
    const bi2 = ni();
    fc += `[${v}][${ti}:v]overlay=0:0:format=auto[vb1];`;
    fc += `[vb1][${bi2}:v]overlay=0:${H - 620}:format=auto[vb];`;
    v = "vb";
  }

  if (logo) {
    // 静止画を入れるときは -loop で時間を持たせる。1枚きりだと fade の
    // 起点（st）に永遠に届かず、透明なまま何も出ない。
    inputs.push.apply(inputs, still.concat([logo]));
    const li = ni();
    // エンドカードは絵がそのまま流れている上に重ねる。ロゴは金色なので、
    // 明るい絵の上ではまず読めない。先に画面を沈める。
    fc += `color=c=black:s=${W}x${H}:d=${total.toFixed(2)}:r=${FPS},format=yuva420p,` +
          `fade=t=in:st=${ecStart.toFixed(2)}:d=0.7:alpha=1,` +
          `colorchannelmixer=aa=${(ec.scrim == null ? 0.42 : ec.scrim)}[scrim];`;
    fc += `[${v}][scrim]overlay=0:0:format=auto[vs];`;
    fc += `[${li}:v]scale=${logoW}:-1,format=rgba,fade=t=in:st=${(ecStart + 0.5).toFixed(2)}:d=0.7:alpha=1[lg];`;
    fc += `[vs][lg]overlay=x=(W-w)/2:y=${Math.round(H * (ec.y == null ? 0.33 : ec.y))}:` +
          `enable='gte(t,${ecStart.toFixed(2)})':format=auto[vl];`;
    v = "vl";
  }

  fc += `[${v}]ass='${assFile.replace(/'/g, "\\'")}'[vout];`;

  // 音：BGM ＋ 効果音を数点。効果音は主張させない（絵に当てるだけ）。
  const bgm = cfg.bgm || {};
  const bgmFile = need(bgm.file || "assets/bgm/title.mp3", "BGM");
  inputs.push("-ss", String(bgm.start || 0), "-i", bgmFile);
  const bi = (inputs.filter(a => a === "-i").length) - 1;
  fc += `[${bi}:a]atrim=0:${total.toFixed(2)},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=${bgm.fadeIn == null ? 0.8 : bgm.fadeIn},` +
        `afade=t=out:st=${(total - (bgm.fadeOut == null ? 2.5 : bgm.fadeOut)).toFixed(2)}:d=${bgm.fadeOut == null ? 2.5 : bgm.fadeOut},` +
        `volume=${bgm.volume == null ? 0.9 : bgm.volume},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];`;

  const mix = ["[a0]"];
  (cfg.sfx || []).forEach((s, i) => {
    const f = need(s.file, "効果音");
    const at = s.cut != null ? seq.starts[s.cut - 1] + (s.at || 0) : (s.at || 0);
    inputs.push("-i", f);
    const idx = (inputs.filter(a => a === "-i").length) - 1;
    const ms = Math.round(at * 1000);
    fc += `[${idx}:a]adelay=${ms}|${ms},volume=${s.volume == null ? 0.45 : s.volume},` +
          `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[s${i}];`;
    mix.push(`[s${i}]`);
  });
  // 最後にラウドネスを揃える。曲ごとに音量差があるので、そのままだと
  // 6本並べたときに1本だけ小さい、ということが起きる（-14 LUFS はSNSの目安）。
  const LOUD = "loudnorm=I=-14:TP=-1.5:LRA=11";
  if (mix.length > 1) {
    fc += `${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0,${LOUD}[aout]`;
  } else {
    fc += `[a0]${LOUD}[aout]`;
  }

  const out = abs(cfg.out || `movie/out/${reel}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff(inputs.concat([
    "-filter_complex", fc,
    "-map", "[vout]", "-map", "[aout]",
    "-t", total.toFixed(2),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.0",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
    "-movflags", "+faststart", out
  ]));
  return out;
}

// ---- 1本ぶん -----------------------------------------------------------
function buildReel(name, cfg, font) {
  console.log(`\n▶ ${name}${cfg.title ? `  ${cfg.title}` : ""}`);
  const clips = [];
  cfg.cuts.forEach((cut, i) => {
    const c = buildCut(cut, i, name);
    cut.dur = c.dur;          // 字幕の時間計算に使う
    clips.push(c);
  });
  const seq = joinCuts(clips, cfg.crossfade == null ? 0.35 : cfg.crossfade, name);
  const ass = writeAss(name, cfg.cuts, seq.starts, seq.dur, cfg.endcard, font);
  const out = finish(name, seq, cfg, ass);
  const size = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`  ✓ ${rel(out)}  ${seq.dur.toFixed(1)}秒 / ${size}MB`);
  return { out, dur: seq.dur };
}

// ---- main ---------------------------------------------------------------
function main() {
  if (!fs.existsSync(CFG)) { console.error(`movie/pr.json がありません`); process.exit(1); }
  const cfg = JSON.parse(fs.readFileSync(CFG, "utf8"));
  const font = cfg.font || "M PLUS 2 ExtraBold";
  const want = process.argv.slice(2);
  const names = Object.keys(cfg.reels).filter(n => !want.length || want.includes(n));
  if (!names.length) {
    console.error(`そんなリールはありません: ${want.join(" ")}\n  ある: ${Object.keys(cfg.reels).join(" ")}`);
    process.exit(1);
  }
  fs.mkdirSync(TMP, { recursive: true });

  const made = [];
  for (const n of names) {
    // defaults を土台にして、リール側の指定で上書きする
    const d = cfg.defaults || {};
    const r = cfg.reels[n];
    const merged = Object.assign({}, d, r, {
      bgm: Object.assign({}, d.bgm, r.bgm),
      endcard: Object.assign({}, d.endcard, r.endcard),
      sfx: r.sfx || d.sfx || []
    });
    made.push([n, buildReel(n, merged, font)]);
  }

  console.log("\n— できたもの —");
  made.forEach(([n, m]) => console.log(`  ${n.padEnd(8)} ${m.dur.toFixed(1)}秒  ${rel(m.out)}`));
}

main();
