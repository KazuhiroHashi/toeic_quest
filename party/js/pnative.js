// WORD QUEST - native bridge (Capacitor only; no-op on the web)
// Overrides the WQ2_STORE mocks with real AdMob rewarded ads and the ¥500/month
// subscription (StoreKit / Play Billing via cordova-plugin-purchase).
//
// ── SETUP (fill these in when the AdMob / store consoles issue them) ──
// 1) AdMob App IDs go in AndroidManifest.xml / Info.plist (see docs/NATIVE_WIRING.md)
// 2) Rewarded ad-unit IDs + product ID below:
(function () {
  "use strict";

  var CONFIG = {
    // ★ AdMobのリワード広告ユニットID
    rewardedAndroid: "ca-app-pub-3056251560404390/5134516956", // 本番（Bridge AI / WORD QUEST Android）
    rewardedIos:     "ca-app-pub-3056251560404390/7099435396", // 本番（Bridge AI / WORD QUEST iOS）
    // インタースティシャル（第3・5・7・9・11戦の前に出す全画面広告）
    //   ★Androidは未作成。Android版を出すときに AdMob で作って差し替えること。
    //   テスト用IDのまま testing:false にすると、その枠の収益はゼロになる
    //   （build_www.js がその組み合わせを検出してビルドを止める）
    interstitialAndroid: "ca-app-pub-3940256099942544/1033173712", // Google テスト用
    interstitialIos:     "ca-app-pub-3056251560404390/9479211793", // 本番（2026-08-22）
    // 画面下に出しっぱなしにするバナー。インタースティシャルとは別の広告枠
    bannerAndroid: "ca-app-pub-3940256099942544/6300978111", // Google テスト用
    bannerIos:     "ca-app-pub-3056251560404390/4608817044", // 本番（2026-08-22）
    // ★ アプリ内課金：プレミアム（月額¥500・自動更新サブスク）
    //   両ストアで同じIDで登録すること。Google Play では基本プラン（月額）を
    //   この商品の下に作る
    productId: "wordquest_premium_monthly",
    // 開発中は true（テスト広告のみ表示・誤タップBAN防止）。本番公開時のみ false
    testing: true,
    // 非パーソナライズ広告で運用する。ATTの許可ダイアログを出さない代わりに
    // 追跡は一切行わない（Appleへの申告も「追跡しない」で統一）
    nonPersonalized: true
  };

  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return; // web: keep mocks

  var platform = cap.getPlatform ? cap.getPlatform() : "android";
  var rewardedId = platform === "ios" ? CONFIG.rewardedIos : CONFIG.rewardedAndroid;
  var interstitialId = platform === "ios" ? CONFIG.interstitialIos : CONFIG.interstitialAndroid;
  var bannerId = platform === "ios" ? CONFIG.bannerIos : CONFIG.bannerAndroid;

  // ---------- AdMob rewarded (@capacitor-community/admob) ----------
  var AdMob = cap.Plugins && cap.Plugins.AdMob;
  if (AdMob) {
    var adReady = false;
    function prepare() {
      AdMob.prepareRewardVideoAd({ adId: rewardedId, isTesting: CONFIG.testing, npa: CONFIG.nonPersonalized })
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

    // ---------- interstitial (free tier: one before every battle) ----------
    var interReady = false, interCb = null;
    function prepareInter() {
      AdMob.prepareInterstitial({ adId: interstitialId, isTesting: CONFIG.testing, npa: CONFIG.nonPersonalized })
        .then(function () { interReady = true; })
        .catch(function () { interReady = false; setTimeout(prepareInter, 30000); });
    }
    prepareInter();

    function interDone() {
      if (interCb) { var c = interCb; interCb = null; c(); }
      interReady = false;
      prepareInter();   // load the next one for the following battle
    }
    AdMob.addListener("interstitialAdDismissed", interDone);
    AdMob.addListener("interstitialAdFailedToShow", interDone);
    AdMob.addListener("interstitialAdFailedToLoad", function () { interReady = false; setTimeout(prepareInter, 30000); });

    // ---------- banner (free tier: pinned to the bottom) ----------
    // 操作ボタンに重ならないよう、読み込まれた実寸だけ #app の下に余白を作る。
    // 高さは端末と広告で変わるので、決め打ちせず SizeChanged を待つ。
    AdMob.addListener("bannerAdSizeChanged", function (size) {
      var h = (size && size.height) || 0;
      document.documentElement.style.setProperty("--wq-banner", h > 0 ? h + "px" : "0px");
    });

    window.WQ2_STORE.showBanner = function () {
      if (window.WQ2_STORE.isPremium && window.WQ2_STORE.isPremium()) return;
      AdMob.showBanner({
        adId: bannerId,
        adSize: "ADAPTIVE_BANNER",
        position: "BOTTOM_CENTER",
        margin: 0,
        isTesting: CONFIG.testing,
        npa: CONFIG.nonPersonalized
      }).catch(function () {
        document.documentElement.style.setProperty("--wq-banner", "0px");
      });
    };
    window.WQ2_STORE.hideBanner = function () {
      document.documentElement.style.setProperty("--wq-banner", "0px");
      if (AdMob.removeBanner) AdMob.removeBanner().catch(function () {});
      else if (AdMob.hideBanner) AdMob.hideBanner().catch(function () {});
    };

    window.WQ2_STORE.showInterstitial = function (cb) {
      // nothing loaded (offline, no fill, first battle after launch): do not
      // make the player wait — start the battle and load one for next time
      if (!interReady) { cb(); prepareInter(); return; }
      interCb = cb;
      AdMob.showInterstitial().catch(interDone);
    };
  }

  // ---------- ¥500/月 subscription (cordova-plugin-purchase v13: window.CdvPurchase) ----------
  document.addEventListener("deviceready", function () {
    var CP = window.CdvPurchase;
    if (!CP || !CP.store) return;
    var store = CP.store;
    var PLATFORM = platform === "ios" ? CP.Platform.APPLE_APPSTORE : CP.Platform.GOOGLE_PLAY;
    store.register([{ id: CONFIG.productId, type: CP.ProductType.PAID_SUBSCRIPTION, platform: PLATFORM }]);

    // A subscription can lapse, so the receipt — not a stored flag — decides.
    // Re-read it whenever the plugin reports a change and whenever the app comes
    // back to the foreground (that is when a renewal or a cancellation lands).
    function syncFromReceipt() {
      var p = store.get(CONFIG.productId, PLATFORM);
      var active = !!(p && p.owned);
      var until = 0;
      try {
        // expiry lives on the transaction; shape differs slightly per store
        (store.localTransactions || []).forEach(function (tx) {
          if (!tx.products || !tx.products.some(function (x) { return x.id === CONFIG.productId; })) return;
          var e = tx.expirationDate || tx.expiryDate;
          if (e) until = Math.max(until, new Date(e).getTime());
        });
      } catch (e) {}
      if (window.WQ2_STORE && window.WQ2_STORE._setPremium) window.WQ2_STORE._setPremium(active, until);
      return active;
    }

    store.when()
      .approved(function (tx) { tx.verify(); })
      .verified(function (receipt) { receipt.finish(); syncFromReceipt(); })
      .unverified(function () { syncFromReceipt(); })
      .productUpdated(syncFromReceipt)
      .receiptUpdated(syncFromReceipt);

    store.initialize([PLATFORM]).then(syncFromReceipt);
    document.addEventListener("resume", function () {
      store.update().then(syncFromReceipt).catch(function () {});
    }, false);

    // 購入は必ず確認パネルを挟んでから StoreKit / Play Billing に渡す。
    //
    // 以前はここでいきなり offer.order() を呼んでいた。そうすると pstore.js の
    // 確認パネルが実機で一度も表示されず、
    //   ・価格／期間／自動更新／解約方法／規約とプライバシーのリンク（Apple 3.1.2）
    //   ・「購入を復元」への導線（Apple 3.1.1）
    // のどちらも画面に出ない状態になっていた。restore 自体は下で定義済みなのに、
    // それを押せる場所がアプリのどこにも無かった。審査で落ちる。
    // パネルの文言は pstore.js の premiumPanel に集約してある。
    var buying = false;
    window.WQ2_STORE.buyPremium = function (cb) {
      if (buying) { cb(false); return; }   // 二重タップでシートが二枚出るのを防ぐ
      buying = true;
      function done(ok) { buying = false; cb(ok); }

      window.WQ2_STORE.premiumPanel(false).then(function (k) {
        if (k === "restore") { window.WQ2_STORE.restore(done); return; }
        if (k !== "buy") { done(false); return; }

        var p = store.get(CONFIG.productId, PLATFORM);
        var offer = p && p.getOffer();
        // 商品が取れないのは、ストア側の登録が未完了か通信できないとき。
        // 黙って閉じると「押しても何も起きない」になるので理由を出す
        if (!offer) {
          window.WQ2_STORE.note("いまは 手続きできません。\n通信環境を確かめて、\nしばらくしてから お試しください。");
          done(false);
          return;
        }
        offer.order()
          .then(function () { done(syncFromReceipt()); })
          .catch(function () { done(false); });   // ユーザーがシートを閉じた場合もここ
      });
    };

    // Apple requires an explicit restore path for subscriptions
    window.WQ2_STORE.restore = function (cb) {
      store.restorePurchases()
        .then(function () {
          var ok = syncFromReceipt();
          window.WQ2_STORE.note(ok ? "プレミアムを 復元しました。"
                                   : "復元できる 購入が 見つかりませんでした。");
          cb(ok);
        })
        .catch(function () {
          window.WQ2_STORE.note("復元に 失敗しました。\nしばらくしてから お試しください。");
          cb(false);
        });
    };
  });
})();
