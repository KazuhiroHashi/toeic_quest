# task-01: vocab_400.js に例文を追加する（パイロット）

## 目的
学習効果を高めるため、各英単語に「短い英語の例文」と「その和訳」を追加する。
まず `data/vocab_400.js`（500語）だけ行う。うまくいけば 500〜900 も同様に依頼する。

## やること
`data/vocab_400.js` の各エントリに、フィールド `ex`（英語例文）と `exj`（和訳）を追加する。

### 変更前
```js
{w:"purchase",m:"購入する",p:"v"},
```
### 変更後
```js
{w:"purchase",m:"購入する",p:"v",ex:"We will purchase new computers next month.",exj:"来月、新しいコンピューターを購入します。"},
```

## ルール（厳守）
1. 既存の `w` / `m` / `p` は**絶対に変更しない**。並び順も変えない。追加するのは `ex` と `exj` だけ。
2. `window.VOCAB[400] = [ ... ];` という構造・変数名・全体の書き方を維持する。1行1エントリのまま。
3. 例文は **TOEIC 400点レベルにふさわしい やさしい英文**（10〜15語程度）。その単語を必ず使う。
4. 例文は**ビジネス・日常の自然な文脈**。固有名詞や高度な語彙は避ける。
5. `exj` は `ex` の自然な日本語訳。
6. ダブルクオート文字列。例文内に `"` を使わない（使うなら `'` にする）。
7. 全500エントリに漏れなく付ける。

## 完了後の確認（必ず実行して成功を確認）
```bash
node -e "global.window={}; eval(require('fs').readFileSync('data/vocab_400.js','utf8'));
var a=window.VOCAB[400]; var bad=a.filter(function(e){return !e.ex||!e.exj;});
console.log('total',a.length,'missing_ex',bad.length);
if(a.length!==500||bad.length) process.exit(1);"
node tests/check.js
```
両方成功したら完了。

## 完了報告
`codex/LOG.md` の末尾に、以下を追記する:
- 実施日 / 対象ファイル / 追加した件数 / 上記チェックの結果（total 500, missing_ex 0 など）
- 気づいた点・疑問があれば `QUESTION:` として記載
