from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
DPI = 300
CM = DPI / 2.54                      # px per cm
W, H = int(6.0 * CM), int(3.0 * CM)  # 6cm x 3cm canvas (8cm四方の制限内)

def render(path, fmt):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    # 文字高が版面の約28%になるサイズを選ぶ
    size = int(0.30 * H)
    f = ImageFont.truetype(FONT, size)
    lines = ["WORDRIA", "ワードリア"]
    boxes = [d.textbbox((0, 0), s, font=f) for s in lines]
    hs = [b[3] - b[1] for b in boxes]
    gap = int(0.18 * H)
    total = sum(hs) + gap
    y = (H - total) // 2
    for s, b, h in zip(lines, boxes, hs):
        w = b[2] - b[0]
        d.text(((W - w) // 2 - b[0], y - b[1]), s, font=f, fill="black")
        y += h + gap
    img.save(path, fmt, dpi=(DPI, DPI), **({"quality": 95} if fmt == "JPEG" else {}))
    print(f"{path}  {W}x{H}px  {W/CM:.1f}cm x {H/CM:.1f}cm @ {DPI}dpi")

render("商標見本_WORDRIA二段併記.png", "PNG")
render("商標見本_WORDRIA二段併記.jpg", "JPEG")
