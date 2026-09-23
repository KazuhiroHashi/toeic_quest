#!/usr/bin/env node
// PR動画用に、いまのビルドを実際に遊んでいるところを録る。
//
//   npm run build:www
//   npm install playwright-core --no-save
//   node tools/record_play.js            # 全部
//   node tools/record_play.js boss miss  # 名前を指定して一部だけ
//   → movie/play/<名前>.mp4（1080×1920 / 30fps / 音なし）
//
// 音は入らない（画面だけ）。BGM と効果音は tools/build_pr.js が後から乗せる。
//
// ── 録り方 ──────────────────────────────────────────
// Chrome の画面配信（CDP の Page.startScreencast）でコマ送りに受け取り、
// 届いた時刻どおりに並べて 30fps に直す。画面が変わらない間はコマが
// 来ないので、時刻で長さを決めないと早送りになる。
//
// 画面は 360×640 の3倍 ＝ 1080×1920。PR動画のキャンバスとぴったり同じなので
// 切り落としも拡大もしない。
//
// ── 操作 ──────────────────────────────────────────
// 押し方は tools/make_shots.js と同じ（そちらのコメントに理由がある）。
// 違うのは、クイズに「速く正解する」ところ。出た単語を VOCAB から引いて、
// 選択肢の中にあるほうの意味を正解として押す。単語は決め打ちにしない
// （動画では毎回ちがう単語が出るほうが、遊んでいるように見える）。
"use strict";
var fs = require("fs");
var path = require("path");
var http = require("http");
var { execFileSync } = require("child_process");
var { chromium } = require("playwright-core");

var ROOT = path.resolve(__dirname, "..");
var WWW = path.join(ROOT, "www");
var OUT = path.join(ROOT, "movie", "play");
var TMP = path.join(ROOT, "movie", "tmp", "play");
var EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
var FFMPEG = process.env.FFMPEG || "ffmpeg";

var CSS_W = 360, CSS_H = 640, DPR = 3;
var PORT = 8972;

var TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json",
  ".woff2": "font/woff2"
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

function wait(page, ms) { return page.waitForTimeout(ms); }

// 録画中の出来事（クイズが出た・答えた・時間切れ）の時刻を控える。
// build_pr.js はこれを見て「2問目に答えた瞬間」のような所を拍に合わせる。
// 録り直して単語や間が変わっても、名前で指しているので編集がずれない。
var CUR = null;
function mark(label) {
  if (!CUR) return;
  var n = (CUR.count[label] = (CUR.count[label] || 0) + 1);
  CUR.events.push({ label: label + n, wall: Date.now() / 1000 });
}

// ---- 録画 ---------------------------------------------------------------
async function startRec(page, name) {
  var cdp = await page.context().newCDPSession(page);
  var dir = path.join(TMP, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  var frames = [];
  cdp.on("Page.screencastFrame", function (f) {
    var file = path.join(dir, String(frames.length).padStart(6, "0") + ".jpg");
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file: file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(function () {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg", quality: 92, maxWidth: CSS_W * DPR, maxHeight: CSS_H * DPR, everyNthFrame: 1
  });
  CUR = { cdp: cdp, frames: frames, dir: dir, name: name, events: [], count: {} };
  return CUR;
}

async function stopRec(rec) {
  var tEnd = Date.now() / 1000;
  await rec.cdp.send("Page.stopScreencast");
  await new Promise(function (r) { setTimeout(r, 300); });
  var fr = rec.frames;
  if (fr.length < 2) throw new Error("コマが届いていません: " + rec.name);
  // 届いた時刻の差がそのままそのコマの長さ
  var list = "ffconcat version 1.0\n";
  for (var i = 0; i < fr.length; i++) {
    // 最後のコマは、止めた時刻まで出しっぱなし（静止した画面はコマが来ない）
    var d = i < fr.length - 1 ? Math.max(0.001, fr[i + 1].t - fr[i].t)
                              : Math.min(10, Math.max(0.2, tEnd - fr[i].t));
    list += "file '" + fr[i].file + "'\nduration " + d.toFixed(4) + "\n";
  }
  list += "file '" + fr[fr.length - 1].file + "'\n";
  var lf = path.join(rec.dir, "list.txt");
  fs.writeFileSync(lf, list);
  fs.mkdirSync(OUT, { recursive: true });
  var out = path.join(OUT, rec.name + ".mp4");
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", lf,
    "-vf", "fps=30,scale=" + CSS_W * DPR + ":" + CSS_H * DPR + ",setsar=1,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-an", out]);
  var len = tEnd - fr[0].t;
  // 出来事は動画の頭（最初のコマ）からの秒で書き出す
  var ev = {};
  rec.events.forEach(function (e) { ev[e.label] = +(e.wall - fr[0].t).toFixed(3); });
  fs.writeFileSync(path.join(OUT, rec.name + ".json"), JSON.stringify({ length: +len.toFixed(3), events: ev }, null, 1));
  CUR = null;
  console.log("  " + rec.name.padEnd(10) + len.toFixed(1) + "秒  " + fr.length + "コマ  → " + path.relative(ROOT, out));
}

// ---- 操作（make_shots.js と同じ押し方）--------------------------------
async function clickText(page, sel, text) {
  var ok = await page.evaluate(function (a) {
    var el = [].slice.call(document.querySelectorAll(a.sel))
      .filter(function (e) { return e.textContent.indexOf(a.text) >= 0; })[0];
    if (!el) return false;
    el.click();
    return true;
  }, { sel: sel, text: text });
  if (!ok) throw new Error("押せませんでした: " + sel + " 「" + text + "」");
  await wait(page, 500);
}

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

async function dismissResume(page) {
  var had = await page.evaluate(function () {
    var o = document.querySelector(".wq2-store-ovl");
    if (!o) return false;
    var b = [].slice.call(o.querySelectorAll("button"))
      .filter(function (x) { return x.textContent.indexOf("最初から") >= 0; })[0];
    if (b) { b.click(); return true; }
    return false;
  });
  if (had) await wait(page, 700);
}

function isOn(page, id) {
  return page.evaluate(function (i) {
    var el = document.getElementById(i);
    return !!el && el.style.display === "block";
  }, id);
}
function quizShown(page) {
  return page.evaluate(function () {
    var q = document.getElementById("quiz-overlay");
    return !!q && getComputedStyle(q).display !== "none";
  });
}

// A を押して、コマンドが出るまで送る。pace は押す間隔（ゆっくり送ると
// 口上や「やっつけた！」が読める長さで映る）
async function toCommand(page, pace) {
  for (var i = 0; i < 80; i++) {
    if (await isOn(page, "pbattle-cmd")) return true;
    if (await quizShown(page)) return false;
    await page.click("#btn-a");
    await wait(page, pace || 450);
  }
  throw new Error("コマンドが出ませんでした");
}

// コマンドから選ぶ。kind = "こうげき" | "まほう"
async function choose(page, kind) {
  await page.locator("#pbattle-cmd .menu-item", { hasText: kind }).first().click();
  await wait(page, 380);
  // まほうなら呪文の一覧、こうげきなら「どの敵？」。1つめを選ぶ
  for (var k = 0; k < 2; k++) {
    if (await isOn(page, "pbattle-sub")) {
      await page.locator("#pbattle-sub .menu-item").first().click();
      await wait(page, 380);
    }
  }
  for (var j = 0; j < 40; j++) {
    if (await quizShown(page)) return;
    await page.click("#btn-a");
    await wait(page, 330);
  }
  throw new Error("クイズが出ませんでした");
}

// 出ている単語の正解を押す。after は答えるまでの間（速答を見せたいので短め）
async function answer(page, after, wrong) {
  await wait(page, after);
  var idx = await page.evaluate(function () {
    var w = (document.getElementById("quiz-word") || {}).textContent;
    var bs = [].slice.call(document.querySelectorAll("#quiz-choices .quiz-choice"))
      .map(function (b) { return b.textContent.replace(/^\s*\d+\s*/, ""); });
    var means = [];
    Object.keys(window.VOCAB || {}).forEach(function (lv) {
      window.VOCAB[lv].forEach(function (e) { if (e.w === w) means.push(e.m); });
    });
    for (var i = 0; i < bs.length; i++) if (means.indexOf(bs[i]) >= 0) return i;
    return -1;
  });
  if (idx < 0) throw new Error("正解が見つかりません");
  if (wrong) idx = (idx + 1) % 4;
  await page.keyboard.press(String(idx + 1));
}

// 1ターン：選ぶ → 速く正解 → 演出が流れきるまで待つ
async function turn(page, kind, opt) {
  opt = opt || {};
  var cmd = await toCommand(page, opt.pace);
  if (cmd === false) { mark("quiz"); await answer(page, opt.after || 650); mark("answer"); await wait(page, 1600); return; }
  mark("cmd");
  await wait(page, opt.hold || 350);
  await choose(page, kind || "こうげき");
  mark("quiz");
  if (opt.timeout) { await wait(page, 6500); mark("late"); return; }   // 時間切れまで放っておく
  await answer(page, opt.after || 650, opt.wrong);
  mark("answer");
  await wait(page, 1500);
}

// ---- 場面 ---------------------------------------------------------------
var SCENES = {
  // タイトル画面 → ことばの冒険 → 最初の敵が出るまで
  title: async function (open) {
    var a = await open();
    var rec = await startRec(a.page, "title");
    await wait(a.page, 2600);
    await clickText(a.page, ".title-btn", "ことばの冒険");
    await wait(a.page, 500);
    await dismissResume(a.page);
    await toCommand(a.page, 700);
    await wait(a.page, 900);
    await stopRec(rec);
  },

  // 第1戦を速答で勝ちきる
  battle: async function (open) {
    var a = await open();
    await clickText(a.page, ".title-btn", "ことばの冒険");
    await wait(a.page, 500);
    await dismissResume(a.page);
    await toCommand(a.page);
    var rec = await startRec(a.page, "battle");
    for (var r = 0; r < 5; r++) {
      await turn(a.page, "こうげき", { after: 520 + r * 40 });
    }
    // 勝利のメッセージを読める速さで送る
    for (var i = 0; i < 6; i++) { await a.page.click("#btn-a"); await wait(a.page, 650); }
    await stopRec(rec);
  },

  // 四天王ハウル：登場から、4人で速答を重ねてチェインを伸ばす
  boss: async function (open) {
    var a = await open();
    await seedRun(a.page, 5);
    await a.page.click("#pbtn-arena");
    await wait(a.page, 700);
    var rec = await startRec(a.page, "boss");
    await clickText(a.page, ".wq2-store-btn", "続きから");
    for (var r = 0; r < 6; r++) {
      await turn(a.page, r === 2 ? "まほう" : "こうげき", { after: 480, pace: 560 });
    }
    await wait(a.page, 600);
    await stopRec(rec);
  },

  // 迷っているうちに時間切れ → 反撃される
  miss: async function (open) {
    var a = await open();
    await seedRun(a.page, 5);
    await a.page.click("#pbtn-arena");
    await wait(a.page, 700);
    await clickText(a.page, ".wq2-store-btn", "続きから");
    await toCommand(a.page);
    var rec = await startRec(a.page, "miss");
    await turn(a.page, "こうげき", { timeout: true });
    for (var i = 0; i < 5; i++) { await a.page.click("#btn-a"); await wait(a.page, 600); }
    await stopRec(rec);
  },

  // 出題範囲 → 学生（中学・高校）→ 学年をえらぶ
  grades: async function (open) {
    var a = await open();
    var rec = await startRec(a.page, "grades");
    await wait(a.page, 700);
    await a.page.click("#pbtn-mode");
    await wait(a.page, 900);
    await clickText(a.page, ".wq2-store-btn", "学生（中学・高校）");
    await wait(a.page, 2200);
    await stopRec(rec);
  },

  // 単語帳：スコア帯のタブを送りながら一覧を流す
  wordbook: async function (open) {
    var a = await open();
    await a.page.click("#pbtn-zukan");
    await wait(a.page, 900);
    var rec = await startRec(a.page, "wordbook");
    await wait(a.page, 700);
    await a.page.mouse.move(CSS_W / 2, CSS_H * 0.7);   // 一覧の上で回す
    for (var s = 0; s < 14; s++) {
      await a.page.mouse.wheel(0, 120);
      await wait(a.page, 120);
    }
    await wait(a.page, 700);
    await stopRec(rec);
  }
};

(async function () {
  if (!fs.existsSync(path.join(WWW, "index.html"))) {
    console.error("www/ がありません。先に npm run build:www を実行してください。");
    process.exit(1);
  }
  var want = process.argv.slice(2);
  var names = Object.keys(SCENES).filter(function (n) { return !want.length || want.indexOf(n) >= 0; });
  var srv = await serve();
  var browser = await chromium.launch({ executablePath: EXE, args: ["--autoplay-policy=no-user-gesture-required"] });
  var ctxs = [];

  async function open() {
    var ctx = await browser.newContext({
      viewport: { width: CSS_W, height: CSS_H }, deviceScaleFactor: DPR, locale: "ja-JP"
    });
    ctxs.push(ctx);
    await ctx.addInitScript(function () {
      try {
        localStorage.setItem("wq2_mode_v1", JSON.stringify({ mode: "toeic", grade: "j3", lock: null }));
      } catch (e) {}
    });
    var page = await ctx.newPage();
    await page.goto("http://127.0.0.1:" + PORT + "/index.html", { waitUntil: "networkidle" });
    await page.mouse.click(CSS_W / 2, CSS_H / 2);     // 「タップして スタート」
    await wait(page, 1600);
    return { ctx: ctx, page: page };
  }

  console.log("\n" + CSS_W * DPR + "×" + CSS_H * DPR + " で録ります（www/ ビルドから）\n");
  for (var i = 0; i < names.length; i++) {
    try {
      await SCENES[names[i]](open);
    } catch (e) {
      console.error("  ! " + names[i] + ": " + e.message);
      process.exitCode = 1;
    }
    while (ctxs.length) await ctxs.pop().close();
  }
  await browser.close();
  srv.close();
})();
