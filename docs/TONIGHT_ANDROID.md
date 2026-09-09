# 今晩やる：Android版を作ってGoogleに出すまで（コピペ手順）

Appleが止まっていても、**Android側は全部進められます**。
Googleの「12人×14日」が最大のボトルネックなので、**今晩ここを開始できれば1〜2週間短縮**できます。

所要：**PC作業 60〜90分**（うち待ち時間が半分）＋ Google審査の待ち

---

# PART 1：ブラウザだけでできる（Mac不要・今すぐ）

## 1-A. Google Play Console 登録（30分＋承認待ち数日）★最優先
1. https://play.google.com/console/signup
2. アカウントの種類 → **「自分用」（個人）**
3. **開発者名** → `Bridge AI`（ストアに表示されます）
4. 連絡先メール・電話を入力 → **$25 をカード決済**
5. **本人確認**（氏名・住所、後日 身分証の提出を求められることあり）を提出
   - ⚠️ ここの承認に**数日**かかる。**今晩出すこと自体が最大の時短**

## 1-B. AdMob（15分／Androidぶんだけ先でOK）
`docs/ADMOB_STEPS.md` の通り。要点だけ：
1. https://admob.google.com → 同じGoogleアカウントで開始
2. 国＝日本／**通貨＝JPY**（⚠️後から変更不可）
3. 「アプリを追加」→ **Android** → ストア登録済み？→**いいえ** → 名前 `WORDRIA`
   （※登録済みのものは改名前の `WORD QUEST` のまま。IDが同じなら影響しない）
4. 「広告ユニットを追加」→ **リワード** → 名前 `continue_reward` → 作成
5. **2つのIDをコピーしてチャットに貼る**（私が即コードに入れます）
   ```
   Android アプリID: ca-app-pub-________~________
   Android リワードID: ca-app-pub-________/________
   ```

## 1-C. Googleグループ作成（3分）＝テスターの受け皿
1. https://groups.google.com →「グループを作成」
2. 名前 `wordquest-testers` ／ メール `wordquest-testers@googlegroups.com`
3. **参加設定＝「誰でも参加できる」**（重要）
4. → Play Console にはこの**メール1個**を登録するだけで済むようになる

## 1-D. サポート用Gmail作成（3分）
- 例：`bridgeai.support@gmail.com`
- **アドレスを私に教えてください** → プライバシーポリシーに差し込みます（ストア申請で必須）

---

# PART 2：Mac作業（Android Studio）

> **2026-09-09：Capacitor 8 に上げました。**
> Google Play が新規アプリに APIレベル36 を要求するようになり、
> Capacitor 6（34）では AAB を受け付けてもらえないためです。
> `android/` は作り直しが要ります。手順は `docs/CAPACITOR8_MIGRATION.md`。

## 2-A. 事前インストール（初回のみ・ダウンロード待ちが長いので先に開始）
- **Node.js**: https://nodejs.org （**v22以上**。Capacitor 8 の必須要件）
- **Android Studio**: https://developer.android.com/studio
  - 初回起動時のセットアップウィザードは**全部そのままNext**でOK

## 2-B. リポジトリを取ってビルド準備（コピペ実行）
ターミナルで、上から順に貼るだけ：

```bash
# 1. リポジトリ取得（すでにcloneしてあるならcdだけでOK）
git clone https://github.com/KazuhiroHashi/toeic_quest.git
cd toeic_quest
git checkout claude/toeic-quest-game-8zva6k
git pull

# 2. 依存インストール（数分）
#    Capacitor 8 に上げたので、古い node_modules は一度消す
rm -rf node_modules android
npm install

# 3. 最新のゲーム本体を www/ に配置
npm run build:www

# 4. アプリアイコンとスプラッシュを全サイズ自動生成
npm run assets

# 5. Androidプロジェクトを作成
npx cap add android

# 6. 同期＋AdMobのアプリIDを注入（この1行でまとめてやる）
npm run cap:sync

# 7. Android Studio を開く
npx cap open android
```

> ⚠️ **6行目を `npx cap sync` だけで済ませないこと。**
> `npm run cap:sync` は `npx cap sync` のあとに `npm run admob` を走らせて、
> AdMob のアプリIDを AndroidManifest.xml に書き込みます。これが無いと
> AdMob の初期化が失敗し、**広告が一切出ません**（しかも黙って失敗します）。
> 入ったかどうかは、タイトル画面のビルド番号を1.5秒長押しすると読めます。

## 2-C. Android Studio での作業
1. 開いたら右下に「Gradle sync」が走る → **終わるまで待つ**（初回5〜10分）
2. 実機テスト（任意）：Pixel 8 をUSB接続 → 上部の ▶ で直接インストール
   - 事前に端末側で：設定 → デバイス情報 → **ビルド番号を7回タップ** → 開発者オプション → **USBデバッグON**
3. **配布用AABを作る**：
   - メニュー **Build → Generate Signed Bundle / APK...**
   - **Android App Bundle** を選択 → Next
   - 「Key store path」→ **Create new...**
     - 保存先：わかりやすい場所（例：`~/wordquest-upload-key.jks`）
     - パスワード（2箇所）／エイリアス `upload` ／ 有効期間25年以上
     - 氏名・組織など適当に埋めてOK
     - 🔴🔴 **この .jks とパスワードは絶対に紛失しないこと**（紛失＝二度とアプリ更新できません）
       → クラウドとUSBの**2箇所にバックアップ**
   - Next → **release** を選択 → Create
4. 完成した `.aab` の場所（通常）：
   `android/app/build/outputs/bundle/release/app-release.aab`

---

# PART 3：Googleに提出（Console承認が下りたら）

1. Play Console → **アプリを作成**（アプリ名 `WORDRIA` ／日本語／ゲーム／無料）
2. 左メニュー **テスト → クローズドテスト** → 「新しいトラックを作成」
3. **AABをアップロード**
4. **テスター**タブ → メーリングリスト → `wordquest-testers@googlegroups.com` を追加
5. 「テストへのリンクをコピー」→ **このURLを12人に配る**（`docs/TESTER_RECRUIT.md` の文面）
6. 12人が参加した時点から **14日カウント開始** 🔥

### 併せて聞かれる項目（先に用意済み）
- **プライバシーポリシーURL** → `store/privacy.html`（メール差し込み後に公開URL化）
- **データセーフティ** → `docs/STORE_LISTING.md` に回答テンプレあり
- **アプリのアクセス権** → 「すべての機能が制限なく利用可能」
- **広告** → **あり**（AdMob使用）
- **コンテンツレーティング** → アンケートに回答（教育ゲーム・暴力表現なし）

---

# 今晩の「押すだけ」チェックリスト
- [ ] 1-A Play Console登録＋本人確認提出（★最重要・待ちが長い）
- [ ] 1-B AdMob作成 → **IDを私に貼る**
- [ ] 1-C Googleグループ作成
- [ ] 1-D サポート用Gmail作成 → **アドレスを私に伝える**
- [ ] 2-A Node.js / Android Studio のダウンロード開始（待ち時間が長いので早めに）
- [ ] 2-B コマンド7行を実行
- [ ] 2-C AAB作成（署名鍵は厳重保管）

詰まったら**その画面のスクショ**を送ってください。すぐ解決します。
