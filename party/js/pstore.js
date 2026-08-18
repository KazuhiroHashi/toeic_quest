// WORD QUEST II - monetization layer
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
  var MAX = 5;        // 無料の1日あたり挑戦回数（スタミナ）
  var AD_REFILL = 3;  // リワード広告1回で回復するスタミナ
  var PRICE = "¥500";
  // grace period after the cached expiry before premium is dropped, so a
  // renewal that has not been observed yet (offline, slow receipt refresh)
  // never locks out a paying player mid-session
  var GRACE_MS = 3 * 24 * 60 * 60 * 1000;

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
  function adScreen() {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      wrap.innerHTML =
        '<div class="wq2-store-panel dq-window">' +
        '<div class="wq2-ad-tag">広告（デモ）</div>' +
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

    // monthly subscription. cb(true) on success. NATIVE OVERRIDES THIS.
    // Both stores require the price, the renewal period, the auto-renewal notice
    // and how to cancel to be visible on the screen that starts the purchase.
    buyPremium: function (cb) {
      overlay(
        '<div class="wq2-store-h">★ プレミアム（月額）</div>' +
        '<div class="wq2-store-p">月額' + PRICE + 'で<br>スタミナ制限なし＋広告オフ。<br>毎日 好きなだけ 遊べます。</div>' +
        '<div class="wq2-store-fine">お支払いは 月額' + PRICE + '（税込）。<br>' +
        '解約しないかぎり 自動更新されます。<br>' +
        '解約は App Store／Google Play の<br>サブスクリプション設定から いつでも できます。<br>' +
        '<a href="https://bridge-ai-tokyo.com/wordquest/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>　' +
        '<a href="https://bridge-ai-tokyo.com/wordquest/terms.html" target="_blank" rel="noopener">利用規約</a></div>' +
        '<div class="wq2-ad-note">※デモ版：実際の課金は 公開版で有効になります</div>',
        [{ key: "buy", label: "登録する（デモ）", primary: true },
         { key: "restore", label: "購入を復元" },
         { key: "no", label: "やめる" }]
      ).then(function (k) {
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
        if (k === "ad") return new Promise(function (r) { api.showRewarded(function () { state.stamina += AD_REFILL; save(); r(); }); });
        if (k === "buy") return new Promise(function (r) { api.buyPremium(function () { r(); }); });
        return;
      }).then(function () { return api.canPlay(); });
    },

    // defeat -> offer a continue. resolves true if the player continues.
    offerContinue: function () {
      if (premiumActive()) {
        return overlay(
          '<div class="wq2-store-h">たおれてしまった…</div>' +
          '<div class="wq2-store-p">その場で 全回復して<br>もう一度 挑みますか？</div>',
          [{ key: "yes", label: "コンティニュー", primary: true }, { key: "no", label: "タイトルへ" }]
        ).then(function (k) { return k === "yes"; });
      }
      return overlay(
        '<div class="wq2-store-h">たおれてしまった…</div>' +
        '<div class="wq2-store-p">広告を見れば その場で<br>全回復して 続けられます。</div>',
        [{ key: "ad", label: "📺 広告を見て 復活", primary: true }, { key: "no", label: "タイトルへ" }]
      ).then(function (k) {
        if (k === "ad") return new Promise(function (r) { api.showRewarded(function () { r(true); }); });
        return false;
      });
    }
  };
  window.WQ2_STORE = api;
})();
