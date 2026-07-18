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
var embedArg = process.argv.find(function (a) { return a.indexOf("--embed=") === 0; });
var srcArg = process.argv.find(function (a) { return a.indexOf("--src=") === 0; });
var srcHtml = srcArg ? path.resolve(srcArg.slice(6)) : path.join(root, "index.html");
var srcDir = path.dirname(srcHtml);

var html = fs.readFileSync(srcHtml, "utf8");
var title = html.match(/<title>([^<]*)<\/title>/)[1];
var cssPath = html.match(/<link rel="stylesheet" href="([^"]+)">/)[1];
var css = fs.readFileSync(path.join(srcDir, cssPath), "utf8");

// body content without the external script/link tags
var body = html.match(/<body>([\s\S]*?)<script/)[1];

var scripts = [];
var re = /<script src="([^"]+)"><\/script>/g, m;
while ((m = re.exec(html))) {
  scripts.push('<script>\n' + fs.readFileSync(path.join(srcDir, m[1]), "utf8") + "\n</script>");
}
if (embedArg) {
  scripts.push('<script>\n' + fs.readFileSync(path.resolve(embedArg.slice(8)), "utf8") + "\n</script>");
}

var core =
  "<title>" + title + "</title>\n" +
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
