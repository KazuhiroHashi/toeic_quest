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

**背景透過PNG／文字は正確に「WORD QUEST II」**。GPTは稀に綴りを間違えるので、生成後に **WORD QUEST II** の綴りを必ず確認。

```
A playful, glossy logo for a cute fantasy RPG, with the exact text "WORD QUEST II" on two lines: "WORD QUEST" on top and a large "II" below. Bold rounded 3D letters with a thick cream outline, glossy golden-yellow and sky-blue gradient fill, a small sparkle and a tiny open book icon as a decorative accent, adventurous and friendly storybook style, high contrast so it reads on any background. Centered, transparent background (PNG), no extra text, no tagline, correct spelling "WORD QUEST II".
```

ポイント／微調整用メモ：
- 和名にしたい場合は text を `"WORD QUEST II"` のままにしつつ、別途サブタイトル画像は作らず、ゲーム内の「〜沈黙の四天王〜」を使えばOK
- 色を変えたい → `golden-yellow and sky-blue` を好みの2色に
- もっと剣＆冒険感 → `a small crossed sword accent` を追加

---

## 反映のしかた
1. 上記2枚を `assets/ui/`（**title_bg.png / logo.png**）にアップ
2. 私が公開版（Artifact）に取り込みます（インライン埋め込み）
3. Web／アプリとも、背景＝キービジュアル、ロゴ＝画像ロゴ に自動で切り替わります

※ 透過やサイズが合わなくても、こちらで軽くトリミング／リサイズして最適化します。まず「1枚ずつ」でも大丈夫です。
