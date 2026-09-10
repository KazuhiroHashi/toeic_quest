// WORDRIA - ストアの評価をお願いする。
//
//   WQ2_RATE.maybeAsk(clears)  闘技場を制覇した直後に呼ぶ。条件を満たしたときだけ聞く
//   WQ2_RATE.openStore()       タイトルのボタンから。自分で書きに行きたい人のため
//
// ── 見返りを絶対に付けないこと ──────────────────────────
// 「星5つを付けたら全機能開放」を謳うアプリが実際にあるが、あれは
// Google Play・App Store の両方で禁止されている。
//   Apple 1.1.7 / 3.2.2 … レビューへの対価提供の禁止
//   Apple 5.6.1         … レビューを条件に機能を制限すること（レビューゲーティング）の禁止
//   Google Play         … 評価と引き換えの報酬はランキング操作にあたる
// 見つかればアプリごと消える。
//
// そのうえ、技術的にも成立していない。iOS の SKStoreReviewController も
// Android の In-App Review API も、**評価したかどうかを返さない**。
// 星の数は当然わからない。両社が意図的にそう設計している（まさにこの
// 抜け道を塞ぐため）。だから「星5つを確認して解放」は不可能で、
// ああいうアプリは「ボタンを押しただけ」で解放しているにすぎない。
// 利用者を欺いている。真似しないこと。
//
// ── ゲームを止めないこと ────────────────────────────────
// requestReview() は「何も表示せずに成功する」ことがよくある。
// OSが決めた回数の上限に達している、審査中のビルド、TestFlight や
// 内部テスト経由での起動——理由は返ってこない。出たかどうかは
// 分からない前提で書く。広告まわりと同じく、ここで待たされて
// ゲームが止まることが無いよう、必ずタイムアウトを噛ませる。
(function () {
  "use strict";

  var KEY = "wq2_rate_v1";

  // Google Play に登録したパッケージ名。iOS とは別（docs/PLAY_CONSOLE.md）
  var PLAY_URL = "https://play.google.com/store/apps/details?id=com.bridgeai.wordria";

  // ── 聞く条件 ───────────────────────────────────────────
  // 初回の制覇では聞かない。そこは「挑戦の塔が開放された」と伝える場面で、
  // 報せが重なる。2周目まで遊んだ人は、そもそも気に入ってくれている
  var MIN_CLEARS = 2;
  var MAX_ASKS = 3;                          // 一生のうち3回まで
  var COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 前回から90日あける
  var TIMEOUT_MS = 4000;                     // これ以上は待たない

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function native() {
    var c = window.Capacitor;
    return !!(c && c.isNativePlatform && c.isNativePlatform());
  }
  function plugin() {
    var p = window.Capacitor && window.Capacitor.Plugins;
    return (p && p.InAppReview) || null;
  }
  function platform() {
    var c = window.Capacitor;
    return (c && c.getPlatform) ? c.getPlatform() : "web";
  }

  // OSの評価シートを出す。出たかどうかは分からないので、返り値も持たせない
  function sheet() {
    var pl = plugin();
    if (!pl || !pl.requestReview) return Promise.resolve();
    return Promise.race([
      pl.requestReview(),
      new Promise(function (r) { setTimeout(r, TIMEOUT_MS); })
    ]).catch(function () {});
  }

  window.WQ2_RATE = {
    // 制覇の直後に呼ぶ。条件を満たさなければ、何もせずすぐ返る。
    // 必ず解決する Promise を返すので、await して詰まることはない
    maybeAsk: function (clears) {
      if (!native()) return Promise.resolve();
      if (!(clears >= MIN_CLEARS)) return Promise.resolve();

      var s = load();
      if ((s.asks || 0) >= MAX_ASKS) return Promise.resolve();
      if (s.last && Date.now() - s.last < COOLDOWN_MS) return Promise.resolve();

      s.asks = (s.asks || 0) + 1;
      s.last = Date.now();
      save(s);   // 出す前に記録する。出たか分からない以上、
                 // 「出なかったから数えない」は無限に聞き続ける実装になる

      return sheet();
    },

    // タイトルの「評価する」ボタンから。こちらは本人が書きに来ているので、
    // 回数制限も間隔もかけない。
    //
    // Android は Play のページを直接開く。OSの評価シートは回数の上限に
    // 当たると黙って何も出さないので、押したのに無反応に見えてしまう。
    // 自分から押した人には、確実に開くほうを見せる。
    //
    // iOS は App Store の数字ID（apps.apple.com/app/id########）が要るが、
    // まだ採番されていない。判明したら
    //   https://apps.apple.com/jp/app/id########?action=write-review
    // に差し替えること。それまでは評価シートで代用する
    openStore: function () {
      if (platform() === "android" || !native()) {
        window.open(PLAY_URL, "_blank", "noopener");
        return Promise.resolve();
      }
      return sheet();
    }
  };
})();
