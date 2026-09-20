#!/usr/bin/env node
// TOEIC6帯（data/vocab_400〜900.js）を、最初から作り直す。
// tools/rebalance_toeic_bands.js → tools/add_toeic_words.js の後始末。
// 2つに分けてやった結果、「元からあった語」と「今夜足した語」の区別が
// data/vocab_*.js の中に残らなくなり、見積もり方法を直しても再現できなく
// なっていた。ここでは、その2つを別々の場所から毎回読み直す。
//
//   古い語（1,907語）: tools/rebalance_snapshot/vocab_*.js
//     2026-09-07未明、重複除去（rebalance_toeic_bands.js）の直前の状態。
//     「元々どの帯にあったか」という一次情報はここにしか残っていない
//   新しい語（1,120語）: tools/toeic_word_candidates/*.js
//     今夜、分野ごとに追加候補として書いたもの
//
// 新しい語の帯は見積もるしかない。見積もり方：
//   1) 中学・高校の語彙リストにあれば、そこから決める（強い手がかり）
//   2) 無ければ、
//        a) その語が どの分野の候補ファイルから来たか（ファイルごとに
//           おおよその難易度を決めてある。日常語のファイルは易しく、
//           法務文書のファイルは難しく、など）
//        b) 語（複合語なら、いちばん長い＝いちばん難しそうな構成語）の長さ
//      の重み付き平均。
//   3) 複合語・句は、構成語の「合計の長さ」ではなく「いちばん長い1語」で
//      測る。総文字数で測ると、易しい語を2つ3つ繋げただけの複合名詞
//      （conference room・target audience 等）が、単語の長さのせいで
//      実際より難しく判定されてしまっていた（900点台の34%が複合語・句に
//      なり、しかもその多くが基礎語という形で表面化した）。
//   4) 複合語のうち、
//        名詞・形容詞の複合語（conference + room）は構成語の意味を
//          そのまま足すだけで分かることが多いので、少しやさしい側へ
//        熟語・慣用句（on the verge of＝間際で、等）は構成語が易しくても
//          意味は語からは推測できないので、やさしい側へは寄せない。
//          3語以上の前置詞句は、むしろ難しい側へ寄せる
//
// 実行：
//   node tools/build_toeic_bands.js --check   # 書き出さず、結果だけ表示
//   node tools/build_toeic_bands.js           # 書き出す
"use strict";
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var OLD_DIR = path.join(__dirname, "rebalance_snapshot");
var NEW_DIR = path.join(__dirname, "toeic_word_candidates");
var DATA = path.join(root, "data");
var BANDS = ["400", "500", "600", "700", "800", "900"];
var CHECK = process.argv.includes("--check");

function loadIn(file, dir) {
  var sandbox = { window: { VOCAB: {}, VOCAB_JHS: {}, VOCAB_HS: {}, NEW: [] } };
  var code = fs.readFileSync(path.join(dir, file), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("window", code)(sandbox.window);
  return sandbox.window;
}

// ---- 中学・高校の語彙（見積もりに使う）----
var jhsWin = loadIn("vocab_jhs.js", DATA);
var hsWin = loadIn("vocab_hs.js", DATA);
var JHS_ORDER = ["g1", "g2", "g3"];
var HS_ORDER = ["lv1", "lv2", "lv3"];
var jhsTier = {}, hsTier = {};
JHS_ORDER.forEach(function (k, i) {
  (jhsWin.VOCAB_JHS[k] || []).forEach(function (e) { if (jhsTier[e.w] === undefined) jhsTier[e.w] = i; });
});
HS_ORDER.forEach(function (k, i) {
  (hsWin.VOCAB_HS[k] || []).forEach(function (e) { if (hsTier[e.w] === undefined) hsTier[e.w] = i; });
});

// ---- 古い語：重複除去前のスナップショットから、元々の最小帯を取る ----
var entries = {};
BANDS.forEach(function (b, bi) {
  loadIn("vocab_" + b + ".js", OLD_DIR).VOCAB[b].forEach(function (e, pos) {
    if (!entries[e.w]) entries[e.w] = { w: e.w, m: e.m, p: e.p, band: bi, pos: pos, isNew: false };
  });
});
var oldCount = Object.keys(entries).length;

// ---- 新しい語：ファイルごとの難易度の目安（0=易しい 〜 5=難しい）----
// 分野の性格で決めている。個々の語まで見積もりきれないので、これが
// いちばん強い手がかりになる
var FILE_HINT = {
  "new_words_01_office.js": 1.5,
  "new_words_02_finance.js": 2.5,
  "new_words_03_sales_marketing.js": 2.0,
  "new_words_04_logistics_manufacturing.js": 2.0,
  "new_words_05_travel_dining.js": 1.0,
  "new_words_06_facilities_realestate.js": 2.0,
  "new_words_07_it_tech.js": 1.5,
  "new_words_08_health.js": 1.5,
  "new_words_09_connectors_adjadv.js": 3.5,
  "new_words_10_general_verbs.js": 3.0,
  "new_words_11_everyday.js": 0.5,
  "new_words_12_phrasal.js": 2.0,
  "new_words_13_education_community.js": 2.0,
  "new_words_14_arts_environment.js": 2.0,
  "new_words_15_people_traits.js": 3.0,
  "new_words_16_project_negotiation.js": 3.5,
  "new_words_17_communication_misc.js": 1.5,
  "new_words_18_retail_banking.js": 1.5,
  "new_words_19_leisure_transport.js": 0.5,
  "new_words_20_advanced_business.js": 4.0,
  "new_words_21_more_everyday.js": 0.5,
  "new_words_22_fill_gap.js": 3.0,
  "new_words_23_final.js": 3.5,
  "new_words_24_last_push.js": 1.5,
  "new_words_25_buffer.js": 3.0,
  "new_words_26_replacements.js": 1.5
};

var candFiles = fs.readdirSync(NEW_DIR).filter(function (f) { return /\.js$/.test(f); }).sort();
var added = 0, skippedDup = 0;
candFiles.forEach(function (f) {
  var hint = FILE_HINT[f];
  if (hint === undefined) { console.error("! ファイルの難易度が未設定: " + f); process.exit(1); }
  loadIn(f, NEW_DIR).NEW.forEach(function (e) {
    if (!e || !e.w) return;
    if (entries[e.w]) { skippedDup++; return; }
    entries[e.w] = { w: e.w, m: e.m, p: e.p, isNew: true, hint: hint };
    added++;
  });
});

// ---- 英語をそのままカタカナにしただけの訳を直す（2026-09-08）----
// documentary の訳が「ドキュメンタリー」になっていた。これでは音が同じなので、
// 語を知らなくても選択肢から音で当てられてしまい、問題として成立しない。
// 訳がカタカナだけの語を全部見直したところ76語あり、次の3つに分かれた。
//   1) そのままでよい … 訳が英語と別の語（brochure→パンフレット、
//      questionnaire→アンケート、windshield→フロントガラス など）。
//      和製英語との違いを覚えられるので、むしろ学習になる
//   2) 訳を直せば残せる … 自然な日本語がある語。それがこの表
//   3) 外すしかない … カタカナ以外に日本語が無い語。下の DROP
var MEANING_FIX = {
  "coach": "指導する", "network": "人脈", "drill": "反復練習", "bench": "長椅子",
  "booth": "仕切り席", "buffet": "立食形式の食事", "resort": "行楽地",
  "server": "給仕係", "backup": "予備", "parade": "行進", "suitcase": "旅行かばん",
  "teammate": "同じ組の仲間", "counter": "受付台", "curriculum": "教育課程",
  "slogan": "標語", "campus": "大学の構内", "scanner": "読み取り機",
  "headset": "通話用の受話器", "allergy": "過敏症", "catering": "仕出し",
  "hardware": "機器本体", "password": "合言葉", "firewall": "防火壁",
  "platform": "演壇", "ensemble": "合奏", "pamphlet": "小冊子",
  "flextime": "自由勤務時間制", "projector": "映写機", "briefcase": "書類かばん",
  "rehearsal": "下稽古", "tournament": "勝ち抜き戦", "version": "版",
  "terminal": "終着駅", "orchestra": "管弦楽団", "soundtrack": "映画音楽",
  "letterhead": "社名入りの便箋", "documentary": "記録映画", "announcement": "告知",
  "elevator": "昇降機", "lobby": "玄関広間", "hose": "水を通す管",
  "malware": "不正プログラム", "intercom": "室内通話装置", "container": "容器",
  "check-in": "宿泊手続き", "check-out": "精算して退室すること",
  "help desk": "相談窓口", "rental car": "貸自動車", "shuttle bus": "送迎バス",
  "hybrid work": "在宅と出社の併用", "supply chain": "供給網",
  "room service": "客室への配膳", "cloud storage": "オンラインの保管庫",
  "receipt printer": "領収書の印刷機", "gantt chart": "工程表",
  "late checkout": "延長して退室すること", "co-working space": "共用の仕事場",
  "percentage point": "百分率の差", "printer cartridge": "印刷機のインク容器",
  "orientation session": "新人向けの説明会"
};
// カタカナ以外に日本語が無く、訳を直しようがない語。同じ帯の語で置き換える
var DROP = new Set(["logo", "login", "balcony", "wrench", "barcode", "software", "database"]);

// カタカナに置き換えただけの訳を直す／直しようがない語を外す
var fixedN = 0, droppedN = 0;
Object.keys(entries).forEach(function (w) {
  if (DROP.has(w)) { delete entries[w]; droppedN++; return; }
  if (MEANING_FIX[w] && entries[w].m !== MEANING_FIX[w]) { entries[w].m = MEANING_FIX[w]; fixedN++; }
});
// 表に書いたのに1つも当たらない行は、語が消えたか綴りを間違えている。黙って
// 効かないままだと気づけないので知らせる
Object.keys(MEANING_FIX).forEach(function (w) {
  if (!entries[w]) console.error("! 訳の手直し表に、存在しない語があります: " + w);
});
console.log("古い語（元の帯が分かる）: " + oldCount);
console.log("新しい語の候補: " + candFiles.length + "ファイル → 採用 " + added + "  重複のため除外 " + skippedDup);
console.log("カタカナ訳の手直し: 訳を直した " + fixedN + "語 ／ 外した " + droppedN + "語");
console.log("合計: " + Object.keys(entries).length);
console.log("");

function tokensOf(w) { return w.split(/[\s-]+/).filter(Boolean); }

// ---- 新しい語の帯を見積もる ----
function estimateBand(e) {
  var jt = jhsTier[e.w], ht = hsTier[e.w];
  if (jt !== undefined) return jt * 0.7;             // 中学語彙 → 低め
  if (ht !== undefined) return 2 + ht * 1.0;          // 高校語彙 → 中〜高め

  var toks = tokensOf(e.w);
  var maxTok = 0;
  toks.forEach(function (t) { if (t.length > maxTok) maxTok = t.length; });
  var lenEst = Math.min(5, Math.max(0, (maxTok - 3) / 2.3));

  if (toks.length >= 2) {
    if (e.p === "n" || e.p === "adj") lenEst -= 0.6;         // 複合名詞・複合形容詞 → やや易しい側
    else if (e.p === "v") lenEst -= 0.3;                      // 動詞+目的語 → 少し易しい側
    else if (e.p === "phr") lenEst += (toks.length >= 3 ? 1.3 : 0.4); // 熟語・慣用句 → 易しい側には寄せない
  }

  // 語の長さからの見積もりと、分野の目安を半々で混ぜる
  return Math.min(5, Math.max(0, lenEst * 0.5 + e.hint * 0.5));
}

// ---- 手直し（利用者からの個別指摘。自動見積もりより優先する）----
// 950点取得者の実感で「900点台にしては易しい」と指摘された語。
// 自動見積もりをまた直しても、ここは上書きされずに残る
var MANUAL_BAND = {
  "accountability": 3, "alternatively": 3, "blueprint": 3, "capitalize": 3,
  "comparatively": 3, "in the event of": 3,
  "across the board": 4, "amend": 4, "apprise": 4, "artifact": 4, "avert": 4,
  "brisk": 4, "collectively": 4, "correspondent": 4, "differentiate": 4,
  "exempt": 4, "flawless": 4, "instrumental": 4, "periodical": 4,
  "whereby": 4, "withhold": 4,
  // errata: 950点取得者でも知らないレアな語。短いので語長からの
  // 自動見積もりでは軽く見られてしまう（一度500→600と直したが、
  // それでもまだ易しく見えすぎていた）
  "errata": 5,

  "overrule": 5, "plummet": 5, "prevalent": 5, "scaffolding": 5,
  "solvent": 5, "stipend": 5, "amicable": 5, "congenial": 5,
  "sturdy": 4, "traction": 4, "abide by": 4, "demote": 4, "incubate": 4
};

var list = Object.keys(entries).map(function (w) { return entries[w]; });
list.forEach(function (e) {
  var jt = jhsTier[e.w], ht = hsTier[e.w];
  e.eduTier = jt !== undefined ? jt : (ht !== undefined ? 3 + ht : 6);
  if (e.band === undefined) e.band = Math.round(estimateBand(e));
  if (MANUAL_BAND[e.w] !== undefined) e.band = MANUAL_BAND[e.w];
  e.band = Math.min(5, Math.max(0, e.band));
  e.score = e.band * 100000 + e.eduTier * 1000 + e.w.length * 10 + Math.min(e.pos || 0, 9);
});
list.sort(function (a, b) { return a.score - b.score; });

var n = list.length;
var per = Math.floor(n / BANDS.length);
var rem = n % BANDS.length;
var out = {}, idx = 0;
BANDS.forEach(function (b, i) {
  var take = per + (i < rem ? 1 : 0);
  out[b] = list.slice(idx, idx + take);
  idx += take;
});

// 全体を順位で切っているだけなので、MANUAL_BAND で下げた語が、
// 全体の並びの都合で狙った帯に入りきらないことがある（他の語との
// 相対順位で境界をまたいでしまう）。手直しした語だけは、最後に
// 確実に指定の帯へ移す
Object.keys(MANUAL_BAND).forEach(function (w) {
  var targetBand = BANDS[MANUAL_BAND[w]];
  BANDS.forEach(function (b) {
    if (b === targetBand) return;
    var i = out[b].findIndex(function (e) { return e.w === w; });
    if (i >= 0) out[targetBand].push(out[b].splice(i, 1)[0]);
  });
});

// ---- 熟語（phr）で「似た語が並びすぎている」ものを間引き、
// 各帯をちょうど500語に揃える ----
// 例：「turn on／switch on」のように訳がほぼ同じ組が2つある、
// 「in ___」型の前置詞句が同じ帯に何本も並ぶ、など。似た語が
// 並びすぎている分は、6帯を500語ずつに揃えるために間引く分（27語）
// の中で、いちばん重複感の強いものから優先して削る
var TARGET_PER_BAND = 500;
function keyOf(e) { return (e.isNew ? 1000 : 0) + e.w.length; } // 新しい語・長い語ほど大きい値
var pinnedWords = new Set(Object.keys(MANUAL_BAND));
function isPinned(e) { return pinnedWords.has(e.w); }
var totalNow = 0;
BANDS.forEach(function (b) { totalNow += out[b].length; });
var totalBudget = Math.max(0, totalNow - TARGET_PER_BAND * BANDS.length);

var cutSet = new Set();

// ① 訳がまったく同じ熟語の組（帯の中で）は、いちばん基本的な1つだけ残す。
// これは削っても情報が失われないので、予算に関係なく必ず間引く。
// 手直しで固定した語（MANUAL_BAND）は対象から外す
BANDS.forEach(function (b) {
  var byMeaning = {};
  out[b].forEach(function (e) { if (e.p === "phr" && !isPinned(e)) (byMeaning[e.m] = byMeaning[e.m] || []).push(e); });
  Object.keys(byMeaning).forEach(function (m) {
    var g = byMeaning[m];
    if (g.length < 2) return;
    g.sort(function (a, c) { return keyOf(a) - keyOf(c); });
    g.slice(1).forEach(function (e) { cutSet.add(e); });
  });
});

// ② 同じ語で始まる熟語の集まりのうち、いちばん大きい集まりから順に、
// 基本的な2つを残して間引く。①だけでは予算（27語）に届かないので、
// 「集まりが大きい＝似た語が並びすぎている度合いが強い」ものを優先する
var remainingBudget = totalBudget - cutSet.size;
if (remainingBudget > 0) {
  var candidates = [];
  BANDS.forEach(function (b) {
    var byRoot = {};
    out[b].forEach(function (e) {
      if (e.p !== "phr" || cutSet.has(e) || isPinned(e)) return;
      var r = e.w.split(/\s+/)[0];
      (byRoot[r] = byRoot[r] || []).push(e);
    });
    Object.keys(byRoot).forEach(function (r) {
      var g = byRoot[r];
      if (g.length <= 2) return;
      g.sort(function (a, c) { return keyOf(a) - keyOf(c); });
      g.slice(2).forEach(function (e) { candidates.push({ e: e, familySize: g.length }); });
    });
  });
  candidates.sort(function (a, b2) {
    if (b2.familySize !== a.familySize) return b2.familySize - a.familySize;
    return keyOf(b2.e) - keyOf(a.e);
  });
  candidates.slice(0, remainingBudget).forEach(function (c) { cutSet.add(c.e); });
}

BANDS.forEach(function (b) { out[b] = out[b].filter(function (e) { return !cutSet.has(e); }); });

// 間引いた結果は6帯合わせてちょうど3000語になるが、間引きが均等には
// 起きないので帯ごとの語数はまだ500からずれている。MANUAL_BAND で固定
// した語はそのまま残し、それ以外の語を全帯まとめてスコア順に並べ直し、
// 各帯の残り枠（500 − 固定語数）に詰め直すことで、ちょうど500語ずつに揃える
var pinnedByBand = {}, flexible = [];
BANDS.forEach(function (b) {
  pinnedByBand[b] = out[b].filter(isPinned);
  out[b].forEach(function (e) { if (!isPinned(e)) flexible.push(e); });
});
flexible.sort(function (a, b2) { return a.score - b2.score; });
var fi = 0;
BANDS.forEach(function (b) {
  var slots = TARGET_PER_BAND - pinnedByBand[b].length;
  out[b] = pinnedByBand[b].concat(flexible.slice(fi, fi + slots));
  fi += slots;
});

console.log("削減した重複気味の熟語: " + cutSet.size + "語（合計 " + totalNow + " → " + (totalNow - cutSet.size) + "）");

BANDS.forEach(function (b) {
  var slice = out[b];
  var newInSlice = slice.filter(function (e) { return e.isNew; }).length;
  var multi = slice.filter(function (e) { return e.w.indexOf(" ") >= 0 || e.w.indexOf("-") >= 0; }).length;
  console.log(b + "点台  " + slice.length + "語  （新規 " + newInSlice + "語 ／ 複合語・句 " + multi + "語）");
});

if (CHECK) { console.log("\n--check のため書き出しはしていません。"); process.exit(0); }

BANDS.forEach(function (b) {
  var slice = out[b];
  var lines = slice.map(function (e) {
    return "{w:" + JSON.stringify(e.w) + ",m:" + JSON.stringify(e.m) + ",p:" + JSON.stringify(e.p) + "}";
  });
  var body =
    "// TOEIC " + b + " level vocabulary (" + slice.length + " words)\n" +
    "// 2026-09-07 に作り直した（tools/build_toeic_bands.js）。\n" +
    "// 出題は重み付き抽選で選ぶので、このリストの並び順は結果に影響しない。\n" +
    "window.VOCAB = window.VOCAB || {};\n" +
    "window.VOCAB[" + b + "] = [\n" +
    lines.join(",\n") +
    "\n];\n";
  fs.writeFileSync(path.join(DATA, "vocab_" + b + ".js"), body);
});
console.log("\ndata/vocab_400.js 〜 vocab_900.js を書き直しました。");
