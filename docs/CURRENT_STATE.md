# プロジェクト現状メモ（軽量ハンドオフ・随時更新）

セッションが変わっても続けられるよう、要点だけ。詳細な過去ログは docs/TODO_NEXT.md ほか各docに分散。

## 何を作っているか
早押し英単語 × RPG。**目標は「App Store公開して累計10万円稼げれば成功」**（現実的ライン＝累計5,000〜1万DL）。
広告（AdMob）＋300円課金（広告除去/解放）で収益化予定。まず小さく出して人気が出れば続きを作る方針。

## 2つのゲーム／モード（新作 WORD QUEST II = party/ 配下）
1. **ことばの闘技場（バトルモード）** … 10連戦（ザコ→中ボス→四天王ハウル→…→ラスボス沈黙王ミュートス）。
   1戦ごとに全回復＋アイテム入手＋レベルUP。ラスボスは全アイテム使い切る〜50ターンの死闘。**←今これを主軸に磨いている**
2. **ストーリーモード** … 1章（王都→洞窟→四天王ハウル撃破）を通しで。まずここまででv1公開が最小ゴール。

1作目 TOEIC QUEST（リポジトリ直下 index.html / js/game.js）は完成・保存済み（DQ1風・ソロ）。以後の主軸は新作。

## 重要な決定・制約
- **TOEIC は ETS の商標。公開前にアプリ名と「TOEIC600」表記を変更必須**（例：スコア600 / Lv600）。ゲーム内はレベル数字に差し替え可能な設計。
- アプリ化は Capacitor→Xcode→App Store（**Mac必須**。ユーザーがMac所持か未確認）。
- 画像/音はユーザーが外部AI（ChatGPTのGPT-image / Suno / ElevenLabs / Gemini Veo）で生成→GitHubへアップ→自動反映。API課金はしない方針。
- 表記は普通の漢字かな交じり（ひらがな縛りは廃止）。

## アーキテクチャ（新作）
- `party/index.html` … シェル。scriptは vocab×6 → enemies → maps_wq2 → bgm → quiz → pbattle → pfield → pmain。
- `party/js/pbattle.js` … パーティ戦闘エンジン。CHARS/SPELLS/レベル成長/敵魔法・全体攻撃/ボスphase/チェイン(最大+15%)/逃走(~50%)。API: start, demoParty, resetParty, fullHeal, levelEveryone, giveItemToParty, expToNext, spellInfo, press* 等。
- `party/js/pfield.js` … フィールド探索。WQ2_MAPS描画・移動(歩行2コマ)・町/店/宿/宝箱/鍵/階段/エンカウント・道具袋(個人8個・使う/渡す/捨てる)・装備・単語帳・セーブ(wq2_save_v1)。
- `party/js/pmain.js` … タイトル＆モード起動（ことばの闘技場 runArena / ストーリー PFIELD.start）。ラスボスbossMaou・中ボスminiBoss定義もここ。
- `party/data/maps_wq2.js` … 216×176ワールド＋城/村＋洞窟3F＋塔4F。`party/tools/check_wq2.js` でBFS検証（ALL PASS維持）。
- 共有: data/vocab_*.js（3000語）, data/enemies.js（32体）, js/quiz.js, js/bgm.js, assets/。

## アセット
- assets/field/ … 地形9・アイコン5・宝箱2・主人公3方向＋歩行中割り3(hero_*_b)・NPC11・階段2(stairs_up/down)。
- assets/bgm/ … title/field/town/dungeon/battle/battle2/battle_dungeon/midboss/boss/ending。
- assets/sfx/ … 13種。assets/bg/ … 戦闘背景10。assets/ui/ … title（frame.png未着＝装飾枠は自動待ち）。

## ビルド／公開（毎回）
1. 画像/音を更新したら: `cd scratchpad && node make_inline_assets.mjs`（BGMは各170秒でインライン化・数分かかる）。
2. party用の軽量インライン: inline_assets.js から UI_ART と BGMの battle_dungeon/ending を除いて party_inline.js を生成。
3. `node tools/build_standalone.js <out> --artifact --src=party/index.html --embed=<scratch>/party_inline.js`（dist版は --artifact なし）。
4. Artifactツールで再公開（URL固定）:
   - 新作: https://claude.ai/code/artifact/7b26dc4a-6c42-4d7e-b3ac-35220101ff5b
   - 1作目: https://claude.ai/code/artifact/8fe8b8da-110b-4d9b-98ed-e9632f9e2323
5. commit+push（trailer: Co-Authored-By: Claude Fable 5 … / Claude-Session: …）。ブランチ claude/toeic-quest-game-8zva6k。
- scratchpad: /tmp/claude-0/-home-user-toeic-quest/fffdd978-e54e-5930-b507-f7c8d2975a4f/scratchpad

## シナリオ
docs/SCENARIO_WQ2_FINAL.md（案B人間ドラマ基盤＋C体感封印＋A経済、1950行）。未実装（ストーリーモードに落とし込む作業が残）。

## 次にやること（優先順）
1. ことばの闘技場の手触り／バランス調整（ユーザー反応待ち）。
2. 反応良ければ v1最小（1章通し＋デイリー/ストリーク移植＝継続率）。
3. TOEIC商標リネーム → Capacitor＋AdMob＋StoreKit＋ストア素材＋審査（Mac必要）。
4. 未着アセット: assets/ui/frame.png（装飾枠）、任意の tree/peak/顔グラ等。

## 音の注意
インラインBGMは170秒クリップ。artifactが重め（約13〜14MB）。重すぎる指摘が出たら120秒に短縮で対応。
