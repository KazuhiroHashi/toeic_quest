# 全戦・別曲プロンプト（Suno 有料版）— 決定版

「音楽はゲームの命」。全戦を別曲にします。**Sunoの設定**：
- **Instrumental：ON**（歌詞なし）
- 長さ：**150〜180秒**（Sunoが完璧にループしなくても、後でこちらが“きれいに繋がる区間”に整えます）
- 生成後 **mp3でダウンロード** → GitHubの `assets/bgm/` にアップ
- アップ先: https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm

**ゲーム側は配線済み**：保存名どおりに置けば、その戦いで自動で鳴ります（未アップは今の曲に自動フォールバック）。
プロンプトは Suno の「**Style of Music / スタイル**」欄に貼ってください。

> 容量メモ：**製品版アプリは全曲フル音質でOK（容量制限は実質なし）**。16MB制限はclaude.aiプレビューだけなので、そこはこちらで一部だけ低ビットレート埋め込みにします。**曲は全力で作ってください。**

---

## ザコ戦（第1〜4戦・だんだん盛り上がる）

### 第1戦 —【保存名: arena1.mp3】冒険の幕開け
```
Bright, upbeat JRPG battle theme, the very first fight of a cheerful adventure. Catchy heroic melody on flute and strings over a bouncy rhythm, light brass hits, glockenspiel sparkle, optimistic and energetic, mid tempo, clean and hummable, instrumental, seamless loop, about 160 seconds
```

### 第2戦 —【保存名: arena2.mp3】仲間が増えて弾む
```
Energetic and playful JRPG battle theme, a party growing stronger together. Driving drums, plucky strings and a lively woodwind melody, cheerful brass counterpoint, a touch faster and more confident than a first battle, fun and bouncy, instrumental, seamless loop, about 160 seconds
```

### 第3戦 —【保存名: arena3.mp3】緊張が高まる
```
Determined JRPG battle theme with rising tension, enemies getting tougher. Faster galloping rhythm, urgent staccato strings, bold brass melody, light choir accents, heroic but pressured, instrumental, seamless loop, about 160 seconds
```

### 第4戦 —【保存名: arena4.mp3】強敵ラッシュ・ボス前
```
Intense, fast JRPG battle theme, a relentless wave of tough enemies just before a boss. Double-time percussion, aggressive driving strings, powerful brass stabs, soaring heroic melody, high energy and adrenaline, instrumental, seamless loop, about 150 seconds
```

---

## 中ボス

### 洞窟の古竜 —【保存名: midboss.mp3】威圧の中ボス
```
Imposing mid-boss battle theme for a fantasy JRPG, a mighty ancient dragon (heroic-fantasy, not horror). Pounding taiko and timpani, heavy low brass riffs, sweeping strings, a grand menacing melody with a sense of scale, driving and powerful, instrumental, seamless loop, about 160 seconds
```

---

## 四天王（沈黙の四天王・それぞれ性格が違う）

### 四天王ハウル —【保存名: king1.mp3】誇り高き獅子・咆哮（聴覚を奪う者）
```
Proud, roaring boss battle theme for a lion-warrior lieutenant. Bold heroic brass fanfares, tribal war drums, powerful strings, a commanding melody full of pride and might, echoing and grand like a great roar, driving and majestic, instrumental, seamless loop, about 160 seconds
```

### 四天王ガグ —【保存名: king2.mp3】弁舌・沈黙の号令（話す力を奪う者）
```
Driving, cunning boss battle theme for a silver-tongued schemer. Relentless staccato low strings ostinato, sharp brass stabs, militaristic snare and taiko, an ominous but catchy minor melody, building pressure without letup, sly and dangerous, instrumental, seamless loop, about 155 seconds
```

### 四天王ブランク —【保存名: king3.mp3】白紙化・可愛いのに不穏（読む力を奪う者）
```
Eerie yet cute boss battle theme for a childlike villain who erases minds. A twinkling music-box and celesta melody turned slightly off-kilter, playful pizzicato strings, ticking percussion, a whimsical-but-unsettling waltz feel that builds into a driving dark-cute climax, instrumental, seamless loop, about 155 seconds
```

### 四天王イレイズ —【保存名: king4.mp3】最強格・消し去る（書く力を奪う者）
```
Heavy, menacing boss battle theme for the strongest lieutenant before the final boss. Pounding double-time percussion, distorted low brass and cello riffs, dark choir accents, a fierce blade-like driving melody, urgent, powerful and climactic, instrumental, seamless loop, about 155 seconds
```

---

## ラスボス（2段階）

### 沈黙王ミュートス —【保存名: boss.mp3】魔王戦
```
Epic dark boss battle theme for the demon king of silence. Grand full orchestra with pipe organ and ominous low choir, thundering taiko and timpani, a majestic tragic melody over menacing brass, dramatic and overwhelming, powerful mid-high tempo, instrumental, seamless loop, about 170 seconds
```

### 真・沈黙王ミュートス —【保存名: lastboss.mp3】最終決戦
```
Ultimate final boss theme, beyond the normal boss battle: a desperate, awe-inspiring last stand. Full orchestra with dark choir chanting, cathedral pipe organ, relentless taiko and timpani, a tragic soaring strings melody over menacing low brass, a brief quiet eerie interlude then an explosive climax, majestic and overwhelming, instrumental, seamless loop, about 175 seconds
```

---

## 戦闘以外（必要なら差し替え／既にあるもの含む）

- タイトル —【保存名: title.mp3】※既存。作り直すなら:
```
Warm, adventurous JRPG title theme, hopeful and grand opening. Sweeping strings and noble brass melody, gentle harp and glockenspiel, a sense of a journey about to begin, mid-slow tempo, uplifting, instrumental, seamless loop, about 120 seconds
```
- 勝利ファンファーレ —【保存名: victory.mp3】※既存（`docs/AUDIO_PROMPTS_3.md`）
- 全滅 —【保存名: gameover.mp3】※プロンプトは `docs/AUDIO_PROMPTS_6.md`
- エンディング —【保存名: ending.mp3】※既存。作り直すなら:
```
Triumphant yet gentle JRPG ending theme, the words return to the world. A warm soaring main melody on strings and horn, hopeful piano and harp, a heartfelt grand finale that softens into peace, instrumental, about 150 seconds
```

---

## 割り当て早見表
| 戦い | ファイル | 状態 |
|---|---|---|
| 第1戦 | arena1.mp3 | ★作る |
| 第2戦 | arena2.mp3 | ★作る |
| 第3戦 | arena3.mp3 | ★作る |
| 第4戦 | arena4.mp3 | ★作る |
| 中ボス 洞窟の古竜 | midboss.mp3 | 既存あり／差し替え可 |
| 四天王ハウル | king1.mp3 | ★作る |
| 四天王ガグ | king2.mp3 | ★作る |
| 四天王ブランク | king3.mp3 | ★作る |
| 四天王イレイズ | king4.mp3 | ★作る |
| ラスボス ミュートス | boss.mp3 | 既存あり／差し替え可 |
| 真・ミュートス | lastboss.mp3 | 既存あり／差し替え可 |

作った分だけアップ → こちらで製品版（フル音質）＆プレビュー（一部）に取り込みます。一気に全部でも、数曲ずつでもOK。
