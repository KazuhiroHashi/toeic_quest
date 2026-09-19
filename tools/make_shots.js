#!/usr/bin/env node
// ストア用スクリーンショットのうち、タイトル画面から行けるものを撮り直す。
//
//   npm run build:www
//   npm install playwright-core --no-save
//   node tools/make_shots.js
//   → store/screenshots/01_title 02_quiz 03_boss 04_wordbook 05_records 06_grades（1290×2796）
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
// ── 02_quiz と 03_boss も撮る（2026-09-16 追加）────────────
// 以前は「特定の単語と四天王ハウルが出ている場面まで自動で運ぶのは
// 当てにならない」として、この2枚だけ手で遊んで撮っていた。
// そのぶん撮り直しが面倒になり、実際に古いまま残った：Bボタンの下が
// 「メニュー/戻る」、Aボタンが「話す/決定」と、いまのアプリに無い表記に
// なっていた（2026-09-16 に本人が気づいた）。撮れないままにしておくと
// 必ずこうなるので、運べるようにした。
//
// 運び方は2つとも決め打ちにしてある。
//   ・出る単語 … QUIZ.ask を包んで opts.entry を差し込む。毎回同じ語が出る
//   ・ハウル   … 「続きから」の保存データ(wq2_run_v1)を 6戦目・4人で作り、
//                 タイトルから再開する。11戦を勝ち抜く必要はない
// どちらもアプリ側には手を入れていない。撮影のときだけ外から差し込む。
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

// 出る単語を決め打ちにする。QUIZ.ask を包んで entry を差し込むだけで、
// アプリ側には触らない。同じ絵が何度でも撮れる
async function forceWord(page, word) {
  var ok = await page.evaluate(function (w) {
    if (!window.QUIZ || !window.VOCAB) return false;
    var found = null;
    Object.keys(window.VOCAB).forEach(function (lv) {
      if (found) return;
      var e = window.VOCAB[lv].filter(function (x) { return x.w === w; })[0];
      if (e) found = { lv: +lv, entry: e };
    });
    if (!found) return false;
    // 正解の意味を控えておく。撮影中にクイズへ答えるときに使う（answerCorrectly）
    window.__shotAnswer = found.entry.m;
    var orig = window.QUIZ.ask;
    window.QUIZ.ask = function (lv, opts) {
      var o = {};
      Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
      o.entry = found.entry;
      return orig.call(this, found.lv, o);
    };
    return true;
  }, word);
  if (!ok) throw new Error("この単語が見つかりません: " + word);
}

// 「続きから」の保存データを作る。11戦を勝ち抜かずに任意の戦いから撮れる
async function seedRun(page, nextIndex) {
  await page.evaluate(function (i) {
    var party = ["yu", "gai", "rina", "mia"].map(function (id) {
      var m = window.PBATTLE.makeMember(id, 28);
      m.bag = ["herb", "herb", "elixir"];
      return m;
    });
    localStorage.setItem("wq2_run_v1", JSON.stringify({
      i: i, party: party, stats: { t0: Date.now(), maxChain: 0 }, easy: false, at: Date.now()
    }));
  }, nextIndex);
}

// 中断した挑戦が残っていたら「最初から やり直す」で消す
async function dismissResume(page) {
  var had = await page.evaluate(function () {
    var o = document.querySelector(".wq2-store-ovl");
    if (!o) return false;
    var b = [].slice.call(o.querySelectorAll("button"))
      .filter(function (x) { return x.textContent.indexOf("最初から") >= 0; })[0];
    if (b) { b.click(); return true; }
    return false;
  });
  if (had) await page.waitForTimeout(700);
}

// 戦闘に入り、コマンドが出るところまで運ぶ。
// 「Ａボタンで 開始！」のカードと、登場〜口上を A で送る。
// 何回押せば終わるかは戦いによって違うので、出るまで押す
async function toCommand(page) {
  var ready = false;
  for (var i = 0; i < 60; i++) {
    ready = await page.evaluate(function () {
      var el = document.getElementById("pbattle-cmd");
      return !!el && el.style.display === "block";
    });
    if (ready) break;
    await page.click("#btn-a");
    await page.waitForTimeout(450);
  }
  if (!ready) {
    // 何が出ているのか分からないまま落ちると原因が追えないので、書き出す
    var now = await page.evaluate(function () {
      function vis(id) {
        var e = document.getElementById(id);
        return e ? (getComputedStyle(e).display !== "none") : null;
      }
      var msg = document.getElementById("pbattle-msg");
      return {
        cmd: vis("pbattle-cmd"), sub: vis("pbattle-sub"),
        quiz: vis("quiz-overlay"), movie: vis("pmovie"),
        ovl: !!document.querySelector(".wq2-store-ovl"),
        msg: msg ? (msg.textContent || "").slice(0, 60) : null
      };
    });
    throw new Error("戦闘のコマンドが出ませんでした: " + JSON.stringify(now));
  }
}

// コマンドから「こうげき」を選んでクイズを出す
async function toQuiz(page) {
  await toCommand(page);

  // ★ メニューの項目は onpointerdown でしか動かない。el.click() では反応しない。
  //   Playwright の本物のクリックなら pointerdown が飛ぶので、そちらを使う
  await page.locator("#pbattle-cmd .menu-item", { hasText: "こうげき" }).first().click();
  await page.waitForTimeout(400);

  // 敵が複数なら「どの敵？」が出る。1体（ボス）なら出ない
  var sub = await page.evaluate(function () {
    var el = document.getElementById("pbattle-sub");
    return !!el && el.style.display === "block";
  });
  if (sub) {
    await page.locator("#pbattle-sub .menu-item").first().click();
    await page.waitForTimeout(400);
  }

  // 攻撃を選んでもすぐクイズにはならない。素早い敵が先に動くことがあり、
  // その行動メッセージを送らないと自分の番が来ない。出るまで A を押し続ける
  var shown = false;
  for (var k = 0; k < 40; k++) {
    shown = await page.evaluate(function () {
      var q = document.getElementById("quiz-overlay");
      return !!q && getComputedStyle(q).display !== "none";
    });
    if (shown) break;
    await page.click("#btn-a");
    await page.waitForTimeout(350);
  }
  if (!shown) throw new Error("クイズが出ませんでした");
  // 制限時間のバーが少し減ったところで撮る（満タンだと止まって見える）
  await page.waitForTimeout(1200);
}

// 出ているクイズに正解する。
// 選択肢は 1〜4 のキーでも答えられる（js/quiz.js の keyHandler）ので、
// 正解のボタンが何番目かを数えて、その数字を押す。
// 正解の文字列は forceWord が window.__shotAnswer に置いている。
async function answerCorrectly(page) {
  var idx = await page.evaluate(function () {
    var want = window.__shotAnswer;
    if (!want) return -2;
    var bs = [].slice.call(document.querySelectorAll("#quiz-choices .quiz-choice"));
    for (var i = 0; i < bs.length; i++) {
      // ボタンの中身は <span class="num">1</span>意味 なので、番号を落として比べる
      var t = bs[i].textContent.replace(/^\s*\d+\s*/, "");
      if (t === want) return i;
    }
    return -1;
  });
  if (idx === -2) throw new Error("先に forceWord を呼んでください");
  if (idx < 0) throw new Error("正解の選択肢が見つかりません");
  await page.keyboard.press(String(idx + 1));
}

// n回ぶん戦ってから、次のコマンドが出たところで止める。
//
// ── なぜ要るのか ──────────────────────────────────────────
// 敵が出てすぐのコマンド画面は、HPが満タンで、メッセージも
// 「〜が あらわれた！」か、ボスの口上の途中になる。戦っている最中には見えない。
// 数ターン進めると、HPが削れ、メッセージも「〜の こうげき！」になる。
async function fightRounds(page, n) {
  for (var r = 0; r < n; r++) {
    await toQuiz(page);
    await answerCorrectly(page);
    await page.waitForTimeout(1400);     // 攻撃の演出が流れるまで
  }
  await toCommand(page);
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

  // ---- 04_wordbook 単語帳 ----
  // ここも撮影対象から漏れていて、Bボタンが「メニュー/戻る」のまま残っていた
  var w = await open();
  await w.page.click("#pbtn-zukan");
  await w.page.waitForTimeout(900);
  await shot(w.page, "04_wordbook");
  await w.ctx.close();

  // ---- 02_quiz 第1戦のクイズ ----
  var c = await open();
  await forceWord(c.page, "moreover");
  await clickText(c.page, ".title-btn", "ことばの冒険");
  await c.page.waitForTimeout(700);
  await dismissResume(c.page);              // 前の「続きから」が残っていたら消す
  await toQuiz(c.page);
  await shot(c.page, "02_quiz");
  await c.ctx.close();

  // ---- 08_command 第1戦のコマンド選択 ----
  // 店頭の絵がクイズばかりだと「単語クイズのアプリ」に見えてしまう。
  // こうげき・まほう を選んでいる画面が1枚あると、RPG だと伝わる
  // （2026-09-19 本人の指摘で追加）
  var e = await open();
  await clickText(e.page, ".title-btn", "ことばの冒険");
  await e.page.waitForTimeout(700);
  await dismissResume(e.page);
  await toCommand(e.page);
  await e.page.waitForTimeout(500);          // カーソルの点滅が落ち着くまで
  await shot(e.page, "08_command");
  await e.ctx.close();

  // ---- 09_boss_command 四天王ハウル戦のコマンド選択（戦いの最中）----
  // 出てすぐだと HP が満タンで、メッセージもボスの口上の途中になる。
  // 3ターン戦わせてから止めると、HP が削れ、メッセージも戦闘中のものになる
  var f = await open();
  await forceWord(f.page, "competent");    // 正解を押すために語を固定する
  await seedRun(f.page, 5);
  await f.page.click("#pbtn-arena");
  await f.page.waitForTimeout(700);
  await clickText(f.page, ".wq2-store-btn", "続きから");
  await fightRounds(f.page, 3);
  await f.page.waitForTimeout(500);
  await shot(f.page, "09_boss_command");
  await f.ctx.close();

  // ---- 03_boss 四天王ハウル戦のクイズ ----
  var d = await open();
  await forceWord(d.page, "competent");
  await seedRun(d.page, 5);                  // 6戦目＝四天王ハウルから再開させる
  // ボタンの文字（「ことばの冒険」／「続きから」）は読み込み時に決まるので、
  // あとから保存データを入れても変わらない。押したときに読み直されるので、
  // 文字ではなく id で押す
  await d.page.click("#pbtn-arena");
  await d.page.waitForTimeout(700);
  await clickText(d.page, ".wq2-store-btn", "続きから");
  await toQuiz(d.page);
  await shot(d.page, "03_boss");
  await d.ctx.close();

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
