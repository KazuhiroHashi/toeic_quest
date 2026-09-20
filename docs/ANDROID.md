# iOS / Android アプリ化ガイド（Capacitor）

あなたの環境（MacBook Pro M3 Pro / iPhone 17 Pro Max / Pixel 8 / Windows PC）なら
**iOS も Android も両方ビルドできます**。土台（capacitor.config.json / package.json /
tools/sync_www.js）はこのリポジトリに用意済みです。

ゲーム本体は画像・音を全部埋め込んだ単一HTML（`dist/wq2_party.html`）なので、
**完全オフラインで動くネイティブアプリ**になります。

---

## 0. 事前準備（一度だけ）

- **Node.js**（Mac/Windows どちらでも）
- **Android**: Android Studio（Mac の M3 Pro でOK。Windows でも可）
- **iOS**: Xcode（MacBook のみ）
- リポジトリを clone して、ルートで:

```bash
npm install          # capacitor 一式が入る
npm run sync:www     # dist/wq2_party.html を www/index.html にコピー
npx cap init         # 初回のみ。appId/appName は capacitor.config.json を使うので Enter 連打でOK
```

※ Capacitor のメジャーバージョンを最新にしたい場合は package.json の `^6.1.2` を
`latest` に変えて `npm install` し直せばOKです。

---

## 1. Android（Pixel 8 で動かす → APK/Play）

```bash
npm run open:android
# = www同期 → npx cap sync → Android Studio が開く
```

Android Studio が開いたら:
1. 実機の **Pixel 8** をUSB接続（設定→端末情報→ビルド番号7回タップで開発者モード→USBデバッグON）
2. 上部の再生ボタン ▶ で **Pixel 8 に直接インストールして起動**（一番はやい確認方法）
3. 配布用は **Build → Build Bundle(s)/APK(s) → Build APK(s)** で `.apk` 生成 → 端末に入れて配れる
4. Google Play 公開時は **AAB**（Build → Generate Signed Bundle）＋ 署名鍵作成 ＋
   [Google Play Developer 登録](https://play.google.com/console)（初回$25）

## 2. iOS（iPhone 17 Pro Max で動かす → App Store）

```bash
npm run open:ios
# = www同期 → npx cap sync → Xcode が開く
```

Xcode が開いたら:
1. 左上でターゲットを **あなたの iPhone** に選択、**Signing & Capabilities** で自分の
   Apple ID（無料でも実機インストール可）を Team に設定
2. ▶ で iPhone に直接インストール
3. App Store 公開は Apple Developer Program（$99/年）＋ Archive → App Store Connect

---

## 3. アプリを更新したとき

ゲームを直したら、再ビルド→同期するだけ:

```bash
# 1) 埋め込み版を作り直す（画像/音を変えた時は scratchpad の make_inline_assets も先に）
node tools/build_standalone.js dist/wq2_party.html --src=party/index.html --embed=<inline>.js
# 2) www へ同期して各プラットフォームに反映
npm run cap:sync
```

## 4. まだ必要なもの（公開前チェックリスト）

- [ ] **アプリアイコン**（1024×1024 PNG）… GPT-imageで生成→ `npx @capacitor/assets generate` で各サイズ自動生成
- [ ] **アプリ名の最終決定**（`capacitor.config.json` の appName / appId）
      ※ **TOEIC は ETS の商標。名前や説明に「TOEIC」を使わない**（例: 「ことばクエスト」）
- [ ] **AdMob 組み込み**（`@capacitor-community/admob`）… 広告を出すなら
- [ ] **課金 組み込み**（`@capacitor-community/in-app-purchases` 等）… 300円解放を入れるなら
- [ ] ストア素材（スクショ・説明文・プライバシーポリシーURL）
- [ ] 実機での動作確認（音の初回タップ、画面比率、性能）

広告・課金は組み込み方が決まったら、こちらでプラグイン設定と最小コードを用意します。

## メモ

- `www/` `android/` `ios/` `node_modules/` は **生成物なので git 管理外**（.gitignore済み）。
  設定の元（capacitor.config.json / package.json / tools/sync_www.js）だけ管理しています。
- まず **Pixel 8 か iPhone に“素の状態”で入れて実機の手触りを見る**のがおすすめ。
  広告/課金/リネームはその後でOKです。
