# Mac でやること（M3 Pro / 2026-08-15 時点）

コードとアセットの準備はこちら側で完了しています。**このページのコマンドを上から順に実行するだけ**です。
所要時間はインストール込みで初回1〜2時間、2回目以降は10分程度。

---

## ⚠️ Anaconda を使っている場合は最初にこれ

プロンプトが `(base)` で始まるなら Anaconda が有効です。
Anaconda は `ffmpeg` `cwebp` `curl` などを **x86_64ビルドで PATH の先頭に置く**ため、
Apple Silicon では次々に失敗します（実際に3回踏みました）。

```bash
conda config --set auto_activate_base false
```

実行後に**ターミナルを開き直す**と `(base)` が消えます。
Python を使うときだけ `conda activate base` すればよく、普段の開発に支障はありません。

これをやらずに進めると、以下の場所で必ず止まります：

| コマンド | 症状 |
|---|---|
| `npm run build:www` | `libfreetype` / `incompatible architecture` |
| `npx cap sync` | `pod install` が `libssl.3.dylib` で失敗 |

---

## 事前チェック

ターミナルを開いて、まず今の状態を確認します。

```bash
node -v          # v18 以上なら OK。「command not found」なら下でインストール
xcodebuild -version   # Xcode は導入済みのはず
```

### Node.js と ffmpeg
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"   # Homebrew未導入なら
brew install node ffmpeg webp
```

> **ffmpeg は必須です。** ビルド時に BGM を128kbpsへ変換するのに使います。
> `webp`（cwebp）も入れておくと、ffmpeg が WebP に対応していない場合の保険になります。
>
> **⚠️ Anaconda を入れている場合の注意**
> Anaconda が同梱する ffmpeg は x86_64 ビルドで、Apple Silicon では
> `incompatible architecture (have 'arm64', need 'x86_64')` で落ちます。
> `which ffmpeg` が `anaconda3/bin/ffmpeg` を返す場合は、Homebrew版を明示してください：
> ```bash
> brew install ffmpeg
> FFMPEG=/opt/homebrew/bin/ffmpeg npm run build:www
> ```
> ビルドスクリプトは動く ffmpeg を自動で探しますが、この指定が確実です。
> 恒久的に直すなら `~/.zshrc` の Anaconda の PATH 追記より後ろに
> `export PATH="/opt/homebrew/bin:$PATH"` を足します。

### Android Studio（Android版に必須）
https://developer.android.com/studio からダウンロードしてインストール。
初回起動時のウィザードで **Android SDK / SDK Platform-Tools / Build-Tools** を入れる（デフォルトのままでOK）。

### Xcode の初期設定（iOS版に必須・一度だけ）
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
brew install cocoapods
```

---

## STEP 1：リポジトリを取得

```bash
git clone https://github.com/KazuhiroHashi/toeic_quest.git
cd toeic_quest
git checkout claude/toeic-quest-game-8zva6k
npm install
```

> 2回目以降は `git pull` だけでOKです。

---

## STEP 2：ビルド

```bash
npm run build:www
```

こう出れば成功です。

```
  ffmpeg: /opt/homebrew/bin/ffmpeg
  WebP  : cwebp
  画像  78MB → 7.6MB  (WebP q82)
  BGM   66MB → 44.7MB (128k)
  透過チェック: OK
  合計 63.9 MB → www/
  Google Play の上限200MB: OK
```

数値は使うエンコーダで多少前後します。**「透過チェック: OK」と「上限200MB: OK」の2つ**が出ていれば成功です。

原本は劣化させず、出力側だけ圧縮しています。未完成のストーリーモードは自動で除外されます。

---

## STEP 3：ネイティブプロジェクトを作る（一度だけ）

```bash
npx cap add android
npx cap add ios
npm run assets        # アイコンとスプラッシュを全サイズ生成
npm run cap:sync      # www を同期 ＋ AdMob の App ID を注入
```

`android/` と `ios/` は gitignore されているので、**このMac上にだけ**作られます。

> `update ios - failed!` と出ても **Android 側は完了しています**（`✓ update android` を確認）。
> iOS だけ上の Anaconda 対策をしてから `npx cap sync ios` を実行し直せば追いつきます。

---

## STEP 4：Android（AAB を作る）

```bash
npm run open:android
```

Android Studio が開いたら：

1. メニュー **Build → Generate Signed App Bundle / APK**
2. **Android App Bundle** を選択 → Next
3. **Create new…** で署名鍵を作る（初回のみ）
   - Key store path：`~/wordquest-release.jks` など
   - パスワード・別名を決める
   - **⚠️ このファイルとパスワードは絶対に失くさないでください。**
     失うと以後アプリを更新できなくなります。iCloud等にバックアップを。
4. Build Variant は **release** → Finish
5. 完成品：`android/app/release/app-release.aab`

これを Play Console の「内部テスト」または「クローズドテスト」にアップロードします。

---

## STEP 5：iOS（TestFlight へ）

```bash
npm run open:ios
```

Xcode が開いたら：

1. 左のツリーで **App** を選択 → **Signing & Capabilities**
2. **Team** に自分の Apple Developer アカウントを選ぶ
3. Bundle Identifier が `com.bridgeai.wordquest` になっているか確認
4. 上部のデバイス選択で **Any iOS Device (arm64)** を選ぶ
5. メニュー **Product → Archive**（5〜10分）
6. Organizer が開いたら **Distribute App → App Store Connect → Upload**

アップロード後、App Store Connect の TestFlight に15〜30分で現れます。

---

## ゲームを直したあと（2回目以降）

```bash
git pull
npm run cap:sync
```

そのあと STEP 4 / STEP 5 のビルド操作だけ。`cap add` と `npm install` は不要です。

---

## ⚠️ 本番提出の直前に必ず

`party/js/pnative.js` の

```js
testing: true      →      testing: false
```

**忘れるとテスト広告のまま公開され、広告収益がゼロになります。**
言っていただければこちらで切り替えます（切り替え後は `git pull` してから再ビルド）。

---

## つまずきやすいところ

| 症状 | 対処 |
|---|---|
| `npx cap add android` で SDK が見つからない | Android Studio を一度起動してウィザードを完了させる |
| `pod install` が `libssl.3.dylib` で失敗 | Anaconda の curl を掴んでいる。冒頭の `conda config --set auto_activate_base false` を実行。急ぐなら `cd ios/App && PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin" pod install` |
| `pod install` がそれ以外で失敗 | `brew install cocoapods` のあと `cd ios/App && pod install` |
| Xcode で "Signing requires a development team" | Signing & Capabilities で Team を選ぶ |
| Archive がグレーで押せない | デバイス選択が実機/シミュレータになっている。**Any iOS Device** にする |
| ビルドは通るが画面が真っ白 | `npm run build:www` を実行してから `npx cap sync` |
| `libfreetype` / `incompatible architecture` で落ちる | Anaconda の ffmpeg を掴んでいる。`FFMPEG=/opt/homebrew/bin/ffmpeg npm run build:www` |
| `音声を変換できる ffmpeg が見つかりません` | `brew install ffmpeg` |
| `WebP に変換できるツールが見つかりません` | `brew install webp` |
| `透過が失われた画像が N 件あります` | 使用中のWebPエンコーダが透過を潰している。`CWEBP=/opt/homebrew/bin/cwebp npm run build:www -- --clean` |

---

## 今どこまで終わっているか

| | 状態 |
|---|---|
| ゲーム本体・BGM11曲・OP/EDムービー | ✅ 完成 |
| バンドルID `com.bridgeai.wordquest` | ✅ |
| AdMob 広告ユニットID（iOS/Android） | ✅ コードに反映済み |
| アイコン・スプラッシュ素材 | ✅ |
| www ビルド（63.9MB） | ✅ 動作検証済み |
| **Google Play Console 開設（$25）** | ⬜ **本人確認に数日。最優先** |
| **スクリーンショット** | ⬜ Appleは必須。こちらで生成できます |
| **サポート用メールアドレス** | ⬜ privacy.html が空欄のまま |
| **Google Play テスター12人×14日** | ⬜ **ここが発売日を決めます** |
