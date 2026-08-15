# 戦闘曲プロンプト（Suno）— グルーヴ重視・改訂版

## なぜオーケストラ寄りになっていたか

旧プロンプトは楽器の指定がほぼ全部オーケストラだった。

> `Catchy heroic melody on **flute and strings**, light **brass** hits, **glockenspiel** sparkle`
> `urgent **staccato strings**, bold **brass** melody, light **choir** accents`

Sunoは**楽器名を最優先のシグナルとして読む**。ドラムもベースもギターも書いていなければ、
出てくるのは映画音楽になる。さらに `cinematic` `epic` `heroic` `soaring` といった語が
そろってテンポを落とす方向に引っ張っていた。`mid tempo` のような曖昧な指定も効かない。

## 気に入っていた曲の実測テンポ

| ファイル | 実測 |
|---|---|
| `battle.mp3` | **約 169 BPM** |
| `battle2.mp3` | **約 164 BPM** |
| `boss.mp3` | 約 156 BPM |

**165〜170 BPM。** かなり速い。最近の生成物はおそらく110〜130程度に落ちている。
**BPMを数字で書くのが一番効く。**

---

## Suno の設定

- **Instrumental：ON**
- 長さ：150〜180秒
- **「Exclude styles」欄があれば、下の除外リストをそこに貼る。** 無ければスタイル欄の末尾に足す
- 生成後 mp3 でダウンロード → `assets/bgm/` に**指定のファイル名で**アップ（コード変更は不要）

### 全曲共通の除外リスト
```
orchestral, cinematic, epic trailer, film score, sweeping strings, choir, ambient, ballad, slow, half-time, rubato, lo-fi, chillout
```

### 書き方の原則
1. **BPMを先頭に書く**
2. **バンド楽器を先に、オーケストラは後ろに「味付け」として**書く
3. リズムの形を具体的に指定する（`driving 16th-note hi-hat`、`syncopated bass`）
4. `cinematic` `epic` `soaring` は使わない。テンポが落ちる

---

# ザコ戦（第1〜4戦）

### 第1戦 —【`arena1.mp3`】冒険の幕開け
```
168 BPM fast JRPG battle theme, prog-rock band. Tight rock drum kit with driving eighth-note hi-hat, punchy fingered electric bass locked to the kick, bright clean electric guitar riff, catchy hummable lead melody on synth. Major key, optimistic, constant forward motion, no let-up. Light flute doubling the melody and short brass stabs only as accents. Instrumental, seamless loop.
```

### 第2戦 —【`arena2.mp3`】仲間が増えて弾む
```
172 BPM upbeat JRPG battle theme, tight fusion band. Snappy drum kit with busy syncopated snare, slap-flavoured electric bass line that never stops moving, funky clean guitar chords on the off-beats, playful Hammond organ lead trading with the guitar. Bright, bouncy, groovy. Strings only as short background stabs. Instrumental, seamless loop.
```

### 第3戦 —【`arena3.mp3`】緊張が高まる
```
176 BPM driving JRPG battle theme in a minor key, hard rock band. Galloping kick pattern, relentless 16th-note hi-hat, aggressive palm-muted distorted guitar riff, growling electric bass doubling the riff, urgent organ lead. Tense and pressured but always fast and groovy. Brass stabs on accents only. Instrumental, seamless loop.
```

### 第4戦 —【`arena4.mp3`】強敵ラッシュ・ボス前
```
180 BPM relentless JRPG battle theme, prog metal band. Double-kick drums, thrashing distorted guitar riff in odd accents, aggressive picked bass, screaming organ and synth lead trading fast licks, brief shred solo. Maximum adrenaline, no slow section anywhere, drives from the first bar to the last. Instrumental, seamless loop.
```

---

# 四天王（それぞれ性格が違う）

### ハウル —【`king1.mp3`】誇り高き獅子・咆哮
```
170 BPM heavy JRPG boss theme, rock band with taiko. Thunderous drum kit layered with japanese taiko on the downbeats, thick distorted guitar power riff, driving low electric bass, defiant brass fanfare riding on top of the groove. Proud, roaring, muscular. Keeps the rock groove the whole time, never turns into a slow fanfare. Instrumental, seamless loop.
```

### ガグ —【`king2.mp3`】弁舌・沈黙の号令
```
168 BPM sly JRPG boss theme, dark jazz-rock band. Tight shuffling drum kit with brushed snare accents, walking distorted electric bass, sharp muted guitar stabs on the off-beats, sleazy Hammond organ lead with chromatic runs, muted trumpet answering it. Confident, theatrical, feminine menace. Groove-driven, never rubato. Instrumental, seamless loop.
```

### ブランク —【`king3.mp3`】白紙化・可愛いのに不穏
```
174 BPM unsettling JRPG boss theme, breakbeat band. Chopped breakbeat drums, deep rubbery synth bass, detuned music-box melody over the top playing a nursery-rhyme phrase that keeps going slightly wrong, glitchy stutter edits, distorted guitar entering in the second half. Cute on the surface, wrong underneath, always fast and rhythmic. Instrumental, seamless loop.
```

### イレイズ —【`king4.mp3`】最強格・消し去る
```
178 BPM ferocious JRPG boss theme, dark prog metal band. Double-kick drums with tight 16th-note ride, downtuned crushing guitar riff, aggressive distorted bass, cold dissonant synth lead cutting through, harpsichord ostinato running underneath. Cruel, precise, overwhelming. Full speed from bar one, no breakdown, no slow bridge. Instrumental, seamless loop.
```

---

# うまくいかない時

| 症状 | 直し方 |
|---|---|
| オーケストラになる | 楽器名を **drum kit / electric bass / distorted guitar / organ** の4つだけに削る。管弦は一旦全部消す |
| 遅い | BPMを **+10** して書き直す。`fast` `driving` `relentless` を先頭付近に足す |
| 途中で失速する | `no slow section anywhere, no breakdown, drives from the first bar to the last` を足す |
| 壮大になりすぎる | `epic` `heroic` `soaring` `anthem` を消す。`tight` `punchy` `groovy` に置き換える |
| ループが不自然 | 気にしなくてよい。こちらで繋がる区間に整える |

**同じプロンプトで2〜3回まわして一番速いものを採る。** 1回目で決めない。

---

# 割り当て早見表

| ファイル名 | 使われる場面 | 優先度 |
|---|---|---|
| `king1.mp3` | 第6戦 四天王ハウル | **★最優先** |
| `king2.mp3` | 第7戦 四天王ガグ | **★最優先** |
| `king3.mp3` | 第8戦 四天王ブランク | **★最優先** |
| `king4.mp3` | 第9戦 四天王イレイズ | **★最優先** |
| `arena1.mp3` | 第1戦 | 次点 |
| `arena2.mp3` | 第2戦 | 次点 |
| `arena3.mp3` | 第3戦 | 次点 |
| `arena4.mp3` | 第4戦 | 次点 |

**king1〜4 が最優先。** いまは第6〜10戦の5連戦が全部 `boss.mp3` の1曲で鳴っている。
この4曲が入るだけで、ゲームで一番長い区間の印象が変わる。
