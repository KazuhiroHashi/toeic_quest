# 追加BGM・効果音プロンプト集（第2弾）

## まず: できあがった新戦闘曲のアップロード

さきほどSunoで完成した新しい戦闘曲は、**battle2.mp3** という名前でここへ:

**https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm**

（緑の「Commit changes」を忘れずに）

アップした瞬間から、通常戦闘では battle.mp3 と battle2.mp3 が**ランダムで**流れます。
ゲーム側の対応は実装済みです。

## 追加で作れる曲（すべて任意・置くだけで自動で有効化）

ファイルが無い間は自動で既存曲にフォールバックするので、1曲ずつ増やしてOKです。

| ファイル名 | 使われる場面 | 無い場合 |
|---|---|---|
| battle2.mp3 | 通常戦闘（battleとランダム） | battleのみ |
| battle_dungeon.mp3 | 洞窟・塔の中での戦闘 | battle/battle2 |
| midboss.mp3 | 中ボス戦（将軍・ドラゴンなど魔王以外のボス） | boss.mp3 |
| ending.mp3 | エンディング | title.mp3 |

※中ボス曲はこれまで存在せず、全ボスで boss.mp3 が流れていました。今回から分けられます。

---

# Sunoに貼るプロンプト（Instrumental ON・60〜120秒）

## battle_dungeon.mp3（ダンジョン戦闘）
```
Dark aggressive orchestral JRPG battle theme for a dungeon fight, ominous low strings ostinato, growling brass, echoing percussion like cave drums, claustrophobic tension with a driving heroic counter-melody, game soundtrack, instrumental, seamless loop
```

## midboss.mp3（中ボス戦）
```
Fierce orchestral JRPG mid-boss battle theme, heavier than a normal battle, relentless string runs, powerful brass fanfare motifs, thundering war drums, a formidable enemy blocking the hero's path, dramatic but not final, instrumental, seamless loop
```

## ending.mp3（エンディング）
```
Emotional grand JRPG ending theme, warm strings swelling with gratitude, gentle piano restating the main heroic melody slowly, soaring flute, a peaceful world restored after a long journey, bittersweet and hopeful finale, cinematic, instrumental
```

---

# ElevenLabs（Sound Effects）: エンカウント音の作り直し

いまの encounter.mp3 がイマイチとのことなので、方向性を変えた3案です。
気に入ったものを1つ生成して **encounter.mp3** の名前で assets/sfx へ上書きアップしてください。

### 案1: 王道オーケストラ・スティング（ドラクエ的な「ジャーン！」）
```
Short dramatic orchestral sting for a JRPG random encounter, a sharp full-orchestra hit followed by a fast upward string rush, startling and urgent, tight ending, 1.5 seconds
```

### 案2: 緊張の駆け上がり（スピード感重視）
```
Rapid rising orchestral swell for a monster encounter in a fantasy RPG, accelerating string tremolo sweeping upward into a bold brass stab, builds excitement in one second, punchy clean ending, 1.5 seconds
```

### 案3: 魔法的なきらめき＋衝撃（かわいい敵に合う軽め）
```
Magical shimmering whoosh into a bold orchestral hit, sparkling glissando rising quickly then a dramatic drum and brass impact, fantasy RPG battle start jingle, bright and exciting, 2 seconds
```

※ボス戦用の boss.mp3（効果音の方）は今のままでも良いですが、変えたければ:
```
Menacing deep orchestral sting for a boss appearance, massive low brass blast with choir accent and rumbling timpani roll, terrifying and epic, 2.5 seconds
```
