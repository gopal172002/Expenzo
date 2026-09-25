"""Generate AllPay brand icons and splash assets from the provided logo PNG."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "src" / "assets" / "brand"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ICONSET = (
    ROOT / "ios" / "AllpayEmployeeApp" / "Images.xcassets" / "AppIcon.appiconset"
)
SRC = BRAND / "app-logo-source.png"


def resize(src: Image.Image, size: int) -> Image.Image:
    return src.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    if not SRC.exists():
        raise SystemExit(f"Missing source logo: {SRC}")

    src = Image.open(SRC).convert("RGBA")

    resize(src, 1024).save(BRAND / "app-icon-1024.png")
    resize(src, 512).save(BRAND / "app-logo.png")
    resize(src, 512).save(BRAND / "splash-logo.png")

    mipmaps = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in mipmaps.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        icon = resize(src, size)
        icon.save(out_dir / "ic_launcher.png")
        icon.save(out_dir / "ic_launcher_round.png")

    drawable = RES / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    resize(src, 256).save(drawable / "splash_logo.png")
    (RES / "drawable-xxhdpi").mkdir(parents=True, exist_ok=True)
    resize(src, 384).save(RES / "drawable-xxhdpi" / "splash_logo.png")
    (RES / "drawable-xxxhdpi").mkdir(parents=True, exist_ok=True)
    resize(src, 512).save(RES / "drawable-xxxhdpi" / "splash_logo.png")

    IOS_ICONSET.mkdir(parents=True, exist_ok=True)
    ios_sizes = {
        "fiona.g@example.net": 40,
        "laura.c@example.net": 60,
        "grace.l@example.com": 58,
        "aaron.s@example.org": 87,
        "xena.w@example.org": 80,
        "paula.r@example.org": 120,
        "laura.c@example.net": 120,
        "james.b@example.com": 180,
        "AppIcon-1024.png": 1024,
    }
    for name, size in ios_sizes.items():
        icon = resize(src, size)
        out = IOS_ICONSET / name
        if size == 1024:
            # App Store icon must be opaque RGB
            rgb = Image.new("RGB", (size, size), (11, 28, 63))
            rgb.paste(icon, (0, 0), icon)
            rgb.save(str(out), format="PNG")
        else:
            icon.save(str(out), format="PNG")

    print("Generated brand assets from", SRC)


if __name__ == "__main__":
    main()
