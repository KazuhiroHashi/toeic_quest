#!/usr/bin/env node
// X に貼る「英単語クイズ」の画像（1080×1350・縦 4:5）。1問につき2枚：
//   問題 Q_nn_単語.png        … 答える直前の画面。上に「〇〇レベル／3秒で答えられる？」。答えは載せない
//   答え Q_nn_単語_answer.png … 答えた直後の画面（正解の選択肢が光り、「単語 = 意味」が出ている）。上に「正解は「〇〇」」
// tools/make_quiz.py が呼ぶ（単語の一覧は movie/tmp/quiz/words.json）。
//
// 画面は、答える直前のゲーム画面（1206×2622 の劣化なしの静止画）を 0.86倍にして、
// 敵の頭から4つ目の選択肢までを切り出したもの。上に動画と同じピンクの字幕で
// 「〇〇レベル／3秒で答えられる？」、下の空いた所に小さくロゴ。
// 4:5 は、X のタイムラインで1枚の画像が切られずにいちばん大きく出る縦長の比率。
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");
const EXE = process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const W = 1080, H = 1350;
// 静止画（幅 1206）を 0.86倍（幅 1037）にして中央に置く。4つ目の選択肢の下に
// ロゴを置く余白を作るため（1080 いっぱいにすると、ロゴが選択肢に重なった）
const SCALE = 0.86;
const TOP = 470;                 // 静止画のどこから使うか（敵の頭の少し上）

const fontCss = () => {
  const dir = path.join(ROOT, "node_modules", "@fontsource", "m-plus-rounded-1c");
  return ["800.css", "900.css"].filter(f => fs.existsSync(path.join(dir, f)))
    .map(f => `<link rel="stylesheet" href="file://${path.join(dir, f)}">`).join("");
};
// setContent で作ったページからは file:// の画像を読めないので、中身をそのまま埋め込む
const dataUri = f => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

(async function () {
  const words = JSON.parse(fs.readFileSync(path.join(ROOT, "movie/tmp/quiz/words.json"), "utf8"));
  const logo = dataUri(path.join(ROOT, "assets/ui/logo.png"));
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const jobs = [];
  for (const q of words) {
    jobs.push({ still: q.still, out: q.out, chip: q.level, big: q.hook || "3秒で答えられる？", logo: "bottom" });
    if (q.answer_still) // 答えた後はゲームの枠が上にずれ、下の「単語 = 意味」がロゴと重なるので、ロゴは左上に置く
    if (q.answer_still) jobs.push({ still: q.answer_still, out: q.answer_out, chip: q.level, big: `正解は「${q.meaning}」`, logo: "top" });
  }
  for (const j of jobs) {
    const still = dataUri(path.join(ROOT, j.still));
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fontCss()}<style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { width:${W}px; height:${H}px; overflow:hidden; background:#0b0f26;
             font-family:'M PLUS Rounded 1c','Noto Sans CJK JP',sans-serif; }
      .shot { position:absolute; inset:0; background:url("${still}") no-repeat;
              background-size:${Math.round(1206 * SCALE)}px auto;
              background-position:${Math.round((W - 1206 * SCALE) / 2)}px -${Math.round(TOP * SCALE)}px; }
      /* 上の字幕を読みやすくする暗がり */
      .shade { position:absolute; left:0; right:0; top:0; height:330px;
               background:linear-gradient(180deg, rgba(8,10,30,.92) 0%, rgba(8,10,30,.75) 55%, rgba(8,10,30,0) 100%); }
      .head { position:absolute; left:0; right:0; top:34px; text-align:center; }
      .level { display:inline-block; color:#fff; font-weight:800; font-size:44px; letter-spacing:.04em;
               padding:.18em .9em .24em; border-radius:999px; background:rgba(255,47,166,.9);
               box-shadow:0 4px 14px rgba(0,0,0,.45); }
      .big { display:inline-block; margin-top:22px; font-weight:900; font-size:100px; line-height:1.1; white-space:nowrap;
             color:#ff2fa6; -webkit-text-stroke:15px #fff; paint-order:stroke fill;
             filter:drop-shadow(0 0 12px rgba(255,70,185,.95)) drop-shadow(0 0 4px rgba(255,70,185,.95))
                    drop-shadow(0 5px 6px rgba(0,0,0,.35)); }
      .logo { position:absolute; filter:drop-shadow(0 3px 8px rgba(0,0,0,.6)); }
      .logo.bottom { left:50%; transform:translateX(-50%); bottom:20px; width:230px; }
      .logo.top { left:22px; top:26px; width:190px; }
    </style></head><body>
      <div class="shot"></div><div class="shade"></div>
      <div class="head"><span class="level">${esc(j.chip)}</span><br><span class="big">${esc(j.big)}</span></div>
      <img class="logo ${j.logo}" src="${logo}">
    </body></html>`);
    await page.evaluate(async (t) => {
      await document.fonts.load("900 100px 'M PLUS Rounded 1c'", t);
      await document.fonts.load("800 44px 'M PLUS Rounded 1c'", t);
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
      // 長い意味で横からはみ出すときは字を詰める
      const el = document.querySelector(".big");
      let fs = 100;
      while (el.offsetWidth > 1010 && fs > 50) { fs -= 2; el.style.fontSize = fs + "px"; el.style.webkitTextStroke = Math.round(fs * 0.15) + "px #fff"; }
    }, j.chip + j.big);
    const out = path.join(ROOT, j.out);
    await page.screenshot({ path: out, type: "png" });
    console.log("  ✓ " + path.relative(ROOT, out));
  }
  await browser.close();
})();
