# assets/enemies

敵イラスト(PNG)の置き場所。ファイル名は敵IDと一致させる（例: `slime.png`, `maou.png`）。
IDの一覧は `docs/ART_GUIDE.md` を参照。

戦闘画面 (`js/battle.js` の `setEnemyArt()`) が `<id>.png` を自動で読み込む。
存在しないIDは絵文字プレースホルダーにフォールバックする。

- 推奨: 正方形・透過PNG・キャラ1体・512〜1024px程度
- ChatGPTで生成 → Claudeに送ればここに配置されます（`docs/ART_GUIDE.md` の手順）
