// 外部の学年別リストと、こちらの学年わけを突き合わせる。
//
//   node tools/check_reference.js            … 食い違いを一覧で出す
//   node tools/check_reference.js --emit     … tools/vocabsrc/jp-curriculum.csv を書き出す
//
// 使い方
//   1) tools/vocabsrc/ref/ に、学年ごとのページを保存する。
//      ファイル名で学年を決めるので、名前にこれらのどれかを含めること：
//        junior-high-1 / junior-high-2 / junior-high-3
//        high-school-1 / high-school-2 / high-school-3
//      （または 中1 / 中2 / 中3 / 高1 / 高2 / 高3）
//      HTML でもテキストでもよい。タグは落として英単語だけ拾う。
//   2) このスクリプトを走らせる。
//
// なぜ「取り込む」ではなく「突き合わせる」なのか
//   よその一覧をそのまま持ってきて配ると、編集著作物の複製になりうる。
//   こちらの割り当てが合っているかを確かめ、ずれているところだけ直すのが
//   参考のしかたとして妥当。--emit は、権利のうえで問題ないと確認できた
//   資料（公的機関が配布しているものなど）を使うときのための出口。
"use strict";
var fs = require("fs"), path = require("path");

var REF = path.join(__dirname, "vocabsrc", "ref");
var STAGE = [
  [/junior[-_ ]?high[-_ ]?1|中1|中学1/i, "g1", "中1"],
  [/junior[-_ ]?high[-_ ]?2|中2|中学2/i, "g2", "中2"],
  [/junior[-_ ]?high[-_ ]?3|中3|中学3/i, "g3", "中3"],
  [/high[-_ ]?school[-_ ]?1|高1|高校1/i, "lv1", "高1"],
  [/high[-_ ]?school[-_ ]?2|高2|高校2/i, "lv2", "高2"],
  [/high[-_ ]?school[-_ ]?3|高3|高校3/i, "lv3", "高3"]
];

if (!fs.existsSync(REF)) {
  console.error("\n" + REF + " がありません。");
  console.error("学年ごとのページを保存してから、もう一度実行してください。\n");
  console.error("例（Macで）:");
  console.error("  mkdir -p tools/vocabsrc/ref");
  console.error("  for g in junior-high-1 junior-high-2 junior-high-3; do");
  console.error("    curl -sSL \"https://tentan.jp/top/school/$g/\" -o \"tools/vocabsrc/ref/$g.html\"");
  console.error("  done\n");
  process.exit(1);
}

// ---- こちらの割り当てを読む ----
global.window = {};
require("../data/vocab_jhs.js");
require("../data/vocab_hs.js");
var J = window.VOCAB_JHS, H = window.VOCAB_HS;
var ours = {}, meaning = {};
[["g1", J.g1], ["g2", J.g2], ["g3", J.g3], ["lv1", H.lv1], ["lv2", H.lv2], ["lv3", H.lv3]]
  .forEach(function (p) {
    p[1].forEach(function (e) { ours[e.w.toLowerCase()] = p[0]; meaning[e.w.toLowerCase()] = e.m; });
  });
var NAME = { g1: "中1", g2: "中2", g3: "中3", lv1: "高1", lv2: "高2", lv3: "高3" };
var ORDER = ["g1", "g2", "g3", "lv1", "lv2", "lv3"];

// ---- 参考リストを読む ----
// HTMLからは、こちらが持っている語と一致するものだけを拾う。
// ページの飾り文字（"Copyright" など）を単語として取り込まないため。
function wordsIn(text) {
  var plain = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  var seen = {}, out = [];
  var re = /[A-Za-z][A-Za-z'’-]{1,}/g, m;
  while ((m = re.exec(plain))) {
    var w = m[0].toLowerCase().replace(/[’]/g, "'");
    if (seen[w] || !ours[w]) continue;     // こちらに無い語は拾わない
    seen[w] = 1; out.push(w);
  }
  return out;
}

var ref = {};                              // 単語 -> 参考リストでの段
var perFile = [];
fs.readdirSync(REF).forEach(function (f) {
  var hit = null;
  STAGE.forEach(function (s) { if (!hit && s[0].test(f)) hit = s; });
  if (!hit) { console.log("（学年が読み取れないので飛ばします: " + f + "）"); return; }
  var ws = wordsIn(fs.readFileSync(path.join(REF, f), "utf8"));
  perFile.push([f, hit[2], ws.length]);
  ws.forEach(function (w) {
    // 同じ語が複数の学年に出ていたら、やさしいほうを採る
    if (!ref[w] || ORDER.indexOf(hit[1]) < ORDER.indexOf(ref[w])) ref[w] = hit[1];
  });
});

console.log("\n=== 読み込んだ参考リスト ===");
perFile.forEach(function (p) { console.log("  " + p[1] + "　" + p[0] + "　" + p[2] + "語（こちらにもある語のみ）"); });

var keys = Object.keys(ref);
if (!keys.length) { console.error("\n語をひとつも拾えませんでした。保存したファイルの中身を確認してください。\n"); process.exit(1); }

// ---- 突き合わせ ----
var same = 0, diff = [];
keys.forEach(function (w) {
  if (ours[w] === ref[w]) same++;
  else diff.push({ w: w, ours: ours[w], ref: ref[w], m: meaning[w] });
});
console.log("\n=== 突き合わせ ===");
console.log("  照合できた語: " + keys.length);
console.log("  一致        : " + same + "（" + Math.round(same / keys.length * 100) + "%）");
console.log("  食い違い    : " + diff.length);

var by = {};
diff.forEach(function (d) {
  var k = NAME[d.ours] + " → " + NAME[d.ref];
  (by[k] = by[k] || []).push(d);
});
Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (k) {
  console.log("\n■ こちら " + k + "　" + by[k].length + "語");
  console.log("   " + by[k].slice(0, 40).map(function (d) { return d.w; }).join(" ") +
    (by[k].length > 40 ? " …" : ""));
});

if (process.argv.indexOf("--emit") >= 0) {
  var out = ["word,stage"];
  keys.forEach(function (w) { out.push(w + "," + ref[w]); });
  var f = path.join(__dirname, "vocabsrc", "jp-curriculum.csv");
  fs.writeFileSync(f, out.join("\n") + "\n");
  console.log("\n" + f + " に " + keys.length + "語を書き出しました。");
  console.log("次: node tools/split_vocab.js");
}
