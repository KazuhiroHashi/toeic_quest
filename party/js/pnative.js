// WORDRIA - native bridge (Capacitor only; no-op on the web)
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
    rewardedAndroid: "ca-app-pub-3056251560404390/5134516956", // 本番（Bridge AI / WORDRIA Android）
    rewardedIos:     "ca-app-pub-3056251560404390/7099435396", // 本番（Bridge AI / WORDRIA iOS）
    // インタースティシャル（闘技場の6・8・10戦目の前と、エンディング後に出す全画面広告）
    //   ★Androidは未作成。Android版を出すときに AdMob で作って差し替えること。
    //   テスト用IDのまま testing:false にすると、その枠の収益はゼロになる
    //   （build_www.js がその組み合わせを検出してビルドを止める）
    interstitialAndroid: "ca-app-pub-3940256099942544/1033173712", // Google テスト用
    interstitialIos:     "ca-app-pub-3056251560404390/9479211793", // 本番（2026-08-22）
    // ★ アプリ内課金：プレミアム（月額¥500・自動更新サブスク）
    //   両ストアで同じIDで登録すること。Google Play では基本プラン（月額）を
    //   この商品の下に作る
    //   ★IDは変えないこと。両ストアに登録済みの商品IDで、変えると既存の
    //     購読が紐づかなくなる。アプリ名がWORDRIAになっても据え置き。
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
    // 記録は端末に残す。アプリを閉じたら消える作りでは「あとで見る」ができない。
    // これは遊ぶ人のための表示ではなく、作った側が異常に気づくための仕掛けなので、
    // 遊び終わったあとに落ち着いて読めることのほうが大事。
    var LOGKEY = "wq2_ads_v1";
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(LOGKEY) || "{}") || {}; } catch (e) {}

    window.WQ2_ADS = {
      build: "2026-09-09e", max: MAX_LOADS, loaders: {},
      platform: platform, testing: CONFIG.testing,
      rewardedId: rewardedId, interstitialId: interstitialId,
      init: "まだ",                          // 初期化の結果
      log: [],                               // この起動での出来事（新しいものが先頭）
      prev: saved.log || [],                 // 前回までの記録
      lastShown: saved.lastShown || 0,       // 最後に広告が「実際に出た」時刻
      shownTotal: saved.shownTotal || 0      // 出た通算回数
    };

    function persist() {
      try {
        localStorage.setItem(LOGKEY, JSON.stringify({
          log: window.WQ2_ADS.log.concat(window.WQ2_ADS.prev).slice(0, 60),
          lastShown: window.WQ2_ADS.lastShown,
          shownTotal: window.WQ2_ADS.shownTotal
        }));
      } catch (e) {}
    }

    // 異常かどうかを1つにまとめる。
    // ★これは画面には出さない。遊ぶ人に不具合を悟らせないため（2026-09-09 方針）。
    //   広告が出ないことに気づくのはAdMobの管理画面の役目で、アプリの役目ではない。
    //   属性だけ立てておくのは、長押しの診断と自動テストから読むため。
    function health() {
      var d = window.WQ2_ADS;
      if (/失敗/.test(d.init)) return "bad";
      var bad = false;
      ["rewarded", "interstitial"].forEach(function (k) {
        var L = d.loaders[k]; if (!L) return;
        var st = L.stats();
        // 1回の失敗は通信のゆらぎでも起きる。2回続く、または3回試して
        // 一度も用意できていないなら、そこには理由がある。
        if (st.dead || st.fails >= 2 || (st.loads >= 3 && !st.ready)) bad = true;
      });
      return bad ? "bad" : "ok";
    }
    function paint() {
      try { document.documentElement.setAttribute("data-ads", health()); } catch (e) {}
    }
    // 実機で理由を読むための記録。Macに繋がなくても、タイトル画面の
    // ビルド番号を長押しすれば下の report() が読める。
    // AdMob の失敗コード: 0=内部エラー 1=リクエスト不正 2=通信 3=在庫なし
    function note(line) {
      var t = new Date();
      var hh = ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2) +
               ":" + ("0" + t.getSeconds()).slice(-2);
      var stamp = (t.getMonth() + 1) + "/" + t.getDate() + " " + hh;
      window.WQ2_ADS.log.unshift(stamp + " " + line);
      if (window.WQ2_ADS.log.length > 30) window.WQ2_ADS.log.pop();
      if (window.console) console.log("[WQ2ads] " + line);
      persist(); paint();
    }
    // 広告が「画面に出た」ときだけ呼ぶ。読み込めた、ではない。
    function shown(kind) {
      window.WQ2_ADS.lastShown = Date.now();
      window.WQ2_ADS.shownTotal++;
      note(kind + "広告が出た（通算 " + window.WQ2_ADS.shownTotal + " 回目）");
    }
    function why(e) {
      if (!e) return "理由不明";
      var c = (e.code != null) ? e.code : (e.error && e.error.code);
      var m = e.message || (e.error && e.error.message) || String(e);
      var name = { 0: "内部エラー", 1: "リクエスト不正", 2: "通信できない", 3: "広告の在庫なし" }[c];
      return (c != null ? "コード" + c + (name ? "(" + name + ")" : "") + " " : "") + m;
    }
    window.WQ2_ADS.report = function () {
      var d = window.WQ2_ADS, out = [];
      out.push("ビルド " + d.build + " / " + d.platform + (d.testing ? " / テスト広告" : " / 本番広告"));
      // いちばん知りたいのはこれ。「広告が出たことがあるのか」
      if (d.shownTotal) {
        var ls = new Date(d.lastShown);
        out.push("★ 広告が出た回数 " + d.shownTotal + "回 / 最後は " +
          (ls.getMonth() + 1) + "/" + ls.getDate() + " " +
          ("0" + ls.getHours()).slice(-2) + ":" + ("0" + ls.getMinutes()).slice(-2));
      } else {
        out.push("★ この端末で 広告はまだ一度も出ていません");
      }
      out.push("初期化: " + d.init);
      ["rewarded", "interstitial"].forEach(function (k) {
        var L = d.loaders[k];
        if (!L) { out.push(k + ": 未作成"); return; }
        var s = L.stats();
        out.push(k + ": " + (s.ready ? "用意できている" : "まだ") +
          " / 読込" + s.loads + "回 失敗" + s.fails + "回" +
          (s.dead ? " / 打ち切り済み" : "") + (s.scheduled ? " / 再試行待ち" : ""));
        if (s.lastError) out.push("   直近の失敗: " + s.lastError);
      });
      out.push("");
      // 画面に収まる分だけ。全部は console か WQ2_ADS.log で読める
      var lines = d.log.concat(d.prev);
      out.push(lines.length ? lines.slice(0, 12).join("\n") : "（記録なし）");
      return out.join("\n");
    };

    function Loader(name, start) {
      var self = this, pending = false, timer = 0, fails = 0, loads = 0, dead = false;
      self.ready = false;
      window.WQ2_ADS.loaders[name] = self;
      var lastError = "";
      self.stats = function () {
        return { loads: loads, fails: fails, ready: self.ready, dead: dead,
                 pending: pending, scheduled: !!timer, lastError: lastError };
      };
      self.load = function () {
        if (dead || pending || timer || self.ready) return;   // すでに動いている／予約済み／打ち切り
        if (loads >= MAX_LOADS) {                              // 安全弁
          dead = true;
          note(name + " の読み込みを打ち切り（" + loads + "回試して駄目だった）");
          return;
        }
        loads++; pending = true;
        start().then(
          function () { pending = false; self.ready = true; fails = 0; note(name + " 用意できた"); },
          function (e) { pending = false; self.retry(e); }
        );
      };
      self.retry = function (e) {
        self.ready = false;
        if (e) lastError = why(e);
        if (dead || pending || timer) return;                 // 二重通知はここで捨てる
        fails++;
        note(name + " 読み込み失敗 " + fails + "回目: " + (lastError || "理由不明"));
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
      .then(function () {
        window.WQ2_ADS.init = "成功";
        note("AdMob 初期化 成功");
        rewarded.load(); inter.load();
      })
      .catch(function (e) {
        // ここで失敗すると広告は一切出ない。理由が分からないまま
        // 「広告が出ない」とだけ言われる状態が続いていたので、必ず残す。
        // よくある原因は、アプリIDが Info.plist / AndroidManifest.xml に
        // 入っていないこと（npm run admob の実行漏れ）。
        window.WQ2_ADS.init = "失敗 — " + why(e);
        note("AdMob 初期化 失敗: " + why(e));
      });

    // reward granted only when the video is actually completed
    var rewardCb = null;
    AdMob.addListener("onRewardedVideoAdReward", function () { if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(true); } });
    // イベント名は "onRewardedVideoAdDismissed"。"...Closed" は
    // @capacitor-community/admob のどのバージョンにも存在せず（Closed は
    // バナーの "bannerAdClosed" だけ）、購読しても一度も呼ばれない。
    // 呼ばれないと rewarded.consumed() が走らないので、次の広告が読み込まれず
    // リワードは起動後1回しか効かない。取り消したときは cb も呼ばれず止まる。
    AdMob.addListener("onRewardedVideoAdDismissed", function () {
      // closed without reward -> no grant; either way, preload the next one
      if (rewardCb) { var cb = rewardCb; rewardCb = null; cb(false); }
      rewarded.consumed();
    });
    AdMob.addListener("onRewardedVideoAdFailedToLoad", function (e) { rewarded.retry(e); });
    AdMob.addListener("onRewardedVideoAdShowed", function () { shown("リワード"); });

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
    AdMob.addListener("interstitialAdFailedToLoad", function (e) { inter.retry(e); });
    AdMob.addListener("interstitialAdShowed", function () { shown("全画面"); });

    // 画面下のバナーは置かない（2026-09-08 に廃止）。遊んでいる最中ずっと
    // 画面を占め続ける広告は、面白さを削るほうが大きいと判断した。
    // 広告は全画面（区切りのいい場所だけ）とリワード（本人が選んだときだけ）の2つ。
    // AdMob 側のバナー枠は消さずに残してある。戻したくなったらここを書き直す。

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
