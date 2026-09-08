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

// ---- CEFR-J による学年の振り直し（2026-09-08）----
// 以前は手作業の一覧（G1_CORE / G3_HINT / TO_HS）だけで学年を決めていた。
// 根拠が作った人の感覚しかなく、中学の段に高校レベルの語が混ざっていた。
// 東京外国語大学 投野研究室の CEFR-J Wordlist を根拠にして振り直す。
// 出典と利用条件は tools/vocabsrc/CEFRJ_SOURCE.md に書いてある。
//
//   A1    → 中1・中2      A2 → 中3
//   B1    → 高校1年       B2 → 高校2年      C1/C2 → 高校3年
//   未収録 → 判断できないので、元の段のまま置く
function readCsv(f) {
  var t = fs.readFileSync(path.join(SRC, f), "utf8").split("\n").slice(1);
  return t.filter(Boolean).map(function (l) {
    var c = [], cur = "", q = false;
    for (var i = 0; i < l.length; i++) {
      var ch = l[i];
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { c.push(cur); cur = ""; }
      else cur += ch;
    }
    c.push(cur); return c;
  });
}
var ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
var CEFR = {};
function noteLevel(word, lv) {
  var k = String(word).trim().toLowerCase();
  if (!k || ORDER.indexOf(lv) < 0) return;
  // 同じ語に複数のレベルが付いていたら、やさしいほうを採る
  if (!CEFR[k] || ORDER.indexOf(lv) < ORDER.indexOf(CEFR[k])) CEFR[k] = lv;
}
readCsv("cefrj-vocabulary-profile-1.5.csv").forEach(function (c) {
  String(c[0] || "").split("/").forEach(function (h) { noteLevel(h, String(c[2] || "").trim()); });
});
readCsv("octanove-vocabulary-profile-c1c2-1.0.csv").forEach(function (c) {
  noteLevel(c[0], String(c[2] || "C1").trim());
});

// ---- 日本の学校教育に準拠した語彙表があれば、そちらを優先する ----
// CEFR-J はヨーロッパの枠組みを日本向けに調整したもので、学習指導要領そのもの
// ではない。文法の配当を見ると差がはっきり出る（CEFR-J は不定詞・動名詞を
// A1.1＝中1相当に置くが、日本の教科書では中2。関係代名詞 which は B2.2＝高3
// 相当だが、日本では中3）。語彙も同じずれがあると考えるべき。
//
// 学習指導要領そのものは「中学で1600〜1800語程度」としか書いておらず、
// どの語を何年生で扱うかは各教科書会社が決めている。つまり公的な語単位の
// 一覧は存在しない。実務的な代わりになるのは、検定教科書を分析して作られた
// 公開資料（例：青森県教育委員会の中学校英単語集。全6社の教科書を分析、約1700語）。
//
// そのファイルを tools/vocabsrc/jp-curriculum.csv として置けば、こちらを使う。
//   形式: 1列目=単語, 2列目=段（g1 / g2 / g3 / lv1 / lv2 / lv3 のいずれか、
//         または 中1 / 中2 / 中3 / 高1 / 高2 / 高3）。1行目は見出しでもよい。
var JP = {};
var JP_FILE = path.join(SRC, "jp-curriculum.csv");
// 学年の書き方はいろいろありうるので、広めに受ける
var JP_STAGE = {};
[["g1", ["g1", "中1", "中一", "中学1", "中学1年", "中学一年", "1", "1年", "一年"]],
 ["g2", ["g2", "中2", "中二", "中学2", "中学2年", "中学二年", "2", "2年", "二年"]],
 ["g3", ["g3", "中3", "中三", "中学3", "中学3年", "中学三年", "3", "3年", "三年"]],
 ["lv1", ["lv1", "高1", "高一", "高校1", "高校1年", "高校基礎"]],
 ["lv2", ["lv2", "高2", "高二", "高校2", "高校2年", "大学入試"]],
 ["lv3", ["lv3", "高3", "高三", "高校3", "高校3年", "難関大"]]
].forEach(function (p2) { p2[1].forEach(function (k) { JP_STAGE[k] = p2[0]; }); });

if (fs.existsSync(JP_FILE)) {
  var rows = readCsv("jp-curriculum.csv");
  // 単語の列と学年の列がどこにあるか、中身を見て決める。
  // 見出し行や列の順番を気にせずに済むように
  var best = { w: 0, g: 1, n: -1 };
  for (var a = 0; a < 4; a++) {
    for (var b = 0; b < 4; b++) {
      if (a === b) continue;
      var n = 0;
      rows.forEach(function (c) {
        var w = String(c[a] || "").trim();
        var g = JP_STAGE[String(c[b] || "").trim()];
        if (g && /^[A-Za-z][A-Za-z' .-]*$/.test(w)) n++;
      });
      if (n > best.n) best = { w: a, g: b, n: n };
    }
  }
  rows.forEach(function (c) {
    var w = String(c[best.w] || "").trim().toLowerCase();
    var st = JP_STAGE[String(c[best.g] || "").trim()];
    if (w && st && /^[a-z][a-z' .-]*$/.test(w)) JP[w] = st;
  });
  console.log("日本の教科書準拠の一覧を使います: " + Object.keys(JP).length + "語" +
    "（" + (best.w + 1) + "列目=単語 / " + (best.g + 1) + "列目=学年 と読みました）");
} else {
  console.log("※ tools/vocabsrc/jp-curriculum.csv が無いので、CEFR-J を土台にします");
}

// ---- curriculum anchors: words that MUST land in 中1 (教科書冒頭の必修) ----
var G1_CORE = new Set(("a about after afternoon again all also always and animal answer any apple april arm around art as ask at august aunt autumn baby back bad bag ball banana bank baseball basketball bath be beautiful because become bed before begin behind between bicycle big bird birthday black blue boat body book box boy bread breakfast bridge bring brother brown build bus busy but buy by cake call camera can cap car card carry cat catch chair cheap child city class classroom clean climb clock close clothes cloudy club cold college color come computer cook cool country cup cut cute dance dark date daughter day december desk dictionary die different difficult dinner dish do doctor dog door draw dream drink drive during each ear early easy eat egg eight english enjoy enough evening every everyone everything eye face fall family famous far farm fast father favorite february feel few field find fine finish fire first fish floor flower fly food foot for forget free fresh friday friend from front fruit full fun game garden get girl give glad glass go good grandfather grandmother great green ground group grow hair hand happy hard hat have head hear heart heavy hello help here high hill history hobby hold holiday home homework hope horse hospital hot hotel hour house how hungry hurry idea if important in interesting into introduce island january japanese job join juice july jump june just keep key kind kitchen know lake language large last late learn leave left leg lesson letter library life light like line listen little live long look lose love low lunch make man many map march math may meet member milk minute monday money month moon more morning mother mountain mouth move movie much museum music must name near need never new news newspaper next night nice noon nose not november now number october of off often old on once only open or other out over page paint paper parent park part party pass pen pencil people picture place plan play please pool poor popular practice present pretty put question quiet rain read ready really red remember restaurant return rice rich ride right river road room run sad safe same saturday say school science sea season seat see sell send september show sick side sing sister sit sky sleep slow small smile snow so some son song soon sorry sound speak special sport spring stand star start station stay stop store story street strong student study summer sun sunday sure swim table take talk tall teach teacher team tell tennis test than thank there thing think thursday ticket time today together tomorrow tonight too town train travel tree trip try tuesday turn uncle under understand use useful vacation vegetable very village visit voice wait walk wall want warm wash watch water way weather wednesday week weekend welcome well what when where which white who why wind window winter with without woman word work world write wrong year yellow yesterday young").split(" "));

// ---- words that belong to 中3/入試 (abstract, exam-oriented) ----
var G3_HINT = new Set(("ability abroad absent accept according achieve action active activity actually add address adult advantage advice affect agriculture aim allow ancient announce apologize appear appreciate area argue arrange article attack attend attention attract audience author average avoid aware balance basic behavior belief benefit blind bother brain breath breathe brief broad burn cancer capital cause celebrate century certain challenge character charge charity chemical chief citizen claim climate comment common communicate communication community company compare compete complain complete condition confidence confuse connect consider contact contain continue contribute control convenient conversation cooperate correct courage create creature crime crop crowd cultural cure curious custom customer damage deal death debate decision decrease degree delay demand describe design destroy detail develop device difference direct direction disagree disappear disappoint disaster discover discovery discuss disease distance divide document double doubt duty eager earn earthquake economy educate education effect effort elect electric electricity emergency emotion encourage energy engineer environment equal equipment escape evidence exact examine excellent except exchange exercise exist expect experiment expert explain explore express expression extra fail fair familiar fashion fault fear feature female figure final fit fix flat flood focus forecast forever forgive form fortunately forward found freedom frequently fuel function gain general generation gesture global goods government grade gradually graduate greenhouse guard guide habit handle harm harmful harvest heat height hire honest honor huge humor identify ignore illness image imagine immediately impact import impossible impress improve include income increase indeed independent individual industry influence injure injury insect insist instance instrument intelligent intend interview invent invention involve issue judge justice knowledge labor lack law lead leader legal leisure lend level license likely limit literature local locate lonely maintain major male manage manner marine material mayor meaning means measure medical mental mention method military mineral modern moment movement narrow nation native natural negative neighbor nervous network normal novel nuclear obey observe obvious occur offer official operate opportunity opposite ordinary organization organize origin original otherwise overcome oxygen pain particular passage passenger patient pattern peaceful perform performance perhaps period permit personal persuade physical planet pleasant pleasure poem poison policy polite political pollution population position positive possible poverty power powerful practical praise predict prefer prepare presentation preserve pressure prevent previous primary print prison private process produce product production professional profit progress promote proper propose protection prove provide publish punish purchase pure purpose quality quantity quarter quit range rapid rare rate rather react realize recent recognize recommend record recover recycle reduce refer reflect refuse regard region regret regular reject relate relationship relative relax release religion rely remain remind remove repair replace reply represent require rescue research reserve resource respect respond response responsible retire reveal review reward risk role rough route rule sacred satisfy scale scene schedule scientific score search secret section secure seek select sense sensitive separate series serious service settle shortage sight signal silence similar situation skill social society solar solution solve source species specific spirit spread standard statement strategy strength stress strict structure struggle succeed success successful sudden suddenly suffer sufficient suggest suitable supply suppose surface surround survey survive suspect symbol system talent target task tax technique technology temperature tend term terrible therefore thought threat thus tiny tool topic total trade tradition translate transport treat treatment trend trust truth typical unique unit universe university unless unusual upset urban valuable value variety various vary vehicle victim view violence vision vote wage wealth weapon weigh weight welfare whether willing wisdom wise witness wonder worse worst worth wound youth").split(" "));

// ---- 中学から高校へ移す語（2026-09-08）----
// もとは「抽象的っぽい語は中3」という手作業の仕分けだけで決めていたため、
// 実際の中学教科書には出てこない語が中3に大量に混ざっていた（obvious など）。
// 一語ずつ見直し、英検準2級〜2級相当のものをここに集めて高校lv1へ移す。
// 中学の総語数は学習指導要領の 1600〜1800語 に収める。
var TO_HS = new Set(("ought according achieve afterward agriculture ancient appreciate arrange aside atmosphere aware behavior belief bitter bow brief broad bury calm capital ceiling charity chief citizen claim clerk client clue coal cooperate cultural cure custom customer dawn debate decrease degree delay demand desire detail device document dozen draft duty eager economy elder elderly elect emotion equipment essay etc evidence exact examine expert explore fabric faith fasten fault fee female fortunately frame frequently fuel function gain gesture goods gradually grain grateful greenhouse grocery guard harvest hire honor horizon humor identify ignore illness immediately impact income indeed individual industry influence insist instance intelligent intend involve issue justice labor lack latest lean lecture legal leisure license likely liquid literature locate maintain major male manner manufacture marine mass mayor means mental mention method military mineral moreover muscle narrow native negative nod novel nuclear obey observe obvious occur official opportunity orbit ordinary organic origin otherwise overcome oxygen pale panel particular passage peak per permit persuade phrase physical pity plenty poet policy political poverty powder practical predict pregnant preserve previous priest primary principal prison private process professional professor profit progress promote proper propose prove publish punish purchase pure qualify quantity quarter range rapid rare rate raw react recall receipt recent refer reflect refuse regard region regular reject relative religion rely represent require reserve resource respond response responsible retire reveal reward rid role rough route rude ruin sacred satisfy scale schedule scientific section secure seek sensitive series servant settle shallow shelter shortage slave slight soil solar solid sore soul source spare species specific spirit statue steel strategy stream strength strict strike structure struggle sufficient suitable supply suppose surround survey suspect symbol talent tax technique temporary tend tender term threat thus tidy tight tribe trial unable unique unless unusual upset urban urgent vary vehicle victim violence vision wage wealth welfare whisper willing wisdom witness wound youth zone").split(" "));

// ---- 文法の土台になる語（2026-09-08 追加）----
// もとにした語彙リストは内容語だけで作られており、代名詞・be動詞の活用・
// 助動詞の一部・関係詞などが1語も入っていなかった。文法を学ぶ順番と
// 結びつく語なので、学年を指定して入れる。
// 学年は、検定教科書で一般的な文法の配当（中1=be動詞・代名詞・過去形、
// 中2=受け身・助動詞・不定詞、中3=現在完了・関係代名詞・仮定法）に合わせた。
// 教科書会社によって前後するので、あくまで目安。
//
// be動詞と do の活用（am/is/are/was/were/been/being, does/did/done）は入れない。
// 「is ＝ です」を4択で当てても学習にならないため。同じ理由で have/get の活用
// （has/had/got）も外してある。文法の説明で必要になる語ではあるが、
// 意味を当てるクイズの出題語としては向かない。
var EXTRA = [
  ["I","私は","pron","g1"],["my","私の","pron","g1"],["me","私を","pron","g1"],["mine","私のもの","pron","g1"],
  ["you","あなた（たち）は","pron","g1"],["your","あなたの","pron","g1"],["yours","あなたのもの","pron","g1"],
  ["he","彼は","pron","g1"],["his","彼の・彼のもの","pron","g1"],["him","彼を","pron","g1"],
  ["she","彼女は","pron","g1"],["her","彼女の・彼女を","pron","g1"],["hers","彼女のもの","pron","g1"],
  ["it","それは","pron","g1"],["its","それの","pron","g1"],
  ["we","私たちは","pron","g1"],["our","私たちの","pron","g1"],["us","私たちを","pron","g1"],["ours","私たちのもの","pron","g1"],
  ["they","彼らは","pron","g1"],["their","彼らの","pron","g1"],["them","彼らを","pron","g1"],["theirs","彼らのもの","pron","g1"],
  ["this","これ・この","pron","g1"],["that","あれ・その／〜ということ","pron","g1"],
  ["these","これら・これらの","pron","g1"],["those","あれら・あれらの","pron","g1"],
  
  
  
  ["whose","誰の","pron","g1"],["not","〜でない","adv","g1"],
  ["myself","私自身","pron","g2"],["yourself","あなた自身","pron","g2"],["yourselves","あなたたち自身","pron","g2"],
  ["himself","彼自身","pron","g2"],["herself","彼女自身","pron","g2"],["itself","それ自体","pron","g2"],
  ["ourselves","私たち自身","pron","g2"],["themselves","彼ら自身","pron","g2"],
  ["somebody","誰か","pron","g2"],["anybody","誰か・誰でも","pron","g2"],
  ["everybody","みんな","pron","g2"],["nobody","誰も〜ない","pron","g2"],
  ["could","〜できた・〜していただけますか","v","g2"],["used","（used to で）以前は〜だった","v","g2"],
  
  ["slowly","ゆっくりと","adv","g2"],["quickly","すばやく","adv","g2"],["carefully","注意深く","adv","g2"],
  ["easily","簡単に","adv","g2"],["happily","幸せに","adv","g2"],["quietly","静かに","adv","g2"],["loudly","大声で","adv","g2"],
  ["somewhere","どこかに","adv","g2"],["everywhere","どこでも","adv","g2"],["nowhere","どこにも〜ない","adv","g2"],
  ["besides","そのうえ","adv","g2"],["anyway","とにかく","adv","g2"],
  ["onto","〜の上へ","prep","g2"],["within","〜以内に","prep","g2"],
  
  
  ["whom","誰を（関係代名詞の目的格）","pron","g3"],["might","〜かもしれない","v","g3"],
  ["none","ひとつも〜ない","pron","g3"],["rarely","めったに〜ない","adv","g3"],
  ["clearly","はっきりと","adv","g3"],["simply","単に","adv","g3"],["truly","本当に","adv","g3"]
].map(function (a) { return { w: a[0], m: a[1], p: a[2], g: a[3] }; });


var basic = load("jhs1.txt"), extra = load("jhs2.txt");
basic.forEach(function (e) { e.__src = 1; });   // 基本
extra.forEach(function (e) { e.__src = 2; });   // 発展
var jhsAll = basic.concat(extra);
// dedupe (first wins)
var seen = {}, jhs = [];
jhsAll.forEach(function (e) { var k = e.w.toLowerCase(); if (!seen[k]) { seen[k] = 1; jhs.push(e); } });

// 学年の決め方
//   中1 … 教科書の冒頭に必ず出てくる語（G1_CORE）
//   中3 … 発展語彙（出典 jhs2）＋ G3_HINT。高校へ送った分は除く
//   中2 … その残り（基本語彙 jhs1 のうち中1に入らなかったもの）
// 以前は中3を G3_HINT という手作業の一覧「だけ」で決めていた。それだと中3が
// 抽象語の精鋭ばかりになり、かえって難しくなる。出典の区分も併せて使い、
// 中3にふつうの語も混ざるようにしてある。
// なお発展側(jhs2)には add / area / bake のような易しい語も混ざっているので、
// 出典だけを信じるのも正しくない。ここは人の目で見直す余地が残っている。
var g1 = [], g2 = [], g3 = [], toHs = [];
jhs.forEach(function (e) {
  var k = e.w.toLowerCase();
  if (TO_HS.has(k)) { toHs.push(e); return; }        // 高校へ送る
  if (G1_CORE.has(k)) { g1.push(e); return; }
  if (e.__src === 2 || G3_HINT.has(k)) { g3.push(e); return; }
  g2.push(e);
});
[g1, g2, g3, toHs].forEach(function (l) { l.forEach(function (e) { delete e.__src; }); });

// 文法の土台になる語を、指定した学年に入れる（すでに入っていれば飛ばす）
var have = {}; [g1, g2, g3, toHs].forEach(function (l) { l.forEach(function (e) { have[e.w.toLowerCase()] = 1; }); });
var bucket = { g1: g1, g2: g2, g3: g3 };
EXTRA.forEach(function (e) {
  if (have[e.w.toLowerCase()]) return;
  bucket[e.g].push({ w: e.w, m: e.m, p: e.p });
  have[e.w.toLowerCase()] = 1;
});
// 見出し語の並びをそろえる（元データはアルファベット順）
[g1, g2, g3].forEach(function (l) {
  l.sort(function (a, b) { return a.w.toLowerCase() < b.w.toLowerCase() ? -1 : a.w.toLowerCase() > b.w.toLowerCase() ? 1 : 0; });
});

// 語数合わせはしない。
// 以前は「文字数が短い＝やさしい」として中2から中1へ語を移していたが、
// 英語の難しさは文字数では決まらない（etc / per / raw / rid / nod が中1に
// 入っていた）。学年は G1_CORE と G3_HINT の仕分けだけで決め、
// 何語になったかはそのまま出す。

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
var lv1 = toHs.concat(hsStd.slice(0, half)).concat(idiom.slice(0, idiomHalf));
var lv2 = hsStd.slice(half).concat(idiom.slice(idiomHalf));
var lv3 = hsAdv;

// ---- ここまでで作った6つの段を、CEFR-J のレベルで振り直す ----
var STAGE = { g1: g1, g2: g2, g3: g3, lv1: lv1, lv2: lv2, lv3: lv3 };
var byLevel = { A1: null, A2: "g3", B1: "lv1", B2: "lv2", C1: "lv3", C2: "lv3" };
var g1Want = {};
G1_CORE.forEach(function (w) { g1Want[w] = 1; });
EXTRA.forEach(function (e) { if (e.g === "g1") g1Want[e.w.toLowerCase()] = 1; });

var moved = 0, unknown = 0;
Object.keys(STAGE).forEach(function (from) {
  var keep = [];
  STAGE[from].forEach(function (e) {
    var k = e.w.toLowerCase();
    if (JP[k]) {                                           // 教科書準拠の一覧が最優先
      if (JP[k] === from) { keep.push(e); return; }
      STAGE[JP[k]].push(e); moved++; return;
    }
    var lv = CEFR[k];
    if (!lv) { unknown++; keep.push(e); return; }          // どちらにも無い語は動かさない
    var to = byLevel[lv];
    if (to === null) to = g1Want[e.w.toLowerCase()] ? "g1" : "g2";   // A1 は中1と中2に分ける
    if (to === from) { keep.push(e); return; }
    STAGE[to].push(e); moved++;
  });
  STAGE[from].length = 0;
  keep.forEach(function (e) { STAGE[from].push(e); });
});
[g1, g2, g3, lv1, lv2, lv3].forEach(function (l) {
  l.sort(function (a, b) {
    var x = a.w.toLowerCase(), y = b.w.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
});
console.log("CEFR-J で振り直した語: " + moved + "　／　表に無くて動かさなかった語: " + unknown);

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
