#!/usr/bin/env node
// X（旧Twitter）のヘッダー画像を作る。
//
//   node tools/make_x_header.js
//   → store/social/x_header_1500x500.png
//
// ── 元になっているもの ────────────────────────────────────
// 背景は `assets/ui/title_bg.png`（タイトル画面の絵・941×1672）の
// **横一本の帯**。城と「B」と浮いている本が入るところを切り出して、
// 1500×500 に引き伸ばしている。
//
//   crop=941:314:0:731   → 比が 3:1 になり、1500×500 と一致する
//
// 切る位置は元のヘッダー（WORD QUEST 時代のもの）から逆算した。
// 「B」の上端が帯の 11%、下端が 39% に来る位置が y=731。
//
// ★ 941px を 1500px に引き伸ばしている。**これ以上大きい原寸は無い。**
//   art/ にも movie_src/ にも 941×1672 しか置かれていない。
//   もっと精細なものが要るなら、絵から作り直すことになる。
//
// ── X のヘッダーで気をつけること ──────────────────────────
// ・寸法は 1500×500
// ・**左下にプロフィール画像が重なる。** そこには何も置かない
// ・スマホでは左右が切り落とされる。端に大事なものを置かない
// ・上端も少し隠れることがある
"use strict";
var fs = require("fs");
var path = require("path");
var execFileSync = require("child_process").execFileSync;

var ROOT = path.resolve(__dirname, "..");
var BG = path.join(ROOT, "assets", "ui", "title_bg.png");
var LOGO = path.join(ROOT, "assets", "ui", "logo.png");
var OUTDIR = path.join(ROOT, "store", "social");
var OUT = path.join(OUTDIR, "x_header_1500x500.png");

// 和文も欧文も同じ書体で通す。Noto Sans CJK JP の Bold。
// ※ .ttc は複数の書体が束ねてあるので、index で JP を選ぶ
var FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc";
// ※ この ffmpeg は fontindex に対応していないので、.ttc の先頭の書体が使われる

var W = 1500, H = 500;
var GOLD = "0xE8C874";

function ff(args) {
  try {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y"].concat(args),
      { maxBuffer: 1 << 28 });
  } catch (e) {
    console.error("\nffmpeg に失敗しました:\n" + (e.stderr || e.message));
    process.exit(1);
  }
}

if (!fs.existsSync(BG)) { console.error("  ! " + BG + " がありません"); process.exit(1); }
if (!fs.existsSync(FONT)) { console.error("  ! 書体が見つかりません: " + FONT); process.exit(1); }
fs.mkdirSync(OUTDIR, { recursive: true });

var fontOpt = "fontfile='" + FONT + "'";

// 1枚の filtergraph で組む。
//   [0] 背景（切り出して拡大）
//   [1] 左を沈める幕（右へ向かって消えていく黒）
//   [2] ロゴ
var filter = [
  // 背景
  "[0:v]crop=941:314:0:731,scale=" + W + ":" + H + ":flags=lanczos,format=rgba[bg]",
  // 左を沈める幕。文字が乗るところだけ暗くする。
  // 右端まで届かせると城と夕陽まで曇るので、6割ほどで消す
  "color=c=black:s=" + W + "x" + H + ",format=rgba," +
    "geq=r=0:g=0:b=0:a='clip(215*(1-X/" + Math.round(W * 0.62) + "),0,255)'[veil]",
  "[bg][veil]overlay=0:0[lit]",
  // ロゴ。横 360px に揃える（元の比 1692:929）
  // 城の丘に重ならないよう、空と山の上・「B」の真下に置く
  "[1:v]scale=360:-1[logo]",
  "[lit][logo]overlay=610:250[withlogo]",
  // Bridge AI
  "[withlogo]drawtext=" + fontOpt +
    ":text='Bridge AI':fontcolor=white:fontsize=74:x=228:y=78" +
    ":shadowcolor=black@0.45:shadowx=0:shadowy=3[t1]",
  // 金の罫。細い線を1本
  "[t1]drawbox=x=218:y=210:w=136:h=3:color=" + GOLD + "@0.95:t=fill[t2]",
  // 単語帳を開くより、冒険しよう
  // 14文字あるのでロゴに当たらない大きさにしてある(28px で右端は約620px)
  "[t2]drawtext=" + fontOpt +
    ":text='単語帳を開くより、冒険しよう':fontcolor=white:fontsize=28:x=228:y=245" +
    ":shadowcolor=black@0.45:shadowx=0:shadowy=2[out]"
].join(";");

ff(["-i", BG, "-i", LOGO, "-filter_complex", filter, "-map", "[out]", "-frames:v", "1", OUT]);

var kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log("  " + path.relative(ROOT, OUT) + "  " + W + "×" + H + "  " + kb + "KB");
console.log("\n  ※ X のヘッダーは左下にプロフィール画像が重なります。");
console.log("     スマホでは左右も切れるので、端に大事なものは置いていません。");
