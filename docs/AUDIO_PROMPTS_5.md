# 攻撃魔法SFXプロンプト（ElevenLabs Sound Effects 用）

ElevenLabs の「Sound Effects」（テキスト→効果音）で作成してください。

**共通の設定の目安**
- Duration: **1.0〜1.5秒**（手動で長さを指定できます。長すぎると次のセリフに被ります）
- Prompt influence: **0.6〜0.8**（プロンプトに忠実寄り）
- 生成後 **mp3でダウンロード** → GitHubの `assets/sfx/` にアップ
- アップ先: https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/sfx

**ゲーム側は対応済み**：属性ごとのファイルがあればそれを、無ければ汎用 `magic.mp3` を自動で鳴らします。
なので **「まず1個（汎用）だけ」でも「属性4種そろえる」でもOK**です。

---

## パターンA：まず1個だけ作るなら（汎用・全魔法共通）

【保存名: magic.mp3】※既存の仮の音を上書き

```
A magical spell casting and impact for a fantasy RPG, a bright shimmering sparkle rising quickly into a crystalline energy burst, clean and punchy with a short sparkling tail, not too harsh, about 1 second
```

---

## パターンB：属性ごとに分けるなら（4種）

保存名を下記のとおりにすると、炎系・氷系・雷系・聖なる系がそれぞれ違う音になります。
（属性の割り当て：炎＝フレイム/ヒートランス/フレイムバースト/インフェルノ、
氷＝フロスト/フロストノヴァ、雷＝スパーク/ボルトストーム/プラズマストーム、聖＝セイクリッド）

### ① 炎 —【保存名: magic_fire.mp3】
```
Fire magic spell impact for a fantasy RPG, a sharp whoosh of igniting flames bursting into a fiery explosion, warm crackling tail, powerful but clean, about 1.2 seconds
```

### ② 氷 —【保存名: magic_ice.mp3】
```
Ice magic spell impact for a fantasy RPG, a crystalline shatter and freezing shimmer, glassy sparkles with a cold airy whoosh, crisp and clean, about 1.2 seconds
```

### ③ 雷 —【保存名: magic_thunder.mp3】
```
Lightning magic spell impact for a fantasy RPG, a crackling electric zap and sharp thunderclap, buzzing arc of energy with a quick snappy tail, about 1 second
```

### ④ 聖 —【保存名: magic_holy.mp3】
```
Holy magic spell for a fantasy RPG, a radiant angelic chime and shimmering burst of light, bright bell-like sparkle with a soft choir glow, uplifting and clean, about 1.3 seconds
```

---

## 補足
- 属性4種を入れても容量はごくわずか（各10KB前後）。Artifact上限16MBに影響しません。
- 「クリティカル（2秒以内）のときだけ別の派手な音」なども後から追加できます。欲しければ言ってください。
- ファイルをアップしてくれたら、こちらで取り込んで公開版（Artifact）に反映します。
