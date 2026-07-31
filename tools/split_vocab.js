// Re-split the flat vocab sources into study stages:
//   中学: g1 / g2 / g3      (grade-based)
//   高校: lv1 / lv2 / lv3   (entrance-exam difficulty)
// Assignment is by CEFR-ish frequency tiers derived from the source ordering
// plus explicit curriculum anchors, so each stage is pedagogically coherent.
"use strict";
var fs = require("fs"), path = require("path");
var SRC = path.join(__dirname, "vocabsrc");

function load(f) {
  return fs.readFileSync(path.join(SRC, f), "utf8").split("\n")
    .map(function (l) { return l.trim(); }).filter(Boolean)
    .map(function (l) { var p = l.split("|"); return { w: p[0].trim(), m: p[1].trim(), p: p[2].trim() }; })
    .filter(function (e) { return /^[a-zA-Z][a-zA-Z' .-]*$/.test(e.w) && e.m && e.m !== "—"; });
}

// ---- curriculum anchors: words that MUST land in 中1 (教科書冒頭の必修) ----
var G1_CORE = new Set(("a about after afternoon again all also always and animal answer any apple april arm around art as ask at august aunt autumn baby back bad bag ball banana bank baseball basketball bath be beautiful because become bed before begin behind between bicycle big bird birthday black blue boat body book box boy bread breakfast bridge bring brother brown build bus busy but buy by cake call camera can cap car card carry cat catch chair cheap child city class classroom clean climb clock close clothes cloudy club cold college color come computer cook cool country cup cut cute dance dark date daughter day december desk dictionary die different difficult dinner dish do doctor dog door draw dream drink drive during each ear early easy eat egg eight english enjoy enough evening every everyone everything eye face fall family famous far farm fast father favorite february feel few field find fine finish fire first fish floor flower fly food foot for forget free fresh friday friend from front fruit full fun game garden get girl give glad glass go good grandfather grandmother great green ground group grow hair hand happy hard hat have head hear heart heavy hello help here high hill history hobby hold holiday home homework hope horse hospital hot hotel hour house how hungry hurry idea if important in interesting into introduce island january japanese job join juice july jump june just keep key kind kitchen know lake language large last late learn leave left leg lesson letter library life light like line listen little live long look lose love low lunch make man many map march math may meet member milk minute monday money month moon more morning mother mountain mouth move movie much museum music must name near need never new news newspaper next night nice noon nose not november now number october of off often old on once only open or other out over page paint paper parent park part party pass pen pencil people picture place plan play please pool poor popular practice present pretty put question quiet rain read ready really red remember restaurant return rice rich ride right river road room run sad safe same saturday say school science sea season seat see sell send september show sick side sing sister sit sky sleep slow small smile snow so some son song soon sorry sound speak special sport spring stand star start station stay stop store story street strong student study summer sun sunday sure swim table take talk tall teach teacher team tell tennis test than thank there thing think thursday ticket time today together tomorrow tonight too town train travel tree trip try tuesday turn uncle under understand use useful vacation vegetable very village visit voice wait walk wall want warm wash watch water way weather wednesday week weekend welcome well what when where which white who why wind window winter with without woman word work world write wrong year yellow yesterday young").split(" "));

// ---- words that belong to 中3/入試 (abstract, exam-oriented) ----
var G3_HINT = new Set(("ability abroad absent accept according achieve action active activity actually add address adult advantage advice affect agriculture aim allow ancient announce apologize appear appreciate area argue arrange article attack attend attention attract audience author average avoid aware balance basic behavior belief benefit blind bother brain breath breathe brief broad burn cancer capital cause celebrate century certain challenge character charge charity chemical chief citizen claim climate comment common communicate communication community company compare compete complain complete condition confidence confuse connect consider contact contain continue contribute control convenient conversation cooperate correct courage create creature crime crop crowd cultural cure curious custom customer damage deal death debate decision decrease degree delay demand describe design destroy detail develop device difference direct direction disagree disappear disappoint disaster discover discovery discuss disease distance divide document double doubt duty eager earn earthquake economy educate education effect effort elect electric electricity emergency emotion encourage energy engineer environment equal equipment escape evidence exact examine excellent except exchange exercise exist expect experiment expert explain explore express expression extra fail fair familiar fashion fault fear feature female figure final fit fix flat flood focus forecast forever forgive form fortunately forward found freedom frequently fuel function gain general generation gesture global goods government grade gradually graduate greenhouse guard guide habit handle harm harmful harvest heat height hire honest honor huge humor identify ignore illness image imagine immediately impact import impossible impress improve include income increase indeed independent individual industry influence injure injury insect insist instance instrument intelligent intend interview invent invention involve issue judge justice knowledge labor lack law lead leader legal leisure lend level license likely limit literature local locate lonely maintain major male manage manner marine material mayor meaning means measure medical mental mention method military mineral modern moment movement narrow nation native natural negative neighbor nervous network normal novel nuclear obey observe obvious occur offer official operate opportunity opposite ordinary organization organize origin original otherwise overcome oxygen pain particular passage passenger patient pattern peaceful perform performance perhaps period permit personal persuade physical planet pleasant pleasure poem poison policy polite political pollution population position positive possible poverty power powerful practical praise predict prefer prepare presentation preserve pressure prevent previous primary print prison private process produce product production professional profit progress promote proper propose protection prove provide publish punish purchase pure purpose quality quantity quarter quit range rapid rare rate rather react realize recent recognize recommend record recover recycle reduce refer reflect refuse regard region regret regular reject relate relationship relative relax release religion rely remain remind remove repair replace reply represent require rescue research reserve resource respect respond response responsible retire reveal review reward risk role rough route rule sacred satisfy scale scene schedule scientific score search secret section secure seek select sense sensitive separate series serious service settle shortage sight signal silence similar situation skill social society solar solution solve source species specific spirit spread standard statement strategy strength stress strict structure struggle succeed success successful sudden suddenly suffer sufficient suggest suitable supply suppose surface surround survey survive suspect symbol system talent target task tax technique technology temperature tend term terrible therefore thought threat thus tiny tool topic total trade tradition translate transport treat treatment trend trust truth typical unique unit universe university unless unusual upset urban valuable value variety various vary vehicle victim view violence vision vote wage wealth weapon weigh weight welfare whether willing wisdom wise witness wonder worse worst worth wound youth").split(" "));

var jhsAll = load("jhs1.txt").concat(load("jhs2.txt"));
// dedupe (first wins)
var seen = {}, jhs = [];
jhsAll.forEach(function (e) { var k = e.w.toLowerCase(); if (!seen[k]) { seen[k] = 1; jhs.push(e); } });

var g1 = [], g2 = [], g3 = [];
jhs.forEach(function (e) {
  var k = e.w.toLowerCase();
  if (G1_CORE.has(k)) g1.push(e);
  else if (G3_HINT.has(k)) g3.push(e);
  else g2.push(e);
});

// balance to the real curriculum shape: 中1 ~600 / 中2 ~600 / 中3 ~645
// (中1 is where textbooks front-load the most words, so top it up from g2's
//  easiest remainder rather than leaving it thin)
function moveEasiest(from, to, n) {
  from.sort(function (a, b) { return a.w.length - b.w.length; }); // shorter ≈ more basic
  for (var i = 0; i < n && from.length; i++) to.push(from.shift());
}
if (g1.length < 600) moveEasiest(g2, g1, 600 - g1.length);
function rebalance(from, to, n) { for (var i = 0; i < n && from.length; i++) to.push(from.pop()); }
if (g2.length > 600) rebalance(g2, g3, g2.length - 600);

// ---- high school: 3 exam levels ----
var hsStd = load("hs1.txt"), hsAdv = load("hs2.txt"), idiom = load("phrase.txt");
var jhsSet = {}; jhs.forEach(function (e) { jhsSet[e.w.toLowerCase()] = 1; });
function notJhs(l) { return l.filter(function (e) { return !jhsSet[e.w.toLowerCase()]; }); }
hsStd = notJhs(hsStd); hsAdv = notJhs(hsAdv); idiom = notJhs(idiom);
var seen2 = {};
function ded(l) { return l.filter(function (e) { var k = e.w.toLowerCase(); if (seen2[k]) return false; seen2[k] = 1; return true; }); }
hsStd = ded(hsStd); hsAdv = ded(hsAdv); idiom = ded(idiom);

// lv1 = 共通テスト基礎（hs1前半 + 熟語の基本）
// lv2 = 共通テスト〜中堅私大（hs1後半 + 熟語残り）
// lv3 = 難関大（hs2 全部）
var half = Math.ceil(hsStd.length / 2);
var idiomHalf = Math.ceil(idiom.length / 2);
var lv1 = hsStd.slice(0, half).concat(idiom.slice(0, idiomHalf));
var lv2 = hsStd.slice(half).concat(idiom.slice(idiomHalf));
var lv3 = hsAdv;

function emit(file, name, groups, header) {
  var s = header + "\nwindow." + name + " = window." + name + " || {};\n\n";
  groups.forEach(function (g) {
    s += "window." + name + "[" + JSON.stringify(g[0]) + "] = [\n" +
      g[1].map(function (e) { return JSON.stringify(e).replace(/"(\w)":/g, "$1:"); }).join(",\n") + "\n];\n\n";
  });
  s += "window." + name + ".all = [].concat(" + groups.map(function (g) { return "window." + name + "[" + JSON.stringify(g[0]) + "]"; }).join(", ") + ");\n";
  fs.writeFileSync(path.join(__dirname, "..", "data", file), s);
  console.log(file + ": " + groups.map(function (g) { return g[0] + "=" + g[1].length; }).join(", ") +
    "  計" + groups.reduce(function (n, g) { return n + g[1].length; }, 0));
}

emit("vocab_jhs.js", "VOCAB_JHS",
  [["g1", g1], ["g2", g2], ["g3", g3]],
  "// 中学英単語（学年別）— 学習指導要領: 中学で1600〜1800語\n// g1=中1 / g2=中2 / g3=中3・高校入試\n// 形式 {w:単語, m:意味, p:品詞}");

emit("vocab_hs.js", "VOCAB_HS",
  [["lv1", lv1], ["lv2", lv2], ["lv3", lv3]],
  "// 高校・大学入試英単語（難易度3段階）— 高校で1800〜2500語 / 受験総語彙4000〜5000語\n// lv1=共通テスト基礎 / lv2=共通テスト〜中堅私大 / lv3=難関大\n// 中学データ(VOCAB_JHS)と重複しないよう除外済み");
