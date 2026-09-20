# WORDRIA アセット生成プロンプト集（完全版）

続編「WORDRIA 〜沈黙の四天王〜」用の新規アセットを一気に作るためのコピペ集です。
画像は ChatGPT（GPT-image）、BGMは Suno、効果音は ElevenLabs（Sound Effects）に
コードブロックを丸ごと貼り付けてください。

## アップロード先（4か所）

| 種類 | アップロード先 |
|---|---|
| キャラ画像（顔グラ・歩行・四天王・ミュートス） | https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/party |
| 戦闘背景 | https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bg |
| BGM | https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm |
| 効果音 | https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/sfx |

- `assets/party` フォルダはまだ存在しませんが、URLを開いてそのままアップすれば自動で作られます
- ファイル名は各ブロック内の**【保存名】の通り**にしてください（画像は .png、音は .mp3）
- 一度に上げるのは **10ファイル前後ずつ**が安全です
- アップ後は**緑の「Commit changes」ボタンを必ず押してください**（押さないと反映されません）

ファイルが揃い次第、こちらでゲームに組み込みます。無い間は既存アセット
（勇者スプライト・流用ボス絵・既存BGM）に自動フォールバックするので、1つずつ増やしてOKです。

## 進捗チェック

- [ ] バッチ1: パーティ4人の顔グラ（4枚）
- [ ] バッチ2: ガイ歩行スプライト3方向（3枚）
- [ ] バッチ3: リナ歩行スプライト3方向（3枚）
- [ ] バッチ4: ミア歩行スプライト3方向（3枚）
- [ ] バッチ5: 四天王＋沈黙王ミュートス（5枚）
- [ ] バッチ6: 新戦闘背景（3枚）
- [ ] Suno: 新BGM（5曲）
- [ ] ElevenLabs: 追加効果音（6個）

---

# バッチ1: パーティ4人の顔グラ（4枚・背景透過）

戦闘画面のステータス枠に表示する顔アイコンです。**4枚とも同じ絵柄・同じ会話の中で**
続けて作ると統一感が出ます。まず【共通スタイル】を1回貼ってから、1人ずつ順に。

## 【顔グラの共通スタイル】※最初に1回だけ貼る
```
これから、スマホ用RPG「WORDRIA」のパーティメンバー4人の顔グラフィック（顔アイコン）を作ります。
すべて同じ絵柄で統一してください。スタイルは以下で固定します:

- 手描き感のある、やわらかいセルアニメ塗り。太めの主線。パステル＋鮮やかなアクセント
- かわいいデフォルメの顔アップ（バストアップではなく、顔と肩まで）。大きな瞳、親しみやすい表情
- 「勉強・英単語」のファンタジー世界観（文具や本のモチーフを衣装に少し取り入れる）
- キャラは1人だけを中央に大きく。正方形（1:1）。背景は完全に透過（透過PNG）
- 文字・ロゴは入れない
了解したら「OK」とだけ返してください。次から1人ずつ指定します。
```

## ユウ（ゆうしゃ・主人公）
```
1人目：勇者「ユウ」の顔グラ。
青いマントと学生風の制服を着た若い勇者。茶色の髪、まっすぐで意志の強い瞳。
明るく前向きな主人公らしい、少し微笑んだ表情。
正方形・顔と肩まで・透過PNG・キャラ1人のみ。
【保存名: face_yu.png】
```

## ガイ（せんし）
```
（同じ会話の中で続けて）
2人目：戦士「ガイ」の顔グラ。
赤い鉢巻きと鋼の肩当てをつけた、体格のいい剣士の青年。短い黒髪、太い眉。
声を奪われた妹を守る兄らしい、頼もしくて熱血な笑顔。
正方形・顔と肩まで・透過PNG・キャラ1人のみ。
【保存名: face_gai.png】
```

## リナ（まほうつかい）
```
（同じ会話の中で続けて）
3人目：魔法使い「リナ」の顔グラ。
紫のとんがり帽子とローブの少女。金色の長い髪、知的で勝ち気な瞳、眼鏡。
魔法学院の首席らしい、自信たっぷりの澄ました表情。
正方形・顔と肩まで・透過PNG・キャラ1人のみ。
【保存名: face_rina.png】
```

## ミア（そうりょ）
```
（同じ会話の中で続けて）
4人目：僧侶「ミア」の顔グラ。
白と青の巫女風のローブとベールをまとった少女。銀色の髪、やさしいたれ目。
古文書の神殿の巫女らしい、穏やかで包み込むような微笑み。
正方形・顔と肩まで・透過PNG・キャラ1人のみ。
【保存名: face_mia.png】
```

---

# バッチ2〜4: 仲間の歩行スプライト（3人×3方向＝9枚・背景透過）

フィールド用のスプライトです。既存の勇者（assets/field/hero_down.png など）と並べて表示するので、
**同じ2.5頭身・同じ油彩タッチ**に合わせるのが最重要です。
ユウは既存の hero_down / hero_up / hero_side をそのまま使うため、**生成は不要**です。

3方向だけでOK（左右はプログラム側で反転します）。横向きは**右向き**で描いてください。
勇者のときと同じく、**3枚とも同じキャラクターに見えること**が大事なので、
1枚目を作ったあと**同じ会話の中で**「同じキャラクターの後ろ姿」「同じキャラクターの横向き」と
頼むのがおすすめです。可能なら hero_down.png を会話に添付して「この絵柄に合わせて」と伝えると、
さらに統一感が出ます。

## バッチ2: ガイ（3枚）

```
2DファンタジーRPGのフィールド用キャラクタースプライトを1枚描いてください。
2.5頭身のかわいいデフォルメ。手描き風の油彩タッチで、明るく鮮やかな色。
背景は完全に透過。キャラクター1人だけを中央に大きく。文字・ロゴは入れないでください。
題材: 戦士「ガイ」。赤い鉢巻きと鋼の肩当て、茶色の革鎧を着た体格のいい剣士の青年。
背中に「大きな定規の大剣」を背負っている。正面を向いて立っている。
【保存名: walk_gai_down.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、真後ろから見た後ろ姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_gai_up.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、右を向いた真横からの姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_gai_side.png】
```

## バッチ3: リナ（3枚）

```
2DファンタジーRPGのフィールド用キャラクタースプライトを1枚描いてください。
2.5頭身のかわいいデフォルメ。手描き風の油彩タッチで、明るく鮮やかな色。
背景は完全に透過。キャラクター1人だけを中央に大きく。文字・ロゴは入れないでください。
題材: 魔法使い「リナ」。紫のとんがり帽子とローブ、金色の長い髪、眼鏡の少女。
先端に羽根ペンがついた杖を持っている。正面を向いて立っている。
【保存名: walk_rina_down.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、真後ろから見た後ろ姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_rina_up.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、右を向いた真横からの姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_rina_side.png】
```

## バッチ4: ミア（3枚）

```
2DファンタジーRPGのフィールド用キャラクタースプライトを1枚描いてください。
2.5頭身のかわいいデフォルメ。手描き風の油彩タッチで、明るく鮮やかな色。
背景は完全に透過。キャラクター1人だけを中央に大きく。文字・ロゴは入れないでください。
題材: 僧侶「ミア」。白と青の巫女風ローブとベール、銀色の髪のやさしい少女。
本のかたちの錫杖（しゃくじょう）を胸の前で持っている。正面を向いて立っている。
【保存名: walk_mia_down.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、真後ろから見た後ろ姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_mia_up.png】
```

```
（同じ会話の中で続けて）
同じキャラクターをそのままに、右を向いた真横からの姿を描いてください。
背景は完全に透過。他の条件は同じです。
【保存名: walk_mia_side.png】
```

---

# バッチ5: 四天王＋沈黙王ミュートス（5枚・背景透過）

戦闘画面用の専用イラストです。既存の敵（assets/enemies/）と同じ
「かわいいけど強そう」な絵柄に合わせます。**新しい会話**で、まず【共通スタイル】を1回貼ってから
1体ずつ順に。四天王は「聞く・話す・読む・書く」を封印している設定なので、
それぞれのモチーフを見た目に入れています。

## 【ボスの共通スタイル】※最初に1回だけ貼る
```
これから、スマホ用RPG「WORDRIA」のボスモンスター5体を作ります。
すべて同じ絵柄で統一してください。スタイルは以下で固定します:

- かわいい2頭身のマスコットモンスター。大きな瞳、丸いフォルム
- ただしボスなので、雑魚より一回り威圧感・不気味さを効かせる（怖すぎない範囲で）
- 手描き感のある、やわらかいセルアニメ塗り。太めの主線。パステル＋鮮やかなアクセント
- 「ことばの力を封印する」世界観（鎖・錠前・封印の札などのモチーフ）
- キャラは1体だけを中央に、全身。正方形（1:1）。背景は透明（透過PNG）
- 文字・ロゴは入れない
了解したら「OK」とだけ返してください。次から1体ずつ指定します。
```

## 四天王その一: 轟嵐のハウル（「聞く」の封印者）
```
1体目：四天王「轟嵐のハウル」。
嵐をまとった大きなオオカミの魔獣。灰色の毛並みに、渦巻く風と稲妻のエフェクト。
巨大な耳に鎖と錠前がかけられ、「聞く力」を封じている。首には壊れたヘッドホン。
遠吠えのポーズ。かわいいけど嵐のように荒々しい。
正方形・全身・透過PNG・キャラ1体のみ。
【保存名: boss_howl.png】
```

## 四天王その二: 黙谷のガグ（「話す」の封印者）
```
（同じ会話の中で続けて）
2体目：四天王「黙谷のガグ」。
峡谷の岩から生まれたガーゴイル風の魔物。青灰色の岩の体、小さな石の翼。
口に大きな金属の錠前つきマスクをはめられ、自分も他人も「話す力」を封じている。
封印の札が貼られた吹き出しの形の石板を持つ。無言の圧を放つ、静かで不気味なかわいさ。
正方形・全身・透過PNG・キャラ1体のみ。
【保存名: boss_gag.png】
```

## 四天王その三: 白紙のブランク（「読む」の封印者）
```
（同じ会話の中で続けて）
3体目：四天王「白紙のブランク」。
真っ白な紙でできた、のっぺりした幽霊のような魔物。顔には目鼻がなく、白いページがめくれて体になっている。
抱えた大きな本は全ページ真っ白で、周囲に文字が吸い取られて消えていく光の粒。
「読む力」を奪う存在。顔がないのにどこか愛嬌がある、不気味かわいいデザイン。
正方形・全身・透過PNG・キャラ1体のみ。
【保存名: boss_blank.png】
```

## 四天王その四: 消筆のイレイズ（「書く」の封印者）
```
（同じ会話の中で続けて）
4体目：四天王「消筆のイレイズ」。
巨大な消しゴムの剣を構えた、小柄な魔剣士。ピンクと白の消しゴム風の鎧、
マントは使い古しの答案用紙。剣が通ったあとの空間から文字が消しカスになって散る。
「書く力」を消し去る存在。小さいのに強そうな、生意気かわいいデザイン。
正方形・全身・透過PNG・キャラ1体のみ。
【保存名: boss_erase.png】
```

## ラスボス: 沈黙王ミュートス
```
（同じ会話の中で続けて）
5体目：ラスボス「沈黙王ミュートス」。
声を奪う沈黙の王。漆黒と銀のローブ、音符に斜線を入れた形の禍々しい王冠。
口元は銀の仮面で覆われ、周囲には鎖で封じられた吹き出しと、光を失って灰色になった文字が浮かぶ。
玉座から立ち上がったような堂々たる立ち姿。四天王より一回り威厳と不気味さを強く、
それでも2頭身のポップな絵柄で。
正方形・全身・透過PNG・キャラ1体のみ。
【保存名: boss_mutos.png】
```

---

# バッチ6: 新戦闘背景（3枚）

1作目の背景（assets/bg/）と同じ要領です。**新しい会話**で、まず【背景の共通スタイル】を
1回貼ってから各プロンプトを順に。アップロード先は **assets/bg** です（partyフォルダではありません）。

## 【背景の共通スタイル】※最初に1回だけ貼る
```
これから、スマホRPGの戦闘背景画像を作ります。すべて同じ絵柄で統一してください。
やわらかい手描き風のファンタジー風景画。明るく彩度高め、アニメ背景のようなタッチ。
キャラクターや文字は一切入れない。横長ではなく正方形(1:1)。画面下半分は敵が立つ「地面」がはっきり見える構図。
了解したら「OK」とだけ返してください。次から1枚ずつ指定します。
```

## 音の塔・内部（ハウル戦）
```
【保存名: bg_sound_tower.png】巨大なパイプオルガンのような「音の塔」の内部。壁一面に金色のパイプと吊るされた鐘、渦巻く風が青い光の音符を散らしている。嵐の気配。下半分は音波の模様が刻まれた石の床。正方形・キャラなし・文字なし。
```

## 忘却の大図書館（ブランク戦）
```
【保存名: bg_library.png】天井まで届く本棚が並ぶ薄暗い大図書館。ただし本の背表紙はすべて真っ白で、ページが宙に舞い、文字が光の粒になって吸い出されていく。静かで物悲しい雰囲気。下半分は古い木の床と散らばる白紙。正方形・キャラなし・文字なし。
```

## 無音の塔・玉座の間（ミュートス戦）
```
【保存名: bg_mute_throne.png】天空にそびえる「無音の塔」最上階の玉座の間。漆黒と銀の装飾、鎖で封じられた巨大な吹き出しのオブジェが浮かび、色を失った灰色の文字が雪のように降る。窓の外は星空と雲海。荘厳で禍々しい最終決戦の雰囲気。下半分は黒い大理石の床と銀の絨毯。正方形・キャラなし・文字なし。
```

---

# Sunoに貼るプロンプト（Instrumental ON・60〜120秒）

できた曲は【保存名】の .mp3 で **assets/bgm** へ。無い間は既存曲にフォールバックします。

| ファイル名 | 使われる場面 | 無い場合 |
|---|---|---|
| wq2_field.mp3 | グロッサリア大陸のワールドマップ | field.mp3 |
| wq2_chapter.mp3 | 各章の幕開け・章タイトル | town.mp3 |
| wq2_join.mp3 | 仲間加入のジングル（短） | level.mp3(SFX) |
| wq2_shitenno.mp3 | 四天王戦（4戦共通） | midboss.mp3 |
| wq2_lastboss.mp3 | 沈黙王ミュートス最終決戦 | boss.mp3 |

## wq2_field.mp3（新ワールドテーマ）
```
Grand adventurous JRPG overworld theme for a sequel, sweeping strings and noble horn melody, a vast new continent where voices have been stolen, hopeful march rhythm with a wistful undertone, more mature and epic than a first adventure, game soundtrack, instrumental, seamless loop
```

## wq2_chapter.mp3（章テーマ）
```
Warm storybook JRPG chapter-opening theme, gentle harp and woodwind introduction blooming into a modest heroic string melody, the feeling of a new chapter beginning in an episodic tale, short journey vignette, cozy and inviting, instrumental, seamless loop
```

## wq2_join.mp3（仲間加入ジングル・15〜20秒）
```
Short triumphant JRPG jingle for a new party member joining, bright brass fanfare rising into a warm string resolution, friendship and newfound strength, celebratory but brief, clean ending, no loop, instrumental, about 15 seconds
```

## wq2_shitenno.mp3（四天王戦・共通）
```
Intense orchestral JRPG boss battle theme for one of four elite generals, menacing pipe organ and low choir-like synth pads, driving percussion and aggressive string ostinato, phases of rising tension for a long five-minute duel, powerful brass motif that returns like a seal being broken, dramatic but not the final battle, instrumental, seamless loop
```

## wq2_lastboss.mp3（最終戦ミュートス）
```
Epic final boss theme against a king of silence, huge cathedral organ and full orchestra with dark choir, moments where the music suddenly drops to eerie near-silence before crashing back fortissimo, desperate heroic counter-melody fighting through oppressive dissonance, three-phase escalating structure, ultimate JRPG climax, instrumental, seamless loop
```

---

# ElevenLabs（Sound Effects）: 追加効果音

できた音は【保存名】の .mp3 で **assets/sfx** へ。

## チェイン継続音（3段階・ピッチが上がっていく）
チェイン×1.15 / ×1.30 / ×1.45以上 で鳴り分けます。**同じ系統の音で、段階的に高く・華やかに**なるよう3つ作ってください。

```
Short bright magical chime for a combo chain in a fantasy RPG, a single clean bell-like ding with a little sparkle tail, low-medium pitch, cheerful and light, 0.5 seconds
【保存名: chain1.mp3】
```

```
Short bright magical chime for a combo chain in a fantasy RPG, same bell-like character but noticeably higher pitch, a clean ding with sparkling overtones, rising excitement, 0.5 seconds
【保存名: chain2.mp3】
```

```
Short brilliant magical chime for a maxed combo chain in a fantasy RPG, highest pitch of a rising series, a radiant double ding with a shimmering glissando burst, triumphant and dazzling, 0.7 seconds
【保存名: chain3.mp3】
```

## フェーズ変化の咆哮（ボスがフェーズ2/3へ移行）
```
Monstrous furious roar of a giant boss entering an enraged phase in a fantasy RPG, deep bestial bellow with a rumbling sub-bass swell and a metallic chain-snapping accent, intimidating and dramatic, 2 seconds
【保存名: roar.mp3】
```

## 全体攻撃ヒット（リナの上位呪文など）
```
Massive magical explosion hitting multiple enemies at once in a fantasy RPG, a deep whoosh into a wide layered blast with crackling arcane energy and a shockwave tail, bigger and broader than a single hit, 1.5 seconds
【保存名: aoe.mp3】
```

## 仲間が倒れる音
```
Dramatic sad thud of a party member collapsing in a JRPG battle, a heavy soft body-fall impact followed by a brief descending mournful chime, somber and alarming but not gory, 1.2 seconds
【保存名: down.mp3】
```

---

# 枚数・ファイル数まとめ

| バッチ | 内容 | 数 | アップ先 |
|---|---|---|---|
| 1 | 顔グラ（ユウ/ガイ/リナ/ミア） | 4 | assets/party |
| 2〜4 | 歩行スプライト（ガイ/リナ/ミア×3方向） | 9 | assets/party |
| 5 | 四天王＋ミュートス | 5 | assets/party |
| 6 | 新戦闘背景 | 3 | assets/bg |
| Suno | 新BGM | 5 | assets/bgm |
| ElevenLabs | 追加効果音 | 6 | assets/sfx |
| 計 | | 32 | |

- 画像18枚は「10ファイル前後ずつ」に分けて（例: バッチ1〜3で10枚 → バッチ4〜5で8枚）アップしてください
- 毎回、緑の「**Commit changes**」を押すのを忘れずに
- ユウの歩行スプライトは既存の hero_down / hero_up / hero_side（assets/field/）を流用するため生成不要です
