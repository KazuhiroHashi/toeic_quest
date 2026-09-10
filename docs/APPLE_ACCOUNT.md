# Apple デベロッパアカウントの状況

チャットは流れるので、ここに記録しておく。

---

## いまの状態（2026-09-10）

**個人 → 組織（個人事業主）への登録申請が受理され、Apple の確認待ち。**

```
登録ID：              7B8K5QVZ2T
Apple ID のメール：   hashino0519@yahoo.co.jp
仕事用のメール：      contact@bridge-ai-tokyo.com
法人名：              BRIDGE AI
D-U-N-S番号：         699799177
住所：                Nishiminemachi 13-6
                      Bell Collins Kugahara 308
                      Ota-ku, Tokyo 145-0075
                      Japan
```

Apple からの受理メール（Apple Developer Relations）：

> お客様の登録申請を受理いたしました。お客様が組織を代表して Apple Developer Program の
> 法的な契約を交わす権限をお持ちであることが確認でき次第、登録の完了手順を
> メールにてご案内いたします。

**こちらからやることは無い。** 完了手順のメールを待つ。

### ⚠️ 完了するまで iOS は出せない

移行の処理中は「Certificates, Identifiers & Profiles」が使えない。
つまり**配布用の証明書が作れず、Xcode の Archive → Upload が最後で落ちる**。

Xcode で出るのはこの2つ。**どちらもアプリの不具合ではない。**

```
No Account for Team "W2TSCP2QY2".
No signing certificate "iOS Distribution" found
```

この間、**Android（Google Play）はまったく影響を受けない**。そちらを進める。

### メールが来なかったら

**3営業日**待って何も来なければ、デベロッパサポート（金子さん）に返信して催促する。
前回は8月17日に申請して、返事が来るまで**23日**かかった。放っておくと止まったままになる。

催促の文面：

```
デベロッパサポート　御中

お世話になっております。橋埜です。

個人事業主としての登録申請を提出し、受理のご連絡をいただきました。
署名権限の確認をお待ちしている状況ですが、進捗をご教示いただけますでしょうか。

　登録ID：7B8K5QVZ2T
　法人名：BRIDGE AI
　D-U-N-S番号：699799177

審査を通過済みのアプリを公開できない状態が8月17日から続いており、
早めのご対応をいただけますと助かります。

よろしくお願いいたします。
```

---

## 完了したあとにやること

1. **Xcode でアカウントを入れ直す**
   Xcode → Settings → Apple Accounts。「Certificates, Identifiers, & Profiles」の
   赤い ❌ が消えていることを確認する。
2. **配布用の証明書を作る**
   同じ画面の Manage… → ＋ → **Apple Distribution**
3. **プロジェクトで Team を選び直す**
   Signing & Capabilities → Automatically manage signing にチェック → Team を選ぶ
4. **Archive → Distribute App → App Store Connect → Upload**

> 移行で **Team ID が変わる可能性がある**。変わっていたら、上の1〜3を
> やり直せば追いつく。バンドルID（`com.bridgeai.wordquest`）は変わらない。

## 完了すると変わること

| | 変化 |
|---|---|
| App Store の販売元名 | 個人名 → **BRIDGE AI** |
| 個人メンバーシップの「売上とトレンド」 | 使えなくなる（Appleの事前案内どおり） |
| 移行前の売上 | 移行開始時点の銀行口座に振り込まれる |
| バンドルID・アプリの記録 | **変わらない** |

---

## これまでの経緯

| 日付 | できごと |
|---|---|
| 2026-08-17 | 個人→組織の移行を申請 |
| 2026-09-05 | 進捗がないため催促 |
| 2026-09-09 | サポートから返信。D-U-N-S番号の入力画面でエラーになり進めない状態と判明 |
| 2026-09-09 | サポートが**個人事業主での登録**に切り替えて手続き |
| 2026-09-10 | 登録申請を提出、受理された（登録ID 7B8K5QVZ2T）←**いまここ** |
