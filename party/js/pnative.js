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
    // 本番の広告を出す。ここは false のままコミットしてある。
    //   以前は true をコミットし、ビルド前に npm run ads:live で false に書き換える
    //   運用にしていた。そのせいでこのファイルが常に「変更あり」の状態になり、
    //   git pull が「Please commit your changes... Aborting」で毎回止まっていた。
    //   本人はpullできたつもりで、修正が一度も端末に届かないまま何時間もテストした。
    //   出荷する値をそのままコミットしておけば、この事故は起きない。
    //   テスト広告で確かめたいときだけ npm run ads:test で true にし、
    //   終わったら git checkout -- party/js/pnative.js で必ず戻すこと。
    testing: false,
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

    // 広告の読み込みを管理する。同時に動くのは常に1本だけ。
    //
    // ここは一度こわれている。読み込み失敗の合図は2か所から来る
    //   ・prepare... の Promise が reject する
    //   ・FailedToLoad イベントが飛ぶ
    // 以前はその両方が別々に「30秒後に再試行」を仕掛けていた。つまり1回の失敗で
    // 再試行が2本になり、その2本がまた失敗して4本、8本…と30秒ごとに倍に増えた。
    // 広告が返ってこない状態（AdMobの審査待ち・在庫なし・圏外）だと失敗し続けるので、
    // 10分ほどでネイティブ呼び出しが100万件を超え、アプリが固まる。
    // 実機で prepareInterstitial の呼び出しIDが267万に達しているのを確認した。
    //
    // テスト広告では必ず読み込みに成功するため、この不具合はテストでは絶対に出ない。
    // 本番IDに切り替えて初めて出る。
    //
    // 対策は2段構え。
    //   1) 予約も実行中も1本に限る。二重に失敗を知らされても予約は増やさない。
    //      失敗が続くほど間隔を延ばし、8分で頭打ちにする。
    //   2) それでも増えたときのために、起動1回あたりの読み込み回数に上限を置く。
    //      上限に達したらその広告枠はあきらめ、アプリを閉じるまで二度と試さない。
    //      1) の理屈を間違えても、2) がある限り暴走はできない。
    //      広告が出なくなるだけで、ゲームは普通に遊べる。
    var MAX_LOADS = 20;

    // 診断用。Safariのウェブインスペクタのコンソールで WQ2_ADS と打つと、
    // どのビルドが入っていて、何回読み込んだかが分かる。
    // 「修正が入ったビルドを試しているのか」を毎回このコマンドで確かめられる
    window.WQ2_ADS = { build: "2026-09-06v", max: MAX_LOADS, loaders: {} };

    function Loader(name, start) {
      var self = this, pending = false, timer = 0, fails = 0, loads = 0, dead = false;
      self.ready = false;
      window.WQ2_ADS.loaders[name] = self;
      self.stats = function () {
        return { loads: loads, fails: fails, ready: self.ready, dead: dead, pending: pending, scheduled: !!timer };
      };
      self.load = function () {
        if (dead || pending || timer || self.ready) return;   // すでに動いている／予約済み／打ち切り
        if (loads >= MAX_LOADS) {                              // 安全弁
          dead = true;
          if (window.console) console.warn("[WQ2] " + name + " の読み込みを打ち切りました（" + loads + "回）");
          return;
        }
        loads++; pending = true;
        start().then(
          function () { pending = false; self.ready = true; fails = 0; },
          function () { pending = false; self.retry(); }
        );
      };
      self.retry = function () {
        self.ready = false;
        if (dead || pending || timer) return;                 // 二重通知はここで捨てる
        fails++;
        var wait = Math.min(30000 * Math.pow(2, Math.min(fails - 1, 4)), 480000);
        timer = setTimeout(function () { timer = 0; self.load(); }, wait);
      };
      self.consumed = function () {                   // 表示し終わった。次を読む
        self.ready = false; fails = 0; self.load();
      };
    }

    var rewarded = new Loader("rewarded", function () {
      return AdMob.prepareRewardVideoAd({ adId: rewardedId, isTesting: CONFIG.testing, npa: CONFIG.nonPersonalized });
    });
    var inter = new Loader("interstitial", function () {
      return AdMob.prepareInterstitial({ adId: interstitialId, isTesting: CONFIG.testing, npa: CONFIG.nonPersonalized });
    });

    // 初期化前に読み込むと確実に失敗するので、終わってから両方を仕込む
    AdMob.initialize({ initializeForTesting: CONFIG.testing })
      .then(function () { rewarded.load(); inter.load(); })
      .catch(function () {});

    // reward granted only when the video is actually completed
    var rewardCb = null;
    AdMob.addListener("onRewardedVideoAdReward", function () { if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(true); } });
    AdMob.addListener("onRewardedVideoAdClosed", function () {
      // closed without reward -> no grant; either way, preload the next one
      if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(false); }
      rewarded.consumed();
    });
    AdMob.addListener("onRewardedVideoAdFailedToLoad", function () { rewarded.retry(); });

    window.WQ2_STORE.showRewarded = function (cb) {
      if (!rewarded.ready) { cb(false); rewarded.load(); return; } // no fill / offline: fail gracefully
      rewardCb = cb;
      AdMob.showRewardVideoAd().catch(function () { if (rewardCb) { var c = rewardCb; rewardCb = null; c(false); } });
    };

    // ---------- interstitial (free tier: one before every battle) ----------
    var interCb = null;
    function interDone() {
      if (interCb) { var c = interCb; interCb = null; c(); }
      inter.consumed();   // load the next one for the following battle
    }
    AdMob.addListener("interstitialAdDismissed", interDone);
    AdMob.addListener("interstitialAdFailedToShow", interDone);
    AdMob.addListener("interstitialAdFailedToLoad", function () { inter.retry(); });

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
      if (!inter.ready) { cb(); inter.load(); return; }
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
