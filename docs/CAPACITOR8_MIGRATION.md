# Capacitor 6 → 8 移行（2026-09-09）

## なぜやるのか

Google Play が、2026年8月31日以降に出す新規アプリに **Android 16（APIレベル36）**
を要求するようになった。Capacitor 6 が作る Android プロジェクトは 34 で、2つ足りない。
このままでは AAB を作っても、Play Console へのアップロードの時点で弾かれる。

| | targetSdk |
|---|---|
| Capacitor 6 | 34 ❌ |
| Capacitor 7 | 35 ❌ |
| **Capacitor 8** | **36 ✅** |

7 でも足りないので、8 まで上げる。

## 何が変わったか（こちらで確認済み）

実際に `npx cap add android` / `npx cap add ios` を走らせて、生成物を確かめた。

| | Capacitor 6 | Capacitor 8 |
|---|---|---|
| Android targetSdk / compileSdk | 34 | **36** |
| Android minSdk | 22（Android 5.1） | **24（Android 7.0）** |
| Gradle | 8.2 系 | **8.14.3** |
| Android Gradle Plugin | 8.2 系 | **8.13.0** |
| iOS 最低バージョン | 13.0 | **15.0** |
| **iOS の依存管理** | **CocoaPods** | **Swift Package Manager** |
| AdMobプラグイン | `@capacitor-community/admob` 6 | **8.1.0** |
| Node.js | 18以上 | **22以上** |

### 対応から外れる端末

- **Android 5.x / 6.x** … 最低が 7.0 に上がる。2026年時点で稼働台数は1%未満
- **iOS 13 / 14 のままの端末** … iOS 15 は iPhone 6s 以降で動くので、
  **機種が切り捨てられるわけではない**。OSを上げていない人だけが対象

### CocoaPods が不要になった

Capacitor 8 の iOS は Swift Package Manager を使う。`Podfile` は生成されない。
`pod install` も要らない。Xcode がパッケージを自動で取ってくる。

ただし `ios/App/CapApp-SPM/Package.swift` が `node_modules` を相対パスで
参照しているので、**`node_modules` を消した状態ではビルドできない**。

### 外した回避策

`tools/apply_admob.js` が Podfile に入れていた
`pod 'GoogleUserMessagingPlatform', '< 3.0'` の固定を削除した。

これは admob v6 が UMP 2系の名前のまま書かれていたための回避策で、
入れないと 2026-08-26 の Archive が22個のエラーで止まった。
admob v8 は逆に `~> 3.1` を要求するので、**残っているとそれが原因で壊れる**。
古い `ios/` フォルダを使い回す場合に備えて、その行を消す処理に置き換えてある。

---

## Mac でやること

`android/` と `ios/` は gitignore されていて、Mac 上にしか無い。
**作り直すのがいちばん確実**なので、消して作り直す。

### 1. 取得して入れ直す

```bash
cd ~/toeic_quest
git pull origin claude/toeic-quest-game-8zva6k

node -v          # v22 以上であること。低ければ brew upgrade node
rm -rf node_modules android ios
npm install
```

`node -v` が v18 や v20 なら、先に上げること。Capacitor 8 の CLI は
Node 22 未満だと起動時に自分で止まる。

```bash
brew upgrade node
```

### 2. ネイティブプロジェクトを作り直す

```bash
npm run build:www
npx cap add android
npx cap add ios
npm run assets      # アイコンとスプラッシュ（順番に注意。cap add のあと）
npm run cap:sync    # www の同期 ＋ AdMob のアプリID注入
```

`npm run cap:sync` を `npx cap sync` で代用しないこと。
AdMob のアプリIDが AndroidManifest.xml / Info.plist に入らず、**広告が出なくなる**。

### 3. Xcode で設定し直す（作り直したので消えている）

`npx cap open ios` で開いて、以下を入れ直す。

- [ ] **Signing & Capabilities → Team** を選ぶ
- [ ] **Info.plist → Bundle display name** を `WORDRIA` にする
- [ ] **Info.plist → Bundle name** を `WORDRIA` にする
- [ ] **General → Version** を App Store Connect の表示に合わせる（現在 `1.0`）
- [ ] **General → Build** を前より大きい番号にする（例 `20260909`）

**Bundle Identifier（`com.bridgeai.wordquest`）は触らないこと。**

CocoaPods は要らなくなったが、入っていても害はない。

### 4. Android Studio

```bash
npx cap open android
```

Gradle sync が走る（初回は10分ほど）。AGP 8.13 / Gradle 8.14.3 に上がるので、
**Android Studio も新しめのものが要る**（Ladybug 以降）。古いと
「この AGP はサポートされていません」と言われるので、その場合は Android Studio を更新する。

署名鍵（`.jks`）はこれまでのものをそのまま使う。**新しく作り直さないこと。**

---

## 確認したこと（こちら側）

推測ではなく、実際に生成して確かめた。

- `npx cap add android` → `variables.gradle` が `targetSdkVersion = 36` になる
- `npx cap add ios` → `Podfile` が無く、`CapApp-SPM/Package.swift` に
  admob と cordova-plugin-purchase の両方が入る
- `node tools/apply_admob.js` → AndroidManifest.xml と Info.plist の両方に
  AdMob のアプリIDが入る
- `npm run assets` → 新しい WORDRIA のスプラッシュが iOS/Android 両方に生成される
- `npx cap sync` → エラーなく完了する
- `npm audit`（本番依存のみ）→ **0件**

### コード側の変更は不要だった

`party/js/pnative.js` は `window.Capacitor.Plugins.AdMob` という書き方で
プラグインを呼んでいる。これはネイティブ側の `JSExport.getPluginJS` が
`window.Capacitor.Plugins` を組み立てて注入する仕組みで、Capacitor 8 でも同じ。

AdMob プラグイン v8 のメソッド名・イベント名も、v6 から変わっていないことを
型定義とネイティブ実装の両方で確認した（`prepareRewardVideoAd` /
`showRewardVideoAd` / `prepareInterstitial` / `showInterstitial` /
`onRewardedVideoAdDismissed` / `interstitialAdShowed` ほか）。

### package-lock.json を追加した

これまで置いていなかった。移行では「こちらで通ったものと同じ組み合わせが
Mac でも入る」ことが要るので、固定して一緒に配る。
