# アイコンの原寸

生成AIが出したままの大きい PNG を、ここに置く。

**アプリは このフォルダを読まない。** ここを `assets/` の外に置いているのは、
`tools/build_www.js` が `assets/` 配下をまるごと端末へ運ぶから。中に入れると、
画面に出ない1辺1200pxの絵まで同梱してしまう。

## 置いたあと

```bash
node tools/make_icons.js
```

`assets/ui/icons/*.png` に **128×128** で書き出される。

- 不透明な部分を測って切り出し、正方形に整えてから、上下左右に同じ余白を付け直す
  （生成AIは余白がばらばらなので、そのまま並べると大きさが揃わない）
- 透過が無いものは **その場で止める**。「透過で」と頼んでも白や市松模様を
  絵として塗り込んでくることがあり、logo.png で実際に起きた

## ファイル名

| 絵 | 名前 |
|---|---|
| 城 | `ic_adventure.png` |
| 塔 | `ic_tower.png` |
| 棒グラフ | `ic_stats.png` |
| 本の山 | `ic_books.png` |
| 歯車 | `ic_gear.png` |
| 開いた本 | `ic_wordbook.png` |
| メダル | `ic_medal.png` |

発注に使ったプロンプトは `docs/ICON_PROMPTS.md`。
