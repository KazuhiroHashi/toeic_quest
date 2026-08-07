# オープニング／エンディング ムービー制作キット（Higgsfield ＋ Seedance 2.5）

**iPhoneから発注する用のページ（起点画像を長押し保存＋プロンプトをタップでコピー）はこちら：**
https://claude.ai/code/artifact/61125985-e34f-4537-9af5-fd2da55397b9

---

## 発注時のルール（全カット共通）

| 項目 | 設定 |
|---|---|
| **比率** | **9:16（縦）** — 縦型アプリ、App Storeプレビュー、SNS の全部に使える |
| **長さ** | **10秒** — 3カットで30秒。App Storeプレビューの規定（15〜30秒）にちょうど収まる |
| **音声** | **なし（オフ）** — 10秒ごとにBGMが変わってしまうので、音はゲーム内の `title.mp3` / `ending.mp3` を後から乗せる |
| **画質** | プランで選べる**最高値**（720pでも可。理由は下記） |

### 720pで足りる理由（Seedance 2.5 / Higgsfieldの現プラン）
Seedance 2.5 の出力解像度は**モデルではなくプラン（ティア）で決まる**。720pしか選べなくても実用上は問題ない：

- **ゲーム内のOP／ED** — 画面が縦360×640相当なので720pで十分すぎる
- **Google Play** — YouTubeリンクを貼る方式なので720pで問題なし
- **SNS・広告素材** — 720p縦は標準的なサイズ
- **App Storeのプレビュー動画** — ここだけ 886×1920 か 1080×1920 の指定がある。720×1280 は規定外なので、**書き出し時に1.5倍へ拡大して 1080×1920 で出力**する。Appleは寸法しか見ないので通る

なお **App Storeのプレビュー動画は任意**（必須はスクリーンショットのみ）。初回リリースは動画なしで出して、後から追加しても構わない。

上位プランで **1080p / Portrait** が選べるようになったら、最優先の **OP-3** と **ED-2** の2本だけ撮り直せば拡大処理が不要になる。

> **重要**：Seedance は画像内の文字を動かすと崩れるので、**ロゴは動画に焼き込まない**。
> ロゴ・「完」の表示は、編集ソフトで静止画として後乗せするか、ゲーム側で表示する。

## 共通スタイル指定（全カットの末尾に付ける）
```
Style: anime JRPG cinematic, soft cel shading, vivid saturated colors, clean thick bold outlines, 2D illustration look (not 3D render), crisp and clean with no grain or noise. Keep every element large and readable. No text, no letters, no subtitles, no watermark, no UI.
Faces: every character keeps normal anime eyes with clearly visible dark pupils, irises and small white highlights for the entire shot. Eyes never glow, never emit light, never turn white or blank. Facial features stay exactly as in the source image.
Avoid: glowing eyes, white eyes, blank eyes, light emitting from faces, blown-out highlights on faces, lens flare over characters, warping faces, extra limbs, morphing characters, text artifacts, camera shake, photorealism.
```

---

# 🎬 オープニング（3カット × 10秒 ＝ 30秒）

## OP-1「世界とヒーローたち」10秒
- **起点画像：`assets/ui/title_bg.png`**（勇者4人＋城のキービジュアル）

```
Slow continuous cinematic push-in toward the distant castle across the sunlit valley. Clouds drift steadily across the blue sky, grass and flowers sway in a gentle breeze. Sunlight rays shimmer and grow brighter in the far background sky only — the lighting on the four chibi heroes stays constant and even from start to finish, their faces never brighten. A handful of large golden alphabet letters drift slowly upward through the air far behind them. The heroes stand still with capes and hair fluttering softly in the wind, facing away toward the castle the whole time. One single smooth camera move throughout, calm and majestic.
```

## OP-2「沈黙王の玉座」10秒
- **起点画像：`assets/bg/maou.png`**（紫の玉座の間）

```
Slow ominous dolly forward down the red carpet toward the empty throne. Purple magic flames flicker along the pillars, floating spellbooks rotate slowly in the air, dark energy pulses through the hall. A shadowy silhouette gradually materializes sitting on the throne, its outline becoming sharper and more defined. Keep it a featureless dark silhouette with no visible face. Glowing letters in the air lose their light one by one and shatter into fading particles. Menacing, regal, tense.
```

## OP-3「英単語の剣」10秒 ★最優先
- **起点画像：`assets/ui/icon.png`**（剣を掲げる主人公アイコン）

```
The hero raises the glowing sword higher as large radiant golden English letters swirl upward around the blade, spinning faster and faster into a spiral of light. The blade flares with intense golden energy, then bursts into a brilliant shockwave of big golden letters and sparks filling the frame. All the light comes from the sword and the letters only — never from his face. His eyes keep their normal blue irises, dark pupils and small white highlights the entire time; light never fills, enters or replaces his eyes. The camera slowly orbits around him. Heroic, powerful, exhilarating.
```
> 上部にロゴを重ねる余白を意識して構図を選ぶ。

---

# 🎬 エンディング（3カット × 10秒 ＝ 30秒）

## ED-1「魔王の消滅」10秒
- **起点画像：`assets/enemies/maou_true.png`**

```
The dark figure slowly dissolves into large glowing motes of white light that drift upward. The surrounding darkness gradually gives way to warm glowing light, the purple gloom fading to gold. Peaceful, redemptive, beautiful dissolution. Slow motion throughout.
```

## ED-2「ことばが還る」10秒 ★最優先
- **起点画像：`assets/bg/zone1.png`**（明るい草原）

```
Large glowing golden letters rain gently down from the sky and scatter across the green landscape, restoring color and light everywhere they touch. Flowers bloom, the sky brightens from dusk to clear blue, birds fly across the frame. The camera drifts slowly upward. Magical, joyful restoration. Slow graceful motion.
```

## ED-3「旅の続き」10秒
- **起点画像：`assets/bg/zone4.png`**

```
Camera slowly pulls back and rises high above the world, revealing the vast peaceful landscape bathed in golden sunset light. A few large glowing letters drift lazily through the sky. Tiny hero silhouettes walk together down a path toward the horizon. Epic, hopeful, "the journey continues" final shot.
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

# ⚙️ 崩れたときの対処

## 目が光る／白目になる（実際に発生）
2026-08-07 の OP-1 テスト生成で、リナ（魔法使い）の両目が **8.4秒から発光**して不気味になった。前の8.3秒は完璧だった。

**原因（3つが重なる）**
1. `sunlight rays shimmer and grow brighter` の「明るくなる」が、背景だけでなく**顔の中にも適用**された。ブルームが顔で最もコントラストの高い小さな部分＝目に集中して白飛びする
2. `glowing` が文中に複数あり、さらに**リナの手元に光る星の杖**がある。モデルが「glow」をシーン全体の性質と解釈して隣のキャラへ波及した
3. **後半で振り向かせた**。振り向く＝顔を描き直す瞬間。720pで顔は縦55px程度しかなく、瞳のディテールを保てず「明るい塊」に潰れる

OP-3（英単語の剣）でも同じ症状を確認。こちらは **6.9秒から**主人公の両目が金色に発光した。光が主役のカットほど出やすい。

**対策**
- 共通スタイルの **`Faces:` 行と `Avoid:` 行**（上に追加済み）。ポジティブ指定とネガティブ指定を両方入れるのが効く
- 光が主役のカットは **「光の出どころ」を明示**する：`All the light comes from the sword and the letters only — never from his face.`
- 「明るくなる」演出は **背景だけ**に限定する（`in the background sky only`）
- **キャラを振り向かせない**。OP-1 は寄りだけの構図に変更済み
- **光る小物をキャラの近くに置かない**
- どうしても直らなければ **崩れる直前で切る**。少しスローにすれば10秒に戻せる：
  ```
  ffmpeg -t 8.30 -i in.mp4 -vf "setpts=1.2048*PTS,fps=30" -c:v libx264 -pix_fmt yuv420p -crf 17 -an out.mp4
  ```
- 後半にクライマックスがあって単純に切れない場合は、**崩れる直前から後半へディゾルブでつなぐ**。光る区間だけ飛ばせる：
  ```
  ffmpeg -i in.mp4 -filter_complex "\
  [0:v]trim=0:6.85,setpts=PTS-STARTPTS,scale=1080:1920,fps=30[a];\
  [0:v]trim=8.55:10.04,setpts=PTS-STARTPTS,scale=1080:1920,fps=30[b];\
  [a][b]xfade=transition=fade:duration=0.5:offset=6.35[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 18 -an out.mp4
  ```

> **カットの尺は編集時に揃えなくてよい。** 10秒は発注時のルールで、Appleが見るのは **OP全体で15〜30秒**。
> 例：10秒＋10秒＋7.8秒＝27.8秒で問題なし。

> **HEVCで出力された場合は要変換。** App Storeのプレビュー動画は **H.264 か ProRes** のみ。
> 上のコマンドは H.264 で書き出すので、通せば同時に解決する。

## 顔がゆがむ・体が伸びる
- **motion strength は控えめ**に
- プロンプトを **「何が動くか」だけ**に絞る（例：`Clouds drift, grass sways. Characters stay still.`）

## 共通
- 各カット2〜3回生成して良いものを採用。1回目で決めない

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

720p（720×1280）素材の場合は、書き出し時に **1080×1920 へ1.5倍拡大**して提出する。
