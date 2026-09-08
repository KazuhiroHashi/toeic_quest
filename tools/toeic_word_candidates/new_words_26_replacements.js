// 訳がカタカナだけで、しかも英語の音をそのまま写しただけだった語の代わり
// （2026-09-08。外した語は tools/build_toeic_bands.js の DROP を参照）
//
//   logo / login / balcony / wrench / barcode / software / database
//
// これらは「ロゴ」「ログイン」のようにカタカナ以外の日本語が無く、訳を直しても
// 音で当てられてしまう。同じくらいの難しさで、訳が日本語になる語に入れ替える。
// 帯は tools/build_toeic_bands.js が自動で決める（このファイルの難易度の目安は
// FILE_HINT に書いてある）。
window.NEW = [
  {w:"postage",     m:"郵便料金",       p:"n"},
  {w:"leaflet",     m:"ちらし",         p:"n"},
  {w:"doorway",     m:"戸口",           p:"n"},
  {w:"refill",      m:"補充する",       p:"v"},
  {w:"workload",    m:"仕事量",         p:"n"},
  {w:"outage",      m:"停電・稼働停止", p:"n"},
  {w:"stairwell",   m:"階段の吹き抜け", p:"n"}
];
