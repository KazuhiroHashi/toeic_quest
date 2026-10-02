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
//   movie/play/*.mkv     … tools/record_play.js で録った実プレイ（1206×2622・劣化なし。
//                          大きいのでコミットしない。無ければ録り直す。古い *.mp4 は予備）
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
// 5. 画質：動画として圧縮するのは、最後の書き出しの1回だけ。
//    録画（劣化なし）→ 1カットずつ（劣化なし・RGB のまま）→ つなぐ（コピー）
//    → 字幕を重ねて、ここで初めて H.264（yuv420p）に圧縮する。
//    絵の大きさを変えるのも、1カットにつき lanczos で1回（＋2倍の画面からの半分への縮小）。
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
// PR_CFG=movie/quiz.json のように、別の設定ファイルでも組み立てられる（クイズ動画など）
const CFG = process.env.PR_CFG ? path.resolve(ROOT, process.env.PR_CFG) : path.join(ROOT, "movie", "pr.json");
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
// "play/battle" → movie/play/battle.mkv ＋ 出来事の表 movie/play/battle.json
// .mkv（劣化なしの録画）を使う。無いときだけ古い .mp4 を使い、そのことを知らせる
function source(src) {
  if (src.startsWith("color:")) return { file: null, events: {} };   // 無地の背景
  if (src.startsWith("play/")) {
    const base = path.join(ROOT, "movie", src);
    let file = base + ".mkv";
    if (!fs.existsSync(file)) {
      file = need(base + ".mp4", "実プレイの録画");
      if (!warned.has(src)) { warned.add(src); console.warn(`    ! ${src} は劣化なしの録画（.mkv）がありません。古い .mp4 を使います（画質が落ちます）`); }
    }
    const ev = fs.existsSync(base + ".json") ? JSON.parse(fs.readFileSync(base + ".json", "utf8")).events : {};
    return { file, events: ev };
  }
  return { file: need(src, "素材"), events: {} };
}

const warned = new Set();
// 効果音の名前 → ファイル。"voice/itinerary" のように書くと、ゲームの英単語の読み上げ（assets/voice）を鳴らす
const sfxFile = nm => (nm.includes("/") ? `assets/${nm}.mp3` : `assets/sfx/${nm}.mp3`);

// ---- 1カット -------------------------------------------------------------
// dur 秒ぶんを、ちょうど frames コマで書き出す（拍の位置とコマをずらさない）
function renderCut(cut, i, reel, dur, frames, beatLen) {
  const out = path.join(TMP, `${reel}_${String(i).padStart(2, "0")}.mkv`);
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
  const shake = fx.includes("shake") ? 32 : 0;   // 2倍の大きさで計算するので px も2倍（仕上がりで16px）
  const fxp = cut.focus || [0.5, 0.5];
  // pulse: カットの途中でも拍ごとに小さく跳ねる（音ハメを画面の動きでも見せる）
  const pulse = cut.pulse || 0;
  const Z = `${z0}+${drift}*t/${n3(dur)}+${punch}*pow(max(0\\,1-t/0.26)\\,2)` +
    (pulse ? `+${pulse}*pow(max(0\\,1-mod(t\\,${n3(beatLen / speed)})/0.13)\\,2)` : "");
  const sx = shake ? `+${shake}*sin(t*75)*max(0\\,1-t/0.32)` : "";
  const sy = shake ? `+${shake * 0.6}*cos(t*61)*max(0\\,1-t/0.32)` : "";

  // 寄り・揺れ：元の録画（1206×2622）を、寄りの倍率ぶんまで lanczos で1回だけ拡げ
  // （2倍の画面 2160×3840 を覆う大きさ）、切り抜いて、最後にちょうど半分に縮める。
  // 以前は「2倍に拡げる → zoompan の中でもう一度拡大縮小 → 縮める」で、
  // 大きさを変える処理が3回重なっていた。2倍の画面で切り抜くのは、ゆっくり寄るときに
  // 1ピクセル単位でカクつかないようにするため（仕上がりで半ピクセル単位になる）。
  const W2 = W * 2, H2 = H * 2;
  const cover = `max(${W2}/iw\\,${H2}/ih)*(${Z})`;
  let vf = `setpts=(PTS-STARTPTS)/${speed},fps=${FPS},tpad=stop_mode=clone:stop_duration=3,format=gbrp,` +
    `scale=w='2*trunc(iw*${cover}/2)':h='2*trunc(ih*${cover}/2)':eval=frame:flags=lanczos+accurate_rnd+full_chroma_int,` +
    `crop=${W2}:${H2}:x='clip((iw-${W2})*${fxp[0]}${sx}\\,0\\,iw-${W2})':y='clip((ih-${H2})*${fxp[1]}${sy}\\,0\\,ih-${H2})',` +
    `scale=${W}:${H}:flags=lanczos+accurate_rnd,setsar=1`;
  if (cut.stripes) vf += `,drawgrid=w=iw:h=${cut.stripes}:t=${Math.max(2, Math.round(cut.stripes / 5))}:c=0xE9E9EC`;
  if (cut.dim) vf += `,colorchannelmixer=rr=${1 - cut.dim}:gg=${1 - cut.dim}:bb=${1 - cut.dim}`;
  if (cut.flash) vf += `,fade=t=in:st=0:d=0.18:color=white`;
  vf += ",format=rgb24";

  const input = cut.src.startsWith("color:")
    ? ["-f", "lavfi", "-i", `color=c=0x${cut.src.slice(7).replace("#", "")}:s=${W}x${H}:r=${FPS}:d=${n3(dur + 1)}`]
    : cut.src.endsWith(".png")
    ? ["-loop", "1", "-framerate", String(FPS), "-t", n3(dur + 1), "-i", file]
    : ["-ss", n3(from), "-t", n3(dur * speed + 1), "-i", file];
  ff(input.concat(["-vf", vf, "-frames:v", String(frames), "-an",
    // 途中のファイルは劣化なし（RGB のまま -qp 0）。圧縮は最後の書き出しの1回だけ
    "-c:v", "libx264rgb", "-qp", "0", "-preset", "ultrafast", "-r", String(FPS), out]));
  return out;
}

// ---- 字幕の絵（Chromium で描く）---------------------------------------
// 文字の組版は ffmpeg より Chrome のほうがずっと上手い（角丸の札、グラデーション、
// ゲームと同じ丸ゴシック）。1枚ずつ透過PNGに書き出して、ffmpeg では重ねるだけ。
function fontCss() {
  const dir = path.join(ROOT, "node_modules", "@fontsource", "m-plus-rounded-1c");
  return ["800.css", "900.css"].filter(f => fs.existsSync(path.join(dir, f)))
    .map(f => `<link rel="stylesheet" href="file://${path.join(dir, f)}">`).join("");
}

const STYLE = (th) => `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background: transparent; }
  body { font-family: 'M PLUS Rounded 1c', 'M PLUS 2', 'Noto Sans CJK JP', sans-serif; font-weight: 800; }
  #wrap { display:inline-block; padding: 34px 40px 44px; }
  em { font-style: normal; color: ${th.accent}; }
  .cap {
    display:inline-block; color:#fff; font-size:${th.capSize || 44}px; line-height:1.25; letter-spacing:.03em;
    padding: .38em .86em .43em; border-radius: 999px; text-align:center; white-space:nowrap;
    background: linear-gradient(120deg, ${th.bg1} 0%, ${th.bg2} 100%);
    border: ${th.capSize > 50 ? 5 : 3.5}px solid ${th.edge};
    box-shadow: 0 10px 26px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.22);
    text-shadow: 0 2px 0 rgba(0,0,0,.35);
  }
  .cap.two { border-radius: .86em; }
  .catch {
    display:inline-block; color:#fff; font-size:60px; letter-spacing:.04em; white-space:nowrap;
    -webkit-text-stroke: 3px rgba(20,12,60,.9); paint-order: stroke fill;
    text-shadow: 0 0 18px ${th.edge}aa, 0 4px 0 rgba(0,0,0,.45), 0 10px 24px rgba(0,0,0,.6);
  }
  .sub { font-size: 40px; padding-left: .6em; padding-right: .6em; }
  /* 大きく色つきの字幕（家族制作のPR動画と同じ見せ方）。札は付けず、
     ピンクの極太丸ゴシックに太い白フチとピンクの光 */
  .big { display:inline-block; font-weight:900; font-size:${th.capSize || 104}px; line-height:1.15;
         letter-spacing:.01em; white-space:nowrap; color:${th.fill || "#ff2fa6"};
         -webkit-text-stroke:${Math.round((th.capSize || 104) * 0.15)}px #fff; paint-order: stroke fill;
         filter: drop-shadow(0 0 12px ${th.glow || "rgba(255,70,185,.95)"}) drop-shadow(0 0 4px ${th.glow || "rgba(255,70,185,.95)"})
                 drop-shadow(0 5px 6px rgba(0,0,0,.35)); }
  .big em { color:${th.accent2 || th.fill || "#ff2fa6"}; }
  .catch.gold { font-weight:900; font-size:${th.catchSize || 78}px; -webkit-text-stroke:0; text-shadow:none;
         background: linear-gradient(180deg, #dcb83e 0%, #a07a16 58%, #6a4e08 100%);
         -webkit-background-clip:text; background-clip:text; color:transparent;
         filter: drop-shadow(0 0 7px #ffe600) drop-shadow(0 0 16px rgba(255,215,0,.85)); }
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
      .update(JSON.stringify([it.kind, it.text, it.size, theme, STYLE(theme), "f2"])).digest("hex").slice(0, 12) + ".png");
    return !fs.existsSync(it.file);
  });
  if (todo.length) {
    const browser = await chromium.launch({ executablePath: EXE });
    const page = await browser.newPage({ viewport: { width: 1400, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fontCss()}
      <style>${STYLE(theme)}</style></head><body><div id="wrap"></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    for (const it of todo) {
      const cls = it.kind === "cap" ? "cap" : it.kind === "sub" ? "cap sub"
                : it.kind === "catch" && theme.catchStyle === "gold" ? "catch gold" : it.kind;
      const two = Array.isArray(it.text) && it.text.length > 1 ? " two" : "";
      await page.evaluate(([html, c, sz]) => {
        const w = document.getElementById("wrap");
        w.innerHTML = `<div class="${c}"${sz ? ` data-size="${sz}"` : ""}>${html}</div>`;
      }, [markup(it.text), cls + two, it.size || 0]);
      // unicode-range で分かれたフォントは、使う字を指定して読ませないと
      // 間に合わず別の書体で描かれることがある（実際に明朝で出た）
      await page.evaluate(async (t) => {
        await document.fonts.load("900 100px 'M PLUS Rounded 1c'", t);
        await document.fonts.load("800 100px 'M PLUS Rounded 1c'", t);
        await document.fonts.ready;
      }, [].concat(it.text).join(""));
      // 横幅が画面の9割を超えたら字を詰める
      await page.evaluate((max) => {
        const el = document.querySelector("#wrap > div");
        if (el.dataset.size) el.style.fontSize = el.dataset.size + "px";
        let fs = parseFloat(getComputedStyle(el).fontSize);
        while (el.offsetWidth > max && fs > 18) { fs -= 1; el.style.fontSize = fs + "px"; }
      }, it.kind === "note" ? 1020 : it.kind === "big" || it.kind === "catch" ? 1010 : it.kind === "sub" ? 1030 : 960);
      await page.locator("#wrap").screenshot({ path: it.file, omitBackground: true });
    }
    await browser.close();
  }
  return items;
}
// 締めの「WORDRIA」を1文字ずつ透過PNGにする。ゲームのタイトルと同じ Cinzel の
// 金文字。1文字ずつ、単語の中心から見た位置（cx, cy）も返すので、ffmpeg 側で
// 1文字ずつ拍に合わせて叩き込める。最後にもう1枚、光を強めた単語全体を作る。
async function renderLetters(text, theme) {
  const { chromium } = require("playwright-core");
  const dir = path.join(TMP, "letters");
  fs.mkdirSync(dir, { recursive: true });
  const key = crypto.createHash("md5").update(JSON.stringify([text, theme.wordSize, "v1"])).digest("hex").slice(0, 10);
  const meta = path.join(dir, key + ".json");
  if (fs.existsSync(meta)) return JSON.parse(fs.readFileSync(meta, "utf8"));
  const font = path.join(ROOT, "assets", "fonts", "Cinzel-latin.woff2");
  const size = theme.wordSize || 170;
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1400, height: 700 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Cinzel; src: url(file://${font}); font-weight: 400 900; }
    html, body { margin:0; background: transparent; }
    #wrap { position:absolute; left:80px; top:120px; padding: 40px; }
    #word { font-family: Cinzel, serif; font-weight: 900; font-size: ${size}px; letter-spacing: .02em;
            white-space: nowrap; line-height: 1; }
    #word span { display:inline-block;
      background: linear-gradient(180deg, #fffbe6 0%, #ffe07a 38%, #e0a02a 62%, #fff1b8 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      -webkit-text-stroke: 3px #3b2206;
      filter: drop-shadow(0 0 14px rgba(255,200,80,.75)) drop-shadow(0 6px 8px rgba(0,0,0,.85)); }
    #word.glow span { filter: drop-shadow(0 0 26px rgba(255,220,120,.95)) drop-shadow(0 0 60px rgba(255,170,40,.6))
                                drop-shadow(0 6px 8px rgba(0,0,0,.85)); }
    .off { visibility: hidden; }
  </style></head><body><div id="wrap"><div id="word">${[...text].map(c => `<span>${c}</span>`).join("")}</div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const wr = await page.locator("#word").boundingBox();
  const out = { letters: [], word: null };
  const pad = 50;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    await page.evaluate(i => document.querySelectorAll("#word span").forEach((s, j) => s.classList.toggle("off", j !== i)), i);
    const r = await page.locator(`#word span >> nth=${i}`).boundingBox();
    const file = path.join(dir, `${key}_${i}.png`);
    await page.screenshot({ path: file, omitBackground: true,
      clip: { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 } });
    out.letters.push({ file, cx: Math.round(r.x + r.width / 2 - (wr.x + wr.width / 2)),
                             cy: Math.round(r.y + r.height / 2 - (wr.y + wr.height / 2)) });
  }
  await page.evaluate(() => { document.querySelectorAll("#word span").forEach(s => s.classList.remove("off"));
                               document.getElementById("word").classList.add("glow"); });
  out.word = path.join(dir, `${key}_word.png`);
  await page.screenshot({ path: out.word, omitBackground: true,
    clip: { x: wr.x - pad * 2, y: wr.y - pad * 2, width: wr.width + pad * 4, height: wr.height + pad * 4 } });
  await browser.close();
  fs.writeFileSync(meta, JSON.stringify(out));
  return out;
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
  // letters：締めは文字だけ。1拍に1文字ずつ入り、slamBeat 拍目で単語全体を
  // 叩きつけて、そこで音楽を切る。そのあと hold 秒だけ余韻を残して終わる
  const letters = ec.mode === "letters";
  const lastA = plan[plan.length - 1].a;
  const slamT = (letters || ec.slamBeat) ? T(lastA + (ec.slamBeat || 8)) : null;
  const total = slamT != null ? slamT + (ec.hold || 1.8)
                        : plan[plan.length - 1].t1 + (ec.tail || 0.9);   // 最後の拍のあと、余韻を少し
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
  const seq = path.join(TMP, `${name}_seq.mkv`);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", seq]);

  // 字幕：カットの頭の拍でポンと出て、capBeats 拍ぶん残る
  const caps = [];
  plan.forEach(p => {
    if (!p.c.cap) return;
    const a = p.t0 + (p.c.capIn || 0) * beatLen;
    const endBeat = p.a + (p.c.capBeats || p.c.beats);
    const b = endBeat >= k ? total : T(endBeat);
    if (theme.capStyle === "big") {
      // 1行ずつ別の絵にして、2行目は lineStep 拍遅れて出す（拍に乗せて畳みかける）。
      // lineAt: [0, 1, 1] のように書くと、行ごとに何拍目に出すかを決められる（同じ数字の行は同時）
      const lines = [].concat(p.c.cap);
      const step = (p.c.lineStep == null ? (theme.lineStep == null ? 1 : theme.lineStep) : p.c.lineStep) * beatLen;
      const at = i => (p.c.lineAt ? p.c.lineAt[i] * beatLen : i * step);
      lines.forEach((ln, i) => caps.push({ kind: "big", text: ln, a: a + at(i), b, pop: p.c.capPop,
        y: p.c.capY, line: i, lines: lines.length, size: p.c.capSize }));
    } else {
      caps.push({ kind: "cap", text: p.c.cap, a, b, pop: p.c.capPop, y: p.c.capY });
    }
  });
  // エンドカード：拍0でロゴ、拍1でキャッチ（ロゴの上）、拍2で締めの一行
  const ep = plan[plan.length - 1];
  const E = j => ep.t0 + j * beatLen;
  // catch を null にすると、ロゴだけで締める
  const endItems = (!letters && ec.catch) ? [{ kind: "catch", text: ec.catch, a: E(ec.catchBeat == null ? 1 : ec.catchBeat), b: total }] : [];
  // 締めの一行（ロゴの下の札）。subSize で字の大きさ（ふだんは 40px）、subBeat で出る拍（ふだんは 2。0 でロゴと同時）
  if (!letters && ec.text) endItems.push({ kind: "sub", text: ec.text, a: E(ec.subBeat == null ? 2 : ec.subBeat), b: total, size: ec.subSize });
  if (ec.note) endItems.push({ kind: "note", text: ec.note, a: letters ? slamT : E(ec.noteBeat == null ? 3 : ec.noteBeat), b: total });
  const word = letters ? await renderLetters(ec.word || "WORDRIA", theme) : null;
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
  caps.forEach(c => {
    let y = c.y || capY;
    if (c.kind === "big") y += Math.round((c.line - (c.lines - 1) / 2) * (c.size || theme.capSize || 104) * 1.28);
    pop(c.file, c.a, c.b, W / 2, y, null, c.pop);
  });

  // ロゴ：エンドカードの頭（拍0）で大きく入る
  const logoW = Math.round(W * (ec.scale || 0.8));
  const logoY = Math.round(H * (ec.y || 0.40));
  if (letters) {
    // 1拍に1文字。叩きつけるように大きめに弾ませる
    const wy = Math.round(H * (ec.y || 0.46));
    const every = ec.every || 1;
    word.letters.forEach((L, i) => {
      const a = ep.t0 + i * every * beatLen;
      pop(L.file, a, slamT, Math.round(W / 2 + L.cx), wy + L.cy, null, 0.7);
    });
    // 小節の頭で、光った単語全体を重ねて白く飛ばす
    pop(word.word, slamT, total, W / 2, wy, null, 0.28);
    const fl = lab();
    fc += `color=c=white:s=${W}x${H}:r=${FPS}:d=0.4,format=rgba,fade=t=out:st=0:d=0.4:alpha=1,` +
          `setpts=PTS+${n3(slamT)}/TB[fw${nlab}];[${v}][fw${nlab}]overlay=eof_action=pass:format=auto[${fl}];`;
    v = fl;
  } else {
    pop(need(ec.logo, "ロゴ"), ep.t0, total, W / 2, logoY, logoW, 0.45);
  }
  // キャッチはロゴの上、締めの一行はロゴの下、注記はいちばん下
  const logoH = Math.round(logoW * pngSize(abs(ec.logo)).h / pngSize(abs(ec.logo)).w);
  endItems.forEach(it => {
    const sz = pngSize(it.file);
    const cy = it.kind === "catch" ? (ec.catchY ? Math.round(H * ec.catchY) : logoY - logoH / 2 - sz.h / 2 + 30)
             : it.kind === "sub" ? logoY + logoH / 2 + sz.h / 2 - 10
             : H - 40 - sz.h / 2;
    pop(it.file, it.a, it.b, W / 2, Math.round(cy), null, it.kind === "note" ? 0 : 0.2);
  });
  // ここで初めて RGB → yuv420p（HD の標準の BT.709 で変換し、そのことを書き込む）
  fc += `[${v}]scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[vout];`;

  // ---- 音 ----
  inputs.push("-ss", n3(B[s0]), "-t", n3(total), "-i", need(grid.file, "BGM"));
  const mi = idx();
  const fo = music.fadeOut || 1.4;
  // letters のときは、叩きつけた拍の頭だけ鳴らして音楽を切る
  // cutAfter 秒だけ拍の頭を鳴らしてから cutFade 秒で落とす。小さくすると「スパッ」と切れる
  const fadeSt = slamT != null ? slamT + (ec.cutAfter == null ? 0.14 : ec.cutAfter) : total - fo;
  const fadeD = slamT != null ? (ec.cutFade == null ? 0.3 : ec.cutFade) : fo;
  fc += `[${mi}:a]asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.03,` +
        `afade=t=out:st=${n3(fadeSt)}:d=${fadeD},volume=${music.volume || 1},` +
        `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[am];`;
  const mix = ["[am]"];
  plan.forEach((p, i) => (p.c.sfx || []).forEach((sx, j) => {
    const [nm, beat, vol] = sx;
    inputs.push("-i", need(sfxFile(nm), "効果音"));
    const si = idx();
    const ms = Math.round((p.t0 + (beat || 0) * beatLen) * 1000);
    fc += `[${si}:a]adelay=${ms}|${ms},volume=${vol == null ? 0.5 : vol},` +
          `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[x${i}_${j}];`;
    mix.push(`[x${i}_${j}]`);
  }));
  if (!letters && slamT != null) {
    // ロゴの締め：エンドカードの頭でロゴが叩きつけられ、slamBeat 拍目の頭で音楽を切る
    [["crit", ep.t0, 0.6]].concat((ec.slamSfx || [["magic_holy", 0.55]]).map(([nm, vol]) => [nm, slamT, vol]))
      .forEach(([nm, at, vol], j) => {
        inputs.push("-i", need(sfxFile(nm), "効果音"));
        const si = idx();
        const ms = Math.round(at * 1000);
        fc += `[${si}:a]adelay=${ms}|${ms},volume=${vol},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[g${j}];`;
        mix.push(`[g${j}]`);
      });
  }
  if (letters) {
    const hits = [];
    word.letters.forEach((L, i) => hits.push([ec.letterSfx || "hit", ep.t0 + i * (ec.every || 1) * beatLen, 0.32]));
    (ec.slamSfx || [["crit", 0.75], ["magic_holy", 0.5]]).forEach(([nm, vol]) => hits.push([nm, slamT, vol]));
    hits.forEach(([nm, at, vol], j) => {
      inputs.push("-i", need(sfxFile(nm), "効果音"));
      const si = idx();
      const ms = Math.round(at * 1000);
      fc += `[${si}:a]adelay=${ms}|${ms},volume=${vol},` +
            `aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[e${j}];`;
      mix.push(`[e${j}]`);
    });
  }
  fc += `${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0,` +
        `loudnorm=I=-14:TP=-1.5:LRA=11[aout]`;

  const out = abs(cfg.out || `movie/out/PR_${name}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff(inputs.concat(["-filter_complex", fc, "-map", "[vout]", "-map", "[aout]", "-t", n3(total),
    // 圧縮はこの1回だけ。SNS は上げた動画をもう一度圧縮するので、ここは余裕を持たせる。
    // tune animation は、ゲーム画面や字幕のような平らな色と輪郭のはっきりした絵に向いた設定
    "-c:v", "libx264", "-preset", "slow", "-crf", String(process.env.CRF || 16), "-tune", "animation",
    "-maxrate", "14M", "-bufsize", "28M", "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-profile:v", "high", "-level", "4.2", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", out]));
  // 途中のファイル（劣化なしのカットとつないだもの）は1本で 1〜2GB になるので消す。
  // 残しておくと何本も組み立てるうちにディスクがいっぱいになった
  files.concat([seq, list]).forEach(f => fs.rmSync(f, { force: true }));
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
