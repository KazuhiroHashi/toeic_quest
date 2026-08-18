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
var BGM_XF = 1.2;          // tail->head crossfade so the short loop still joins
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
  var d = Math.min(BGM_SECONDS + BGM_XF, len);
  // [xf..d] with the head faded in over its tail, so looping the clip joins cleanly
  ff(["-i", src, "-i", src, "-filter_complex",
      "[0:a]atrim=" + BGM_XF + ":" + d.toFixed(2) + ",asetpts=N/SR/TB[a];" +
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

var art = { UI_ART: {}, BG_ART: {}, ENEMY_ART: {}, SFX_ART: {}, BGM_ART: {} };

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

var js = Object.keys(art).map(function (k) {
  return "window." + k + " = " + JSON.stringify(art[k]) + ";";
}).join("\n") + "\n";

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, js);
console.log("\n素材 " + (total / 1048576).toFixed(1) + "MB → base64 " +
  (fs.statSync(out).size / 1048576).toFixed(1) + "MB  " + path.relative(root, out));
