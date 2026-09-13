#!/usr/bin/env node
// ストア用スクリーンショットのうち、タイトル画面から行けるものを撮り直す。
//
//   npm run build:www
//   npm install playwright-core --no-save
//   node tools/make_shots.js
//   → store/screenshots/01_title.png 05_records.png 06_grades.png （1290×2796）
//
// そのあと、いつもの並びに組み直す：
//   node tools/make_store_assets.js   # → 6.9inch / 6.5inch
//   node tools/make_ipad_shots.js     # → 13inch
//   node tools/make_play_assets.js    # → store/play/
//
// ── なぜ www/ から撮るのか ──────────────────────────────
// party/ は開発用で、出荷ビルドには入らないものが混ざっている
// （「※ ストーリーモードは 制作中です」の行は build_www.js が落とす）。
// 店頭に出す絵は、実際に配るものと同じでなければならない。
//
// ── 撮れないもの ────────────────────────────────────
// 02_quiz と 03_boss は撮らない。特定の単語（moreover / competent）と
// 四天王ハウルが出ている場面で、そこまで自動で持っていくのは当てにならない。
// あの2枚は手で遊んで撮ったもので、中身も古くなっていないのでそのまま使う。
//
// ── 日本語フォント ─────────────────────────────────
// これが無い環境で撮ると、sans-serif が中国語フォントに解決されて
// **中国語の字形**になる（「記録」「単語」あたりで分かる）。
//   fc-match "sans-serif:lang=ja"   → Noto Sans CJK JP なら正しい
"use strict";
var fs = require("fs");
var path = require("path");
var http = require("http");
var { chromium } = require("playwright-core");

var ROOT = path.resolve(__dirname, "..");
var WWW = path.join(ROOT, "www");
var OUT = path.join(ROOT, "store", "screenshots");
var EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// iPhone 6.9インチ。1290×2796 は 430×932 の3倍
var CSS_W = 430, CSS_H = 932, DPR = 3;
var PORT = 8971;

var TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json"
};

function serve() {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = path.join(WWW, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(WWW) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(PORT, "127.0.0.1", function () { resolve(srv); });
  });
}

// 文字で押す。id が付いていないボタン（出題範囲・学年）があるため
async function clickText(page, sel, text) {
  var ok = await page.evaluate(function (a) {
    var el = [].slice.call(document.querySelectorAll(a.sel))
      .filter(function (e) { return e.textContent.indexOf(a.text) >= 0; })[0];
    if (!el) return false;
    el.click();
    return true;
  }, { sel: sel, text: text });
  if (!ok) throw new Error("押せませんでした: " + sel + " 「" + text + "」");
  await page.waitForTimeout(500);
}

(async function () {
  if (!fs.existsSync(path.join(WWW, "index.html"))) {
    console.error("www/ がありません。先に npm run build:www を実行してください。");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  var srv = await serve();
  var browser = await chromium.launch({ executablePath: EXE });
  var missing = [];

  async function open() {
    var ctx = await browser.newContext({
      viewport: { width: CSS_W, height: CSS_H }, deviceScaleFactor: DPR,
      locale: "ja-JP", reducedMotion: "reduce"
    });
    // 初回の「出題範囲を えらぶ」が被さるので、選んだ状態にしておく。
    // 撮るのは、一度遊んだ人が見ている画面
    await ctx.addInitScript(function () {
      try {
        localStorage.setItem("wq2_mode_v1", JSON.stringify({ mode: "toeic", grade: "j3", lock: null }));
      } catch (e) {}
    });
    var page = await ctx.newPage();
    page.on("response", function (r) {
      if (r.status() >= 400 && r.url().indexOf("favicon") < 0) missing.push(r.status() + " " + r.url());
    });
    await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "networkidle" });
    // 「タップして スタート」を抜ける。実際に押す（音の解禁もここで起きる）
    await page.mouse.click(CSS_W / 2, CSS_H / 2);
    await page.waitForTimeout(1600);   // 背景画とロゴが出そろうまで
    return { ctx: ctx, page: page };
  }

  async function shot(page, name) {
    var f = path.join(OUT, name + ".png");
    await page.screenshot({ path: f, animations: "disabled" });
    console.log("  " + name.padEnd(14) + (fs.statSync(f).size / 1024).toFixed(0) + "KB");
  }

  console.log("\n" + CSS_W * DPR + "×" + CSS_H * DPR + " で撮ります（www/ ビルドから）\n");

  // ---- 01_title タイトル画面 ----
  var a = await open();
  await shot(a.page, "01_title");
  // ---- 05_records 称号・記録 ----
  await a.page.click("#pbtn-achv");
  await a.page.waitForTimeout(600);
  await shot(a.page, "05_records");
  await a.ctx.close();

  // ---- 06_grades 学年をえらぶ ----
  // 出題：TOEIC → 学生（中学・高校） と進むと出る。撮ったら選ばずに閉じる
  var b = await open();
  await b.page.click("#pbtn-mode");
  await b.page.waitForTimeout(600);
  await clickText(b.page, ".wq2-store-btn", "学生（中学・高校）");
  await b.page.waitForTimeout(400);
  await shot(b.page, "06_grades");
  await b.ctx.close();

  await browser.close();
  srv.close();

  if (missing.length) {
    console.error("\n  ! 読めなかったものがあります:");
    missing.forEach(function (m) { console.error("      " + m); });
    process.exitCode = 1;
  } else {
    console.log("\n  読み込みエラーなし");
  }
  console.log("\n  次: node tools/make_store_assets.js && node tools/make_ipad_shots.js && node tools/make_play_assets.js");
})();
