// WORD QUEST - native bridge (Capacitor only; no-op on the web)
// Overrides the WQ2_STORE mocks with real AdMob rewarded ads and the ¥600
// non-consumable unlock (StoreKit / Play Billing via cordova-plugin-purchase).
//
// ── SETUP (fill these in when the AdMob / store consoles issue them) ──
// 1) AdMob App IDs go in AndroidManifest.xml / Info.plist (see docs/NATIVE_WIRING.md)
// 2) Rewarded ad-unit IDs + product ID below:
(function () {
  "use strict";

  var CONFIG = {
    // ★ AdMobのリワード広告ユニットID
    rewardedAndroid: "ca-app-pub-3056251560404390/5134516956", // 本番（Bridge AI / WORD QUEST Android）
    rewardedIos:     "ca-app-pub-3940256099942544/1712485313", // ←iOSはまだテストID（AdMobでiOSアプリ登録後に差し替え）
    // ★ アプリ内課金：全解放（¥600・非消費型）。両ストアで同じIDで登録すること
    productId: "wordquest_unlock",
    // 開発中は true（テスト広告のみ表示・誤タップBAN防止）。リリース時に false
    testing: true
  };

  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return; // web: keep mocks

  var platform = cap.getPlatform ? cap.getPlatform() : "android";
  var rewardedId = platform === "ios" ? CONFIG.rewardedIos : CONFIG.rewardedAndroid;

  // ---------- AdMob rewarded (@capacitor-community/admob) ----------
  var AdMob = cap.Plugins && cap.Plugins.AdMob;
  if (AdMob) {
    var adReady = false;
    function prepare() {
      AdMob.prepareRewardVideoAd({ adId: rewardedId, isTesting: CONFIG.testing })
        .then(function () { adReady = true; })
        .catch(function () { adReady = false; setTimeout(prepare, 30000); }); // retry (offline etc.)
    }
    AdMob.initialize({ initializeForTesting: CONFIG.testing }).then(prepare).catch(function () {});

    // reward granted only when the video is actually completed
    var rewardCb = null;
    AdMob.addListener("onRewardedVideoAdReward", function () { if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(true); } });
    AdMob.addListener("onRewardedVideoAdClosed", function () {
      // closed without reward -> no grant; either way, preload the next one
      if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(false); }
      adReady = false; prepare();
    });
    AdMob.addListener("onRewardedVideoAdFailedToLoad", function () { adReady = false; setTimeout(prepare, 30000); });

    window.WQ2_STORE.showRewarded = function (cb) {
      if (!adReady) { cb(false); prepare(); return; } // no fill / offline: fail gracefully
      rewardCb = cb;
      AdMob.showRewardVideoAd().catch(function () { if (rewardCb) { var c = rewardCb; rewardCb = null; c(false); } });
    };
  }

  // ---------- ¥600 unlock (cordova-plugin-purchase v13: window.CdvPurchase) ----------
  document.addEventListener("deviceready", function () {
    var CP = window.CdvPurchase;
    if (!CP || !CP.store) return;
    var store = CP.store;
    var PLATFORM = platform === "ios" ? CP.Platform.APPLE_APPSTORE : CP.Platform.GOOGLE_PLAY;
    store.register([{ id: CONFIG.productId, type: CP.ProductType.NON_CONSUMABLE, platform: PLATFORM }]);
    store.when()
      .approved(function (tx) { tx.verify(); })
      .verified(function (receipt) { receipt.finish(); grantUnlock(); });
    store.initialize([PLATFORM]).then(function () {
      // restore: if already owned (reinstall/new device), unlock silently
      var p = store.get(CONFIG.productId, PLATFORM);
      if (p && p.owned) grantUnlock();
    });

    function grantUnlock() {
      try {
        var raw = JSON.parse(localStorage.getItem("wq2_store_v1") || "{}");
        raw.premium = true;
        localStorage.setItem("wq2_store_v1", JSON.stringify(raw));
      } catch (e) {}
      if (window.WQ2_STORE) window.WQ2_STORE._grantPremium && window.WQ2_STORE._grantPremium();
      location.reload(); // simplest way to re-read premium state everywhere
    }

    window.WQ2_STORE.buyUnlock = function (cb) {
      var offer = store.get(CONFIG.productId, PLATFORM) && store.get(CONFIG.productId, PLATFORM).getOffer();
      if (!offer) { cb(false); return; }
      offer.order().then(function () { cb(true); }).catch(function () { cb(false); });
    };
  });
})();
