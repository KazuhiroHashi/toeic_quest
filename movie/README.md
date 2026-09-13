# OP／ED ムービーの組み立て

動画編集ソフトは不要。生成した素材を `movie/src/` に置いてプッシュするだけで、
連結・BGM・ロゴ・書き出しまで自動で終わります。

## そちらの作業

1. Higgsfield で生成した mp4 をダウンロード
2. この名前で `movie/src/` に置く

   | ファイル名 | カット |
   |---|---|
   | `op1.mp4` | OP-1 世界とヒーローたち |
   | `op2.mp4` | OP-2 沈黙王の玉座 |
   | `op3.mp4` | OP-3 英単語の剣 |
   | `ed1.mp4` | ED-1 魔王の消滅 |
   | `ed2.mp4` | ED-2 ことばが還る |
   | `ed3.mp4` | ED-3 旅の続き |

3. プッシュする。以上。

**チャットに直接添付してもらっても構いません。** そのほうが手間が少なければそちらで。

揃っていないカットは飛ばして、あるぶんだけで組み上がります。
1本ずつ届くたびに組み直せるので、全部揃うのを待つ必要はありません。

## 組み立て

```
node tools/build_movie.js        # OP・ED 両方
node tools/build_movie.js op     # OPだけ
```

出力は `movie/out/OP.mp4` / `movie/out/ED.mp4`。
**1080×1920 / 30fps / H.264 / AAC** — App Store にそのまま出せる形式です。

## 崩れたカットの直し方

`movie/cuts.json` に「どこを使うか」を書きます。撮り直しは不要です。

```json
{ "src": "movie/src/op1.mp4", "trim": [0, 8.30], "speed": 1.2048 }
```
`trim` で使う区間を指定、`speed` で尺を伸ばす（1.2048 = 1.2倍スロー）。
→ 8.4秒から目が発光する問題を、8.3秒で切って10秒に戻している。

```json
{ "src": "movie/src/op3.mp4", "skip": [6.85, 8.55], "dissolve": 0.5 }
```
`skip` した区間を `dissolve` 秒のディゾルブで飛ばす。
→ 後半にクライマックスがあって単純に切れないカット向け。見せ場を失いません。

## 仕上げの設定

```json
"crossfade": 0.4,
"bgm":  { "file": "assets/bgm/title.mp3", "start": 0, "fadeIn": 0.6, "fadeOut": 2.0, "volume": 0.85 },
"tail": { "logo": "assets/ui/logo.png", "hold": 2.4, "scale": 0.80, "y": 0.40, "scrim": 0.22 }
```

- `crossfade` — カット間のディゾルブ秒数
- `bgm.start` — 曲のどこから使うか（サビを見せ場に合わせたい時に動かす）
- `tail.hold` — 最後にロゴを出す秒数、`scrim` — ロゴを読ませるための背景の沈み具合
- `tail.text` — ロゴの下に文字を出したい場合のみ指定（現在は未使用）

## ロゴなし版（`movie/out/OP_nologo.mp4`）

最後の2.4秒に WORDRIA のロゴを焼き込んでいない OP。長さ・画質・BGM は
通常版とまったく同じで、その2.4秒に本編の絵がそのまま流れる。

ロゴを重ねる前の状態は組み立ての途中で必ず一度できている
（`movie/tmp/op_seq.mp4`）。ただし `movie/tmp/` は gitignore なので、
**そこから作り直すのではなく、書き出したものを置いてある**。

作り直すときは、`cuts.json` の `op` から `tail` を丸ごと外して

```bash
node tools/build_movie.js op        # movie/out/OP.mp4 がロゴなしで出る
```

を走らせ、出てきたものを `OP_nologo.mp4` に名前を変えて、`cuts.json` を
元に戻す。**`tail` を外したまま置いておかないこと**（通常版からロゴが消える）。

## 注意

- `movie/tmp/` は中間ファイル置き場。gitignore 済み
- 完成後は `movie/src/` の素材を消してもかまいません（リポジトリが軽くなります）
- Seedance が HEVC で書き出しても、このスクリプトが H.264 に変換します
- 尺は 3カットで揃える必要なし。**Apple が見るのは全体で15〜30秒**
