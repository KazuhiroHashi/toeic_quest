# iOS 先行リリース手順

App Store だけ先に出す。Google Play は後から追いかける。
2026-08-22 時点。**Apple Developer Program は登録済み。**

Google Play を待たずに済む理由：Play の「12人×14日のクローズドテスト」は
2023年11月以降に作られた**個人**アカウントの義務で、審査の待ち時間より長い。
iOS の審査は通常24〜48時間で、この義務がない。

> **D-U-N-S番号をお持ちなら、Play も組織アカウントで開けば12人×14日は対象外です。**
> iOS を出したあと、同じビルドから短期間で追いつけます。

---

## いま止まっているのは1つだけ

**AdMob の iOS用インタースティシャル広告ユニットID。**

`party/js/pnative.js` の `interstitialIos` が Google のテスト用IDのままです。
このまま公開すると、戦闘前の広告は1円も生みません。

- AdMob管理画面 → 広告ユニット → **インタースティシャル**を iOS アプリ用に1つ作成
- `ca-app-pub-3056251560404390/XXXXXXXXXX` の形式のIDを渡してください
- Android用は iOS 先行なら後回しでかまいません

リワード広告（スタミナ回復・復活）の iOS用IDは本番のものが入っています。

---

## すでに入っているもの（触らなくてよい）

| | |
|---|---|
| Bundle ID | `com.bridgeai.wordquest` |
| AdMob App ID (iOS) | `ca-app-pub-3056251560404390~6974212233` |
| `GADApplicationIdentifier` | `npm run cap:sync` が Info.plist へ自動注入 |
| `ITSAppUsesNonExemptEncryption` | `false` を自動注入。**輸出コンプライアンスの質問が毎回出なくなる** |
| `NSUserTrackingUsageDescription` | 自動で削除。ATTを使わず非パーソナライズ広告のみのため |
| スクリーンショット | `store/screenshots/` に5枚（1290×2796） |
| アイコン・スプラッシュ | `appicon/`。`npm run assets` が全サイズ生成 |
| プライバシーポリシー | https://bridge-ai-tokyo.com/wordquest/privacy.html |
| 利用規約（EULA） | https://bridge-ai-tokyo.com/wordquest/terms.html |
| サポートURL | https://bridge-ai-tokyo.com/support.html |
| 掲載文 | `docs/STORE_LISTING.md` |

---

## 手順

### 1. App Store Connect でアプリを登録

- 名前：**WORD QUEST 〜 沈黙の四天王 〜**（`docs/STORE_LISTING.md`）
- Bundle ID：`com.bridgeai.wordquest`
- **「App情報」に利用規約URLを設定**（上記のterms.html）。サブスクを出すなら必須

### 2. サブスクリプションを登録

- サブスクリプショングループを作る（例：`WORD QUEST プレミアム`）
- 製品ID **`wordquest_premium_monthly`** ／ 自動更新 ／ **月額 ¥500**
- 表示名と説明を日本語で入れる
- **審査用のスクリーンショット**が要る。タイトルの「★ プレミアム（月額¥500・広告オフ）」を
  押したときの画面を撮って添付する
- **Small Business Program に登録する。**年商1億円未満なら手数料が30%→15%。
  申請するだけで、サブスク収入がほぼ倍になる

### 3. App のプライバシー（栄養ラベル）

広告を出すので申告が要る。方針は**「追跡はしない」で統一**。

- **トラッキング：しない。**ATTのダイアログを出さず、非パーソナライズ広告のみで運用している
- AdMob が広告配信・不正防止のために取得する情報は「**あなたに紐づけられないデータ**」として申告する
  （識別子・使用状況データ・診断）
- 位置情報・連絡先・カメラ・マイク・写真は一切使わない

> 申告の内容はアプリの実装と一致していなければならず、食い違うとリジェクトされます。
> 迷ったら送る前に相談してください。

### 4. 年齢制限

広告を含むので、アンケートで「**第三者の広告**」を含むと答える。
暴力表現は戦闘のみで、レーティングは低く出るはずです。

### 5. Mac でビルド

```bash
git pull
npm install          # 初回のみ
npm run build:www    # 78.2MB になれば成功
npx cap add ios      # 初回のみ
npm run assets       # 初回のみ。アイコンとスプラッシュを全サイズ生成
npm run cap:sync     # www を同期 ＋ AdMob の App ID を注入
npm run open:ios
```

Xcode が開いたら：

1. 左のツリーで **App** → **Signing & Capabilities** → **Team** に Apple Developer アカウントを選ぶ
2. Bundle Identifier が `com.bridgeai.wordquest` か確認
3. 上部のデバイス選択を **Any iOS Device (arm64)** にする
4. **Product → Archive**（5〜10分）
5. Organizer → **Distribute App → App Store Connect → Upload**

`(base)` が出る環境なら、先に `conda config --set auto_activate_base false`。
Anaconda の curl を掴んで `pod install` が `libssl.3.dylib` で失敗します。

### 6. TestFlight で実機確認

**ここでしか確かめられないもの：**

- [ ] 読み上げ音声が **2問目以降も鳴り続ける**（iOSで一番壊れやすい）
- [ ] 🗣 をオフにすると本当に鳴らない
- [ ] 戦闘前の広告が2戦ごとに出る
- [ ] 全滅→広告→復活で、敵のHPが半分ぶん残っている
- [ ] OPムービーが初回起動で流れ、スキップできる
- [ ] マナースイッチをオンにすると音が出ない（iOSの仕様どおり）

### 7. 提出

**提出用ビルドの直前に `testing: false` へ切り替えます。**言ってください、5分です。

```
TestFlight まで   testing: true   ← 自分でタップしても安全
提出するビルド     testing: false  ← 本番広告
```

**順番を逆にしないでください。**テスト中に本番広告を自分で何度もタップすると、
AdMob が不正トラフィックと判定してアカウントごと停止されます。

---

## 想定スケジュール

| | |
|---|---|
| AdMob の iOS用インタースティシャル作成 | 10分 |
| App Store Connect の登録＋サブスク＋申告 | 1〜2時間 |
| Mac でビルド → アップロード | 初回1〜2時間 |
| TestFlight に現れるまで | 15〜30分 |
| 実機確認 | 任意 |
| 審査 | 通常24〜48時間 |

**最短で数日。**Google Play の2週間を待つ必要はありません。
