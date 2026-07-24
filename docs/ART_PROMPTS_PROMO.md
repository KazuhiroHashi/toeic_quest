# 宣伝用ビジュアルのプロンプト（GPT-image 2.0）

X投稿・ストア掲載で使う画像。**私は絵が描けない**ので、ここのプロンプトをChatGPTに貼って生成してください。
（ゲーム内のスクショはそのまま使えるので、ここは「装飾用の絵」だけ）

---

## 1. X募集ポスト用のバナー　【保存名: promo_banner.png】
横長（16:9）。**文字はゲーム内スクショを重ねるので、絵には文字を入れない**。

```
A vibrant horizontal 16:9 promotional banner for a cute fantasy JRPG about learning English words. Left side: four adorable chibi heroes (a boy hero with a sword, a sturdy warrior with a shield, a girl mage in a purple witch hat, a gentle girl priest) standing together in a heroic pose on a sunny grassy hill. Right side: a dramatic swirl of glowing golden English letters and open spellbooks spiraling into a dark starry vortex where a shadowy silhouette of a demon king looms. Bright hopeful left, ominous right, cinematic contrast. Soft cel shading, thick clean outlines, vivid saturated colors, polished anime game-art quality. Leave the center-right area relatively simple for text overlay. No text, no words, no watermark, no UI, no border.
```

## 2. ストア用「特徴紹介」の背景　【保存名: feature_bg.png】
スクショの背景に敷く縦長の飾り。**上下に余白**を残すのがコツ。

```
A clean vertical 9:16 background for a mobile game store screenshot. A soft gradient sky from warm gold at the top to deep indigo at the bottom, with gentle floating glowing alphabet letters (A B C), sparkles, and faint open storybooks drifting upward. Subtle, low-contrast, decorative only — designed to sit BEHIND a phone screenshot and text. No characters, no text, no words, no watermark, no border, nothing in the center.
```

## 3. Google Play フィーチャー画像（1024×500）　【保存名: feature_graphic.png】
Google Play で必須の横長バナー。

```
A bold horizontal banner (aspect ratio roughly 2:1) for a mobile RPG about mastering English vocabulary. Centered composition: a heroic chibi party of four charging forward, with glowing golden English letters and runes streaming behind them like magic energy. Background: a bright fantasy landscape with a distant castle under a dramatic golden-hour sky. Vivid, high-contrast, eye-catching at small sizes, polished anime game-art. Leave the upper-left third relatively clear for a logo overlay. No text, no words, no watermark, no border.
```

## 4. SNS用「会心の一撃」演出カット（任意・拡散用）　【保存名: promo_crit.png】
「速答＝会心の一撃」という一番の売りを1枚で伝える絵。

```
A dynamic square illustration for a game about answering English quizzes fast. A chibi boy hero swings a glowing sword, and at the moment of impact the slash bursts into brilliant golden English letters and sparks, with a huge shockwave of light. Speed lines, dramatic impact framing, energetic and exhilarating. Soft cel shading, thick clean outlines, vivid colors, polished anime game-art. No text, no words, no numbers, no watermark, no border.
```

---

## 使い方
- **1** → Xの募集ポストの1枚目（アイキャッチ）
- **3** → Google Play Console の「フィーチャー画像」欄（1024×500 必須）
- **2** → ストアのスクショを装飾したい時の下地
- **4** → 拡散狙いのポストに

生成後は `assets/promo/` にアップしてくれれば、サイズ調整はこちらでやります。
（※ ストアのスクショ本体は、実機のスクリーンショットをそのまま使うのが一番効果的です）
