# タイトル画面アート（GPT-image 2.0 用プロンプト）

トップ画面を「明るく・楽しそう」にするための **①キービジュアル（背景）** と **②タイトルロゴ** を作ります。
GPT-image 2.0（ChatGPTの画像生成）に、下のプロンプトをそのまま貼ってください。

- アップ先: https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/ui
- **ゲーム側は対応済み**：ファイルを置けば自動でタイトルに反映されます（無い間は今の明るいグラデ＋文字ロゴ）。
- 保存名（重要）：背景＝ **title_bg.png** ／ ロゴ＝ **logo.png**

---

## ① キービジュアル（背景）　【保存名: title_bg.png】

**縦長（ポートレート 9:16）／明るい／文字なし**。ボタンが上に重なるので、**上ゾーンは空でスッキリ**、キャラは**中央〜下**に置くのがコツ。

```
A bright, cheerful key visual for a cute fantasy JRPG about learning English words. Portrait 9:16 vertical composition. A warm sunny fantasy world at golden dawn: rolling green hills, a sparkling blue sky with fluffy clouds and floating glowing alphabet letters (A B C) and open storybooks drifting in the air, a friendly distant castle tower on the horizon. In the lower-center foreground stands a small party of four adorable chibi heroes seen from behind/three-quarters, looking toward the tower with excitement: a boy hero with a short sword, a sturdy warrior, a girl mage with a star-tipped staff, and a gentle girl priest. 2-head-tall chibi proportions, big sparkly eyes, soft cel shading, thick clean outlines, vivid saturated pastel palette, joyful and inviting. Leave the TOP THIRD mostly open sky (space for a logo) and keep the very bottom simple. No text, no words, no watermark, no UI, no border.
```

ポイント／微調整用メモ：
- もっと明るく → `bright sunny midday, extra vivid colors` を足す
- キャラを大きく → `the four chibi heroes larger and more central`
- 学習感を強く → `more floating alphabet letters, dictionaries and pencils`

---

## ② タイトルロゴ　【保存名: logo.png】

> **2026-09-09：ロゴは WORDRIA のものに差し替え済み。**
> 現行の `assets/ui/logo.png` は外注した金の立体ロゴで、下のプロンプトから
> 作ったものではない。旧ロゴは `assets/ui/logo-wordquest-original.png` に保管。
> 以下は当時のプロンプトの記録。作り直すときは `WORD QUEST` を `WORDRIA`
> （1語・7文字）に読み替えること。
>
> **書き出しは必ず背景透過PNG（アルファ付き）にすること。**
> 透過を表す市松模様が絵として焼き込まれたPNGを渡されたことがあり、
> タイトル画面とOP/EDに灰色の板が乗ったまま組み上がった。
> `node tools/build_movie.js` はこれを検知して止まるようにしてある。

**文字は「WORD QUEST」のみ（数字・II・2・1は入れない）／背景透過PNG。**
日本のゲームロゴ風＝**丸ゴシック系のポップ書体・フラット寄り・細く均一なフチ・ツヤ控えめ**が肝（西洋カジュアルの厚ぼったい3Dキャンディ調は避ける）。

```
A cute, clean title logo for a cozy Japanese mobile RPG about learning English words, in the style of popular Japanese casual game logos — flat, crisp and graphic, NOT the heavy glossy 3D candy style of Western match-3 games. The text is ONLY "WORD QUEST" (two words, absolutely no number, no Roman numeral, no "II", no "2", no subtitle). Use a friendly rounded Japanese-style pop typeface (maru-gothic / soft rounded sans), neat, evenly weighted and very legible. Flat, clean design with soft pastel fills — warm honey-gold for "WORD" and sky-blue for "QUEST" — a gentle subtle gradient and only a slight soft highlight (minimal bevel, no gooey 3D gloss), with a thin even crisp outline. A few small tasteful accents only: a tiny star and a small cute open book. Wholesome, warm, kawaii yet refined, appealing to both women and men. "WORD" on top and "QUEST" below, centered and balanced. Transparent background (PNG). Avoid: any number or numeral, heavy 3D candy bevel, thick brown outline, glossy bubble letters, ornate metal, swords, generic western match-3 look. Correct spelling exactly "WORD QUEST", nothing else.
```

ポイント／微調整用メモ：
- まだ洋物っぽい → `flatter, less 3D gloss, thinner even outline, rounded maru-gothic typeface` を追い足し
- 色を変えたい → `honey-gold and sky-blue` を好みの2色に
- カタカナ「ワードリア」は画像だと崩れやすいので、**ロゴ画像は英字のみ**にして、カナはゲーム内文字で表示するのが確実
- タイトルは **「WORDRIA」**（続編番号は付けない）

---

## 反映のしかた
1. 上記2枚を `assets/ui/`（**title_bg.png / logo.png**）にアップ
2. 私が公開版（Artifact）に取り込みます（インライン埋め込み）
3. Web／アプリとも、背景＝キービジュアル、ロゴ＝画像ロゴ に自動で切り替わります

※ 透過やサイズが合わなくても、こちらで軽くトリミング／リサイズして最適化します。まず「1枚ずつ」でも大丈夫です。
