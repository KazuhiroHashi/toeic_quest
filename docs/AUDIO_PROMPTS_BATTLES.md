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

## Suno の設定 — 貼る欄を間違えないこと

| Suno の欄 | 入れるもの |
|---|---|
| **スタイル** | 下の「スタイル欄」ブロックの文 |
| **スタイルを除外** | 下の「除外欄」ブロックの単語だけ |
| **歌詞** | **インスト** |
| **奇抜さ** | **20〜30%**（同じ質感で複数曲を揃えたいので振れ幅は小さく） |

> ⚠️ 除外リストを**スタイル欄**に貼ると、「オーケストラで・遅い・バラードを作れ」という指示になる。
> 2026-08-15 に実際にこの取り違えが起きていた。オーケストラ寄りで遅い曲が続いた原因はこれ。

### `orchestral` は除外しない
Suno のライブラリに残っている `battle.mp3` のプロンプトは
`Fast exciting orchestral JRPG battle theme, driving...`、Styles は `JRPG, orchestral, battle theme`。
**気に入っていた曲は orchestral 入りで作られている。**
問題は管弦楽そのものではなく、`Fast` `driving` `BPM` が無いと遅くなること。
除外すべきは**テンポを落とす語だけ**にする。

> ### 最も確実な再現方法
> Suno に **`midboss.mp3` / `lastboss.mp3` そのものをアップロードして Cover / Persona 機能で回す**のが、
> どんなテキストより正確に再現できる。テキストプロンプトは、それが使えない場合の代替。

---

# A. ザコ戦（5曲）— 第1〜4戦＋塔

**スタイル欄**
```
170 BPM fast exciting JRPG battle theme, driving prog-rock band with orchestral backing. Tight rock drum kit on straight eighth-note hi-hat, punchy electric bass locked to the kick, crunchy electric guitar riff, strong hummable lead melody on synth and strings in unison, short brass stabs on accents. Minor key but bright and confident, pure forward momentum, full energy from the first bar to the last.
```
**除外欄**
```
slow, half-time, ballad, ambient, calm, gentle, quiet, sparse, breakdown, fade out, cute, playful, music box, nursery rhyme, chiptune, horror, sinister, demonic, creepy
```

# B. 中ボス系（4曲）— 四天王4連戦 ★最優先

**スタイル欄**
```
116 BPM driving JRPG boss battle theme in a 12/8 triplet shuffle gallop, fast rolling hard-rock gallop with orchestral backing. Rock drum kit galloping on triplets with a hard backbeat, thick distorted electric guitar riff, growling electric bass doubling the riff, bold organ and brass melody riding on top of the groove. Powerful, dignified, relentless, full intensity the whole way through.
```
**除外欄**
```
slow, half-time, ballad, ambient, calm, gentle, quiet, sparse, breakdown, fade out, cute, playful, music box, nursery rhyme, horror, sinister, demonic, creepy, whispering, chanting
```

# C. ラスボス系（2曲）— 第10・11戦

**スタイル欄**
```
118 BPM driving final boss JRPG battle theme in a 12/8 triplet shuffle gallop, huge and heroic, hard rock band with full orchestra. Drum kit galloping on triplets, downtuned distorted guitar riff, heavy electric bass, soaring lead melody shared by organ, synth and brass, pipe organ underneath for weight. Grand and defiant, the sound of a fight you can win. Full intensity from bar one, no quiet intro.
```
**除外欄**
```
slow, half-time, ballad, ambient, calm, gentle, quiet, sparse, breakdown, fade out, cute, playful, horror, sinister, demonic, creepy, whispering, dissonant drone
```

---

## 嫌いな方向に振れた時の直し方

| 症状 | 対処 |
|---|---|
| **妙に可愛い** | `music box, glockenspiel, celesta, nursery, playful, chiptune` を Exclude に足す。楽器を drum kit / bass / distorted guitar / organ の4つに削る |
| **大人しい・薄い** | `full intensity from bar one, no quiet intro, no breakdown, dense arrangement` を足す。BPMを +8 |
| **邪悪・ホラーっぽい** | `evil, sinister, demonic, horror, creepy, dissonant, whispering, chanting` を Exclude に。代わりに `heroic, defiant, dignified, noble` を本文へ |
| **オーケストラ一色で速さが無い** | `orchestral` は消さなくてよい。代わりに本文の先頭を `170 BPM fast ... driving rock band` にして、drum kit / electric bass / distorted guitar を先に書く |
| **遅い** | BPMを +10。`12/8 triplet shuffle gallop` が消えていないか確認 |

**同じプロンプトで2〜3回まわして、一番速く・一番密度の高いものを採る。1回目で決めない。**

---

## アップ先

`assets/bgm/` に、上の表のファイル名（`king1.mp3` など）で置くだけ。**コード変更は不要**です。

https://github.com/KazuhiroHashi/toeic_quest/upload/claude/toeic-quest-game-8zva6k/assets/bgm

## 現状の問題（再掲）

いま **第6〜10戦の5連戦が全部 `boss.mp3` の1曲**で鳴っている。
タイプBの4曲が入るだけで、ゲームで一番長い区間の印象が変わる。**Bが最優先。**
