# WORD QUEST 発売までの残作業（2026-08-07 実測）

担当：🧑=あなた（アカウント・お金・実機・法務判断）／🤖=Claude（コード・文書・素材加工）

---

# 1. BGM — 8曲不足。実害が出ている

`js/bgm.js` は21トラックを定義しているが、`assets/bgm/` には13曲しかない。
足りないぶんは自動でフォールバックするので**無音にはならない**が、同じ曲が続く。

## 11戦を通しで再生したときに実際に鳴る曲

| 戦 | 敵 | 指定 | 実際に鳴る曲 |
|---|---|---|---|
| 1 | スペルバード他 | `arena1` | battle / battle2（ランダム） |
| 2 | ペンシルラビット他 | `arena2` | battle / battle2 |
| 3 | | `arena3` | battle / battle2 |
| 4 | | `arena4` | battle / battle2 |
| 5 | 洞窟の古竜 | `midboss` | **midboss** ✅ |
| 6 | 四天王ハウル | `king1` | **boss** |
| 7 | 四天王ガグ | `king2` | **boss** |
| 8 | 四天王ブランク | `king3` | **boss** |
| 9 | 四天王イレイズ | `king4` | **boss** |
| 10 | 沈黙王ミュートス | `boss` | **boss** |
| 11 | 真・ミュートス | `lastboss` | **lastboss** ✅ |

**問題は第6〜10戦。5連戦が全部 `boss.mp3` の1曲。** ここが一番長く、一番盛り上がるはずの区間で、
プレイヤーは同じループを30分以上聴かされる。「曲が足りない」と感じたのはこれ。

第1〜4戦は2曲ローテなのでまだ許容範囲。

## 必要なもの

- 🧑 **`king1.mp3` 〜 `king4.mp3`（最優先）** — 5連戦問題が解消する
- 🧑 `arena1.mp3` 〜 `arena4.mp3`（次点）
- プロンプトは **`docs/AUDIO_PROMPTS_BATTLES.md` に8曲ぶん用意済み**。Sunoに貼るだけ
- 保存先は `assets/bgm/`。ファイル名を合わせれば**コード変更は一切不要**

## いますぐできる緩和策（Suno待ちなし）

`battle_dungeon.mp3` が**リポジトリにあるのに1箇所も使われていない**。
四天王戦の2つに割り当てれば、5連戦の単調さが半分になる。1行の変更で済む。
→ **やるか指示ください**（ゲームバランスには一切触れません）

---

# 2. 提出をブロックしている項目

これが揃わないと審査に出せない。

| | 項目 | 状態 |
|---|---|---|
| 🧑 | Apple Developer Program 登録 | ✅ 完了 |
| 🧑 | Google Play Console 開設（$25）＋本人確認 | ⬜ 確認に数日かかる |
| 🧑 | **サポート用メールアドレス**（公開される） | ✅ contact@bridge-ai-tokyo.com |
| 🧑 | **スクリーンショット** | ✅ store/screenshots/ に5枚（1290×2796） |
| 🧑 | Mac に Node.js ＋ Android Studio を導入 | ⬜ Xcodeは導入済み |
| 🧑 | 署名付き AAB（Android）／ IPA（iOS）をビルド | ⬜ |
| 🤖 | `party/js/pnative.js` の `testing: true` → `false` | ⬜ **ビルド直前に必ず**（忘れるとテスト広告のまま公開される） |
| 🧑 | App Store Connect / Play Console でアプリ登録 | ⬜ |
| 🧑 | **サブスク `wordquest_premium_monthly`（月額¥500・自動更新）を両ストアに登録** | ⬜ Google Play は基本プラン（月額）も作る |
| 🧑 | App Store Connect の「App情報」に**利用規約(EULA)のURL**を設定 | ⬜ https://bridge-ai-tokyo.com/wordquest/terms.html |
| 🧑 | **Google Play クローズドテスト 12人 × 14日連続** | ⬜ **最長の待ち時間。ここが全体の締切を決める** |

**12人×14日が critical path です。** 他が全部終わっていても、ここを始めてから最短2週間。
テスター募集文は `docs/TESTER_RECRUIT.md` にあります。**今日始めるかどうかで発売日が2週間動きます。**

---

# 3. できているもの

| 項目 | 状態 |
|---|---|
| ゲーム本体（11戦＋挑戦の塔＋復習＋実績） | ✅ |
| バンドルID `com.bridgeai.wordquest` | ✅ |
| AdMob 広告ユニットID（Android / iOS 両方） | ✅ コードに反映済み |
| 収益化（スタミナ1／日・動画1本で+1（上限なし）／区切りのいい場所で全画面広告／月額¥500サブスク） | ✅ 下部バナーは2026-09-08に廃止（遊びの最中ずっと画面を占めるため） |
| アイコン・ロゴ・キービジュアル | ✅ |
| **OP ムービー 27.1秒** | ✅ 1080×1920 / H.264+AAC |
| **ED ムービー 24.5秒** | ✅ 同上 |
| プライバシーポリシー | ✅ https://bridge-ai-tokyo.com/wordquest/privacy.html |
| 利用規約（サブスク条件・解約方法を明記） | ✅ https://bridge-ai-tokyo.com/wordquest/terms.html |
| ストア掲載文 | ✅ `docs/STORE_LISTING.md` |
| 効果音 | ✅ 全参照ファイルが存在 |

---

# 4. あった方がいいが、なくても出せる

- ~~OP/ED をゲーム内で再生する~~ → **実装済み**（2026-08-15）。
  720pに圧縮して +11MB。初回起動時にOP（スキップ可）、クリア後のエピローグの後にED
- 中学生・高校生向け単語4,016語（`data/vocab_*.js`）は**意図的に未接続**のまま
- プレイ時間が1〜2時間と短い。コンテンツ追加はリリース後でよい

---

# 4.5 Android版を出すときに必ず見ること

**iOS版のために iOS 寄りにしてある箇所がある。** Android版のビルド前に、ここを上から順に確認すること。

| | 項目 | いまの状態 |
|---|---|---|
| 1 | **`party/js/pnative.js` の `interstitialAndroid`** | ❗ **Google のテスト用IDのまま。** AdMob で Android 用のインタースティシャルを作って差し替える。忘れるとその枠の収益がゼロになる（`rewardedAndroid` だけは本番IDが入っている） |
| 2 | **課金の開示文（`party/js/pstore.js` の `storeWords()`）** | ✅ 自動。`Capacitor.getPlatform()` を見て Android では「Google アカウントに請求」「解約は Google Play の設定から」に切り替わる。**手で書き換えないこと。** iOS版の画面に「Google Play」と書いてあると審査で指摘されるため、この分岐を消してはいけない |
| 3 | Google Play にサブスク `wordquest_premium_monthly` を登録 | ⬜ iOS と同じIDで作り、その下に**基本プラン（月額）**を作る |
| 4 | `npm run ads:live` を実行してから AAB をビルド | ⬜ `node tools/set_ads.js --show` で本番モードとID一覧を確認できる |
| 5 | クローズドテスト 12人 × 14日連続 | ⬜ ここが Android の critical path |

---

# 5. 私がすぐ着手できること

言っていただければ今日中に片付きます。

1. **スクリーンショットの自動生成** — ヘッドレスブラウザで実機解像度（1290×2796）で撮影。
   タイトル／戦闘／クイズ／レベルアップ／エンディングの5〜8枚を狙った構図で撮ります
2. **`battle_dungeon.mp3` を四天王戦へ割り当て**（1行）
3. **`testing: false` への切り替え**（ビルド直前に）
4. メールアドレスをいただければ `privacy.html` を完成させます
