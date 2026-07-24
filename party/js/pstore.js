// WORD QUEST II - monetization layer
// Free + daily stamina + rewarded-ad continue + one-time "full unlock" (ads off).
// WEB build uses MOCK ad/purchase (clearly labelled デモ). The native (Capacitor)
// build overrides WQ2_STORE.showRewarded / WQ2_STORE.buyUnlock with real
// AdMob (rewarded video) and StoreKit / Play Billing (¥600 non-consumable).
(function () {
  "use strict";
  var KEY = "wq2_store_v1";
  var MAX = 5;        // 無料の1日あたり挑戦回数（スタミナ）
  var AD_REFILL = 3;  // リワード広告1回で回復するスタミナ

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  var state = { day: today(), stamina: MAX, premium: false };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var s = JSON.parse(raw); if (s && typeof s === "object") state = s; }
  } catch (e) {}
  if (state.day !== today()) { state.day = today(); state.stamina = MAX; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  save();

  function screenEl() { return document.getElementById("screen") || document.body; }

  // ---- overlay with buttons -> Promise(key) ----
  function overlay(html, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wq2-store-ovl";
      var panel = document.createElement("div");
      panel.className = "wq2-store-panel dq-window";
      panel.innerHTML = html;
      var row = document.createElement("div");
      row.className = "wq2-store-btns";
      buttons.forEach(function (b) {
        var el = document.createElement("button");
        el.className = "wq2-store-btn" + (b.primary ? " primary" : "");
        el.textContent = b.label;
        el.onclick = function (e) { e.preventDefault(); wrap.remove(); resolve(b.key); };
        row.appendChild(el);
      });
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
    isPremium: function () { return !!state.premium; },
    canPlay: function () { return state.premium || state.stamina > 0; },
    spendPlay: function () { if (!state.premium && state.stamina > 0) { state.stamina--; save(); } },

    // daily review reward: +1 stamina, once per day (premium doesn't need it)
    claimReviewBonus: function () {
      if (state.premium) return false;
      if (state.srsDay === today()) return false;
      state.srsDay = today();
      state.stamina = Math.min(MAX, state.stamina + 1);
      save();
      return true;
    },

    // rewarded video. cb(true) on completed view. NATIVE OVERRIDES THIS.
    showRewarded: function (cb) { adScreen().then(function () { cb(true); }); },

    // one-time unlock purchase. cb(true) on success. NATIVE OVERRIDES THIS.
    buyUnlock: function (cb) {
      overlay(
        '<div class="wq2-store-h">★ 全ステージ 解放</div>' +
        '<div class="wq2-store-p">¥600（買い切り）で<br>スタミナ制限なし＋広告オフ。<br>ずっと 好きなだけ 遊べます。</div>' +
        '<div class="wq2-ad-note">※デモ版：実際の課金は 公開版で有効になります</div>',
        [{ key: "buy", label: "購入する（デモ）", primary: true }, { key: "no", label: "やめる" }]
      ).then(function (k) {
        if (k === "buy") { state.premium = true; save(); cb(true); } else cb(false);
      });
    },

    // out of stamina -> gate. resolves to whether the player can now play.
    openGate: function () {
      return overlay(
        '<div class="wq2-store-h">今日の 無料プレイを 使い切りました</div>' +
        '<div class="wq2-store-p">スタミナ ' + state.stamina + ' ／ ' + MAX + '<br>広告を見て 回復するか、<br>全解放で いつでも 遊べます。</div>',
        [{ key: "ad", label: "📺 広告を見て ＋" + AD_REFILL, primary: true },
         { key: "buy", label: "★ 全解放（¥600）" },
         { key: "no", label: "やめる" }]
      ).then(function (k) {
        if (k === "ad") return new Promise(function (r) { api.showRewarded(function () { state.stamina += AD_REFILL; save(); r(); }); });
        if (k === "buy") return new Promise(function (r) { api.buyUnlock(function () { r(); }); });
        return;
      }).then(function () { return api.canPlay(); });
    },

    // defeat -> offer a continue. resolves true if the player continues.
    offerContinue: function () {
      if (state.premium) {
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
