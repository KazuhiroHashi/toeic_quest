# 今夜やること（iOS 提出まで）

上から順に。**私に聞かなくても全部できるようにしてあります。**
つまずいたら該当箇所に「困ったら」を書いてあります。

コード側は完了しています。URLも実際に叩いて3つとも生きていることを確認済みです。

---

## 0. AdMob で広告ユニットを2つ作る（10分）

AdMob → アプリ（WORD QUEST iOS）→ 広告ユニット → 新しい広告ユニット

| 作るもの | 名前の例 |
|---|---|
| **インタースティシャル** | `WQ iOS Interstitial` |
| **バナー** | `WQ iOS Banner` |

`ca-app-pub-3056251560404390/1234567890` の形のIDが2つ出ます。

```bash
node tools/set_ads.js --interstitial-ios ca-app-pub-3056251560404390/XXXXXXXXXX
node tools/set_ads.js --banner-ios       ca-app-pub-3056251560404390/YYYYYYYYYY
npm run ads                # 確認
```

**Androidぶんは今夜は不要です**（iOS先行なので）。

> 困ったら：IDの形式が違うとツールが弾きます。数字とスラッシュだけです。

---

## 1. ビルドして Xcode へ（初回1〜2時間）

```bash
git pull
npm install            # 初回だけ
npm run build:www      # 78.2MB になれば成功
npx cap add ios        # 初回だけ
npm run assets         # 初回だけ（アイコンとスプラッシュを全サイズ生成）
npm run cap:sync       # www を同期 ＋ AdMob の App ID を注入
npm run open:ios
```

Xcode で：

1. **App** → Signing & Capabilities → **Team** に Apple Developer アカウント
2. Bundle Identifier が `com.bridgeai.wordquest` か確認
3. デバイス選択を **Any iOS Device (arm64)**
4. **Product → Archive**（5〜10分）
5. Organizer → **Distribute App → App Store Connect → Upload**

> 困ったら：`(base)` が出る環境なら先に `conda config --set auto_activate_base false` してターミナルを開き直す。
> Anaconda の curl を掴んで `pod install` が `libssl.3.dylib` で失敗します。

---

## 2. App Store Connect に登録（1〜2時間）

貼り付ける文字列は **`docs/STORE_LISTING.md` の「App Store Connect 貼り付け用」**にすべて確定させてあります。文字数も検証済み。

- App名 / サブタイトル / キーワード / プロモーションテキスト
- サポートURL・プライバシーポリシーURL・**利用規約URL**（「App情報」欄）
- カテゴリ：教育（第2：ゲーム／ワード）

### スクリーンショット

`store/screenshots/` の7枚（1290×2796）。**この順で入れてください。**

```
02_quiz → 03_boss → 01_title → 06_grades → 04_wordbook → 05_records
```

1枚目しか見られないことが多いので、**単語クイズで攻撃する絵を先頭に**。

### サブスクリプション

| | |
|---|---|
| 製品ID | `wordquest_premium_monthly` |
| 表示名 | `WORD QUEST プレミアム` |
| 期間・価格 | 1か月・自動更新・**¥500** |
| 審査用スクショ | `store/screenshots/07_subscription.png` |

**Small Business Program にも登録してください。**手数料が30%→15%になります。申請するだけです。

### App のプライバシー

**トラッキング：しない。**ATTを呼ばず非パーソナライズ広告のみで運用しています。
AdMob が取得するものは「**あなたに紐づけられないデータ**」（識別子・使用状況・診断）として申告。
位置情報・連絡先・カメラ・マイク・写真は一切使いません。

### 年齢制限

アンケートで「**第三者の広告を含む**」を選択。それ以外に該当項目はありません。

---

## 3. TestFlight で実機確認

**ここでしか確かめられないもの：**

- [ ] 読み上げ音声が **2問目以降も鳴り続ける**（iOSで一番壊れやすい）
- [ ] タイトル右上の **英** を押すと読み上げが止まる
- [ ] 戦闘前の広告が **第2・4・6・8・10戦の直後**に出る
- [ ] 下のバナーが **操作ボタンに重なっていない**
- [ ] 全滅 → 広告 → 復活で、**敵のHPが半分ぶん残っている**
- [ ] OPムービーが初回起動で流れ、スキップできる

**この段階では `testing: true` のままにしてください。**
自分で本番広告を何度もタップすると、AdMob が不正トラフィックと判定して
**アカウントごと停止**されます。

---

## 4. 提出用ビルド

実機確認が終わってから、最後に切り替えます。

```bash
npm run ads:live       # testing: false へ
npm run ads            # 本番IDが揃っているか確認
npm run build:www      # ★テスト用IDが残っていると、ここで止まります
npm run cap:sync
npm run open:ios       # Archive → Upload
```

`npm run build:www` は、**本番モードなのにテスト用IDが残っていたらビルドを中止します。**
「公開したのに広告収入がゼロ」を防ぐための仕掛けです。

提出後、Androidの作業に戻るときは `npm run ads:test` でテストモードへ戻せます。

---

## 確認済み（今夜やらなくてよいこと）

| | |
|---|---|
| 本番ビルド | 78.2MB／透過チェックOK／上限200MB OK |
| 通し動作 | タイトル→闘技場→戦闘→クイズ→判定まで **JSエラーなし・読み込み失敗なし** |
| 出荷ビルドの中身 | 読み上げ4,883語／BGM17曲／効果音18／OP・ED |
| 未完成モード | 出荷ビルドから除外済み（「制作中」の文字は0件） |
| プライバシーポリシー | https://bridge-ai-tokyo.com/wordquest/privacy.html **HTTP 200** |
| 利用規約 | https://bridge-ai-tokyo.com/wordquest/terms.html **HTTP 200** |
| サポート | https://bridge-ai-tokyo.com/support.html **HTTP 200** |
| iOS の Info.plist | AdMob App ID・輸出コンプライアンス・ATT不使用の設定を自動注入 |

---

## 審査でつまずきやすいところ

- **リンク切れ** — 上の3つは確認済み。App Store Connect に打ち込むときのタイプミスだけ注意
- **申告と実装の食い違い** — 「追跡しない」と申告するので、ATTを足す改修をするときは申告も直すこと
- **サブスクの審査用スクショ忘れ** — `07_subscription.png` を必ず添付
- **利用規約URLの未設定** — サブスクを出すなら「App情報」欄に必須
