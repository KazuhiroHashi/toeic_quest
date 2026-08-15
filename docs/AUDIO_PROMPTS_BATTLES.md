# 戦闘曲プロンプト（Suno）— 3タイプ構成

敵ごとの個性はつけない。**3つのプロンプトを使い回して11曲**にする。

| タイプ | 何曲 | 割り当て先 |
|---|---|---|
| **A ザコ戦** | 5曲 | `arena1` `arena2` `arena3` `arena4` `arena5` |
| **B 中ボス系**（`midboss.mp3` の再現） | 4曲 | `king1` `king2` `king3` `king4` |
| **C ラスボス系**（`lastboss.mp3` の再現） | 2曲 | `boss` `lastboss` |

同じプロンプトを N 回まわして、出てきたものを**全部そのまま採用**する。
似た曲が並ぶのが狙いなので、粒を揃えることを優先する。

> `arena5` はまだトラック定義に無い。挑戦の塔とフォールバック用に1行足せば使える。
> 4曲でよければ `arena1`〜`arena4` だけでも成立する。
> `lastboss.mp3` を気に入っているなら、Cは `boss.mp3` の1曲だけでもよい。

---

## 既存曲の実測値

| ファイル | テンポ | 備考 |
|---|---|---|
| `battle.mp3` | **約 170 BPM** | ストレート（4分の4・イーブン） |
| `midboss.mp3` | **約 116 BPM ＋ 3連** | 116の3連＝毎分174パルス。**ギャロップ（12/8シャッフル）** |
| `lastboss.mp3` | **約 118 BPM ＋ 3連** | 同上。低域はやや控えめで中高域が前に出ている |
| `boss.mp3` | 約 156 BPM | ストレート。midboss/lastboss とはノリが違う |

**midboss と lastboss が「速いのに落ち着いて聴こえる」のは3連のギャロップだから。**
ここを `116 BPM` とだけ書くと Suno は本当に遅い曲を出す。**必ず `12/8 triplet shuffle gallop` を添える。**

---

## Suno の設定

- **Instrumental：ON**
- 長さ：150〜180秒
- **「Exclude styles」欄があれば、各プロンプトの `Exclude:` 行をそこに貼る**。無ければスタイル欄の末尾に足す

> ### 最も確実な再現方法
> Suno に **`midboss.mp3` / `lastboss.mp3` そのものをアップロードして Cover / Persona 機能で回す**のが、
> どんなテキストより正確に再現できる。テキストプロンプトは、それが使えない場合の代替。

---

# A. ザコ戦（5曲）— 第1〜4戦＋塔

```
170 BPM fast JRPG battle theme, prog-rock band. Tight rock drum kit driving straight eighth notes on the hi-hat, punchy fingered electric bass locked to the kick, crunchy electric guitar riff, strong hummable lead melody played by synth and guitar in unison. Minor key but bright and confident. Pure forward momentum, full energy from the first bar to the last. Short brass stabs only as accents. Instrumental, seamless loop.
Exclude: cute, playful, music box, nursery rhyme, chiptune, gentle, calm, quiet, sparse, ambient, evil, horror, sinister, creepy, orchestral, cinematic, epic trailer, choir, slow, half-time, ballad, breakdown, fade out.
```

# B. 中ボス系（4曲）— 四天王4連戦

```
116 BPM JRPG boss battle theme with a driving 12/8 triplet shuffle gallop — the rolling hard-rock gallop of a fast boss fight, never a slow song. Rock drum kit galloping on triplets with a hard backbeat, thick distorted electric guitar riff, growling electric bass doubling the riff, bold organ and brass melody riding on top of the groove. Powerful, dignified, relentless, stays at full intensity the whole way through. Instrumental, seamless loop.
Exclude: cute, playful, music box, nursery rhyme, gentle, calm, quiet, sparse, ambient, evil, horror, sinister, demonic, creepy, whispering, chanting choir, cinematic, epic trailer, slow, half-time, ballad, breakdown, fade out.
```

# C. ラスボス系（2曲）— 第10・11戦

```
118 BPM final boss JRPG battle theme with a driving 12/8 triplet shuffle gallop, huge and heroic. Hard rock drum kit galloping on triplets, downtuned distorted guitar riff, heavy electric bass, soaring lead melody shared by organ, synth and brass, pipe organ underneath for weight. Grand, defiant, overwhelming — the sound of a fight you can win, not a horror scene. Full intensity from bar one, no quiet intro, no let-up. Instrumental, seamless loop.
Exclude: cute, playful, gentle, calm, quiet, sparse, ambient, evil, horror, sinister, demonic, creepy, whispering, dissonant drone, cinematic, epic trailer, slow, half-time, ballad, breakdown, fade out.
```

---

## 嫌いな方向に振れた時の直し方

| 症状 | 対処 |
|---|---|
| **妙に可愛い** | `music box, glockenspiel, celesta, nursery, playful, chiptune` を Exclude に足す。楽器を drum kit / bass / distorted guitar / organ の4つに削る |
| **大人しい・薄い** | `full intensity from bar one, no quiet intro, no breakdown, dense arrangement` を足す。BPMを +8 |
| **邪悪・ホラーっぽい** | `evil, sinister, demonic, horror, creepy, dissonant, whispering, chanting` を Exclude に。代わりに `heroic, defiant, dignified, noble` を本文へ |
| **オーケストラになる** | `orchestral, cinematic, epic trailer, film score` を Exclude に。管弦の楽器名を本文から全部消す |
| **遅い** | BPMを +10。`12/8 triplet shuffle gallop` が消えていないか確認 |

**同じプロンプトで2〜3回まわして、一番速く・一番密度の高いものを採る。1回目で決めない。**

---

## アップ先

`assets/bgm/` に、上の表のファイル名（`king1.mp3` など）で置くだけ。**コード変更は不要**です。

https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm

## 現状の問題（再掲）

いま **第6〜10戦の5連戦が全部 `boss.mp3` の1曲**で鳴っている。
タイプBの4曲が入るだけで、ゲームで一番長い区間の印象が変わる。**Bが最優先。**
