// Bundle the game into a single self-contained HTML file.
// Usage: node tools/build_standalone.js [outfile] [--artifact]
//   default outfile: dist/toeic_quest.html (full standalone page)
//   --artifact: emit body-content only (no doctype/html/head/body) for hosts
//               that wrap the content in their own skeleton
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

var out = process.argv[2] || path.join(root, "dist", "toeic_quest.html");
var artifactMode = process.argv.includes("--artifact");

var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var css = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");

// body content without the external script/link tags
var body = html.match(/<body>([\s\S]*?)<script/)[1];

var scripts = [];
var re = /<script src="([^"]+)"><\/script>/g, m;
while ((m = re.exec(html))) {
  scripts.push('<script>\n' + fs.readFileSync(path.join(root, m[1]), "utf8") + "\n</script>");
}

var core =
  "<title>TOEIC QUEST - 英単語で魔王を倒せ</title>\n" +
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
