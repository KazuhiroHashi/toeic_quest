# 発売までの実作業 playbook（アカウント→ビルド→テスト開始）

順番の要点：**Google14日テストもApple TestFlightも「ビルドファイル」が要る**。
だから **アカウント作成＆本人確認を今すぐ（遅いので）／その裏でビルド作成／出来たらアップ**。

---

## STEP 0：決めるだけ（5分）
- **名義**：会社未設立なら **個人（Individual）で今すぐ開始**が最速。あとで Bridge AI 法人へ**アプリ移管**できる（Apple/Google とも移管に対応）。
- **バンドルID**：`com.bridgeai.wordquest` を推奨（会社が実在しなくても“文字列”として使える）。※**最初のアップロード後は変更不可**。決めたら私が `capacitor.config.json` を確定します。

---

## STEP 1：アカウント作成＋本人確認（あなた・今すぐ／確認は数日）
ビルドを待たずに着手。ここが律速なので**最優先**。

### Google Play Console（$25・1回）
1. https://play.google.com/console → 「登録」
2. アカウント種別＝**個人**、$25 支払い
3. **本人確認**（氏名・住所・電話・身分証）を提出 → 数日かかることあり
4. 「アプリを作成」→ アプリ名 **WORD QUEST**

### Apple Developer（$99/年）
1. https://developer.apple.com/programs/ → 「Enroll」
2. **個人（Individual）**で登録（法人はD-U-N-Sが要り+1〜2週）
3. $99 支払い → **本人確認**完了を待つ（1〜3日）
4. App Store Connect → 「＋ 新規App」→ WORD QUEST

### 税務・銀行（両方・入金に必要／後で困らないよう早めに）
- Google：Console → お支払いプロファイル
- Apple：App Store Connect → 契約/税金/口座（Agreements, Tax, and Banking）

### AdMob（広告・並行）
1. https://admob.google.com → 登録
2. 「アプリを追加」→ WORD QUEST（まだ未公開でOK）
3. **リワード広告ユニット**を作成 → 出てくる **広告ユニットID** を私に渡す（実装はこちらで配線）

---

## STEP 2：ビルド作成（私が手順化・あなたがMacで実行／1〜2時間）
**両テストの前提**。Mac（M3 Pro）で実行。初回だけ環境準備。

### 事前（一度だけ）
- **Node.js**（未インストールなら https://nodejs.org LTS）
- **Android Studio**（https://developer.android.com/studio）
- **Xcode**（Mac App Store）

### 共通
```bash
git clone <このリポジトリ> && cd toeic_quest
npm install
# 最新ゲームビルドを www に反映（ゲームを直すたびに実行）
node tools/build_standalone.js dist/wq2_party.html --src=party/index.html   # ← 埋め込み版を作る手順は別途こちらで用意
npm run assets        # アイコン全サイズ生成（appicon/ から）
```
> ※ `dist/wq2_party.html`（全部入り単一HTML）はこちらでビルドして渡せます。あなたはそれを `www/index.html` に置く（`npm run sync:www`）だけでもOK。

### Android（AAB を作る → Googleテスト用）
```bash
npx cap add android      # 初回のみ
npm run cap:sync
npx cap open android     # Android Studio が開く
```
Android Studio で：
1. 実機Pixel8で動作確認（▶ で直接インストール）
2. 配布用：**Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
3. **署名鍵（upload key）を新規作成**（キーストアの.jksとパスワードは厳重保管！紛失＝更新不可）
4. 出力された **.aab** が Google クローズドテストにアップするファイル

### iOS（TestFlight 用）
```bash
npx cap add ios          # 初回のみ
npm run cap:sync
npx cap open ios         # Xcode が開く
```
Xcode で：
1. Signing & Capabilities → チーム（あなたのApple ID）を選択（自動署名）
2. 実機iPhoneで動作確認
3. **Product → Archive** → Organizer →「Distribute App」→ **App Store Connect** にアップロード

---

## STEP 3：テスト開始（アカウント＋ビルドが揃ったら）

### Google：12人×14日クローズドテスト（＝14日の時計スタート）
1. Console → テスト → **クローズドテスト** → トラック作成
2. **.aab をアップロード**
3. テスター登録：**メールアドレス12件以上**（Googleグループ推奨）
4. 「テストへのリンク（オプトインURL）」を12人に配布 → **各自タップで参加**（起動だけでOK・感想不要）
5. **14日連続**で条件維持 → 本番申請が解禁。テスト中はビルドを何度でも差し替え可

### Apple：TestFlight
1. アップロードしたビルドが App Store Connect → TestFlight に出る（処理数分）
2. **内部テスト**（自分/身内の端末）＝**審査不要で即配信**
3. 外部テスターに広げる場合のみ簡易審査あり

---

## いちばん大事な順番（まとめ）
1. **今日**：Google/Apple/AdMob アカウント作成＋本人確認提出（遅いので先に）。バンドルID決定。
2. **確認待ちの間**：私と一緒にビルド（AAB/IPA）を作る。
3. **アカウント有効化＆ビルド完成**：Googleクローズドテスト（12人）開始＝14日カウント／Apple TestFlight配信。
4. **裏で**：私がゲーム仕上げ＋AdMob/¥600課金の本実装。
5. **14日経過＆完成**：両ストアに本提出。

## 私が今できること（言ってくれれば即対応）
- バンドルID確定 → `capacitor.config.json` 反映
- `dist` 埋め込みビルドを最新化して渡す（あなたはStudio/Xcodeに載せるだけ）
- AdMobリワード＆¥600課金の**ネイティブ配線**（IDをもらえたら）
