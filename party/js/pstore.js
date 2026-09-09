// WORDRIA - monetization layer
// Free + daily stamina + rewarded-ad continue + a ¥500/month subscription (ads off).
// WEB build uses MOCK ad/purchase (clearly labelled デモ). The native (Capacitor)
// build overrides WQ2_STORE.showRewarded / WQ2_STORE.buyPremium with real
// AdMob (rewarded video) and StoreKit / Play Billing (auto-renewing subscription).
//
// Unlike the one-time unlock this replaced, a subscription LAPSES. The store
// receipt is the only authority on that; `premiumUntil` here is just a cache so
// the game behaves correctly offline, and it is deliberately allowed to expire.
(function () {
  "use strict";
  var KEY = "wq2_store_v1";
  var MAX = 1;        // 無料の1日あたり挑戦回数（スタミナ）
  var AD_REFILL = 1;  // リワード広告1回で回復するスタミナ
  // 闘技場（1周11戦）で全画面広告を出す戦い。その直前に1回だけ出る。
  //   1〜5戦目：出さない。仲間が2・3・5戦目で加わり、5戦目の古竜で
  //             ひと区切りになる導入の弧。ここを切ると面白さが伝わる前に止まる
  //   6戦目の前：古竜を倒した直後＝章の変わり目。いちばん自然な切れ目
  //   8・10戦目の前：四天王どうしの合間
  //   11戦目の前：出さない。真ラスボスは隠しの登場で、カウンタも開始カードも
  //             出さない作りにしてある。その直前に広告を挟むと台無しになる
  var AD_ROUNDS = [6, 8, 10];
  // 挑戦の塔は5階ごとが守護者戦で、突破するとパーティが全回復する。
  // その休憩の直後＝6・11・16階の前に出す。闘技場の6戦目と同じ考え方で、
  // 戦いの途中ではなく、ひと区切りついたところに置く
  var TOWER_EVERY = 5;
  // フィールドには区切りが無いので、通算の回数で間引く
  var AD_EVERY = 2;
  var PRICE = "¥500";
  // grace period after the cached expiry before premium is dropped, so a
  // renewal that has not been observed yet (offline, slow receipt refresh)
  // never locks out a paying player mid-session
  var GRACE_MS = 3 * 24 * 60 * 60 * 1000;

  // 課金の開示文はストアごとに書き分ける。iOS版の画面に「Google Play」と書くと、
  // 他プラットフォームへの誘導・言及として審査で指摘されうる。逆も同じなので、
  // 実行中のプラットフォームの言い方だけを出す
  function storeWords() {
    var cap = window.Capacitor;
    var p = (cap && cap.getPlatform) ? cap.getPlatform() : "web";
    if (p === "ios") return { account: "Apple ID", store: "App Store" };
    if (p === "android") return { account: "Google アカウント", store: "Google Play" };
    return { account: "Apple ID", store: "App Store" }; // ブラウザのデモ表示
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var state = { day: today(), stamina: MAX, premium: false, premiumUntil: 0 };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var s = JSON.parse(raw); if (s && typeof s === "object") state = s; }
  } catch (e) {}
  if (state.day !== today()) { state.day = today(); state.stamina = MAX; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  save();

  // A subscription is active only while the receipt says so. premiumUntil === 0
  // means "active, expiry unknown" — the native layer fills it in when the
  // store reports one, and the mock build never sets it.
  function premiumActive() {
    if (!state.premium) return false;
    if (state.premiumUntil && Date.now() > state.premiumUntil + GRACE_MS) {
      state.premium = false;
      save();
      return false;
    }
    return true;
  }

  var skipNextAd = false;   // set after a rewarded revive, so two ads never stack

  function screenEl() { return document.getElementById("screen") || document.body; }

  // ---- overlay with buttons -> Promise(key) ----
  // Dialog. B button / Esc / tapping outside resolves with the "no" key
  // (or the last button's key) so the player is never trapped.
  function overlay(html, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      var panel = document.createElement("div");
      panel.className = "wq2-store-panel dq-window";
      panel.innerHTML = html;
      var row = document.createElement("div");
      row.className = "wq2-store-btns";
      var cancelKey = "no";
      for (var i = 0; i < buttons.length; i++) if (buttons[i].key === "no") cancelKey = "no";
      if (!buttons.some(function (b) { return b.key === "no"; })) cancelKey = buttons[buttons.length - 1].key;
      var btnB = document.getElementById("btn-b");
      function done(k) {
        window.removeEventListener("keydown", onKey, true);
        if (btnB) btnB.removeEventListener("pointerdown", onB, true);
        wrap.remove();
        resolve(k);
      }
      buttons.forEach(function (b) {
        var el = document.createElement("button");
        el.className = "wq2-store-btn" + (b.primary ? " primary" : "");
        el.textContent = b.label;
        el.onclick = function (e) { e.preventDefault(); done(b.key); };
        row.appendChild(el);
      });
      function onKey(e) {
        if (e.key === "Escape" || e.key === "x") { e.preventDefault(); e.stopPropagation(); done(cancelKey); }
      }
      function onB(e) { e.preventDefault(); e.stopPropagation(); done(cancelKey); }
      wrap.onpointerdown = function (e) { if (e.target === wrap) { e.preventDefault(); done(cancelKey); } };
      window.addEventListener("keydown", onKey, true);
      if (btnB) btnB.addEventListener("pointerdown", onB, true);
      panel.appendChild(row);
      wrap.appendChild(panel);
      screenEl().appendChild(wrap);
    });
  }

  // ---- mock rewarded-ad playback screen (native build overrides showRewarded) ----
  function adScreen(tag) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      wrap.innerHTML =
        '<div class="wq2-store-panel dq-window">' +
        '<div class="wq2-ad-tag">' + (tag || "広告") + '（デモ）</div>' +
        '<div class="wq2-ad-body">📺 動画広告を 再生中…</div>' +
        '<div class="wq2-ad-bar"><div></div></div>' +
        '<div class="wq2-ad-note">※実際の広告は 公開版で表示されます</div>' +
        '</div>';
      screenEl().appendChild(wrap);
      setTimeout(function () { wrap.remove(); resolve(); }, 1700);
    });
  }

  var api = {
    stamina: function () { return state.stamina; },
    max: function () { return MAX; },
    isPremium: premiumActive,
    price: function () { return PRICE; },
    canPlay: function () { return premiumActive() || state.stamina > 0; },
    spendPlay: function () { if (!premiumActive() && state.stamina > 0) { state.stamina--; save(); } },

    // called by the native layer once the store receipt has been read.
    // untilMs = 0 when the store reports no expiry date.
    _setPremium: function (active, untilMs) {
      state.premium = !!active;
      state.premiumUntil = active ? (untilMs || 0) : 0;
      save();
    },

    // daily review reward: +1 stamina, once per day (premium doesn't need it)
    claimReviewBonus: function () {
      if (premiumActive()) return false;
      if (state.srsDay === today()) return false;
      state.srsDay = today();
      state.stamina = Math.min(MAX, state.stamina + 1);
      save();
      return true;
    },

    // rewarded video. cb(true) on completed view. NATIVE OVERRIDES THIS.
    showRewarded: function (cb) { adScreen().then(function () { cb(true); }); },

    // full-screen interstitial, shown between battles on the free tier.
    // NATIVE OVERRIDES THIS. Must never block: if no ad is ready the callback
    // fires straight away and the battle starts as normal.
    showInterstitial: function (cb) { adScreen("広告").then(function () { cb(); }); },

    // 画面下に出しっぱなしのバナーは置かない（2026-09-08 に廃止）。
    // 遊びの最中ずっと画面を占め続ける広告は、面白さを削るほうが大きい。
    // 全画面広告（区切りのいい場所だけ）と、続きを選んだ人だけが見る
    // リワード広告の2つでやる。

    // Called by the battle engine before every encounter. Shows a full-screen ad
    // once every AD_EVERY battles — the first battle starts straight away, then
    // one before every second battle after that. The counter is persisted so
    // quitting and relaunching does not reset the cadence.
    adBeforeBattle: function (round, floor) {
      if (premiumActive()) return Promise.resolve();
      state.battles = (state.battles || 0) + 1;
      // never stack an interstitial straight after a rewarded revive
      if (skipNextAd) { skipNextAd = false; save(); return Promise.resolve(); }
      save();

      var show;
      if (typeof round === "number") {
        // 闘技場（1周11戦）。位置は AD_ROUNDS で決め打ちにする。
        // 通算回数で数えていたときは、2周目以降の序盤にも広告が入っていた
        show = AD_ROUNDS.indexOf(round) >= 0;
      } else if (typeof floor === "number") {
        // 挑戦の塔。守護者を倒して全回復した直後（6・11・16階…の前）
        show = floor > 1 && (floor - 1) % TOWER_EVERY === 0;
      } else {
        // フィールド。区切りが無いので通算の回数で間引く
        show = state.battles > AD_EVERY && (state.battles - 1) % AD_EVERY === 0;
      }
      if (!show) return Promise.resolve();
      return new Promise(function (r) { api.showInterstitial(function () { r(); }); });
    },

    // エンディングを見終えて、タイトルに戻る直前。1周の終わりで、この先を
    // 待っている人がいない場所。戦闘の途中に挟むより害が小さい
    adAfterEnding: function () {
      if (premiumActive()) return Promise.resolve();
      return new Promise(function (r) { api.showInterstitial(function () { r(); }); });
    },

    // 短い結果表示。復元できた／できなかった、のように、押した結果を必ず何か返す
    // ために使う。黙って閉じると「反応しない」と受け取られる
    note: function (text) {
      return overlay('<div class="wq2-store-p">' + String(text).replace(/\n/g, "<br>") + '</div>',
        [{ key: "no", label: "とじる", primary: true }]);
    },

    // 購入前に必ず出す確認パネル。Promise("buy" | "restore" | "no") を返す。
    //
    // ここは飾りではなく、両ストアの審査要件そのもの。名称・期間・価格・自動更新・
    // 解約方法・規約とプライバシーのリンクを、購入を始める画面に出さないと通らない
    // （Apple 3.1.2）。「購入を復元」も必須（Apple 3.1.1）。
    //
    // ネイティブ側（pnative.js）は buyPremium を丸ごと差し替えるが、このパネルは
    // 共有して使う。以前は差し替えでパネルごと消えてしまい、実機では開示も復元も
    // 出ない状態だった。表示は1か所にまとめて、二度と食い違わないようにする。
    premiumPanel: function (demo) {
      var W = storeWords();
      return overlay(
        '<div class="wq2-store-h">★ プレミアム（月額）</div>' +
        '<div class="wq2-store-p">月額' + PRICE + 'で<br>' +
        '・スタミナ制限なし<br>・広告オフ<br>' +
        '・出題レベルを 1つに 絞れる<br>　（中1だけ／スコア600だけ など）<br>' +
        '・学習の記録を すべて表示<br>　（毎日の推移グラフ／苦手な単語）</div>' +
        '<div class="wq2-store-fine">お支払いは 月額' + PRICE + '（税込）。<br>' +
        '購入を確定すると ' + W.account + ' に請求されます。<br>' +
        '解約しないかぎり 自動更新されます。<br>' +
        '解約は ' + W.store + ' の<br>サブスクリプション設定から いつでも できます。<br>' +
        '<a href="https://bridge-ai-tokyo.com/wordria/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>　' +
        '<a href="https://bridge-ai-tokyo.com/wordria/terms.html" target="_blank" rel="noopener">利用規約</a></div>' +
        (demo ? '<div class="wq2-ad-note">※デモ版：実際の課金は 公開版で有効になります</div>' : ''),
        [{ key: "buy", label: demo ? "登録する（デモ）" : "登録する", primary: true },
         { key: "restore", label: "購入を復元" },
         { key: "no", label: "やめる" }]
      );
    },

    // monthly subscription. cb(true) on success. NATIVE OVERRIDES THIS
    // （パネルの表示だけは premiumPanel を共有する）。
    buyPremium: function (cb) {
      api.premiumPanel(true).then(function (k) {
        if (k === "buy") { api._setPremium(true, 0); cb(true); }
        else if (k === "restore") { api.restore(function (ok) { cb(ok); }); }
        else cb(false);
      });
    },

    // Apple requires a way to restore an existing subscription on a new device.
    // NATIVE OVERRIDES THIS.
    restore: function (cb) { cb(premiumActive()); },

    // out of stamina -> gate. resolves to whether the player can now play.
    openGate: function () {
      return overlay(
        '<div class="wq2-store-h">今日の 無料プレイを 使い切りました</div>' +
        '<div class="wq2-store-p">スタミナ ' + state.stamina + ' ／ ' + MAX + '<br>広告を見て 回復するか、<br>プレミアムなら いつでも 遊べます。</div>',
        [{ key: "ad", label: "📺 広告を見て ＋" + AD_REFILL, primary: true },
         { key: "buy", label: "★ プレミアム（月額" + PRICE + "）" },
         { key: "no", label: "やめる" }]
      ).then(function (k) {
        // showRewarded は cb(true/false) で「広告が最後まで流れたか」を返すが、
        // ここでは見ずに必ず回復させる。意図的な選択（2026-09-09 に確認）。
        // 広告が出ないのはこちら側の都合（在庫なし・圏外・SDKの不調）であって、
        // 遊ぶ人の落ち度ではない。押したのに何も起きない、を作らない。
        // ※そのぶん「広告が出ていない」ことに気づけないので、失敗の記録は
        //   pnative.js 側に残してある（タイトルのビルド番号を長押しで読める）
        if (k === "ad") return new Promise(function (r) { api.showRewarded(function () { state.stamina += AD_REFILL; save(); r(); }); });
        if (k === "buy") return new Promise(function (r) { api.buyPremium(function () { r(); }); });
        return;
      }).then(function () { return api.canPlay(); });
    },

    // defeat -> offer a continue. resolves true if the player continues.
    offerContinue: function () {
      // The revive rule is only ever read here, so spell it out plainly:
      // the player keeps half of the damage they had already dealt.
      var rule =
        '<div class="wq2-store-rule">' +
        '<div class="wq2-store-rule-h">復活すると こうなります</div>' +
        '・パーティは <b>全回復</b><br>' +
        '・敵は <b>あたえた ダメージの 半分</b>を<br>　受けたままで 再開<br>' +
        '<div class="wq2-store-rule-n">あと一歩まで 追いつめた 相手ほど<br>' +
        '弱った状態から 始まります。<br>敵のHPは 最大でも 半分までしか 戻りません。</div>' +
        '</div>';
      if (premiumActive()) {
        return overlay(
          '<div class="wq2-store-h">たおれてしまった…</div>' +
          '<div class="wq2-store-p">その場で もう一度 挑みますか？</div>' + rule,
          [{ key: "yes", label: "コンティニュー", primary: true }, { key: "no", label: "タイトルへ" }]
        ).then(function (k) { return k === "yes"; });
      }
      return overlay(
        '<div class="wq2-store-h">たおれてしまった…</div>' +
        '<div class="wq2-store-p">広告を見れば その場で 復活できます。</div>' + rule,
        [{ key: "ad", label: "📺 広告を見て 復活", primary: true }, { key: "no", label: "タイトルへ" }]
      ).then(function (k) {
        // 上の openGate と同じ。広告が流れなくても復活はさせる。
        if (k === "ad") return new Promise(function (r) {
          api.showRewarded(function () { skipNextAd = true; r(true); });
        });
        return false;
      });
    }
  };
  window.WQ2_STORE = api;
})();
