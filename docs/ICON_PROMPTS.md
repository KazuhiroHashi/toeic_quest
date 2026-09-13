# タイトルの項目アイコン 制作キット

タイトル画面のメニュー7項目に添えるしるし。いまは絵文字＋塔だけ手描きSVG。
**作るなら7つまとめて。** 2つだけ差し替えると、残りの絵文字と並んだときに浮く。

---

## 納品の条件（全部共通）

| 項目 | 値 |
|---|---|
| サイズ | **256×256**（正方形） |
| 形式 | **PNG・背景は完全な透過** |
| 余白 | 上下左右に **8%** の余白（枠に詰めすぎない） |
| 文字 | **入れない**（数字・記号・ロゴも不可） |

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
Style: anime JRPG game icon, single centered object on a fully transparent
background, soft cel shading, thick clean outlines, vivid saturated colors,
bright and readable at very small size, 2D illustration (not 3D render),
no grain, no gradient background, no drop shadow on the background.
Composition: one object only, centered, facing the viewer, filling about 84%
of the frame, generous even margins.
Avoid: text, letters, numbers, logos, watermarks, backgrounds, scenery,
multiple objects, thin hairlines, tiny details, photorealism, 3D render.
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

1. `assets/ui/icons/` に上の名前で置く
2. 透過とサイズを検査する（こちらでやる）
3. `party/index.html` の `<span class="ic">絵文字</span>` を
   `<span class="ic"><img src="../assets/ui/icons/ic_xxx.png" alt=""></span>` に替え、
   `party.css` に `#ptitle-menu .title-btn .ic img { width:20px; height:20px; }` を足す
4. 実機サイズ（375／393px）で描画して、つぶれていないか見る

**7つそろってから差し替える。** 混ざった状態では出さない。

---

## いま作らないもの

- **`assets/ui/frame.png`**（窓枠の装飾）— 仕組みは残してあるが絵が無い。
  無くても成立しているので、急がない（`party/js/pmain.js` の該当箇所を参照）
- **ED-3「旅の続き」の撮り直し**（3人→4人）— これは動画。
  プロンプトは `docs/TOMORROW.md` に書いてある
