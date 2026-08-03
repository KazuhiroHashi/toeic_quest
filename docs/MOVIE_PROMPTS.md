# オープニング／エンディング ムービー制作キット（Higgsfield ＋ Seedance 2.0）

Seedance 2.0 は **画像を起点に「動き」を指示する** のが得意なので、
「① 起点画像（アセット）」＋「② 動画プロンプト」のセットで並べています。

> **重要**：Seedance は画像内の文字を動かすと崩れやすいので、**ロゴは動画に焼き込まない**方針。
> 最後のロゴ表示は「無地の背景で動画を作り、あとから静止ロゴを重ねる」か「ゲーム側で表示」が安全です。

## 共通スタイル指定（全カットの末尾に付ける）
```
Style: anime JRPG cinematic, soft cel shading, vivid saturated colors, clean thick outlines, 2D illustration look (not 3D render), gentle film grain. No text, no letters, no subtitles, no watermark, no UI.
```

## 共通の禁止指定（崩れ防止）
```
Avoid: warping faces, extra limbs, morphing characters, text artifacts, camera shake, photorealism.
```

---

# 🎬 オープニング（全6カット・合計約30秒）

## OP-1「夜明けの世界」5秒
- **起点画像：`assets/ui/title_bg.png`**（勇者4人＋城のキービジュアル）← そのまま使えます
```
Slow cinematic push-in toward the distant castle. Clouds drift gently across the blue sky, grass and flowers sway in a soft breeze, sunlight rays shimmer and glow brighter. The four chibi heroes stand still, capes and hair fluttering slightly in the wind. Floating glowing alphabet letters drift slowly upward. Calm, hopeful, majestic opening shot.
```

## OP-2「ことばが奪われる」5秒
- **起点画像：`assets/bg/zone1.png`**（明るい草原）
```
The bright peaceful landscape suddenly darkens as a wave of black shadow sweeps across from the horizon. Floating glowing letters in the air lose their light one by one and shatter into fading particles. Colors drain toward grey. Ominous, sudden, dramatic tonal shift.
```

## OP-3「沈黙王の玉座」4秒
- **起点画像：`assets/bg/maou.png`**（紫の玉座の間）← そのまま使えます
```
Slow ominous dolly forward down the red carpet toward the empty throne. Purple magic flames flicker along the pillars, floating spellbooks rotate slowly in the air, dark energy pulses. A shadowy silhouette gradually forms sitting on the throne. Menacing, regal, tense.
```

## OP-4「四天王」4秒
- **起点画像：`assets/enemies/king_gag.png`**（またはお好みのボス）
- ※透過PNGなので、Higgsfield側で背景を付けるか、下の指示で暗い空間に置きます
```
The character floats in a dark void lit by purple magic light, cloak and hair flowing, magical aura swirling around them, slowly turning toward the camera with a confident menacing gesture. Dramatic rim lighting, particles drifting. Boss reveal shot.
```

## OP-5「英単語の剣」5秒 ★このゲームの核
- **起点画像：`assets/ui/icon.png`**（剣を掲げる主人公アイコン）← そのまま使えます
```
The hero raises the glowing sword higher as radiant golden English letters swirl upward around the blade, spinning faster and faster into a spiral of light. The blade flares with intense golden energy. Camera slowly orbits around him. Heroic, powerful, exhilarating.
```

## OP-6「決意の4人」6秒
- **起点画像：`assets/ui/title_bg.png`**（同じキービジュアルを再利用）
```
The four chibi heroes turn to face the camera one after another with determined expressions, then step forward together toward the viewer. Wind blows their capes, golden letters swirl around them, sunlight bursts behind them. Ends with the group standing tall in a heroic pose. Uplifting, cinematic finale of an opening.
```
> 最後にロゴを重ねる余白として、**上部を空けた構図**を意識してください。

---

# 🎬 エンディング（全5カット・合計約28秒）

## ED-1「魔王の消滅」5秒
- **起点画像：`assets/enemies/maou_true.png`**
```
The dark figure slowly dissolves into countless particles of white light that drift upward. The surrounding darkness gradually gives way to warm glowing light. Peaceful, redemptive, beautiful dissolution. Slow motion.
```

## ED-2「ことばが還る」6秒 ★エンディングの核
- **起点画像：`assets/bg/zone1.png`** または **`title_bg.png`**
```
Countless glowing golden letters rain gently down from the sky and scatter across the green landscape, restoring color and light everywhere they touch. Flowers bloom, the sky brightens from dusk to clear blue, birds fly across. Magical, joyful restoration. Slow graceful motion.
```

## ED-3「街に声が戻る」5秒
- **起点画像：`assets/bg/zone3.png`** または `zone2.png`
```
Warm sunlight spreads across the town as the scene comes alive: banners flutter, lights turn on in windows, gentle particles of light drift through the air like laughter returning. Camera slowly pans across the peaceful scene. Heartwarming, nostalgic.
```

## ED-4「仲間たちの笑顔」6秒
- **起点画像：`assets/ui/title_bg.png`**
```
The four chibi heroes look at each other and smile, shoulders relaxing, then look up at the bright sky together. Wind gently moves their hair and capes, petals and sparkles drift past. Camera slowly rises from behind them toward the sky. Warm, emotional, satisfying conclusion.
```

## ED-5「旅の続き」6秒
- **起点画像：`assets/bg/zone4.png`** または `title_bg.png`
```
Camera slowly pulls back and rises high above the world, revealing the vast peaceful landscape bathed in golden sunset light. Glowing letters drift lazily through the sky. The four tiny hero silhouettes walk together down a path toward the horizon. Epic, hopeful, "the journey continues" final shot.
```
> ここに「ＷＯＲＤ ＱＵＥＳＴ ・ 完」を後から重ねると綺麗に締まります。

---

# 📁 起点画像として使うアセット一覧（すでにリポジトリにあります）
| ファイル | 使うカット |
|---|---|
| `assets/ui/title_bg.png` | OP-1, OP-6, ED-4, ED-5 |
| `assets/ui/icon.png` | OP-5 |
| `assets/bg/maou.png` | OP-3 |
| `assets/bg/zone1.png` | OP-2, ED-2 |
| `assets/bg/zone3.png` | ED-3 |
| `assets/bg/zone4.png` | ED-5 |
| `assets/enemies/king_gag.png` 他 | OP-4 |
| `assets/enemies/maou_true.png` | ED-1 |

**ダウンロード方法**：GitHubの該当ファイルを開いて「Download」、または手元のクローンから直接。

---

# 🎼 音楽との合わせ方
- **OP** → `title.mp3`（タイトル曲）に合わせると自然
- **ED** → `ending.mp3` に合わせる
- 尺は「曲のサビが来る位置」に OP-5（剣の一撃）／ED-2（ことばが還る）を置くと決まります

# ⚙️ Seedance 2.0 での設定めやす
- **解像度**：縦型アプリなので **9:16** 推奨（ストア動画・SNS両対応）。横型も作るなら16:9で別途
- **1カット4〜6秒**を個別生成 → 編集ソフトで連結（iMovie / CapCut で十分）
- **motion strength は控えめ**に（強すぎるとキャラの顔が崩れます）
- うまくいかない時は、プロンプトを **「何が動くか」だけに絞る**（例：`Clouds drift, grass sways, light glows brighter. Characters stay still.`）

# 💡 コツ
1. **キャラを動かしすぎない**：AIは人物の動きで崩れるので、「風でなびく」「振り向く」程度に留める
2. **カメラワークで見せる**：push-in / pull-back / orbit が最も安定して映える
3. **1カットずつ作って選抜**：各カット2〜3回生成して良いものを採用（お試し枠を効率的に）
4. **文字は入れない**：ロゴ・字幕は後乗せが確実

---

## 優先度（お試し枠が限られている場合）
1. **OP-5**（英単語の剣＝ゲームの核。SNS拡散にも最強）
2. **ED-2**（ことばが還る＝物語の答え）
3. **OP-1**（世界の紹介）
4. **OP-6**（決意の4人）
5. 残り

**この2本（OP-5・ED-2）だけでも、ストア掲載動画とSNS投稿に十分使えます。**
