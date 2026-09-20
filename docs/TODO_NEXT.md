# 作業リスト（2026-07-19 更新・新作WORDRIA 開発フェーズ）

1作目 TOEIC QUEST は完成・保存済み（アーティファクトURL不変）。以後の開発は新作が主軸。

- 1作目: https://claude.ai/code/artifact/8fe8b8da-110b-4d9b-98ed-e9632f9e2323
- 新作戦闘プロトタイプ: https://claude.ai/code/artifact/7b26dc4a-6c42-4d7e-b3ac-35220101ff5b

---

# ユーザーの作業（優先度順）

## 0.【最重要・5分】新作の死闘デモを遊んで感想を返す
戦闘の面白さの方向性が全ての土台。四天王ハウル戦（目標: 正解率9割で勝率90%・6分強の死闘）の
手応え・テンポ・難度の感想がほしい。

## 1.【画像・最優先】フィールドHDリテイク 16枚
- docs/ART_PROMPTS_FIELD_HD.md（ピクセルアート指定・**ファイル名は現行と同じ＝上書きで自動反映**）
- 内訳: 地形9 ＋ **tree/peak 2（最優先）** ＋ 建物アイコン5
- アップ先: assets/field

## 2.【画像】UI素材 8枚
- docs/UI_PROMPTS.md（**frame.png が最優先**。アップした瞬間 全ウィンドウに自動適用・実装済み）
- 内訳: frame / button / cmd_attack / cmd_spell / cmd_guard / cmd_item / logo_wq2 / timer_frame
- アップ先: assets/ui

## 3.【画像】新作キャラ素材 21枚（戦闘の方向性が固まってからでOK）
- docs/ASSET_PROMPTS_WQ2.md
- 内訳: 顔グラ4 ＋ 歩行スプライト9（ガイ/リナ/ミア×3方向）＋ 四天王・魔王5 ＋ 新戦闘背景3
- アップ先: assets/party（新規）と assets/bg

## 4.【音】Suno 新曲5 ＋ ElevenLabs 効果音
- docs/ASSET_PROMPTS_WQ2.md 後半（新ワールド曲・章/加入ジングル・四天王戦・最終戦）
- docs/AUDIO_PROMPTS_2.md の encounter.mp3 リテイク3案（1作目の音がイマイチな件）
- アップ先: assets/bgm / assets/sfx

## 5.【動画】保留中（ユーザー判断でストップ。再開時は docs/VIDEO_PROMPTS.md）

### 自動化についての結論（2026-07-19時点）
- gpt-image / Suno / ElevenLabs は**API課金なしでは私から直接駆動できない**（ユーザー方針: API課金なし）
- Codex はコード作業しかできず画像は作れない → コードは私が担当するので出番なし
- 軽減策: 各プロンプト集は「1つの会話に連投→まとめてダウンロード→同名アップ」で済む構成にしてある。
  実質作業は コピペ→保存→アップロード のみ

---

# Claude側の作業キュー（自動進行）

## 進行中（並列エージェント）
- [x] シナリオ案A（docs/SCENARIO_WQ2.md・930行）
- [ ] シナリオ案B（人間ドラマ軸・docs/SCENARIO_WQ2_B.md）← 実行中
- [ ] シナリオ案C（ゲームプレイ統合軸・docs/SCENARIO_WQ2_C.md）← 実行中
- [ ] 3案の審査・統合 → docs/SCENARIO_WQ2_FINAL.md（B/C完了後に審査エージェント起動）
- [x] マップ（party/data/maps_wq2.js: 96×80ワールド＋城＋村＋洞窟3F＋塔4F、BFS検証PASS）
- [x] バランス（シム2000回: 正解率90%→勝率90%・6.2分。適用済み）
- [x] アセットプロンプト集（docs/ASSET_PROMPTS_WQ2.md）

## 次の実装（プロトタイプの感想を受けてから着手が理想）
1. フィールドエンジンを party/ に移植（WQ2_MAPS で歩く・エンカウント・宝箱・階段・鍵）
2. SCENARIO_WQ2_FINAL.md をイベントデータ化（章フラグ・仲間加入・四天王配置・世界変化）
3. パーティメニュー（つよさ/どうぐ/じゅもん/さくせん/セーブ）・レベル個別成長・装備
4. UI素材（frame/button/cmd/logo）が届き次第の組み込み（frameは実装済み・自動）
5. face_*.png が届いたらパーティ枠に顔グラ表示
6. 敵グループのゾーン別編成テーブル・中ボス/固定シンボル戦
7. 20分ダンジョンの中間回復石・ショートカット鍵の実装（マップデータ側は準備済み）

## ビルド・公開手順（毎回）
- scratchpad/make_inline_assets.mjs → tools/build_standalone.js（1作目 --embed=inline_assets.js /
  新作 --src=party/index.html --embed=party_inline.js）→ 両アーティファクト republish → commit/push
