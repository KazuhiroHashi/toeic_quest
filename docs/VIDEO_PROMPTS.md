# ストーリー用ビデオクリップ制作ガイド（Sora用）

オープニング・中ボス・最終ボス・エンディングの4本のショートムービーを入れます。
ゲーム側は、該当シーンで動画をオーバーレイ再生（タップでスキップ可）する形で実装します。
**動画ファイルが届き次第、再生機能をこちらで実装します。**

## 使うサービス: Sora（ChatGPT Plusに含まれています）

- **sora.chatgpt.com** を開く → ChatGPTのアカウントでログイン
- すでにChatGPT Plusに加入済みなので**追加料金なし**で使えます
- 下のプロンプトを貼って生成 → 気に入るまで数回 → ダウンロード
- 設定はあれば「横向き 16:9」「10秒」を選択（5秒しか選べなければ5秒でOK）

### 注意（重要）

- Plusプランの動画は**720p・短尺・ダウンロードに透かし（ウォーターマーク）が入る**ことがあります。
  プロトタイプには十分ですが、**App Storeリリース版に使う場合は透かしの有無を確認**してください。
  透かしが問題になったら: Sora Pro（上位プラン）／Runway／Kling などが代替候補です。まず1本作って確認しましょう。
- 各プロンプトは英語ですが、そのままコピペでOKです。

## アップロード先

**https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/video**

（assets/video フォルダは初回アップロード時に自動で作られます。緑の「Commit changes」を忘れずに）

ファイルは **mp4**。1本ずつで良いので、下記の【保存名】どおりに改名してからアップしてください。
※動画は容量が大きいため、ブラウザ版（アーティファクト）には埋め込まず、リポジトリ版・iPhoneアプリ版で使います。
※1ファイル25MBを超えるとGitHubのWebアップロードが失敗します。超えた場合は教えてください（圧縮方法を案内します）。

---

## 1. オープニング（タイトル→はじめから、の直後に再生）

```
Hand-painted anime fantasy style, cinematic 2D animation. A peaceful storybook kingdom where everyone joyfully speaks and words float in the air as glowing golden letters. Suddenly a dark shadow demon lord rises over the horizon and inhales the glowing letters from the whole land; the sky darkens, villagers' speech bubbles turn empty. Final shot: a young hero in a blue cape holding a giant pencil sword looks up with determination at a distant dark tower. Warm painterly colors turning cold, epic orchestral mood, no text, no captions.
【保存名: op.mp4】
```

## 2. 中ボス戦前（将軍との対決シーン）

```
Hand-painted anime fantasy style, cinematic 2D animation. In a torch-lit stone fortress, a huge armored lion general slams his battle axe down, blocking a narrow bridge. A small brave hero in a blue cape holding a giant pencil sword stands his ground as wind whips his cape. The two charge toward each other; clash of light on impact. Dramatic low-angle shots, embers floating in the air, painterly warm-vs-dark color contrast, epic tension, no text, no captions.
【保存名: midboss.mp4】
```

## 3. 最終ボス戦前（魔王との対峙シーン）

```
Hand-painted anime fantasy style, cinematic 2D animation. A hero in a blue cape with a giant pencil sword climbs the last steps of a colossal dark tower into a throne room filled with swirling stolen glowing letters. On the throne, a massive shadow demon lord with glowing purple eyes rises, absorbing the letters, growing larger. The hero raises the pencil sword, which lights up with golden words. Lightning flashes, purple-and-gold color scheme, epic final confrontation atmosphere, no text, no captions.
【保存名: finalboss.mp4】
```

## 4. エンディング（魔王撃破後に再生）

```
Hand-painted anime fantasy style, cinematic 2D animation. The dark demon lord dissolves into thousands of glowing golden letters that scatter across the sky like fireworks, then rain gently over a storybook kingdom. Color returns to the land: flowers bloom, villagers laugh and speak, children chase floating words. Final shot: the hero with the giant pencil sword stands on a green hill at sunrise, cape fluttering, watching the peaceful kingdom. Warm golden hour light, joyful and emotional, painterly, no text, no captions.
【保存名: ending.mp4】
```

---

## 生成のコツ

- キャラクターの一貫性は動画AIでは完璧にできません。「青いマント＋巨大鉛筆の剣の勇者」という
  記号で統一しているので、多少顔が違っても「同じ勇者」に見えます。
- 1本目（op.mp4）をまず作って雰囲気を確認 → 良ければ残り3本、が効率的です。
- 動きが崩れたカットが出たら、同じプロンプトでもう1〜2回生成すると当たりが出やすいです。
