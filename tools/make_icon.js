// WORDRIA - アプリアイコンを描いて appicon/ に書き出す
//
// なぜ手で描くか：前のアイコンは情報量の多いイラストで、ホーム画面の 60×60 では
// 顔も剣も潰れてただの暗い四角になっていた。アイコンは「いちばん小さいとき」に
// 成立していなければ意味がない。形はひとつ、明暗差は大きく、が原則。
//
// 出力（@capacitor/assets がここから全サイズを作る）
//   icon-only.png        1024 不透明。iOS と Android の旧形式
//   icon-foreground.png  1024 透過。Android アダプティブの前景
//   icon-background.png  1024 不透明。Android アダプティブの背景
//
// Android のアダプティブアイコンは中央 66% の円で切られる。前景は剣だけを
// 62% に収めてある。前のように icon-only をそのまま前景に使うと頭が切れる。
//
// ぼかしフィルタは使わない。SVG の filter は既定で要素の周囲 10% しか領域を
// 取らないため、広く伸ばした形をぼかすと縁が直線で切れる（実際に一度そうなった）。
// オーロラは楕円のグラデーションを重ねて作る。
//
//   node tools/make_icon.js            書き出し
//   node tools/make_icon.js --preview  60px / 120px に縮めた確認用も出す
//
// 描画に playwright-core と Chromium を使う。書き出した PNG はコミットしてあるので
// 普段は走らせなくてよい。作り直すときだけ用意する：
//   npm i -D playwright-core && npx playwright install chromium
"use strict";
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");

var OUT = path.join(__dirname, "..", "appicon");
var EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// 戦闘画面（ガラスとオーロラ）と同じ色で揃える
var C = {
  deep: "#060a22", navy: "#141e4e",
  teal: "#3ee6c4", violet: "#8b6cf0",
  goldHi: "#ffefb4", goldMid: "#e8b444", goldLo: "#8f5f10",
  core: "#fffdf2", gem: "#5cb4ff", gemLo: "#1a56ad", grip: "#241c3c"
};

// ---------- 背景 ----------
function background() {
  // 文字の星座。60px では点にしか見えず、大きく見ると文字だと分かる程度に抑える
  var letters = [
    [148, 214, 44, "A"], [872, 178, 40, "B"], [214, 792, 38, "Q"],
    [846, 806, 44, "W"], [330, 118, 32, "E"], [706, 946, 34, "S"],
    [92, 546, 30, "R"], [944, 566, 32, "T"]
  ].map(function (l) {
    return '<text x="' + l[0] + '" y="' + l[1] + '" font-size="' + l[2] +
      '" font-family="Georgia, serif" font-weight="700" fill="#cfe0ff" ' +
      'opacity=".22" text-anchor="middle">' + l[3] + '</text>';
  }).join("");

  var stars = ["252,308,4", "790,392,5", "168,668,4", "624,206,4",
               "902,700,4", "396,880,5", "560,84,3", "108,404,3"]
    .map(function (s) { var a = s.split(",");
      return '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] +
        '" fill="#e2ecff" opacity=".5"/>'; }).join("");

  return '<rect width="1024" height="1024" fill="url(#bg)"/>' +
    '<ellipse cx="286" cy="236" rx="440" ry="230" fill="url(#auT)"/>' +
    '<ellipse cx="782" cy="176" rx="420" ry="215" fill="url(#auV)"/>' +
    '<ellipse cx="600" cy="880" rx="470" ry="200" fill="url(#auV)" opacity=".5"/>' +
    letters + stars;
}

// ---------- 剣 ----------
// 刃は先へ向けてわずかに細らせる。真っ直ぐだと板に見える
function sword() {
  return [
    '<ellipse cx="512" cy="430" rx="230" ry="360" fill="url(#glow)"/>',
    // 刃
    '<path d="M512 116 L566 288 L560 622 L464 622 L458 288 Z" fill="url(#blade)"/>',
    // 樋。明るい芯を一本通すと、小さくても縦の形が読める
    '<path d="M512 176 L529 300 L526 604 L498 604 L495 300 Z" fill="' + C.core + '" opacity=".95"/>',
    '<path d="M512 116 L566 288 L560 622 L464 622 L458 288 Z" fill="none" stroke="' + C.goldLo + '" stroke-width="8"/>',
    // 鍔。両端を尖らせて、ただの横棒に見えないようにする
    '<path d="M356 620 L668 620 L706 650 L668 680 L356 680 L318 650 Z" ' +
      'fill="url(#gold)" stroke="' + C.goldLo + '" stroke-width="8" stroke-linejoin="round"/>',
    // 柄
    '<rect x="486" y="678" width="52" height="164" rx="16" fill="' + C.grip + '" stroke="' + C.goldLo + '" stroke-width="7"/>',
    '<rect x="486" y="712" width="52" height="13" fill="' + C.goldMid + '"/>',
    '<rect x="486" y="750" width="52" height="13" fill="' + C.goldMid + '"/>',
    '<rect x="486" y="788" width="52" height="13" fill="' + C.goldMid + '"/>',
    // 柄頭と宝石
    '<circle cx="512" cy="876" r="50" fill="url(#gold)" stroke="' + C.goldLo + '" stroke-width="8"/>',
    '<circle cx="512" cy="876" r="23" fill="url(#gemg)"/>'
  ].join("");
}

function defs() {
  function fade(id, color) {
    return '<radialGradient id="' + id + '" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".42"/>' +
      '<stop offset="55%" stop-color="' + color + '" stop-opacity=".15"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
    '</radialGradient>';
  }
  return '<defs>' +
    '<radialGradient id="bg" cx="50%" cy="40%" r="76%">' +
      '<stop offset="0%" stop-color="' + C.navy + '"/>' +
      '<stop offset="100%" stop-color="' + C.deep + '"/>' +
    '</radialGradient>' +
    fade("auT", C.teal) + fade("auV", C.violet) +
    '<linearGradient id="blade" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="' + C.goldMid + '"/>' +
      '<stop offset="40%" stop-color="' + C.goldHi + '"/>' +
      '<stop offset="100%" stop-color="' + C.goldMid + '"/>' +
    '</linearGradient>' +
    '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + C.goldHi + '"/>' +
      '<stop offset="100%" stop-color="' + C.goldMid + '"/>' +
    '</linearGradient>' +
    '<radialGradient id="gemg" cx="38%" cy="34%" r="76%">' +
      '<stop offset="0%" stop-color="#dcefff"/>' +
      '<stop offset="55%" stop-color="' + C.gem + '"/>' +
      '<stop offset="100%" stop-color="' + C.gemLo + '"/>' +
    '</radialGradient>' +
    '<radialGradient id="glow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + C.goldHi + '" stop-opacity=".38"/>' +
      '<stop offset="52%" stop-color="' + C.goldMid + '" stop-opacity=".13"/>' +
      '<stop offset="100%" stop-color="' + C.goldMid + '" stop-opacity="0"/>' +
    '</radialGradient>' +
  '</defs>';
}

function svg(mode) {
  var body;
  if (mode === "bg") body = background();
  else if (mode === "fg") {
    // アダプティブの安全域（中央66% ≒ 676px）に収める。剣は元が810px高なので
    // 0.70 倍で 567px。円で切られても欠けない
    body = '<g transform="translate(512 512) scale(0.70) translate(-512 -512)">' + sword() + '</g>';
  } else body = background() + sword();

  return '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">' +
    defs() + body + '</svg>';
}

(async function () {
  var preview = process.argv.indexOf("--preview") >= 0;
  var browser = await chromium.launch({ executablePath: EXE });
  var page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });

  var jobs = [
    { mode: "full", file: "icon-only.png", alpha: false },
    { mode: "fg", file: "icon-foreground.png", alpha: true },
    { mode: "bg", file: "icon-background.png", alpha: false }
  ];
  for (var j of jobs) {
    var bg = j.alpha ? "transparent" : C.deep;
    await page.setContent(
      '<style>html,body{margin:0;padding:0;background:' + bg + '}svg{display:block}</style>' + svg(j.mode));
    var out = path.join(OUT, j.file);
    await page.screenshot({ path: out, omitBackground: j.alpha });
    console.log(j.file, "->", (fs.statSync(out).size / 1024).toFixed(0) + "KB");
  }
  await browser.close();

  if (preview) {
    var cp = require("child_process");
    var src = path.join(OUT, "icon-only.png");
    var dir = path.join(__dirname, "..", "build");
    fs.mkdirSync(dir, { recursive: true });
    // 一度小さくしてから拡大し直す。実機のホーム画面で見える情報量を再現する
    [[60, 300], [120, 360]].forEach(function (p) {
      cp.execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src,
        "-vf", "scale=" + p[0] + ":" + p[0] + ":flags=lanczos,scale=" + p[1] + ":" + p[1] + ":flags=neighbor",
        path.join(dir, "icon_at_" + p[0] + ".png")]);
    });
    console.log("build/icon_at_60.png, build/icon_at_120.png");
  }
})();
