// Bundle a game into a single self-contained HTML file.
// Usage: node tools/build_standalone.js [outfile] [--artifact] [--src=<index.html>]
//   default src: index.html (repo root), default outfile: dist/toeic_quest.html
//   --artifact: emit body-content only (no doctype/html/head/body) for hosts
//               that wrap the content in their own skeleton
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var out = process.argv[2] || path.join(root, "dist", "toeic_quest.html");
var artifactMode = process.argv.includes("--artifact");
var noStory = process.argv.includes("--no-story");
var embedArg = process.argv.find(function (a) { return a.indexOf("--embed=") === 0; });
var srcArg = process.argv.find(function (a) { return a.indexOf("--src=") === 0; });
var srcHtml = srcArg ? path.resolve(srcArg.slice(6)) : path.join(root, "index.html");
var srcDir = path.dirname(srcHtml);

var html = fs.readFileSync(srcHtml, "utf8");
var title = html.match(/<title>([^<]*)<\/title>/)[1];
var css = "";
var cssRe = /<link rel="stylesheet" href="([^"]+)">/g, cm;
while ((cm = cssRe.exec(html))) {
  css += fs.readFileSync(path.join(srcDir, cm[1]), "utf8") + "\n";
}

// body content without the external script/link tags
var body = html.match(/<body>([\s\S]*?)<script/)[1];
if (noStory) {
  // the story mode is unfinished and its art is not embedded — drop the entry
  var b0 = body;
  body = body.replace(/[ \t]*<div id="ptitle-foot">[\s\S]*?<\/div>\r?\n/, "");
  if (body === b0) { console.error("! ptitle-foot が見つかりません"); process.exit(1); }
}

var scripts = [];
var re = /<script src="([^"]+)"><\/script>/g, m;
while ((m = re.exec(html))) {
  scripts.push('<script>\n' + fs.readFileSync(path.join(srcDir, m[1]), "utf8") + "\n</script>");
}
if (embedArg) {
  // asset data (window.*_ART) must be defined BEFORE the game scripts run, because
  // the title screen reads UI_ART at script-eval time (not lazily like battle art).
  scripts.unshift('<script>\n' + fs.readFileSync(path.resolve(embedArg.slice(8)), "utf8") + "\n</script>");
}

// artifact mode emits body content only, so the host supplies <head>; the game
// still needs a phone viewport, so set it from script.
var viewportFix = artifactMode
  ? '<script>(function(){var m=document.querySelector(\'meta[name="viewport"]\')||document.head.appendChild(document.createElement("meta"));m.name="viewport";m.content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";})();</script>\n'
  : "";

var core =
  "<title>" + title + "</title>\n" + viewportFix +
  "<style>\n" + css + "\n</style>\n" +
  body + "\n" +
  scripts.join("\n");

var doc = artifactMode ? core :
  '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="UTF-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  "</head>\n<body>\n" + core + "\n</body>\n</html>\n";

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, doc);
console.log("wrote " + out + " (" + Math.round(doc.length / 1024) + " KB)");
