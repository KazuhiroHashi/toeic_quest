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

`make_shots.js` が**6枚すべて**撮る（2026-09-16 から）。
以前は `02_quiz` と `03_boss` を「自動で運ぶのは当てにならない」として
手で遊んで撮っていたが、そのせいで撮り直しが面倒になり、実際に古いまま
残った（Bボタンが「メニュー/戻る」、Aボタンが「話す/決定」と、いまの
アプリに無い表記になっていた）。運べるようにしてある。

  出る単語  … QUIZ.ask を包んで opts.entry を差し込む。毎回同じ語が出る
              （02_quiz は moreover、03_boss は competent）
  ハウル    … 「続きから」の保存データを 6戦目・4人で作って再開する
  04_wordbook … 単語帳。これも漏れていたので足した

アプリ側には手を入れていない。撮影のときだけ外から差し込む。

**www/ ビルドから撮ること。** `party/` には出荷ビルドに入らないもの
（「※ ストーリーモードは 制作中です」の行）が混ざっている。

### ⚠ 日本語フォント（毎回確認すること）

日本語フォントが無い環境で撮ると、sans-serif が中国語フォントに解決されて
**中国語の字形**になる。2026-09-16 の撮り直しでも、最初はこうなっていた。

```bash
fc-match "sans-serif:lang=ja"
#  Noto Sans CJK JP  なら正しい
#  WenQuanYi Zen Hei など中国語フォントが出たら、そのまま撮ってはいけない
```

直し方：

```bash
apt-get install -y fonts-noto-cjk
cat > /etc/fonts/conf.d/99-ja-noto.conf <<'XML'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <alias binding="strong"><family>sans-serif</family>
    <prefer><family>Noto Sans CJK JP</family></prefer></alias>
</fontconfig>
XML
fc-cache -f
```

インストールしただけでは足りない。中国語フォントのほうが優先されたままなので、
上の設定で順番を入れ替える必要がある。

### ⚠ プレビュー動画が巻き添えで再エンコードされる

`make_store_assets.js` は `store/upload/preview/op_preview_886x1920.mp4` も
作り直す。中身は同じなのにファイルが 13.2MB → 16.5MB に太るだけなので、
**スクリーンショットだけ更新したいときは、実行後に戻すこと。**

```bash
git checkout -- store/upload/preview/
```
（`sans-serif` が WenQuanYi 等に解決されるため）。`fonts-noto-cjk` が必要。
確かめ方は `fc-match "sans-serif:lang=ja"` → `Noto Sans CJK JP` なら正しい。

### 画面を変えたら撮り直すこと

店頭の絵とアプリの中身が食い違うのは、審査以前に見た人を戸惑わせる。
実際に `05_records` には旧名の **WORD QUEST** のロゴが、`01_title` には
「ことばの闘技場」が写ったまま残っていた（2026-09-13 に撮り直し）。
