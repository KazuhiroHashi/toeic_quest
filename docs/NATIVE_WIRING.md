# 広告・課金のネイティブ配線（AdMob＋¥600課金）

配線コードは **`party/js/pnative.js`** に実装済み。Webでは何もしない（モックのまま）、
Capacitorネイティブでのみ本物のAdMob/課金に切り替わる。

## あなたのやること（IDが発行されたら）

### 1. AdMob（リワード広告）
AdMobコンソールで iOS / Android それぞれのアプリを登録すると2種類のIDが出る：

| ID | 形式 | 書く場所 |
|---|---|---|
| **App ID** | `ca-app-pub-XXXX~YYYY`（チルダ） | 下記のネイティブ設定 |
| **リワード広告ユニットID** | `ca-app-pub-XXXX/ZZZZ`（スラッシュ） | `party/js/pnative.js` の `CONFIG.rewardedAndroid / rewardedIos` |

**App ID のネイティブ設定：**
- Android: `android/app/src/main/AndroidManifest.xml` の `<application>` 内に
```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXX~YYYY"/>
```
- iOS: `ios/App/App/Info.plist` に
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXX~YYYY</string>
```

**注意：**
- `pnative.js` の `CONFIG.testing = true` の間は**テスト広告のみ**表示（開発中はこのまま。**自分の本番広告を自分でタップするとBAN**）。ストア提出ビルドで `false` に。
- 現在はGoogle公式の**テスト用ユニットID**が入れてあるので、実IDが来るまでもテスト表示で動作確認できる。

### 2. アプリ内課金（全解放 ¥600）
- 商品ID：**`wordquest_unlock`**（`pnative.js` の `CONFIG.productId`。変えたい場合は両方揃える）
- **Google Play Console** → 収益化 → アプリ内アイテム → 新規作成
  - ID `wordquest_unlock` ／ 非消費型（買い切り）／ ¥600
- **App Store Connect** → 対象アプリ → App内課金 → 「＋」
  - タイプ **非消耗型** ／ 製品ID `wordquest_unlock` ／ ¥600（価格Tier）
- 復元（機種変更・再インストール）は `pnative.js` が自動対応（起動時に所有チェック）。

### 3. ビルドに乗せる
```bash
npm install        # admob + purchase プラグインが入る
npm run cap:sync   # ネイティブに同期
```
その後はいつものビルド手順（BUILD_WALKTHROUGH.md）。

## 実装の仕組み（参考）
- `WQ2_STORE.showRewarded(cb)` … Webはデモ広告→cb(true)。ネイティブは
  AdMobリワードを表示し、**動画を最後まで見た時だけ** cb(true)（＝復活/スタミナ+3）。
  在庫なし/オフライン時は cb(false)（UIは「今は見られない」扱いで安全に閉じる）。
- `WQ2_STORE.buyUnlock(cb)` … Webはデモ。ネイティブはストア購入シートを表示、
  購入検証→`premium=true` 保存→リロードで全画面に反映。
