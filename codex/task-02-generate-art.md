# task-02: gpt-image-1 で敵イラストを生成してコミットする

## 目的
`tools/gen_art.mjs` を実行し、`tools/art_prompts.json` の全プロンプトから
敵イラスト(PNG)を生成して `assets/enemies/<id>.png` に保存し、コミット＆プッシュする。

## 前提（重要）
- これは **OpenAIの画像API を呼ぶ**処理。**ChatGPT Plusの月額には含まれない従量課金**が発生する。
  Plusだけでは実行できない。API残高（クレジット）が必要。
- **APIキー**を環境変数 `OPENAI_API_KEY` に設定して実行する。ソースにキーを書かない・コミットしない。
- **モデルID**は `--model=<id>`（または環境変数 `OPENAI_IMAGE_MODEL`）で指定する。
  既定は `gpt-image-1`。アカウントで使える正確なモデルID（例: 新しい世代のID）に合わせること。
  IDが違うとAPIがエラーを返す。

## 手順
1. まず**パイロット4体だけ**生成して絵柄を確認する:
   ```bash
   OPENAI_API_KEY=... node tools/gen_art.mjs --pilot --quality=medium --model=gpt-image-1
   ```
   （`--model` はアカウントの正確な画像モデルIDに置き換える）
   → `assets/enemies/slime.png rat.png gen_r.png maou.png` ができる。
2. 問題なければ**残り全部**:
   ```bash
   OPENAI_API_KEY=... node tools/gen_art.mjs --quality=medium
   ```
   （既存ファイルはスキップ。作り直すなら `--force`）
3. 生成物をコミット＆プッシュ:
   ```bash
   git add assets/enemies/*.png
   git commit -m "task-02: generate enemy art via gpt-image-1"
   git push
   ```
4. `codex/LOG.md` に、生成できたID・枚数・失敗があればそのIDを追記する。

## ルール
- `tools/gen_art.mjs` と `tools/art_prompts.json` の**中身は変更しない**（プロンプト調整が必要ならLOGに `QUESTION:` として提案するだけ）。
- 生成される画像は「正方形・透過PNG・キャラ1体」。それ以外の加工はしない。
- APIキーを絶対にリポジトリに含めない。

## 補足
- 画質は `--quality=low|medium|high`。まず `medium` 推奨。
- 1枚失敗しても他は続行される。失敗IDだけ後で `node tools/gen_art.mjs <id> --force` で再生成可能。
