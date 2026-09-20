# 音楽・効果音ガイド（FFリメイク水準を目指す制作手順）

ゲーム内蔵の自作チップチューンは**廃止**しました。以後、音楽と効果音は下記のAIサービスで制作し、
ファイルを置くだけで自動的に鳴る仕組みになっています（画像と同じパイプライン）。

## 使うサービス（あなたが登録するもの）

| 用途 | サービス | プラン | 理由 |
|---|---|---|---|
| BGM | **Suno**（suno.com） | **Pro（月額約$10）** | 現在最高品質の音楽生成。**Proプランで生成曲の商用利用・権利があなたに帰属** |
| 効果音 | **ElevenLabs**（elevenlabs.io の Sound Effects） | **Starter（月額約$5）** | 48kHzのプロ品質SFX。**有料プランはクレジット表記不要で商用利用可** |

- どちらも「使った月だけ課金」でき、アセットが揃ったら解約してOK（生成済みファイルの権利は残る）
- 代替: BGMはAIVA（オーケストラ特化・Proで権利帰属）も可

## アップロード先

- BGM: **https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm**
- 効果音: **https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/sfx**

ファイル形式は **mp3**。ファイル名は下記の通り（これも画像と同じルール）。

---

# A. BGM 6曲（Sunoに貼るプロンプト）

Sunoでは「Instrumental」をONにして、下記スタイル文を貼って生成。
気に入るまで数回生成→ベストをダウンロード→上記URLへ。**1曲60〜120秒**あれば十分（ループ再生します）。

## title.mp3（タイトル画面）
```
Epic orchestral JRPG main theme, sweeping strings, noble French horns, harp arpeggios, gentle piano intro building to a hopeful heroic melody, cinematic game soundtrack, instrumental, seamless loop
```
## field.mp3（フィールド）
```
Adventurous orchestral JRPG overworld theme, bright strings and woodwinds, marching snare, soaring brass melody, sense of a grand journey across plains, uplifting, instrumental, seamless loop
```
## town.mp3（町・城）
```
Warm peaceful JRPG town theme, acoustic guitar, flute, light strings, cozy and nostalgic, gentle waltz feel, medieval village atmosphere, instrumental, seamless loop
```
## dungeon.mp3（洞窟・塔）
```
Mysterious tense JRPG dungeon theme, low strings, deep pulsing bass, sparse piano echoes, dark cave ambience, slowly building unease, cinematic, instrumental, seamless loop
```
## battle.mp3（通常戦闘）
```
Fast exciting orchestral JRPG battle theme, driving strings ostinato, bold brass stabs, energetic percussion, heroic melody with urgency, game soundtrack, instrumental, seamless loop
```
## boss.mp3（ボス戦）
```
Intense dramatic orchestral boss battle theme, full choir hits, pounding timpani and taiko drums, menacing low brass, frantic strings, epic final confrontation, instrumental, seamless loop
```

---

# B. 効果音 13個（ElevenLabs Sound Effects に貼るプロンプト）

各1〜2秒（win/levelは3〜4秒）。生成→ダウンロード→ファイル名を付けて assets/sfx へ。
置いた瞬間、現在の電子ビープ音と自動で差し替わります。

| 保存名 | プロンプト |
|---|---|
| ok.mp3 | Bright short correct-answer chime, sparkling bell, satisfying, game UI |
| crit.mp3 | Powerful critical hit impact with metallic slash and explosive punch, fantasy game |
| ng.mp3 | Short wrong-answer buzzer, muted error tone, game show style |
| slash.mp3 | Sharp sword slash whoosh with slight metal ring, fantasy battle |
| hit.mp3 | Heavy blunt impact hitting the hero, deep thud with slight rumble |
| heal.mp3 | Gentle magical healing shimmer, warm ascending sparkle, fantasy |
| level.mp3 | Triumphant short level-up fanfare, brass and bells, celebratory, 3 seconds |
| win.mp3 | Victory fanfare, orchestral brass flourish ending with a bright chord, 4 seconds |
| encounter.mp3 | Quick dramatic encounter sting, rising orchestral swell, danger appears |
| boss.mp3 | Deep menacing monster roar with orchestral hit, boss appears |
| chest.mp3 | Treasure chest creaking open followed by a magical coin sparkle |
| stairs.mp3 | Short mystical transition whoosh, moving to another area |
| cursor.mp3 | Tiny soft menu tick, subtle UI blip |

（任意の追加: fire.mp3 = fire spell burst / thunder.mp3 = lightning strike zap。将来の魔法演出用）

---

# 実装済みの受け皿（技術メモ）

- `js/bgm.js`: `assets/bgm/<track>.mp3` をループ再生（クロスフェード付き）。ファイルが無い間は**無音**
- `js/game.js` の SFX: `assets/sfx/<key>.mp3` があれば自動使用、無ければ従来のビープ
- 音楽ON/OFF: タイトルとゲーム内メニューの「ＢＧＭ」
- ライセンス管理: 生成に使ったサービスとプランをこのファイルに記録しておくこと
  - BGM: （記入例）Suno Pro で生成 2026-07
  - SFX: （記入例）ElevenLabs Starter で生成 2026-07
