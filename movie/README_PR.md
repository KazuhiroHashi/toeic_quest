# PR動画（相手別・各30秒・音ハメ版）

相手ごとに言うことを変えた30秒を6本。全部 **1080×1920 / 30fps / H.264 / AAC**。
X にそのまま添付でき、App Store のプレビュー動画の規定（15〜30秒）にも収まる。

- 画面の中心は**いまのビルドを実際に遊んでいる録画**（`movie/play/`）。
  OP/ED の生成クリップ（`movie/src/`）は、場面転換と見せ場に使う
- **カットの切り替わりはすべてBGMの拍の上**。正解を押す瞬間も拍に合わせてある
- 切り替わりにズームのパンチ、小節の頭に白フラッシュ、当たりの場面に揺れと効果音
- 字幕は**小さめの色付きの札**を、画面の下（十字キーのあたり）に出す。
  プレイ画面の単語・選択肢・敵には被せない。拍に合わせてポンと出る
- 最後は6本とも **WORDRIA のロゴの上に「単語帳を開くより、冒険しよう。」**。
  main / toeic / jhs / hs / parent はバトルの場面だけで組み、字幕は家族制作のPR動画と同じ「大きなピンク字＋白フチ」を画面中央に出す。
  最後は白地（横じま）に金色の「単語帳を開くより、冒険しよう。」とロゴ。toeic・jhs・hs・parent も同じ作りで、曲と展開だけ変えてある。
  jhs は中学3年、hs は高校3年の出題で録った実プレイ（`play/*_j3` `play/*_h3`）を使うので、画面に出る英単語がその学年のもの。
  parent は両方を混ぜている。dev だけは前の作り（小さめの札の字幕）のまま

## 6本

| ファイル | 相手 | 曲 | 最初の一言 | 締めの一行 |
|---|---|---|---|---|
| `out/PR_main.mp4` | 汎用（ストア／X本命） | arena4（battle4・8.4秒から） | WORDRIAは → TOEIC950点保持者が開発 → … → 自然と単語が身につく！ | 白地に「単語帳を開くより、冒険しよう。」とロゴを同時に叩きつけ、次の小節の頭で音楽を切る |
| `out/PR_toeic.mp4` | TOEIC学習者 | king1（Howl） | WORDRIAは → 速く答えることが重要なゲーム！ → … → つい夢中になる！単語が楽しく身につく！ | main と同じ（白地にキャッチとロゴ） |
| `out/PR_jhs.mp4` | 中学生 | battle2（13秒から。拍は `--double` で取り直したもの） | 英単語の暗記に苦労している君！ → WORDRIAで遊びながら単語を覚えられる！ → スキマ時間にも、息抜きにも気軽に遊べて学べる！ → つい夢中に！いつの間にか単語が身につく！（1つ16拍） | main と同じ（白地にキャッチとロゴ、スパッと切る） |
| `out/PR_hs.mp4` | 高校生・大学受験 | boss（52秒あたりから） | 大学受験の英単語、RPGで攻略！ → … → スキマ時間が経験値になる！ | 同上 |
| `out/PR_parent.mp4` | 保護者 | arena1（74秒あたりから） | ゲームばかり…と思っていませんか？ → … → 「勉強しなさい」と言う前に。 | 同上 |
| `out/PR_dev.mp4` | X・AI界隈（個人開発） | arena4 | 個人開発で、ここまで作れる。 | 絵・音・動画・コードまで、生成AIで。 |

言っていることは `docs/MISSION.md` と `docs/STORE_COPY.md` に合わせ、価格・回数・収録語数の
ような変わりうる数字は出していない。画面に「TOEIC」が映るので、6本とも末尾に免責表記を入れた。

## 作り方（3段）

```bash
# 1. 実プレイを録る（www/ から。速答・時間切れ・ボス戦などを自動で遊ぶ）
npm run build:www
npm install playwright-core @fontsource/m-plus-rounded-1c --no-save
node tools/record_play.js          # → movie/play/*.mp4 と、出来事の時刻 *.json
REC_GRADE=j3 node tools/record_play.js battle boss b3 b4 dragon miss strategy   # 中学3年の出題で → *_j3
REC_GRADE=h3 node tools/record_play.js battle boss b3 b4 dragon miss strategy   # 高校3年の出題で → *_h3

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
- `music.startBeat` で曲のどこから使うかを決める（小節の頭に自動でそろう）。
  選ぶときは打楽器の強さ（疾走感）を小節ごとに測って決める。battle4 は 38秒前後が一番落ち着く
  区間で、そこから始めると出だしがもたつく。main は一番勢いのある 8.4秒（21拍目）から使い、
  締めのロゴが曲の最も激しい 33〜37秒に来るようにしてある
- 字幕の位置は `endcard.capY`（画面の上からのピクセル。いまは 1575）。カットごとに `capY` で上書きできる
- `pulse` を付けたカットは、拍ごとに画面が小さく跳ねる。`capPop` は字幕が出るときの弾み具合
- 単語帳・称号の画面は、遊び込んだ記録（400帯 421/500語、連続学習23日など）を仕込んで録ってある（`record_play.js` の `seedPlayed`）
- 札の色は `theme`（`bg1`→`bg2` のグラデーション、縁 `edge`、強調 `accent`）。字の大きさは `theme.capSize`
- `theme.capStyle: "big"` … 札なしの大きな字幕（ピンク `fill`・白フチ・ピンクの光）。`cap` を配列にすると
  1行ずつ `lineStep` 拍遅れて出る。位置は `endcard.capY`（main / toeic は 985。クイズの英単語の少し下）
- `theme.catchStyle: "gold"` … 締めのキャッチを金色の光る字にする。`endcard.slamBeat` を付けると、
  その拍の頭で音楽を切る。`"stripes": 28` で白地に横じま
- `endcard.mode: "letters"` … 背景は無地（`"src": "color:#06070f"`）、`word` の文字を1拍に1文字ずつ入れ、
  `slamBeat` 拍目で単語全体を光らせて白く飛ばし、そこで音楽を切る。字はゲームのタイトルと同じ Cinzel の金文字
- バトルの録画は第1戦・第3戦・第4戦・第5戦（古竜）・第6戦（ハウル）。第7戦以降は録らない（遊ぶ前の人に見せない）

## 気をつけること

- **画質**（SNS に上げると一度再圧縮されるので、元をできるだけきれいにしておく）
  - 録画は JPEG 画質 100 で受け取り、crf 10 で保存（`record_play.js`）
  - 寄り・揺れは 2160×3840 で計算してから lanczos で 1080×1920 に1回だけ縮める（`build_pr.js`）
  - 途中のファイルは crf 8、書き出しは crf 15・上限 14Mbps・`-tune animation`
  - X に上げるときは、アプリの「設定 → アクセシビリティ、表示、言語 → データ利用の設定 →
    高画質の動画をアップロード」をオンにしておくと、アップロード時に縮められにくい

- **録画は iPhone 17 の画面（402×874 の3倍）で撮る**（`record_play.js`）。以前の 360×640 は
  iPhone SE ほどの幅で、敵の名前やメッセージが窮屈だった。動画に入れるときは上下を少し切り落とす
- **日本語フォントを必ず確かめる**。`fc-match "sans-serif:lang=ja"` が WenQuanYi などの中国語の
  フォントだと、ゲームの文字が中国語の字形で録れてしまう（実際に一度そうなった）。
  Noto Sans CJK JP を優先させる設定は `store/screenshots/README.md` にある。`record_play.js` は
  中国語のフォントのままなら止まる

- **画面を変えたら `record_play.js` から録り直す**。店頭の動画と中身が違うのは
  ガイドライン 2.3.3 に触れる。録り直しても、カットは出来事の名前で指しているので
  `pr.json` はそのまま使える
- dev は、まだ記録なし（0/500語）の単語帳を使ったまま。
  直すときは `play/wordbook` を使えば、記録入りの画面に変わる
- 配信が始まったら、`endcard.text` に「App Store / Google Play で配信中」を足せる
