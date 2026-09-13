#!/usr/bin/env node
// 13インチiPad用のスクリーンショットを作る。
//
//   node tools/make_ipad_shots.js
//   → store/upload/13inch/01..06_*.png （2064×2752）
//
// なぜ実機のiPadで撮り直さないか：
//   盤面は #game-wrap の max-width:560px で頭打ちになるので、iPadの幅(1032pt)で
//   そのまま撮ると左右が真っ黒に余る。かといって幅が収まる高さ(747pt)で撮ると
//   十字キーが画面の3分の1を占めてしまう。どちらも店頭の絵として成立しない。
//   そこで App Store でよくある「説明文つきの見せ方」にして、実機のiPhone撮影
//   （store/upload/6.9inch）をiPadの版面に組み直す。中身は実機そのままなので、
//   Appleの「実際のアプリを写すこと」という条件も満たす。
//
// iPhone側を撮り直したら（tools/make_store_assets.js）、こちらも実行し直すこと。
"use strict";
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");

var root = path.join(__dirname, "..");
var SRC = path.join(root, "store", "upload", "6.9inch");
var OUT = path.join(root, "store", "upload", "13inch");
var EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
var W = 2064, H = 2752;   // 13インチiPad（Apple指定の縦）

// ゲーム内の戦闘コマンドはひらがなで統一しているが、ここは店頭の文章なので
// 漢字で書く。分かち書きもしない（アプリの外では読みにくいだけ）。
// 03 のキャッチコピーは家族が考えたものなので、一字も変えないこと。
var SHOTS = [
  { file: "01_quiz.png",     title: "戦いながら、英単語を覚える",  sub: "4択に答えると剣が飛ぶ。まちがえたら反撃を受ける。" },
  { file: "02_boss.png",     title: "ボスは、単語で倒す",         sub: "コマンドバトルの緊張感が、語彙をそのまま記憶に変える。" },
  { file: "03_title.png",    title: "単語帳を開くより、冒険しよう。", sub: "WORDRIA 英単語RPG" },
  { file: "04_grades.png",   title: "中学英語から TOEIC®まで",    sub: "中1・中2・中3・高校基礎・大学入試・難関大／スコア別の6段階。" },
  { file: "05_wordbook.png", title: "出会った単語は、単語帳に残る", sub: "意味・発音・正解率を、いつでも見返せる。" },
  // 「制覇」はアプリ内で「完結」に直したので、こちらも合わせる。
  // 絵の中に「冒険 完結」と出ているのに、見出しだけ別の言葉だと引っかかる
  { file: "06_records.png",  title: "称号と記録が、次の一戦を呼ぶ", sub: "最速タイム、最大チェイン、完結回数。" }
];

function dataUri(p) {
  return "data:image/png;base64," + fs.readFileSync(p).toString("base64");
}

function html(shot) {
  return '<!doctype html><meta charset="utf-8"><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'html,body{width:' + W + 'px;height:' + H + 'px;overflow:hidden}' +
    'body{' +
    '  font-family:"Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif;' +
    '  background:radial-gradient(120% 80% at 50% 0%,#1d2a52 0%,#101733 45%,#070a16 100%);' +
    '  display:flex;flex-direction:column;align-items:center;' +
    '}' +
    // 上下に軽く光の帯を置いて、単色の背景に見えないようにする
    'body::before{content:"";position:absolute;inset:0;' +
    '  background:radial-gradient(60% 30% at 50% 12%,rgba(255,213,74,.13),transparent 70%);}' +
    '.cap{position:relative;width:100%;padding:150px 130px 0;text-align:center}' +
    '.t{font-size:98px;font-weight:700;color:#fff;line-height:1.28;letter-spacing:.01em;' +
    '   text-shadow:0 6px 28px rgba(0,0,0,.55)}' +
    '.s{margin-top:34px;font-size:46px;font-weight:500;color:#a8b6dd;line-height:1.5}' +
    '.rule{width:150px;height:6px;margin:56px auto 0;border-radius:3px;' +
    '  background:linear-gradient(90deg,transparent,#ffd54a,transparent)}' +
    '.shot{position:relative;margin-top:76px;border-radius:46px;overflow:hidden;' +
    '  box-shadow:0 44px 90px rgba(0,0,0,.62),0 0 0 3px rgba(255,255,255,.09);' +
    '  height:1930px}' +
    '.shot img{display:block;height:100%;width:auto}' +
    '</style>' +
    '<div class="cap"><div class="t">' + shot.title + '</div>' +
    '<div class="s">' + shot.sub + '</div><div class="rule"></div></div>' +
    '<div class="shot"><img src="' + dataUri(path.join(SRC, shot.file)) + '"></div>';
}

(async function () {
  var missing = SHOTS.filter(function (s) { return !fs.existsSync(path.join(SRC, s.file)); });
  if (missing.length) {
    console.error("元になるiPhone用の画像がありません → " + SRC);
    missing.forEach(function (s) { console.error("  " + s.file); });
    console.error("先に  node tools/make_store_assets.js  を実行してください。");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  var browser = await chromium.launch({ executablePath: EXE });
  var page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  console.log("");
  console.log("13インチiPad用に書き出しました → store/upload/13inch/");
  for (var i = 0; i < SHOTS.length; i++) {
    var s = SHOTS[i];
    await page.setContent(html(s));
    await page.waitForTimeout(150);
    var dst = path.join(OUT, s.file);
    await page.screenshot({ path: dst });
    var b = fs.readFileSync(dst);
    var w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    console.log("  " + s.file + "  " + w + " x " + h +
      (w === W && h === H ? "  OK" : "  ★寸法がちがう"));
  }
  console.log("");
  await browser.close();
})();
