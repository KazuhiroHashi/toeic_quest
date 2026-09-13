# ストア用スクリーンショット

**1290 × 2796 px**（iPhone 6.9インチ）。www/ ビルドから実際にプレイして撮影。

| ファイル | 内容 |
|---|---|
| `01_title.png` | タイトル画面 |
| `02_quiz.png` | **英単語クイズ＝ゲームの核**。制限時間バーと4択 |
| `03_boss.png` | 四天王ハウル戦。ボス＋クイズ |
| `04_wordbook.png` | 単語帳（TOEIC全3027語の進捗） |
| `05_records.png` | 称号・記録 |

## 使い方

- **App Store**：3〜10枚必須。6.9インチ用にそのまま使える。
  6.5インチ（1242×2688）も求められた場合は縮小で通る
- **Google Play**：2〜8枚。9:16 なのでそのまま使える

**02_quiz.png を1枚目に置くこと。** ストアでは1枚目しか見られないことが多く、
このゲームの差別化点（単語クイズで攻撃する）が一目で伝わるのはこの絵だけ。

## 撮り直し

```bash
npm run build:www
npm install playwright-core --no-save
node tools/make_shots.js            # 01_title / 05_records / 06_grades
node tools/make_store_assets.js     # → store/upload/6.9inch, 6.5inch
node tools/make_ipad_shots.js       # → store/upload/13inch
node tools/make_play_assets.js      # → store/play/
```

`make_shots.js` が撮るのは**タイトル画面から行ける3枚だけ**。
`02_quiz` と `03_boss` は、特定の単語と四天王ハウルが出ている場面なので、
そこまで自動で運ぶのは当てにならない。あの2枚は手で遊んで撮ったもの。

**www/ ビルドから撮ること。** `party/` には出荷ビルドに入らないもの
（「※ ストーリーモードは 制作中です」の行）が混ざっている。

日本語フォントが無い環境で撮ると**中国語字形になる**ので注意
（`sans-serif` が WenQuanYi 等に解決されるため）。`fonts-noto-cjk` が必要。
確かめ方は `fc-match "sans-serif:lang=ja"` → `Noto Sans CJK JP` なら正しい。

### 画面を変えたら撮り直すこと

店頭の絵とアプリの中身が食い違うのは、審査以前に見た人を戸惑わせる。
実際に `05_records` には旧名の **WORD QUEST** のロゴが、`01_title` には
「ことばの闘技場」が写ったまま残っていた（2026-09-13 に撮り直し）。
