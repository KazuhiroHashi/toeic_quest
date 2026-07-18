# 次回作業メモ（セッション切れ対策・2026-07-18記録）

ユーザーからの修正依頼リストと実装方針。途中でセッションが切れたら、ここから再開する。

## 修正依頼（2026-07-18受領）

1. **戦闘BGMは続き再生をやめる** — 毎回最初から。フィールド/町/ダンジョンBGMは続き再生のまま。
2. **戦闘曲を複数化** — Sunoでもう1曲完成済み（ユーザー側）。`assets/bgm/battle2.mp3` としてアップしてもらい、
   通常戦闘は battle / battle2 からランダム。さらに:
   - 塔・洞窟での戦闘曲: `battle_dungeon.mp3`（あれば優先使用）
   - 中ボス曲: `midboss.mp3`（将軍・ドラゴンなど maou 以外のボス戦。無ければ boss.mp3）
   - Suno用プロンプトを docs/AUDIO_GUIDE.md 形式で提示する（→ docs/AUDIO_PROMPTS_2.md 作成）
3. **呪い（にがて単語を敵が出題してくる仕組み）を削除** — battle.js の curse ブロックを丸ごと除去。
   いろいろな単語に触れる方が良い・ゲームバランスが崩れるため。通常攻撃のみに戻す。
4. **かいしんの いちげき は通常こうげき限定** — ヒール・呪文では「かいしん」を出さない
   （2秒以内正解の×2ボーナスも呪文には付けない。battle.js の呪文処理を確認）。
5. **エンディング実装** — 現状: 魔王撃破後、ボス曲が流れたまま開始の城に戻るだけ。
   - 魔王撃破 → BGM停止 → 勝利ジングル → エンディングシーン（スタッフロール風テキスト+一枚絵）→ THE END → タイトルへ
   - `ending.mp3` があればエンディング曲として使用（Sunoプロンプトも提示）
6. **ストーリー用ビデオクリップ** — OP・中ボス戦前・最終ボス戦前・エンディングの4本。
   ユーザーはChatGPT Plus加入済み → **Sora**（Plusに含まれる、sora.com）で生成してもらう。
   プロンプト集を docs/VIDEO_PROMPTS.md に作成。保存先: `assets/video/op.mp4` など。
   ゲーム側は <video> オーバーレイで該当タイミングに再生（スキップ可能に）。
   注意: 動画はサイズが大きいのでartifact版には埋め込まない（リポジトリ/実機ビルドのみ）。
7. **エンカウント効果音の作り直し** — 今のはイマイチ。ElevenLabs用プロンプトを再考して提示。
8. **戦闘終了時のBGM切り替え** — 勝利した瞬間に戦闘BGMを即停止 → 勝利ファンファーレSFX → その後フィールドBGM再開。
   現状はBGMが唐突にフィールド曲へ切り替わる。
9. **フィールド用テクスチャ・スプライト・アイコンはユーザーが生成中**（docs/ART_PROMPTS_FIELD.md 参照）。
   届いたら assets/field/ を確認して新フィールド描画エンジンを実装する。

## 実装状態

- [ ] bgm.js: battle系（battle/battle2/battle_dungeon/midboss/boss）は currentTime=0 から再生
- [ ] bgm.js: 論理名→候補リスト解決（battle→ランダム、無いファイルはフォールバック）
- [ ] game.js runBattle: マップ種別（cave/tower）で battle_dungeon、ボスid=maou→boss、他ボス→midboss
- [ ] battle.js: 呪い削除
- [ ] battle.js: 呪文・ヒールのかいしん除去
- [ ] game.js: エンディングシーン実装（魔王撃破フラグで分岐）
- [ ] battle.js/game.js: 勝利時 BGM即stop→winジングル→フィールドBGM
- [ ] docs/AUDIO_PROMPTS_2.md（Suno: battle_dungeon / midboss / ending）
- [ ] docs/VIDEO_PROMPTS.md（Sora: op / midboss_cutscene / finalboss_cutscene / ending 4本）
- [ ] ElevenLabs エンカウント音の新プロンプト（AUDIO_PROMPTS_2.md に含める)
- [ ] リビルド（inline assets→artifact/dist）・アーティファクト再公開・commit/push

## 資産の置き場所ルール（再掲）

- BGM: assets/bgm/*.mp3（title/field/town/dungeon/battle/boss + 今後 battle2/battle_dungeon/midboss/ending）
- SFX: assets/sfx/*.mp3（13種、encounter は差し替え予定）
- 動画: assets/video/*.mp4（op/midboss/finalboss/ending）※新設
- フィールド画像: assets/field/（地形9・アイコン7・主人公3・NPC11 = 30枚、生成中）
- アップロードURL: https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/<フォルダ>
- アーティファクトURL（固定）: https://claude.ai/code/artifact/8fe8b8da-110b-4d9b-98ed-e9632f9e2323
- artifact再構築手順: scratchpad/make_inline_assets.mjs → tools/build_standalone.js --artifact --embed=inline_assets.js
