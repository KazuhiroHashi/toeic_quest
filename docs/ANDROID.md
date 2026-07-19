# Androidで遊ぶ／アプリ化する方法

WORD QUEST II（および1作目）は、HTML＋Canvasだけで動く単一ファイルなので、
**Androidでもそのまま動きます**。段階に応じて3つの方法があります。

## 方法1【今すぐ・無料】Chromeで開いてホーム画面に追加（PWA風）

1. Android端末の **Chrome** で、共有されたアーティファクトのURLを開く
2. Chromeのメニュー（右上「⋮」）→ **「アプリをインストール」** または **「ホーム画面に追加」**
3. ホーム画面のアイコンから起動すると、アドレスバーのない**全画面アプリ**として遊べます

`mobile-web-app-capable` などのメタタグを入れてあるので、追加後は全画面で起動します。
※ 音は最初のタップ後に鳴り始めます（ブラウザの仕様）。

## 方法2【配布用・単一ファイル】dist/wq2_party.html を直接渡す

`dist/wq2_party.html` は画像・音を全部埋め込んだ**1ファイル完結**版です。
これを端末に保存してChromeで開けば、オフラインでも動きます。
（LINEやメールで送って「Chromeで開く」だけ。インストール不要）

## 方法3【本物のアプリ＝APK／Playストア】Capacitorでネイティブ化

ストア公開や、広告・課金（AdMob / Google Play課金）を入れる段階ではこれを使います。
手順の概要（開発PCが必要。こちらで設定を用意します）:

```
# 1) プロジェクト初期化
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "WordQuest2" "com.example.wordquest2"

# 2) dist/wq2_party.html を www/index.html として配置
mkdir -p www && cp dist/wq2_party.html www/index.html

# 3) Androidプロジェクトを生成してビルド
npx cap add android
npx cap sync android
npx cap open android   # Android Studio が開く → ビルド/実行 or APK出力
```

- **Android Studio**（無料）で「Build > Build APK」すると、実機に入れられるAPKができます
- Playストア公開には Google Play Developer 登録（初回のみ $25）が必要
- 広告（AdMob）・課金は Capacitor プラグインで追加できます。必要になったら、
  このリポジトリに `android/` 一式とプラグイン設定を用意します

## 補足

- iPhone向けも同じ仕組み（Safariで「ホーム画面に追加」／将来はCapacitor→Xcode→App Store）
- まずは**方法1**でAndroid実機の操作感（タッチ操作・画面比率）を確認するのがおすすめです。
  気になる点（ボタン位置・文字サイズなど）があれば調整します
