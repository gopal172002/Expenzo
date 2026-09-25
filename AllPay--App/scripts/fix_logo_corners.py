"""Clip AllPay logo corners to transparent for splash (no white canvas)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "src" / "assets" / "brand"
SOURCE = BRAND / "app-icon-1024.png"


def clip_logo(im: Image.Image) -> Image.Image:
    w, h = im.size
    radius = int(min(w, h) * 0.28)
    inset = 4
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (inset, inset, w - 1 - inset, h - 1 - inset),
        radius=radius,
        fill=255,
    )
    soft = mask.filter(ImageFilter.GaussianBlur(radius=1.2))

    sp = im.convert("RGBA").load()
    mp = soft.load()
    out = Image.new("RGBA", (w, h))
    op = out.load()

    for y in range(h):
        for x in range(w):
            a = mp[x, y]
            if a < 10:
                op[x, y] = (0, 0, 0, 0)
                continue
            r, g, b, oa = sp[x, y]
            if oa < 10:
                op[x, y] = (0, 0, 0, 0)
                continue
            bright = (r + g + b) / 3.0
            # Replace pale fringe RGB with blue so AA never shows white
            if bright >= 150 and not (r >= 230 and g >= 230 and b >= 230):
                cx, cy = w // 2, h // 2
                dx, dy = cx - x, cy - y
                found = False
                for t in range(1, 40):
                    nx = max(0, min(w - 1, x + int(dx * t / 40)))
                    ny = max(0, min(h - 1, y + int(dy * t / 40)))
                    nr, ng, nb, na = sp[nx, ny]
                    if na > 200 and nb > nr + 20 and (nr + ng + nb) / 3 < 150:
                        r, g, b = nr, ng, nb
                        found = True
                        break
                if not found:
                    r, g, b = 37, 99, 235
            op[x, y] = (r, g, b, a)
    return out


def main() -> None:
    fixed = clip_logo(Image.open(SOURCE))
    targets = [
        (BRAND / "app-icon-1024.png", 1024),
        (BRAND / "app-logo-source.png", 512),
        (BRAND / "splash-logo.png", 168),
        (BRAND / "app-logo.png", 168),
        (ROOT / "android/app/src/main/res/drawable/splash_logo.png", 168),
        (ROOT / "android/app/src/main/res/drawable-xxhdpi/splash_logo.png", 240),
        (ROOT / "android/app/src/main/res/drawable-xxxhdpi/splash_logo.png", 320),
        (ROOT / "ios/AllpayEmployeeApp/Images.xcassets/SplashLogo.imageset/splash-logo.png", 168),
    ]
    for path, size in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        fixed.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
        print("wrote", path)


if __name__ == "__main__":
    main()
