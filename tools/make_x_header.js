#!/usr/bin/env node
// X（旧Twitter）のヘッダー画像を作る。
//
//   npm install playwright-core --no-save
//   node tools/make_x_header.js
//   → store/social/x_header_1500x500.png
//
// ── 元になっているもの ────────────────────────────────────
// 背景は `assets/ui/title_bg.png`（タイトル画面の絵・941×1672）の
// **横一本の帯**。城と「B」と浮いている本が入るところを切り出して、
// 1500×500 に引き伸ばしている。
//
//   crop=941:314:0:733   → 比が 3:1 になり、1500×500 と一致する
//
// 切る位置は WORD QUEST 時代のヘッダーから実測で割り出した。
// 幕のかからない右側どうしを重ねて相関を取ると y=733 が山（0.997）。
//
// ★ 941px を 1500px に引き伸ばしている。**これ以上大きい原寸は無い。**
//   art/ にも movie_src/ にも 941×1672 しか置かれていない。
//   もっと精細なものが要るなら、絵から作り直すことになる。
//
// ── 文字まわりは実測で合わせてある ────────────────────────
// 書体は **M PLUS Rounded 1c ExtraBold**。元のヘッダーと字形が一致する。
// 太さは、字の外接枠を 394×82 に揃えたときの塗り率で決めた:
//
//   元絵 0.325 ／ Bold 0.287 ／ ExtraBold 0.347 ／ Black 0.386
//
// 元絵は JPEG で縁がなまって拾い落ちるぶん実際はもう少し高いので、
// ExtraBold が合う。拡大して重ねても字形・太さとも一致した。
//
// 幕（左を沈めている暗がり）も実測。黒ではなく **暗い紺**で、
// 元絵÷素の帯から色 rgb(10,16,32)・濃さは下の VEIL の通り。
//
// ── なぜ ffmpeg だけで作らないか ──────────────────────────
// 元のヘッダーは字間が空けてある（ExtraBold で約2.4px）。
// ffmpeg の drawtext に字間を指定する手段が無いので、
// 文字は Chromium（playwright-core）に CSS で組ませている。
// 背景の切り出しだけ ffmpeg。
//
// ── X のヘッダーで気をつけること ──────────────────────────
// ・寸法は 1500×500
// ・**左下にプロフィール画像が重なる。** そこには何も置かない
// ・スマホでは左右が切り落とされる。端に大事なものを置かない
"use strict";
var fs = require("fs");
var path = require("path");
var os = require("os");
var execFileSync = require("child_process").execFileSync;

var ROOT = path.resolve(__dirname, "..");
var BG = path.join(ROOT, "assets", "ui", "title_bg.png");
var LOGO = path.join(ROOT, "assets", "ui", "logo.png");
var FONT = path.join(ROOT, "art", "fonts", "MPLUSRounded1c-ExtraBold-subset.woff2");
var OUTDIR = path.join(ROOT, "store", "social");
var OUT = path.join(OUTDIR, "x_header_1500x500.png");

var CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

var W = 1500, H = 500;

// 元のヘッダーの実測値。ここを動かすと元絵から離れる。
var NAME = "Bridge AI";
var NAME_SIZE = 84.5;        // 字の高さ（Bの上端〜gの下端）が 82px になる大きさ
var NAME_TRACK = 2.38;       // 字間。これで幅が 394px になる
var NAME_X = 232;            // 字の左端
var NAME_TOP = 84;           // B の上端

var RULE_X = 225, RULE_Y = 210, RULE_W = 135, RULE_H = 2;

var COPY = "単語帳を開くより、冒険しよう";
var COPY_SIZE = 30;          // 元絵は10文字で33px。こちらは14文字あるので詰めた
var COPY_X = 227;            // 字の左端（元絵と同じ）
var COPY_TOP = 247;          // 字の上端（元絵と同じ）

// ロゴ。WORD QUEST は縦2行だったが WORDRIA は横長なので、
// 右端と上下の真ん中を合わせた位置に置く。
var LOGO_W = 372, LOGO_RIGHT = 1062, LOGO_MID = 318;

// 幕。元絵÷素の帯から出した濃さ。x=1250 で消える。
var VEIL_RGB = "10,16,32";
var VEIL = [[0, 0.91], [120, 0.85], [300, 0.805], [500, 0.64],
            [700, 0.44], [900, 0.27], [1100, 0.06], [1250, 0]];

function ff(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args),
    { maxBuffer: 1 << 28 });
}

var need = [BG, LOGO, FONT];
for (var i = 0; i < need.length; i++) {
  if (!fs.existsSync(need[i])) {
    console.error("  ! " + path.relative(ROOT, need[i]) + " がありません");
    process.exit(1);
  }
}
if (!fs.existsSync(CHROME)) {
  console.error("  ! Chromium が " + CHROME + " にありません");
  process.exit(1);
}
var chromium;
try {
  chromium = require("playwright-core").chromium;
} catch (e) {
  console.error("  ! playwright-core がありません。`npm install playwright-core --no-save`");
  process.exit(1);
}

fs.mkdirSync(OUTDIR, { recursive: true });
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xhdr-"));
var band = path.join(tmp, "band.png");
ff(["-i", BG, "-vf", "crop=941:314:0:733,scale=" + W + ":" + H + ":flags=lanczos",
    "-frames:v", "1", band]);

function dataUrl(file, mime) {
  return "data:" + mime + ";base64," + fs.readFileSync(file).toString("base64");
}

var veilCss = VEIL.map(function (s) {
  return "rgba(" + VEIL_RGB + "," + s[1] + ") " + s[0] + "px";
}).join(",");

var src = {
  band: dataUrl(band, "image/png"),
  logo: dataUrl(LOGO, "image/png"),
  font: dataUrl(FONT, "font/woff2")
};

var html =
'<!doctype html><meta charset="utf-8"><style>' +
'@font-face{font-family:R;src:url(' + src.font + ') format("woff2")}' +
'html,body{margin:0;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:#000}' +
'#w{position:relative;width:' + W + 'px;height:' + H + 'px}' +
'#bg,#veil{position:absolute;inset:0}' +
'#bg{width:' + W + 'px;height:' + H + 'px}' +
'#veil{background:linear-gradient(to right,' + veilCss + ')}' +
'#logo{position:absolute;width:' + LOGO_W + 'px}' +
'.t{position:absolute;font-family:R;color:#fff;white-space:nowrap;line-height:1;' +
'text-shadow:0 3px 10px rgba(0,0,0,.45)}' +
'#name{font-size:' + NAME_SIZE + 'px;letter-spacing:' + NAME_TRACK + 'px}' +
'#copy{font-size:' + COPY_SIZE + 'px;text-shadow:0 2px 8px rgba(0,0,0,.45)}' +
'#rule{position:absolute;left:' + RULE_X + 'px;top:' + RULE_Y + 'px;' +
'width:' + RULE_W + 'px;height:' + RULE_H + 'px;' +
'background:linear-gradient(to right,#e8c874 0,#e8c874 25%,rgba(232,200,116,0) 100%)}' +
'</style><div id=w>' +
'<img id=bg src="' + src.band + '">' +
'<div id=veil></div>' +
'<img id=logo src="' + src.logo + '">' +
'<div class=t id=name>' + NAME + '</div>' +
'<div id=rule></div>' +
'<div class=t id=copy>' + COPY + '</div>' +
'</div>';

// 白い字だけを黒地に出した画像から、字の外接枠を測る。
// 書体の上下の余白は書体ごとに違って当てにならないので、
// 「置く → 測る → ずれたぶん直す」を回して合わせる。
function inkBox(png) {
  var pgm = path.join(tmp, "ink.pgm");
  ff(["-i", png, "-vf", "format=gray", "-frames:v", "1", pgm]);
  var b = fs.readFileSync(pgm);
  var head = b.indexOf("255\n") + 4;
  var x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (var y = 0; y < H; y++) {
    var row = head + y * W;
    for (var x = 0; x < W; x++) {
      if (b[row + x] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

(async function () {
  var browser = await chromium.launch({ executablePath: CHROME });
  var page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(function () { return document.fonts.ready; });

  // ロゴは右端と上下の真ん中で置く
  await page.evaluate(function (o) {
    var el = document.getElementById("logo");
    el.style.left = (o.right - el.width) + "px";
    el.style.top = (o.mid - el.height / 2) + "px";
  }, { right: LOGO_RIGHT, mid: LOGO_MID });

  // 文字を1つずつ黒地に出して測り、字の左上が狙いどおりになるまで直す
  var targets = [{ id: "name", x: NAME_X, top: NAME_TOP },
                 { id: "copy", x: COPY_X, top: COPY_TOP }];
  var probe = path.join(tmp, "probe.png");
  for (var t = 0; t < targets.length; t++) {
    var s = targets[t];
    await page.evaluate(function (id) {
      ["bg", "veil", "logo", "rule", "name", "copy"].forEach(function (k) {
        document.getElementById(k).style.visibility = k === id ? "visible" : "hidden";
      });
      document.getElementById(id).style.textShadow = "none";
      document.body.style.background = "#000";
    }, s.id);
    for (var pass = 0; pass < 4; pass++) {
      await page.screenshot({ path: probe });
      var got = inkBox(probe);
      if (!got) throw new Error(s.id + " の字が出ていません");
      var dx = s.x - got.x, dy = s.top - got.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break;
      await page.evaluate(function (o) {
        var el = document.getElementById(o.id);
        el.style.left = ((parseFloat(el.style.left) || 0) + o.dx) + "px";
        el.style.top = ((parseFloat(el.style.top) || 0) + o.dy) + "px";
      }, { id: s.id, dx: dx, dy: dy });
    }
  }
  await page.evaluate(function () {
    ["bg", "veil", "logo", "rule", "name", "copy"].forEach(function (k) {
      document.getElementById(k).style.visibility = "visible";
    });
    document.getElementById("name").style.textShadow = "0 3px 10px rgba(0,0,0,.45)";
    document.getElementById("copy").style.textShadow = "0 2px 8px rgba(0,0,0,.45)";
    document.body.style.background = "#000";
  });

  await page.screenshot({ path: OUT });

  var box = await page.evaluate(function () {
    var b = document.getElementById("logo").getBoundingClientRect();
    return Math.round(b.left) + "," + Math.round(b.top) +
           " → " + Math.round(b.right) + "," + Math.round(b.bottom);
  });
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });

  var kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log("  " + path.relative(ROOT, OUT) + "  " + W + "×" + H + "  " + kb + "KB");
  console.log("  書体 M PLUS Rounded 1c ExtraBold（元のヘッダーと同じ字形）");
  console.log("  Bridge AI  字の左上 " + NAME_X + "," + NAME_TOP + "（元絵と同じ）");
  console.log("  キャッチ   字の左上 " + COPY_X + "," + COPY_TOP + "（元絵と同じ）");
  console.log("  ロゴ       " + box);
  console.log("\n  ※ X のヘッダーは左下にプロフィール画像が重なります。");
  console.log("     スマホでは左右も切れるので、端に大事なものは置いていません。");
})().catch(function (e) {
  console.error("\n失敗しました:\n" + (e && e.stack || e));
  process.exit(1);
});
