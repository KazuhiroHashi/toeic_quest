# App Review への回答（Guideline 2.1 - Information Needed）

Submission ID: 02155668-14f2-4b70-8bda-f3ad18ab1c74

これは**却下ではない**。審査履歴の少ないデベロッパーに対して Apple が毎回出す
定型の情報提供依頼で、アプリの中身を否定されたわけではない。求められている
7項目に答えれば審査に進む。

貼り付け先は**2か所**。どちらにも同じ本文を入れる。

1. App Store Connect →「App Review」ページ → 返信欄
2. バージョンのページ →「App Review情報」→「メモ」欄
   （2に入れておくと、次回以降の審査でも読まれる）

言語は英語。審査担当は英語圏なので、そのほうが早い。

---

## 送る本文（英語・そのまま貼る）

```
Thank you for the review. Please find the requested information below.

--------------------------------------------------
1. SCREEN RECORDING
--------------------------------------------------
A screen recording captured on a physical iPhone running the latest iOS is
attached to this reply. It starts from launching the app and shows the
typical user flow, including the subscription purchase flow.

The app has NO account registration, NO login, and NO account deletion flow,
because the app does not use accounts of any kind. All progress is stored
locally on the device.

The app has NO user-generated content, NO social features, and NO
communication between users. Therefore no content reporting or blocking
mechanism is required or present.

--------------------------------------------------
2. PURPOSE AND TARGET AUDIENCE
--------------------------------------------------
WORD QUEST is an English vocabulary learning game for Japanese speakers.
The entire user interface is in Japanese; the material being learned is
English vocabulary.

Problem it solves:
In Japan, English vocabulary is normally studied with flashcards and word
lists. It is repetitive, and most learners stop before the vocabulary is
retained. The difficulty is not comprehension but continuation.

How it solves it:
The app is a turn-based role-playing game in which answering a vocabulary
question IS the attack. When the player selects "attack", a four-choice
question appears with a five-second timer. A correct answer damages the
enemy. An answer given within two seconds is a critical hit. A wrong answer
or a timeout lets the enemy strike back. Because the vocabulary question is
the core game mechanic rather than a separate quiz screen, the learner keeps
answering questions in order to keep playing.

Content:
- 5,761 English words, each with a pre-recorded audio pronunciation file
  bundled in the app (no speech synthesis, no network required)
- 3,000 of these are TOEIC vocabulary, evenly divided into six score bands
  of 500 words each
- TOEIC score bands 400 / 500 / 600 / 700 / 800 / 900
- Japanese school levels: junior high 1st, 2nd, 3rd year; high school basic;
  university entrance; advanced university entrance

Target audience:
- Japanese junior high school and high school students studying English
  vocabulary for school and entrance examinations
- Japanese adults studying English vocabulary, including those preparing for
  the TOEIC test

The app is rated for general audiences and is not directed at children under
13. It is not submitted to the Kids Category.

--------------------------------------------------
3. SETUP AND ACCESS INSTRUCTIONS
--------------------------------------------------
No login credentials, demo account, or sample files are required.
The app is fully playable immediately after installation and works offline.

First launch:
1. A dialog asks which vocabulary set to use. Choose "TOEIC" or
   "学生" (student). Either choice is fine for review.
2. Tap anywhere to start. The title screen appears.

Main features, all reachable from the title screen:
- ことばの闘技場 (Arena) - the main game mode. Eleven consecutive battles.
- 挑戦の塔 (Tower) - endless mode, hidden until the Arena is cleared once.
- 学習の記録 (Study records) - accuracy, daily history, weak words.
- 出題：TOEIC (Vocabulary range) - switch between TOEIC bands and school years.
- 難易度 (Difficulty) - easy / normal / hard.
- 単語帳 (Wordbook) - every word encountered, with meaning and accuracy.
- 称号・記録 (Achievements and records) - titles, best time, best chain.
- ★ プレミアム (Premium) - the subscription. See section 7.
- 🎬 (top left) - replays the opening movie.
- 🔊 (top right) - background music on / off.

To reach a battle quickly: title screen -> tap ことばの闘技場 -> tap through
the message -> the battle begins -> tap たたかう (attack) -> a vocabulary
question appears -> tap one of the four answers.

--------------------------------------------------
4. EXTERNAL SERVICES, TOOLS AND PLATFORMS
--------------------------------------------------
The app uses only two external components:

- Google AdMob (advertising) - interstitial and rewarded video ads, shown to
  free users only. There is no banner ad; nothing is displayed during play.
  Ads are disabled entirely for subscribers.
- Apple In-App Purchase / StoreKit - for the auto-renewable subscription.

There is nothing else. Specifically, the app does NOT use:
- any backend server or API of our own
- any analytics or attribution SDK
- any authentication or account service
- any payment processor other than Apple In-App Purchase
- any AI or machine learning service, at runtime or otherwise
- any third-party data provider

All vocabulary data, audio pronunciation files, artwork, music and sound
effects are bundled inside the app binary. Apart from serving ads, the app
requires no network connection and functions completely offline.

The app does not access location, contacts, camera, microphone, photos,
health data, or the address book. It collects no personal information.

--------------------------------------------------
5. REGIONAL DIFFERENCES
--------------------------------------------------
The app functions identically in all regions. There are no region-gated
features, no region-specific content, and no server-side configuration.

The app is offered in Japanese only, because the entire user interface and
all explanatory text are written in Japanese for Japanese learners of
English. This is a language limitation, not a functional difference between
regions.

--------------------------------------------------
6. REGULATED INDUSTRY AND THIRD-PARTY MATERIAL
--------------------------------------------------
The app does not operate in a regulated industry. It is an educational game.
It does not provide any official test, certification, or score.

Regarding "TOEIC":
"TOEIC" is a registered trademark of Educational Testing Service (ETS).
This app is not affiliated with, endorsed by, or sponsored by ETS or the
TOEIC program, and this is stated in the App Store description.

The trademark is used nominatively only, to describe the difficulty level of
our own original vocabulary lists (for example "vocabulary at the TOEIC 600
score level"). The app does not reproduce, include, or imitate any ETS test
questions, passages, or copyrighted material. Inside the app, difficulty is
displayed as "スコア600" (score 600) and the TOEIC name is not shown on any
game screen.

All content in the app is original and created by us:
- vocabulary lists and Japanese definitions
- character and enemy artwork
- background music and sound effects
- pronunciation audio for all 5,761 words

We hold the rights to all of the above. No third-party protected material is
included in the app.

--------------------------------------------------
7. IN-APP PURCHASE OVERVIEW
--------------------------------------------------
The app is free to download and play. It contains exactly one In-App
Purchase, submitted together with this app version:

  Reference name : WORD QUEST Premium Monthly
  Product ID     : wordquest_premium_monthly
  Type           : Auto-renewable subscription
  Duration       : 1 month
  Price          : JPY 500 per month

What the free version includes:
  The complete game. All game modes, all vocabulary, all pronunciation audio.
  Nothing is locked behind payment except the items listed below.
  Free users may start one battle per day. This can be increased by watching
  a rewarded video ad (+1) and by completing the daily review (+1).

What the subscription unlocks:
  - No advertising of any kind
  - No daily limit on the number of battles
  - The ability to restrict questions to a single level (for example, only
    junior high 1st year vocabulary, or only TOEIC 600 level vocabulary)
  - Full study records, including the daily accuracy graph and weak-word list

How to reach the purchase flow:
  1. Launch the app and tap through to the title screen.
  2. At the bottom of the title menu, tap the button labelled
     "★ プレミアム（月額¥500・広告オフ・学習機能プラス）".
  3. A panel opens showing, before any purchase is possible:
       - the subscription title
       - the length of the subscription (monthly)
       - the price (JPY 500 per month, tax included)
       - a statement that the subscription renews automatically unless
         cancelled
       - how to cancel (through App Store subscription settings)
       - a link to the Terms of Use
       - a link to the Privacy Policy
  4. Tap "登録する" (Subscribe) to open the Apple purchase sheet.
  5. A "購入を復元" (Restore Purchases) button is present on the same panel.

  The same panel also appears when a free user has used the daily play
  allowance, offering the choice of watching a rewarded ad or subscribing.

Terms of Use:     https://bridge-ai-tokyo.com/wordquest/terms.html
Privacy Policy:   https://bridge-ai-tokyo.com/wordquest/privacy.html

--------------------------------------------------

Please let us know if any further information would be helpful.

Thank you for your time.
```

---

## 画面収録の撮り方

実機のiPhoneで、コントロールセンターの画面収録を使う。**ホーム画面から
アプリを起動するところから**始めること（Appleが明示的に要求している）。

音は入れなくてよい。長さは3〜5分。

### 撮る順番

| # | 操作 | 見せる目的 |
|---|---|---|
| 1 | ホーム画面 → アプリのアイコンをタップ | 起動から始まっていることを示す |
| 2 | 出題範囲を選ぶ → 「TOEIC」 | 初回の設定 |
| 3 | タップしてスタート → タイトル画面 | 全体像 |
| 4 | ことばの闘技場 → 1戦目 | 主要な遊び方 |
| 5 | 「たたかう」→ 4択に答える（正解も不正解も） | **中核の仕組み。ここを長めに** |
| 6 | 魔法・道具も1回ずつ | 機能の広さ |
| 7 | 1戦終わって次の戦いへ | 続きがあること |
| 8 | タイトルに戻る（「にげる」→「もどる」） | |
| 9 | 単語帳 → タブを切り替える | 学習機能 |
| 10 | 学習の記録 | 学習機能 |
| 11 | 称号・記録 | |
| 12 | **★プレミアムをタップ** | **ここが最重要** |
| 13 | 購入パネルを **5秒ほど静止して見せる** | 価格・期間・自動更新・解約方法・利用規約・プライバシーポリシーが1画面に出ていること |
| 14 | 「登録する」→ Appleの購入シートが出る → **キャンセル** | 購入導線が動くこと（実際に買わなくてよい） |
| 15 | 「購入を復元」を見せる | ガイドライン3.1.1で必須 |

**13番を飛ばさないこと。**サブスクリプションの表示義務（3.1.2）を満たしている
証拠が、この審査でいちばん見られる。

### 送り方

App Store Connect の App Review ページの返信欄に、動画を添付する。

大きすぎて添付できない場合は、YouTubeに**「限定公開」**でアップロードして、
そのURLを本文の1番のところに書く。Appleはリンクでも受け付ける。
（「非公開」ではなく「限定公開」。非公開だと審査担当が見られない）

容量を減らしたいときは、このリポジトリの道具が使える。

    node tools/make_preview.js ~/Desktop/review.mov --fit --len 300

---

## 送る前に確認すること

### ① サブスクリプションの配信地域

以前ASCで見たとき、サブスクリプションの「配信可否」が
**「175か所の国または地域のうち1個が選択されました」** になっていた。

1か国（おそらく日本）だけだと、**審査担当の国では購入導線が動かない**可能性が
ある。「買えなかった」で差し戻される典型例なので、先に直しておく。

  収益化 → サブスクリプション → Premium → WORD QUEST Premium Monthly
  → 配信可否 → 編集 → **アプリと同じ地域をすべて選ぶ**

価格は地域ごとにAppleが自動で換算するので、日本の¥500は変わらない。

### ② スクリーンショット

返信の「よくある問題」に 2.3.3（スクリーンショットは実際の画面を写すこと）が
挙がっている。これは定型文で、こちらのスクリーンショットは実画面なので問題ない。
iPad用は「説明文＋実機画面」の構成だが、中の画面は実機そのものなので条件を
満たしている。何もしなくてよい。

### ③ メモ欄にも同じ本文を入れる

返信するだけでなく、**バージョンのページ →「App Review情報」→「メモ」**にも
同じ本文を貼っておく。Appleが「次回以降の参照のために入れておけ」と明示して
いるので、入れておくと次のアップデートの審査が軽くなる。
