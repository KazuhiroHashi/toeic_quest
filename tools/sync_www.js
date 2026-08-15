// Copy the self-contained game build into www/index.html for Capacitor.
// The dist file already has all images/audio embedded (offline-ready).
// Usage: node tools/sync_www.js [--src=dist/wq2_party.html]
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var srcArg = process.argv.find(function (a) { return a.indexOf("--src=") === 0; });
var src = path.resolve(root, srcArg ? srcArg.slice(6) : "dist/wq2_party.html");
var wwwDir = path.join(root, "www");
var out = path.join(wwwDir, "index.html");

if (!fs.existsSync(src)) {
  console.error("source build not found: " + src + "\nBuild it first (see docs/ANDROID.md).");
  process.exit(1);
}
fs.mkdirSync(wwwDir, { recursive: true });
fs.copyFileSync(src, out);
console.log("wrote " + out + " (" + Math.round(fs.statSync(out).size / 1024) + " KB) from " + path.basename(src));

// OP/ED movies are not inlined (too big for a data URI); ship them as files
// beside index.html — pmovie.js looks for movie/op.mp4 first.
var movSrc = path.join(root, "assets", "movie");
if (fs.existsSync(movSrc)) {
  var movDst = path.join(wwwDir, "movie");
  fs.mkdirSync(movDst, { recursive: true });
  fs.readdirSync(movSrc).forEach(function (f) {
    if (!/\.mp4$/.test(f)) return;
    fs.copyFileSync(path.join(movSrc, f), path.join(movDst, f));
    console.log("copied movie/" + f + " (" + Math.round(fs.statSync(path.join(movDst, f)).size / 1048576) + " MB)");
  });
}
