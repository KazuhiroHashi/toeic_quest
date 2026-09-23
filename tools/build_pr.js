#!/usr/bin/env node
// WORDRIA - PR（宣伝）動画の組み立て。音ハメ版。
//
//   node tools/build_pr.js              # movie/pr.json のリールを全部
//   node tools/build_pr.js toeic jhs    # 名前を指定して一部だけ
//   → movie/out/PR_<名前>.mp4（1080x1920 / 30fps / H.264 / AAC）
//
// 必要なもの
//   ffmpeg（PATH に無ければ FFMPEG=/path/to/ffmpeg）
//   npm install playwright-core @fontsource/m-plus-rounded-1c --no-save
//     … 字幕の絵を Chromium で描くため。フォントはゲームと同じ M PLUS Rounded 1c
//   movie/beats/<曲>.json … tools/beat_grid.py で作る拍の表（コミット済み）
//   movie/play/*.mp4     … tools/record_play.js で録った実プレイ（コミット済み）
//
// ── 考え方 ──────────────────────────────────────────
// 1. 時間の単位は「秒」ではなく「拍」。カットの長さは拍の数で書く。
//    切り替わりは必ず拍の上に来る（BGM の実測の拍なので、テンポの揺れにも付いていく）。
// 2. 実プレイは「答えた瞬間」を拍に合わせられる（sync）。録画のときに
//    tools/record_play.js が出来事の時刻を控えているので、それを拍に置く。
// 3. 切り替わりの瞬間にズームのパンチ（punch）と白いフラッシュ（flash）を入れる。
//    フラッシュは小節の頭だけ。全部に入れるとうるさい。
// 4. 字幕は小さめの色付きの札。画面の下、ゲームの十字キーのあたりに出す
//    （プレイ画面の大事なところには被せない）。拍に合わせてポンと出る。
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CFG = path.join(ROOT, "movie", "pr.json");
const TMP = path.join(ROOT, "movie", "tmp", "pr");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const EXE = process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const W = 1080, H = 1920, FPS = 30;

// ---- ffmpeg -------------------------------------------------------------
function ff(args) {
  try {
    return execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y"].concat(args), {
      encoding: "utf8", maxBuffer: 1 << 28
    });
  } catch (e) {
    fs.writeFileSync(path.join(TMP, "failed_args.json"), JSON.stringify(args));
    console.error("\nffmpeg failed (status " + e.status + ", signal " + e.signal + "):\n" + (e.stderr || e.message).slice(-3000));
    process.exit(1);
  }
}
function duration(file) {
  let out = "";
  try { execFileSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8", stdio: "pipe" }); }
  catch (e) { out = e.stderr || ""; }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) throw new Error("長さが読めません: " + file);
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}
const rel = p => path.relative(ROOT, p);
const abs = p => (path.isAbsolute(p) ? p : path.join(ROOT, p));
function need(p, what) {
  if (!fs.existsSync(abs(p))) { console.error(`  ! ${what}が見つかりません: ${p}`); process.exit(1); }
  return abs(p);
}
const n3 = x => (+x).toFixed(3);

// ---- 素材の解決 ---------------------------------------------------------
// "play/battle" → movie/play/battle.mp4 ＋ 出来事の表 movie/play/battle.json
function source(src) {
  if (src.startsWith("play/")) {
    const base = path.join(ROOT, "movie", src);
    const file = need(base + ".mp4", "実プレイの録画");
    const ev = fs.existsSync(base + ".json") ? JSON.parse(fs.readFileSync(base + ".json", "utf8")).events : {};
    return { file, events: ev };
  }
  return { file: need(src, "素材"), events: {} };
}

// ---- 1カット -------------------------------------------------------------
// dur 秒ぶんを、ちょうど frames コマで書き出す（拍の位置とコマをずらさない）
function renderCut(cut, i, reel, dur, frames, beatLen) {
  const out = path.join(TMP, `${reel}_${String(i).padStart(2, "0")}.mp4`);
  const { file, events } = source(cut.src);
  const speed = cut.speed || 1;

  // どこから使うか。sync があれば「その出来事が、このカットの n 拍目に来る」ように逆算
  let from = 0;
  if (cut.sync) {
    const t = events[cut.sync.event];
    if (t == null) throw new Error(`出来事がありません: ${cut.src} の ${cut.sync.event}`);
    from = t - (cut.sync.beat || 0) * beatLen * speed + (cut.sync.shift || 0);
  } else if (typeof cut.at === "string") {
    const t = events[cut.at];
    if (t == null) throw new Error(`出来事がありません: ${cut.src} の ${cut.at}`);
    from = t + (cut.shift || 0);
  } else {
    from = cut.at || 0;
  }
  from = Math.max(0, from);

  // 画面の動き：一定の寄り(zoom) ＋ ゆっくりの寄り(drift) ＋ 頭のパンチ ＋ 揺れ
  const fx = cut.fx || ["punch"];
  const z0 = cut.zoom || 1.0;
  const drift = cut.drift == null ? 0.04 : cut.drift;
  const punch = fx.includes("punch") ? (cut.punch || 0.09) : 0;
  const shake = fx.includes("shake") ? 16 : 0;
  const fxp = cut.focus || [0.5, 0.5];
  // pulse: カットの途中でも拍ごとに小さく跳ねる（音ハメを画面の動きでも見せる）
  const pulse = cut.pulse || 0;
  const zExpr = `${z0}+${drift}*in_time/${n3(dur)}+${punch}*pow(max(0\\,1-in_time/0.26)\\,2)` +
    (pulse ? `+${pulse}*pow(max(0\\,1-mod(in_time\\,${n3(beatLen / speed)})/0.13)\\,2)` : "");
  const xExpr = `(iw-iw/zoom)*${fxp[0]}` + (shake ? `+${shake}*sin(in_time*75)*max(0\\,1-in_time/0.32)` : "");
  const yExpr = `(ih-ih/zoom)*${fxp[1]}` + (shake ? `+${shake * 0.6}*cos(in_time*61)*max(0\\,1-in_time/0.32)` : "");

  let vf = `setpts=(PTS-STARTPTS)/${speed},` +
    `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},` +
    `tpad=stop_mode=clone:stop_duration=3,` +
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${W}x${H}:fps=${FPS},setsar=1`;
  if (cut.dim) vf += `,colorchannelmixer=rr=${1 - cut.dim}:gg=${1 - cut.dim}:bb=${1 - cut.dim}`;
  if (cut.flash) vf += `,fade=t=in:st=0:d=0.18:color=white`;
  vf += ",format=yuv420p";

  const input = cut.src.endsWith(".png")
    ? ["-loop", "1", "-framerate", String(FPS), "-t", n3(dur + 1), "-i", file]
    : ["-ss", n3(from), "-t", n3(dur * speed + 1), "-i", file];
  ff(input.concat(["-vf", vf, "-frames:v", String(frames), "-an",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(FPS), out]));
  return out;
}

// ---- 字幕の絵（Chromium で描く）---------------------------------------
// 文字の組版は ffmpeg より Chrome のほうがずっと上手い（角丸の札、グラデーション、
// ゲームと同じ丸ゴシック）。1枚ずつ透過PNGに書き出して、ffmpeg では重ねるだけ。
function fontCss() {
  const css = path.join(ROOT, "node_modules", "@fontsource", "m-plus-rounded-1c", "800.css");
  return fs.existsSync(css) ? `<link rel="stylesheet" href="file://${css}">` : "";
}

const STYLE = (th) => `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background: transparent; }
  body { font-family: 'M PLUS Rounded 1c', 'M PLUS 2', 'Noto Sans CJK JP', sans-serif; font-weight: 800; }
  #wrap { display:inline-block; padding: 34px 40px 44px; }
  em { font-style: normal; color: ${th.accent}; }
  .cap {
    display:inline-block; color:#fff; font-size:44px; line-height:1.25; letter-spacing:.03em;
    padding: 17px 38px 19px; border-radius: 999px; text-align:center; white-space:nowrap;
    background: linear-gradient(120deg, ${th.bg1} 0%, ${th.bg2} 100%);
    border: 3.5px solid ${th.edge};
    box-shadow: 0 10px 26px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.22);
    text-shadow: 0 2px 0 rgba(0,0,0,.35);
  }
  .cap.two { border-radius: 38px; }
  .catch {
    display:inline-block; color:#fff; font-size:60px; letter-spacing:.04em; white-space:nowrap;
    -webkit-text-stroke: 3px rgba(20,12,60,.9); paint-order: stroke fill;
    text-shadow: 0 0 18px ${th.edge}aa, 0 4px 0 rgba(0,0,0,.45), 0 10px 24px rgba(0,0,0,.6);
  }
  .sub { font-size: 40px; }
  .note { display:inline-block; color:rgba(235,235,245,.85); font-size:22px; font-weight:700;
          text-shadow: 0 1px 3px rgba(0,0,0,.9); white-space:nowrap; }
`;

function markup(text) {
  const lines = Array.isArray(text) ? text : [text];
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return lines.map(l => esc(l).replace(/\{g\}/g, "<em>").replace(/\{\/\}/g, "</em>")).join("<br>");
}

async function renderPngs(items, theme) {
  const { chromium } = require("playwright-core");
  const dir = path.join(TMP, "caps");
  fs.mkdirSync(dir, { recursive: true });
  const todo = items.filter(it => {
    it.file = path.join(dir, crypto.createHash("md5")
      .update(JSON.stringify([it.kind, it.text, theme, STYLE(theme)])).digest("hex").slice(0, 12) + ".png");
    return !fs.existsSync(it.file);
  });
  if (todo.length) {
    const browser = await chromium.launch({ executablePath: EXE });
    const page = await browser.newPage({ viewport: { width: 1400, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fontCss()}
      <style>${STYLE(theme)}</style></head><body><div id="wrap"></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    for (const it of todo) {
      const cls = it.kind === "cap" ? "cap" : it.kind === "sub" ? "cap sub" : it.kind;
      const two = Array.isArray(it.text) && it.text.length > 1 ? " two" : "";
      await page.evaluate(([html, c]) => {
        const w = document.getElementById("wrap");
        w.innerHTML = `<div class="${c}">${html}</div>`;
      }, [markup(it.text), cls + two]);
      await page.evaluate(() => document.fonts.ready);
      // 横幅が画面の9割を超えたら字を詰める
      await page.evaluate((max) => {
        const el = document.querySelector("#wrap > div");
        let fs = parseFloat(getComputedStyle(el).fontSize);
        while (el.offsetWidth > max && fs > 18) { fs -= 1; el.style.fontSize = fs + "px"; }
      }, it.kind === "note" ? 1020 : 960);
      await page.locator("#wrap").screenshot({ path: it.file, omitBackground: true });
    }
    await browser.close();
  }
  return items;
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ---- 1本 -----------------------------------------------------------------
async function buildReel(name, cfg, defaults) {
  const theme = Object.assign({}, defaults.theme, cfg.theme);
  const ec = Object.assign({}, defaults.endcard, cfg.endcard);
  const music = cfg.music;
  const grid = JSON.parse(fs.readFileSync(need(`movie/beats/${music.track}.json`, "拍の表"), "utf8"));
  const B = grid.beats;
  // 始まりは小節の頭にそろえる
  const s0 = grid.down.find(d => d >= (music.startBeat || 0));
  const beatLen = (B[s0 + 8] - B[s0]) / 8;
  console.log(`\n▶ ${name}  ${cfg.title || ""}  （${music.track} ${grid.tempo}BPM・${s0}拍目から）`);

  // 拍 → 秒（動画の頭が 0）
  const T = k => B[s0 + k] - B[s0];
  const cuts = cfg.cuts.slice();
  cuts.push(Object.assign({ endcard: true }, ec.shot, { beats: ec.beats || 8 }));

  let k = 0;
  const plan = cuts.map(c => {
    const a = k, b = k + c.beats;
    k = b;
    if (s0 + b >= B.length) throw new Error("曲が足りません。startBeat を前にしてください");
    return { c, a, b, t0: T(a), t1: T(b) };
  });
  const total = plan[plan.length - 1].t1 + (ec.tail || 0.9);   // 最後の拍のあと、余韻を少し
  plan[plan.length - 1].t1 = total;

  // 小節の頭に来るカットだけフラッシュ
  const downs = new Set(grid.down.map(d => d - s0));
  plan.forEach(p => { if (p.c.flash == null) p.c.flash = downs.has(p.a) && p.a > 0; });

  // 1カットずつ
  fs.mkdirSync(TMP, { recursive: true });
  const files = plan.map((p, i) => {
    const f0 = Math.round(p.t0 * FPS), f1 = Math.round(p.t1 * FPS);
    const f = renderCut(p.c, i, name, p.t1 - p.t0, f1 - f0, beatLen);
    const label = p.c.endcard ? "エンドカード" : (p.c.src + (p.c.sync ? ` @${p.c.sync.event}` : ""));
    console.log(`    ${String(p.a).padStart(2)}拍 +${String(p.c.beats).padStart(2)}  ${label}`);
    return f;
  });
  const list = path.join(TMP, `${name}_list.txt`);
  fs.writeFileSync(list, files.map(f => `file '${f}'`).join("\n") + "\n");
  const seq = path.join(TMP, `${name}_seq.mp4`);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", seq]);

  // 字幕：カットの頭の拍でポンと出て、capBeats 拍ぶん残る
  const caps = [];
  plan.forEach(p => {
    if (!p.c.cap) return;
    const a = p.t0 + (p.c.capIn || 0) * beatLen;
    const endBeat = p.a + (p.c.capBeats || p.c.beats);
    caps.push({ kind: "cap", text: p.c.cap, a, b: endBeat >= k ? total : T(endBeat), pop: p.c.capPop, y: p.c.capY });
  });
  // エンドカード：拍0でロゴ、拍1でキャッチ（ロゴの上）、拍2で締めの一行
  const ep = plan[plan.length - 1];
  const E = j => ep.t0 + j * beatLen;
  // catch を null にすると、ロゴだけで締める
  const endItems = ec.catch ? [{ kind: "catch", text: ec.catch, a: E(1), b: total }] : [];
  if (ec.text) endItems.push({ kind: "sub", text: ec.text, a: E(2), b: total });
  if (ec.note) endItems.push({ kind: "note", text: ec.note, a: E(3), b: total });
  await renderPngs(caps.concat(endItems), theme);

  // ---- 重ねる ----
  const inputs = ["-i", seq];
  const idx = () => inputs.filter(x => x === "-i").length - 1;
  let fc = "", v = "0:v", nlab = 0;
  const lab = () => `v${++nlab}`;

  // ポンと出す：頭の 0.16 秒で (1+amt)倍 → 1倍。
  // 倍率は clip で 0〜1 に抑える。抑えないと、出る前の時刻（t < a）で倍率が
  // 何十倍にもなり、巨大な絵を作ろうとしてメモリが尽きる（実際に 14GB で落ちた）。
  // 静止画は -loop の入力にせず、グラフの中で movie → loop で作る。
  // -loop の入力は読み込み側が先走ってコマを溜め込み、枚数が多いと
  // ffmpeg がメモリを食い尽くして落ちた（14GB）。loop フィルタは
  // 要求されたぶんだけ1枚を複製するので溜まらない。
  function pop(file, a, b, cx, cy, baseW, amt) {
    const w0 = baseW || pngSize(file).w;
    const nfr = Math.max(1, Math.round((b - a) * FPS));
    const o = lab(), s = `s${nlab}`;
    fc += `movie=filename=${file},format=rgba,loop=loop=${nfr - 1}:size=1:start=0,` +
          `setpts=N/${FPS}/TB+${n3(a)}/TB,` +
          `scale=w='trunc(${w0}*(1+${amt == null ? 0.22 : amt}*pow(clip(1-(t-${n3(a)})/0.16\\,0\\,1)\\,2))/2)*2':h=-2:eval=frame[${s}];`;
    fc += `[${v}][${s}]overlay=x='${cx}-w/2':y='${cy}-h/2':eval=frame:eof_action=pass:format=auto[${o}];`;
    v = o;
  }

  const capY = ec.capY || 1630;
  caps.forEach(c => pop(c.file, c.a, c.b, W / 2, c.y || capY, null, c.pop));

  // ロゴ：エンドカードの頭（拍0）で大きく入る
  const logoW = Math.round(W * (ec.scale || 0.8));
  const logoY = Math.round(H * (ec.y || 0.40));
  pop(need(ec.logo, "ロゴ"), ep.t0, total, W / 2, logoY, logoW, 0.45);
  // キャッチはロゴの上、締めの一行はロゴの下、注記はいちばん下
  const logoH = Math.round(logoW * pngSize(abs(ec.logo)).h / pngSize(abs(ec.logo)).w);
  endItems.forEach(it => {
    const sz = pngSize(it.file);
    const cy = it.kind === "catch" ? logoY - logoH / 2 - sz.h / 2 + 30
             : it.kind === "sub" ? logoY + logoH / 2 + sz.h / 2 - 10
             : H - 40 - sz.h / 2;
    pop(it.file, it.a, it.b, W / 2, Math.round(cy), null, it.kind === "note" ? 0 : 0.2);
  });
  fc += `[${v}]null[vout];`;

  // ---- 音 ----
  inputs.push("-ss", n3(B[s0]), "-t", n3(total), "-i", need(grid.file, "BGM"));
  const mi = idx();
  const fo = music.fadeOut || 1.4;
  fc += `[${mi}:a]asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.03,` +
        `afade=t=out:st=${n3(total - fo)}:d=${fo},volume=${music.volume || 1},` +
        `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[am];`;
  const mix = ["[am]"];
  plan.forEach((p, i) => (p.c.sfx || []).forEach((sx, j) => {
    const [nm, beat, vol] = sx;
    inputs.push("-i", need(`assets/sfx/${nm}.mp3`, "効果音"));
    const si = idx();
    const ms = Math.round((p.t0 + (beat || 0) * beatLen) * 1000);
    fc += `[${si}:a]adelay=${ms}|${ms},volume=${vol == null ? 0.5 : vol},` +
          `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[x${i}_${j}];`;
    mix.push(`[x${i}_${j}]`);
  }));
  fc += `${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0,` +
        `loudnorm=I=-14:TP=-1.5:LRA=11[aout]`;

  const out = abs(cfg.out || `movie/out/PR_${name}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff(inputs.concat(["-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-t", n3(total),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.0", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", out]));
  const mb = (fs.statSync(out).size / 1048576).toFixed(1);
  console.log(`  ✓ ${rel(out)}  ${total.toFixed(1)}秒 / ${mb}MB`);
  return { out, total };
}

(async function main() {
  const cfg = JSON.parse(fs.readFileSync(CFG, "utf8"));
  const want = process.argv.slice(2);
  const names = Object.keys(cfg.reels).filter(n => !want.length || want.includes(n));
  if (!names.length) {
    console.error(`そんなリールはありません: ${want.join(" ")}\n  ある: ${Object.keys(cfg.reels).join(" ")}`);
    process.exit(1);
  }
  const made = [];
  for (const n of names) made.push([n, await buildReel(n, cfg.reels[n], cfg.defaults || {})]);
  console.log("\n— できたもの —");
  made.forEach(([n, m]) => console.log(`  ${n.padEnd(8)} ${m.total.toFixed(1)}秒  ${rel(m.out)}`));
})().catch(e => { console.error("\n" + (e.stack || e.message)); process.exit(1); });
