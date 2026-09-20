# 追加BGMプロンプト（第4弾・ボス曲のバリエーション）

「中ボスの音楽に種類が多い方が良い。1体ずつ違う音楽でも良いぐらい」への対応。
四天王4連戦がすべて同じ曲だと単調なので、**あと2曲**足すと各ボスの曲がほぼ全部変わります。

現在の割り当て（ゲーム側は対応済み。無い曲は自動で `boss.mp3` にフォールバック）:

| 戦い | 使用トラック | 状態 |
|------|------------|------|
| 中ボス 洞窟の古竜 | `midboss.mp3` | ある |
| 四天王ハウル | `midboss.mp3` | ある |
| 四天王ガグ | **`midboss2.mp3`** | ★これを作る |
| 四天王ブランク | `boss.mp3` | ある |
| 四天王イレイズ | **`midboss3.mp3`** | ★これを作る |
| ラスボス ミュートス | `boss.mp3` | ある |
| 真・ミュートス | `lastboss.mp3` | ある |

- アップ先: https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm
- Sunoで「Instrumental」ON、60〜180秒。ファイル名は下記の通り。
- **アップした瞬間から自動で使われます**（無い間は boss.mp3 で代用）。
- Artifactの容量: 現在12.7MB / 上限16MB。170秒前後の曲を **あと2〜3曲まで**入れられます。

## 1. midboss2.mp3（四天王ガグ戦・弁舌/沈黙をテーマにした攻めのボス曲）

```
Driving JRPG boss battle theme, mid-tier villain, tense and relentless: staccato low strings ostinato, sharp brass stabs, militaristic snare and taiko, an ominous but catchy minor melody with a sense of a silver-tongued schemer, building pressure without letup, instrumental, seamless loop, about 150 seconds
```

## 2. midboss3.mp3（四天王イレイズ戦・最強の四天王らしい重く鋭いボス曲）

```
Heavy, menacing JRPG boss battle theme for the strongest lieutenant before the final boss: pounding double-time percussion, distorted low brass and cello riffs, dark choir accents, a fierce driving melody with a blade-like edge, urgent and climactic, instrumental, seamless loop, about 150 seconds
```

※これで四天王4連戦が「ハウル=midboss / ガグ=midboss2 / ブランク=boss / イレイズ=midboss3」と全て別曲になります。
