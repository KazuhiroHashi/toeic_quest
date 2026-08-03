# オープニング／エンディング ムービー制作キット（Higgsfield ＋ Seedance 2.0）

**iPhoneから発注する用のページ（起点画像を長押し保存＋プロンプトをタップでコピー）はこちら：**
https://claude.ai/code/artifact/61125985-e34f-4537-9af5-fd2da55397b9

---

## 発注時の3つのルール（全カット共通）

| 項目 | 設定 |
|---|---|
| **比率** | **9:16（縦）** — 縦型アプリ、App Storeプレビュー、SNS の全部に使える |
| **長さ** | **10秒** — 3カットで30秒。App Storeプレビューの規定（15〜30秒）にちょうど収まる |
| **音声** | **なし（オフ）** — 10秒ごとにBGMが変わってしまうので、音はゲーム内の `title.mp3` / `ending.mp3` を後から乗せる |

解像度は 4K しか選べなくても問題なし（後から縮小できる。拡大はできないので、大きい方が安全）。

> **重要**：Seedance は画像内の文字を動かすと崩れるので、**ロゴは動画に焼き込まない**。
> ロゴ・「完」の表示は、編集ソフトで静止画として後乗せするか、ゲーム側で表示する。

## 共通スタイル指定（全カットの末尾に付ける）
```
Style: anime JRPG cinematic, soft cel shading, vivid saturated colors, clean thick outlines, 2D illustration look (not 3D render), gentle film grain. No text, no letters, no subtitles, no watermark, no UI.
Avoid: warping faces, extra limbs, morphing characters, text artifacts, camera shake, photorealism.
```

---

# 🎬 オープニング（3カット × 10秒 ＝ 30秒）

## OP-1「世界とヒーローたち」10秒
- **起点画像：`assets/ui/title_bg.png`**（勇者4人＋城のキービジュアル）

```
Slow cinematic push-in toward the distant castle. Clouds drift gently across the blue sky, grass and flowers sway in a soft breeze, sunlight rays shimmer and grow brighter. The four chibi heroes stand still, capes and hair fluttering slightly in the wind. Floating glowing alphabet letters drift slowly upward around them. In the second half, the heroes turn toward the camera one after another with determined expressions. Calm and hopeful, building to heroic.
```

## OP-2「沈黙王の玉座」10秒
- **起点画像：`assets/bg/maou.png`**（紫の玉座の間）

```
Slow ominous dolly forward down the red carpet toward the empty throne. Purple magic flames flicker along the pillars, floating spellbooks rotate slowly in the air, dark energy pulses through the hall. A shadowy silhouette gradually forms sitting on the throne, growing more defined. Glowing letters in the air lose their light one by one and shatter into fading particles. Menacing, regal, tense.
```

## OP-3「英単語の剣」10秒 ★最優先
- **起点画像：`assets/ui/icon.png`**（剣を掲げる主人公アイコン）

```
The hero raises the glowing sword higher as radiant golden English letters swirl upward around the blade, spinning faster and faster into a spiral of light. The camera slowly orbits around him. The blade flares with intense golden energy, then a burst of light expands outward filling the frame. Heroic, powerful, exhilarating.
```
> 上部にロゴを重ねる余白を意識して構図を選ぶ。

---

# 🎬 エンディング（3カット × 10秒 ＝ 30秒）

## ED-1「魔王の消滅」10秒
- **起点画像：`assets/enemies/maou_true.png`**

```
The dark figure slowly dissolves into countless particles of white light that drift upward. The surrounding darkness gradually gives way to warm glowing light, the purple gloom fading to gold. Peaceful, redemptive, beautiful dissolution. Slow motion throughout.
```

## ED-2「ことばが還る」10秒 ★最優先
- **起点画像：`assets/bg/zone1.png`**（明るい草原）

```
Countless glowing golden letters rain gently down from the sky and scatter across the green landscape, restoring color and light everywhere they touch. Flowers bloom, the sky brightens from dusk to clear blue, birds fly across the frame. The camera drifts slowly upward. Magical, joyful restoration. Slow graceful motion.
```

## ED-3「旅の続き」10秒
- **起点画像：`assets/bg/zone4.png`**

```
Camera slowly pulls back and rises high above the world, revealing the vast peaceful landscape bathed in golden sunset light. Glowing letters drift lazily through the sky. Tiny hero silhouettes walk together down a path toward the horizon. Epic, hopeful, "the journey continues" final shot.
```
> ここに「★　ＷＯＲＤ　ＱＵＥＳＴ　・　完　★」を後乗せすると綺麗に締まる。

---

# 📁 起点画像一覧（リポジトリ内）
| ファイル | 使うカット |
|---|---|
| `assets/ui/title_bg.png` | OP-1 |
| `assets/bg/maou.png` | OP-2 |
| `assets/ui/icon.png` | OP-3 |
| `assets/enemies/maou_true.png` | ED-1 |
| `assets/bg/zone1.png` | ED-2 |
| `assets/bg/zone4.png` | ED-3 |

上のArtifactページには**6枚すべてが埋め込んである**ので、iPhoneなら長押し→「写真に追加」でそのまま保存できる。

---

# 🎼 音の付け方（後乗せ）
- **OP** → `assets/bgm/title.mp3`
- **ED** → `assets/bgm/ending.mp3`
- iMovie / CapCut で 3カットを連結 → 元音声を消す → BGMを1本敷く
- サビの位置に **OP-3（剣の一撃）／ED-2（ことばが還る）** を置くと決まる

# ⚙️ うまくいかない時
- **motion strength は控えめ**に（強いとキャラの顔が崩れる）
- プロンプトを **「何が動くか」だけ**に絞る（例：`Clouds drift, grass sways, light glows brighter. Characters stay still.`）
- 各カット2〜3回生成して良いものを採用

## 優先度（お試し枠が限られている場合）
1. **OP-3**（英単語の剣＝ゲームの核。SNS拡散にも最強）
2. **ED-2**（ことばが還る＝物語の答え）
3. **OP-1**（世界の紹介）

**この2本（OP-3・ED-2）だけでも、ストア掲載動画とSNS投稿に十分使える。**

---

# 📱 App Store プレビュー動画の規定（提出時）
| 項目 | 要件 |
|---|---|
| 長さ | **15〜30秒**（3カット30秒でぴったり） |
| 解像度 | **886×1920** または 1080×1920（縦） |
| コーデック | H.264 / ProRes |
| フレームレート | 30fps以下 |
| ファイルサイズ | 500MB以下 |

4Kで作った素材を、書き出し時に 1080×1920 へ縮小すればOK。
