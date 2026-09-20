# アプリアイコン（ストア用）の生成

マスター画像：`assets/ui/icon.png`（1254×1254、クールな主人公＋魔法の英字）。
`appicon/` に @capacitor/assets 用のソースを置いてあります。

## iOS / Android の全アイコンサイズを一括生成
ネイティブ（Capacitor）プロジェクトを追加したあと、リポジトリのルートで：

```bash
# 一度だけ
npm i -D @capacitor/assets

# アイコン（＋あればスプラッシュ）を全サイズ生成して各プラットフォームへ配置
npx @capacitor/assets generate --assetPath appicon --iconBackgroundColor '#0b1230' --iconBackgroundColorDark '#0b1230'
```

- `appicon/icon-only.png` … 通常アイコン（角丸なし。iOSが角丸を付ける）
- `appicon/icon-foreground.png` … Android アダプティブアイコンの前景（背景色は上記フラグ）
- 生成物は `ios/App/App/Assets.xcassets/AppIcon.appiconset` と `android/app/src/main/res/mipmap-*` に自動配置されます。

## ストア掲載用の1024×1024（App Store Connect / Play Console）
- App Store は 1024×1024 の「マーケティング用アイコン」を別途要求。`assets/ui/icon.png` を 1024×1024 に書き出して提出（透過・角丸なしのPNG/JPG）。
- Google Play は 512×512 の「ハイレゾアイコン」。同じく `icon.png` を 512×512 で書き出し。

※ 文字は入れないこと（小サイズで潰れる／ストア規約でも避けるのが無難）。
