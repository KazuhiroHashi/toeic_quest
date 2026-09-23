# PR動画（相手別・各30秒・音ハメ版）

相手ごとに言うことを変えた30秒を6本。全部 **1080×1920 / 30fps / H.264 / AAC**。
X にそのまま添付でき、App Store のプレビュー動画の規定（15〜30秒）にも収まる。

- 画面の中心は**いまのビルドを実際に遊んでいる録画**（`movie/play/`）。
  OP/ED の生成クリップ（`movie/src/`）は、場面転換と見せ場に使う
- **カットの切り替わりはすべてBGMの拍の上**。正解を押す瞬間も拍に合わせてある
- 切り替わりにズームのパンチ、小節の頭に白フラッシュ、当たりの場面に揺れと効果音
- 字幕は**小さめの色付きの札**を、画面の下（十字キーのあたり）に出す。
  プレイ画面の単語・選択肢・敵には被せない。拍に合わせてポンと出る
- 最後は6本とも、**WORDRIA のロゴの上に「単語帳を開くより、冒険しよう。」**

## 6本

| ファイル | 相手 | 曲 | 最初の一言 | 締めの一行 |
|---|---|---|---|---|
| `out/PR_main.mp4` | 汎用（ストア／X本命） | boss | 「知ってる」だけでは、倒せない。 | 速く答えるほど、強くなる英単語RPG |
| `out/PR_toeic.mp4` | TOEIC学習者 | lastboss | スコアが、600から動かない。 | TOEIC®対策に、「速さ」という武器を。 |
| `out/PR_jhs.mp4` | 中学生 | field | 単語帳、何回も閉じた。 | 中学英語からはじめる英単語RPG |
| `out/PR_hs.mp4` | 高校生・大学受験 | battle | 読めるのに、間に合わない。 | 大学受験の語彙まで、遊びながら。 |
| `out/PR_parent.mp4` | 保護者 | title | 「勉強しなさい」の、前に。 | 学習そのものに、上限は置きません。 |
| `out/PR_dev.mp4` | X・AI界隈（個人開発） | arena4 | 個人開発で、ここまで作れる。 | 絵・音・動画・コードまで、生成AIで。 |

字幕の札の色は相手ごとに変えてある（TOEIC=青緑、中学=ピンク、高校=青、保護者=琥珀、開発=紫）。
言っていることは `docs/MISSION.md` と `docs/STORE_COPY.md` に合わせ、価格・回数・収録語数の
ような変わりうる数字は出していない。画面に「TOEIC」が映るので、6本とも末尾に免責表記を入れた。

## 作り方（3段）

```bash
# 1. 実プレイを録る（www/ から。速答・時間切れ・ボス戦などを自動で遊ぶ）
npm run build:www
npm install playwright-core @fontsource/m-plus-rounded-1c --no-save
node tools/record_play.js          # → movie/play/*.mp4 と、出来事の時刻 *.json

# 2. BGM の拍を測る（曲を替えたときだけ）
pip install librosa
python3 tools/beat_grid.py boss    # → movie/beats/boss.json

# 3. 組み立てる
node tools/build_pr.js             # 6本ぜんぶ
node tools/build_pr.js toeic jhs   # 名前を指定して一部だけ
```

1 と 2 の結果はコミットしてあるので、**文言やカットを直すだけなら 3 だけでいい**。
ffmpeg は PATH に要る（無ければ `FFMPEG=/path/to/ffmpeg`）。

## 直したいとき — `movie/pr.json` だけ触る

時間の単位は**拍**。カットの長さは `beats` で書く。

```jsonc
// 実プレイ：2問目に「答えた瞬間」がこのカットの1拍目に来るように切り出す
{ "src": "play/battle", "sync": { "event": "answer2", "beat": 1 }, "beats": 2,
  "zoom": 1.12, "focus": [0.5, 0.25],           // クイズの枠に寄る
  "cap": "速く答えるほど、{g}強い一撃{/}。",       // {g}…{/} が色つき
  "capBeats": 4,                                 // 字幕を次のカットまで残す
  "sfx": [["ok", 1, 0.5]] }                      // 効果音（名前, 何拍目, 音量）

// 実プレイ：答えた 0.7 秒後（攻撃が当たる所）から。揺れ付き
{ "src": "play/battle", "at": "answer2", "shift": 0.7, "beats": 2,
  "fx": ["punch", "shake"], "sfx": [["crit", 0, 0.55]] }

// 生成クリップ：秒で指定
{ "src": "movie/src/op3.mp4", "at": 7.4, "beats": 4 }
```

- 使える出来事の名前は `movie/play/<名前>.json` にある（`quiz1` `answer1` … `late1`）
- `music.startBeat` で曲のどこから使うかを決める（小節の頭に自動でそろう）
- 字幕の位置は `endcard.capY`（画面の上からのピクセル。いまは 1575）
- 札の色は `theme`（`bg1`→`bg2` のグラデーション、縁 `edge`、強調 `accent`）

## 気をつけること

- **画面を変えたら `record_play.js` から録り直す**。店頭の動画と中身が違うのは
  ガイドライン 2.3.3 に触れる。録り直しても、カットは出来事の名前で指しているので
  `pr.json` はそのまま使える
- 単語帳の画面は、まだ何も覚えていない状態（0/500語）で映っている。
  遊んだ記録を仕込んでから録ると、ここがもっと映える
- 配信が始まったら、`endcard.text` に「App Store / Google Play で配信中」を足せる
