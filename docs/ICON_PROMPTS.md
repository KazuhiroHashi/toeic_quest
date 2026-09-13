# タイトルの項目アイコン 制作キット

タイトル画面のメニュー7項目に添えるしるし。いまは絵文字＋塔だけ手描きSVG。
**作るなら7つまとめて。** 2つだけ差し替えると、残りの絵文字と並んだときに浮く。

---

## なぜ絵文字をやめるのか（機種依存）

絵文字は**端末のOSが持っているフォントで描かれる**。アプリが絵を持って
いるわけではない。だから同じ文字でも、iPhone と Android で別の絵になる。
実際にこのアプリで起きること：

**① 見た目が変わる**
🏰 は Apple と Google で形も色も違う。iPhone で整えた並びが、Android では
そろって見えない。**こちらから直せない。**

**② 単色で出るものがある**
`⚙`（U+2699）と `⚔`（U+2694）は、もともと絵文字ではなく記号。
異体字セレクタ（VS16）を付けていないので、端末によっては**色のない字**として
描かれる。いま実機で歯車が白い線なのはこれ。

**③ 古い端末では豆腐（▯）になる**
このアプリの最低は **Android 7.0**。そこに無い絵文字は四角で出る。

| 絵文字 | 追加 | Android 7.0 |
|---|---|---|
| 🧙 🧝 🧔 | Unicode 10.0（2017） | **出ない** |
| 🧴 | Unicode 11.0（2018） | **出ない** |

この4つは `party/js/pfield.js`（制作中のストーリーモード）の中なので、
**いまの出荷物では画面に出ない**。ただしストーリーモードを出すときは
必ずぶつかる。

→ **画像にすれば、3つとも消える。** どの端末でも同じ絵になる。

## 納品の条件（全部共通）

| 項目 | 値 |
|---|---|
| サイズ | **128×128**（正方形） |
| 形式 | **PNG・背景は完全な透過** |
| 余白 | 上下左右に **8%** の余白（枠に詰めすぎない） |
| 文字 | **入れない**（数字・記号・ロゴも不可） |

### 128で足りる理由

画面に出るのは **20×20 CSS ピクセル**。いちばん精細な端末（4倍）でも
**80ピクセル**にしかならない。128 あれば足りる。

そのうえ `tools/build_www.js` が**書き出しのときに WebP へ変換する**ので、
実際に端末へ入るのはもっと小さい。128×128 の平たい絵なら **1つ 3〜6KB**、
7つで **30KB 前後**。256 にしても画面は1ドットも良くならず、容量だけ増える。

> もっと小さくするなら 96×96 でも成立する。128 にしているのは、
> あとで称号の一覧など**大きく使いたくなったときの余地**として。

> ⚠️ **「透過」と言われて、市松模様を絵として描き込んでくる生成AIがある。**
> 実際に logo.png でそれが起きて、気づかずに動画へ焼き込みかけた
> （`tools/build_movie.js` に検査を足したのはそのため）。
> 受け取ったら必ず透過を確認する。こちらで検査できる。

## なぜ小ささが効くか

実際に表示されるのは **28×28 CSS ピクセル**の枠の中（`#ptitle-menu .title-btn .ic`）。
高精細な端末でも84ピクセル相当。**細部は全部つぶれる。**

- ものは **1個だけ**。情景を描かない
- **輪郭が一目で分かる形**にする。細い線・小さな装飾は消える
- 枠の地は **暗い半透明**。明るい色・高い彩度でないと沈む

## 共通スタイル指定（全部の末尾に付ける）

```
Output: 128x128 PNG, fully transparent background, no background layer.
Style: anime JRPG game icon, single centered object, soft cel shading, thick
clean outlines, vivid saturated colors, bright enough to read against a dark
panel, 2D illustration (not 3D render), no grain, no gradient backdrop,
no drop shadow cast onto the background.
Composition: one object only, centered, facing the viewer, filling about 84%
of the frame, generous even margins on all four sides. The object must fit a
roughly SQUARE area — do not make it tall and narrow or wide and flat.
Legibility: this is displayed at 20x20 pixels. Keep the silhouette simple and
instantly recognisable. No thin lines, no small details, no fine texture.
Avoid: text, letters, numbers, logos, watermarks, scenery, multiple objects,
checkerboard pattern, photorealism, 3D render.
```

---

## 7つのプロンプト

### 1. ことばの冒険（本編） — `ic_adventure.png`

```
A small fantasy castle with three blue conical roof towers and warm cream
stone walls, a golden arched gate at the centre, tiny red pennant flags on the
spires, catching soft golden sunset light.
```
> 本編の入口。ここだけ金色の枠に載るので、**暖色**にすると馴染む。
> 起点にできる絵：`assets/ui/title_bg.png` の奥に建つ城。

### 2. 挑戦の塔 — `ic_tower.png`

```
A tall narrow medieval stone watchtower with crenellated battlements at the
top, one dark arrow-slit window, a single red pennant flag on a pole above,
pale weathered stone with cool shadow on one side.
```
> ⚠️ **東京タワーにしないこと。** 鉄骨・展望台・現代建築は不可。
> 中世の見張り塔。縦に細長いので、**上下いっぱいに使ってよい**。

### 3. 学習の記録 — `ic_stats.png`

```
Three rising bar-chart columns in mint green, sky blue and warm yellow, with a
simple upward arrow line crossing over them, clean flat shapes.
```

### 4. 出題（範囲えらび） — `ic_books.png`

```
Three closed hardcover books stacked at a slight angle, in deep red, navy blue
and cream, with gold page edges and a small ribbon bookmark.
```

### 5. 難易度 — `ic_gear.png`

```
A single chunky mechanical gear with six thick teeth, polished silver-blue
metal with a warm highlight, a round hollow centre.
```

### 6. 単語帳 — `ic_wordbook.png`

```
An open book seen from above with cream pages, a warm brown leather cover and
a red ribbon bookmark hanging from the spine, faint blank ruled lines.
```
> ページに**文字を書かせない**。小さすぎて汚れにしか見えないうえ、
> 生成AIは崩れた英単語を描く（ED-3で実際に起きた）。

### 7. 称号・記録 — `ic_medal.png`

```
A round gold medal with a five-pointed star embossed at the centre, hanging
from a short red and blue striped ribbon.
```

---

## 受け取ったあと

1. 原寸を `art/icons/ic_xxx.png` に置く（`assets/` の中には置かない。
   `build_www.js` が `assets/` を丸ごと同梱するので、1200pxの絵まで端末へ運ばれる）
2. `node tools/make_icons.js` — 透過を検査し、`assets/ui/icons/` に128pxで書き出す
3. `party/index.html` の `<span class="ic">…</span>` を
   `<span class="ic"><img src="../assets/ui/icons/ic_xxx.png" alt=""></span>` に替える
4. `npm run build:www` して、`www/index.html` が `.webp` を指し、
   `www/assets/ui/icons/` に同じ名前の `.webp` があることを確かめる
5. 実機サイズ（360／375／393px）で描画して、つぶれていないか見る

**7つそろってから差し替える。** 混ざった状態では出さない。

### ⚠️ ここで実際にはまったこと（2026-09-13）

**① 出荷ビルドだけ 404 になりかけた**
`build_www.js` は `assets/` の PNG を WebP に焼き直して**拡張子ごと変える**。
その書き換えは JS にしか掛かっていなかったので、index.html に直接書いた
`.png` は出荷ビルドで消える。開発中は `party/` から素の PNG を読むため
**手元では絶対に気づけない**。html にも同じ書き換えを足して塞いだ。

**② 縦長の絵だけ小さく見えた**
届いた7枚の縦横比は、5枚が約1.0、**塔が0.47・勲章が0.53**。
「長辺をそろえる」やり方だと、この2枚だけ枠の半分の幅になって沈んだ。
`make_icons.js` を **√(幅×高さ) をそろえる**（＝画面が絵で埋まる量をそろえる）
に直して解決。正方形の絵は変わらず、縦長の2枚だけ19%大きくなる。

→ **次に頼むときは、プロンプトに縦横比を書く。** 上の共通スタイルに
`Fit the object into a roughly square area` と入れておくと、この手間が要らない。
勲章は「short ribbon」と指定したのに長いリボンで届いた。生成AIは
長さの形容詞をよく落とすので、**「正方形に収まること」で縛るほうが効く**。

---

## いま作らないもの

- **`assets/ui/frame.png`**（窓枠の装飾）— 仕組みは残してあるが絵が無い。
  無くても成立しているので、急がない（`party/js/pmain.js` の該当箇所を参照）
- **ED-3「旅の続き」の撮り直し**（3人→4人）— これは動画。
  プロンプトは `docs/TOMORROW.md` に書いてある
