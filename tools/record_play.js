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
// 画面は iPhone 17 と同じ 402×874 の3倍（1206×2622）。以前は 360×640 で録っていたが、
// これは iPhone SE ほどの幅で、敵の名前やメッセージが窮屈に折り返していた。
// PR動画（1080×1920）に入れるときは、上の空と下のボタンの端を少し切り落とす
// （build_pr.js が中央で切り抜く）。
//
// ── 日本語フォント ─────────────────────────────────
// fontconfig の既定のままだと、日本語が WenQuanYi（中国語の字形）で描かれる。
// 録る前に必ず確かめること：
//   fc-match "sans-serif:lang=ja"   → Noto Sans CJK JP なら正しい
// 違っていたら store/screenshots/README.md の手順で Noto Sans CJK JP を優先させる。
// 下の checkFont() が、中国語のフォントのままなら止める。
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

var CSS_W = 402, CSS_H = 874, DPR = 3;   // iPhone 17
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

// 遊び込んだ人の記録を仕込む（単語帳・称号の画面を、まっさらでなく撮るため）。
// 乱数は種を固定してあるので、何度録り直しても同じ画面になる。
// 仕込むのは localStorage だけで、アプリには手を入れない。読み直さないと
// アプリ側の G.study に反映されないので、呼んだあとで reload すること。
async function seedPlayed(page) {
  await page.evaluate(function () {
    var seed = 20260923;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    var today = window.QUIZ_DNUM ? window.QUIZ_DNUM(0) : 0;
    var share = { 400: 0.86, 500: 0.64, 600: 0.41, 700: 0.23, 800: 0.11, 900: 0.04 };
    var words = {};
    Object.keys(share).forEach(function (lv) {
      (window.VOCAB[lv] || []).forEach(function (e) {
        if (rnd() > share[lv]) return;
        var c = 1 + Math.floor(rnd() * 6), fast = rnd() < 0.62, gold = c >= 3 && rnd() < 0.55;
        var miss = rnd() < 0.16 ? 1 + Math.floor(rnd() * 2) : 0;
        words[e.w] = { l: +lv, m: e.m, p: e.p, c: c, wr: miss, s: gold ? 3 : Math.min(c, 2),
                       f: fast ? 1 : 0, g: gold ? 1 : 0, t: c * (fast ? 1.4 : 2.7),
                       d: today - Math.floor(rnd() * 21), box: miss ? 2 : undefined, due: miss ? today + 2 : undefined };
      });
    });
    var key = window.WQ2_MODE ? window.WQ2_MODE.studyKey() : "wq2_study_v1";
    localStorage.setItem(key, JSON.stringify({ missed: {}, answered: 5480, correct: 4912, words: words }));
    var d = new Date();
    localStorage.setItem("wq2_streak", JSON.stringify({ last: d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(), n: 23 }));
    localStorage.setItem("wq2_records_v1", JSON.stringify({ clears: 9, bestRound: 12, bestMs: 1386000, bestChain: 27, bestFloor: 18 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.mouse.click(CSS_W / 2, CSS_H / 2);     // 「タップして スタート」
  await wait(page, 1600);
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

// 「続きから」で idx 戦目（0始まり）に入り、登場から turns ターン戦う
async function fight(open, name, idx, turns) {
  var a = await open();
  await seedRun(a.page, idx);
  await a.page.click("#pbtn-arena");
  await wait(a.page, 700);
  var rec = await startRec(a.page, name);
  await clickText(a.page, ".wq2-store-btn", "続きから");
  for (var r = 0; r < turns; r++) {
    await turn(a.page, r === 2 ? "まほう" : "こうげき", { after: 460, pace: 520 });
  }
  await wait(a.page, 600);
  await stopRec(rec);
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

  // 第3〜5戦（5戦目は中ボスの古竜）。4人パーティで速答を重ねる。
  // 第7戦以降は録らない。四天王の残りやラスボスは、遊ぶ前の人に見せない
  // （サウンドトラックの曲名を Secret にしているのと同じ理由）
  b3: async function (open) { await fight(open, "b3", 2, 5); },
  b4: async function (open) { await fight(open, "b4", 3, 5); },
  dragon: async function (open) { await fight(open, "dragon", 4, 6); },

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

  // 単語帳：遊び込んだ記録を仕込んで開き、一覧をなめらかに流してから次の帯へ
  wordbook: async function (open) {
    var a = await open();
    await seedPlayed(a.page);
    await a.page.click("#pbtn-zukan");
    await wait(a.page, 900);
    var rec = await startRec(a.page, "wordbook");
    await wait(a.page, 900);
    mark("scroll");
    for (var s = 0; s < 4; s++) {
      await a.page.evaluate(function () {
        document.getElementById("zukan-list").scrollBy({ top: 330, behavior: "smooth" });
      });
      await wait(a.page, 520);
    }
    await wait(a.page, 300);
    mark("band");
    await a.page.keyboard.press("ArrowRight");        // 次の帯（スコア500）へ
    await wait(a.page, 1400);
    await stopRec(rec);
  },

  // 称号・記録：同じ記録を仕込んだ状態で開く
  records: async function (open) {
    var a = await open();
    await seedPlayed(a.page);
    var rec = await startRec(a.page, "records");
    await wait(a.page, 600);
    mark("open");
    await a.page.click("#pbtn-achv");
    await wait(a.page, 2600);
    await stopRec(rec);
  },

  // 攻撃の戦略：コマンドでカーソルを動かし、まほうの一覧から選んで速答する
  strategy: async function (open) {
    var a = await open();
    await seedRun(a.page, 5);
    await a.page.click("#pbtn-arena");
    await wait(a.page, 700);
    await clickText(a.page, ".wq2-store-btn", "続きから");
    await toCommand(a.page);
    var rec = await startRec(a.page, "strategy");
    await wait(a.page, 500);
    mark("cursor");
    for (var i = 0; i < 2; i++) { await a.page.keyboard.press("ArrowDown"); await wait(a.page, 380); }
    await a.page.keyboard.press("ArrowUp");
    await wait(a.page, 420);
    mark("magic");
    await a.page.locator("#pbattle-cmd .menu-item", { hasText: "まほう" }).first().click();
    await wait(a.page, 900);
    mark("spells");
    // 一覧を下までたどって、いちばん強い攻撃呪文（インフェルノ）を選ぶ。
    // 先頭はヒールなので、1つめを押すと「HPが0回復した」になってしまう
    if (await isOn(a.page, "pbattle-sub")) {
      for (var k = 0; k < 6; k++) { await a.page.keyboard.press("ArrowDown"); await wait(a.page, 230); }
      await wait(a.page, 300);
      mark("pick");
      await a.page.locator("#pbattle-sub .menu-item", { hasText: "インフェルノ" }).first().click();
      await wait(a.page, 400);
      if (await isOn(a.page, "pbattle-sub")) {
        await a.page.locator("#pbattle-sub .menu-item").first().click();
        await wait(a.page, 400);
      }
    }
    for (var j = 0; j < 40 && !(await quizShown(a.page)); j++) { await a.page.click("#btn-a"); await wait(a.page, 330); }
    mark("quiz");
    await answer(a.page, 480);
    mark("answer");
    await wait(a.page, 2600);
    await stopRec(rec);
  }
};

// 日本語が中国語の字形で録れてしまうのを防ぐ
function checkFont() {
  var got = "";
  try { got = execFileSync("fc-match", ["sans-serif:lang=ja"], { encoding: "utf8" }); } catch (e) { return; }
  if (!/Noto Sans CJK JP|Hiragino|IPA|M\+|M PLUS/i.test(got)) {
    console.error("日本語フォントが中国語のものになっています: " + got.trim());
    console.error("  Noto Sans CJK JP を優先させてから録ってください（store/screenshots/README.md）");
    process.exit(1);
  }
}

(async function () {
  checkFont();
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
