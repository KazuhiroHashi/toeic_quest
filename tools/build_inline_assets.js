#!/usr/bin/env node
// Build the data-URI asset bundle used by the single-file preview build.
//
// The store build ships assets as files (tools/build_www.js). A claude.ai
// artifact has to be ONE html under 16MB, and base64 inflates everything by
// 4/3 — so here the art is downscaled hard and the music is cut to a short
// seamless loop at low bitrate. Quality is deliberately worse than the real
// app; this exists so the game can be played from a phone link.
//
//   node tools/build_inline_assets.js [out.js]
//
"use strict";
var fs = require("fs");
var path = require("path");
var { execFileSync, spawnSync } = require("child_process");

var root = path.join(__dirname, "..");
var out = process.argv[2] || path.join(root, "build", "inline_assets.js");

// budgets tuned so the finished html lands under the 16MB artifact cap
var IMG = {
  enemies: { max: 512, q: 68 },
  bg:      { max: 900, q: 66 },
  ui:      { max: 900, q: 72 }
};
var BGM_SECONDS = 60;      // one loop is plenty for a preview
var BGM_BITRATE = "48k";
var BGM_XF = 0.6;          // tail->head crossfade so the short loop still joins
var SFX_BITRATE = "48k";

var FFMPEG = (function () {
  var cands = [process.env.FFMPEG, "/opt/homebrew/bin/ffmpeg", "ffmpeg"].filter(Boolean);
  for (var i = 0; i < cands.length; i++) {
    var r = spawnSync(cands[i], ["-hide_banner", "-version"], { encoding: "utf8" });
    if (!r.error && r.status === 0) return cands[i];
  }
  console.error("ffmpeg が見つかりません"); process.exit(1);
})();

var TMP = fs.mkdtempSync(path.join(require("os").tmpdir(), "wqinline-"));
process.on("exit", function () { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} });

function ff(args) {
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y"].concat(args), { stdio: "pipe" });
}
function dataUri(file, mime) {
  return "data:" + mime + ";base64," + fs.readFileSync(file).toString("base64");
}
function duration(f) {
  return parseFloat(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
}

var total = 0;
function image(src, cfg) {
  var dst = path.join(TMP, "i.webp");
  ff(["-i", src, "-vf", "scale='min(" + cfg.max + ",iw)':-1",
      "-c:v", "libwebp", "-quality", String(cfg.q), "-compression_level", "6", dst]);
  total += fs.statSync(dst).size;
  return dataUri(dst, "image/webp");
}
function music(src) {
  var dst = path.join(TMP, "a.mp3");
  var len = duration(src);
  // A track already short enough needs no cut, and rotating it by BGM_XF would
  // only move its opening to the end — which is exactly what it did to the 6秒
  // victory fanfare, so the fanfare came in 1.2s late with no attack.
  if (len <= BGM_SECONDS) {
    ff(["-i", src, "-ac", "1", "-c:a", "libmp3lame", "-b:a", BGM_BITRATE, dst]);
    total += fs.statSync(dst).size;
    return dataUri(dst, "audio/mpeg");
  }
  // [0..len] with the head mixed into its own tail, so the clip both starts on
  // the real intro and joins when it loops. Taking [xf..len] instead would give
  // a perfect seam, but it rotates the track — every battle theme then began a
  // bar late, with its opening moved to the end.
  ff(["-i", src, "-i", src, "-filter_complex",
      "[0:a]atrim=0:" + BGM_SECONDS + ",asetpts=N/SR/TB[a];" +
      "[1:a]atrim=0:" + BGM_XF + ",asetpts=N/SR/TB[b];" +
      "[a][b]acrossfade=d=" + BGM_XF + ":c1=tri:c2=tri[o]",
      "-map", "[o]", "-ac", "1", "-c:a", "libmp3lame", "-b:a", BGM_BITRATE, dst]);
  total += fs.statSync(dst).size;
  return dataUri(dst, "audio/mpeg");
}
function sfx(src) {
  var dst = path.join(TMP, "s.mp3");
  ff(["-i", src, "-ac", "1", "-c:a", "libmp3lame", "-b:a", SFX_BITRATE, dst]);
  total += fs.statSync(dst).size;
  return dataUri(dst, "audio/mpeg");
}

function stems(dir, filter) {
  return fs.readdirSync(path.join(root, "assets", dir))
    .filter(function (f) { return filter.test(f); })
    .map(function (f) { return f.slice(0, f.lastIndexOf(".")); });
}

// 単語音声は全部で14MBあり、16MBのアーティファクト上限に収まらない。
// そこで序盤の戦いで出る語だけを、残り容量いっぱいまで入れる。
// 入らなかった語は VOICE_ART に載らず、voice.js が「無い」と判断して黙る
// （404を取りにいかない）。プレビューは音を確かめるためのもので、
// 本番ビルドには4,883語すべて入る。
var VOICE_BUDGET = 3.4 * 1048576;   // 素材ベース。base64で約4.5MBになる
var art = { UI_ART: {}, BG_ART: {}, ENEMY_ART: {}, SFX_ART: {}, BGM_ART: {}, VOICE_ART: {} };

process.stdout.write("画像… ");
// pmain.js looks these up by role name, not filename
var UI_KEYS = { titlebg: "title_bg", logo: "logo", icon: "icon" };
Object.keys(UI_KEYS).forEach(function (k) {
  var f = path.join(root, "assets", "ui", UI_KEYS[k] + ".png");
  if (fs.existsSync(f)) art.UI_ART[k] = image(f, IMG.ui);
});
stems("bg", /\.png$/).forEach(function (s) {
  art.BG_ART[s] = image(path.join(root, "assets", "bg", s + ".png"), IMG.bg);
});
stems("enemies", /\.png$/).forEach(function (s) {
  art.ENEMY_ART[s] = image(path.join(root, "assets", "enemies", s + ".png"), IMG.enemies);
});
console.log((total / 1048576).toFixed(1) + "MB");

var before = total;
process.stdout.write("効果音… ");
stems("sfx", /\.mp3$/).forEach(function (s) {
  art.SFX_ART[s] = sfx(path.join(root, "assets", "sfx", s + ".mp3"));
});
console.log(((total - before) / 1048576).toFixed(1) + "MB");

// story-mode-only tracks are never reachable in the preview
var SKIP_BGM = ["field", "town", "dungeon", "battle_dungeon"];
before = total;
process.stdout.write("BGM… ");
stems("bgm", /\.mp3$/).filter(function (s) { return SKIP_BGM.indexOf(s) < 0; }).forEach(function (s) {
  art.BGM_ART[s] = music(path.join(root, "assets", "bgm", s + ".mp3"));
});
console.log(((total - before) / 1048576).toFixed(1) + "MB  (" + Object.keys(art.BGM_ART).length + "曲 × " + BGM_SECONDS + "秒)");

// 読み上げ：序盤の段階から順に、予算いっぱいまで
before = total;
process.stdout.write("読み上げ… ");
(function () {
  var dir = path.join(root, "assets", "voice");
  if (!fs.existsSync(dir)) { console.log("なし"); return; }
  // voice.js / build_voice_list.js と同じ規則
  function slug(w) {
    return String(w).toLowerCase().replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  // 序盤の戦いで引かれる段階から埋める。TOEIC版と学生版の両方が
  // 最初の数戦を音つきで試せるように、中学の語も混ぜる
  var g = global.window || (global.window = {});
  ["400", "500"].forEach(function (f) {
    eval(fs.readFileSync(path.join(root, "data", "vocab_" + f + ".js"), "utf8"));
  });
  eval(fs.readFileSync(path.join(root, "data", "vocab_jhs.js"), "utf8"));
  var order = []
    .concat(g.VOCAB[400] || [], g.VOCAB[500] || [], (g.VOCAB_JHS || {}).g1 || []);
  var used = 0, n = 0, seenSlug = {};
  for (var i = 0; i < order.length; i++) {
    var s = slug(order[i].w);
    if (!s || seenSlug[s]) continue;
    var f = path.join(dir, s + ".mp3");
    if (!fs.existsSync(f)) continue;
    var sz = fs.statSync(f).size;
    if (used + sz > VOICE_BUDGET) break;
    seenSlug[s] = 1;
    art.VOICE_ART[s] = dataUri(f, "audio/mpeg");
    used += sz; n++;
  }
  total += used;
  console.log((used / 1048576).toFixed(1) + "MB  (" + n + "語ぶん。残りは無音)");
})();

var js = Object.keys(art).map(function (k) {
  return "window." + k + " = " + JSON.stringify(art[k]) + ";";
}).join("\n") + "\n";

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, js);
console.log("\n素材 " + (total / 1048576).toFixed(1) + "MB → base64 " +
  (fs.statSync(out).size / 1048576).toFixed(1) + "MB  " + path.relative(root, out));
