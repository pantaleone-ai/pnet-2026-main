#!/usr/bin/env python3
"""Download gallery artworks and crop platform-native JPEG cards.

Usage: python3 build-cards.py --out-dir DIR --size WxH [--quality N] <url> [<url> ...]
Writes 1.jpg..n.jpg (cover-crop, center). Exits non-zero on any failure.
curl is used for download (system certs); PIL for pixels.
"""
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("build-cards: PIL (pillow) required", file=sys.stderr)
    sys.exit(1)


def parse_args(argv):
    out_dir = None
    width, height = 1080, 1350
    quality = 88
    urls = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--out-dir":
            out_dir = argv[i + 1]
            i += 2
        elif a == "--size":
            width, height = (int(x) for x in argv[i + 1].split("x"))
            i += 2
        elif a == "--quality":
            quality = int(argv[i + 1])
            i += 2
        elif a.startswith("--"):
            print(f"build-cards: unknown flag {a}", file=sys.stderr)
            sys.exit(1)
        else:
            urls.append(a)
            i += 1
    if not out_dir or not urls:
        print("build-cards: need --out-dir and at least one URL", file=sys.stderr)
        sys.exit(1)
    return out_dir, width, height, quality, urls


def main():
    out_dir, width, height, quality, urls = parse_args(sys.argv)
    dest = Path(out_dir)
    dest.mkdir(parents=True, exist_ok=True)
    tmp = dest / ".dl"
    tmp.mkdir(exist_ok=True)
    for n, url in enumerate(urls, 1):
        if not url.startswith("https://"):
            print(f"build-cards: refusing non-https {url}", file=sys.stderr)
            sys.exit(1)
        raw = tmp / f"src-{n}.bin"
        r = subprocess.run(
            ["curl", "-sL", "--max-time", "60", url, "-o", str(raw)],
            capture_output=True,
        )
        if r.returncode != 0 or raw.stat().st_size == 0:
            print(f"build-cards: download failed {url}", file=sys.stderr)
            sys.exit(1)
        try:
            im = Image.open(raw).convert("RGB")
            im.load()
        except Exception as e:
            print(f"build-cards: unreadable image {url}: {e}", file=sys.stderr)
            sys.exit(1)
        w, h = im.size
        scale = max(width / w, height / h)
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        x = (im.width - width) // 2
        y = (im.height - height) // 2
        out = dest / f"{n}.jpg"
        im.crop((x, y, x + width, y + height)).save(str(out), "JPEG", quality=quality)
        check = Image.open(out)
        if check.size != (width, height):
            print(f"build-cards: bad output size {out}", file=sys.stderr)
            sys.exit(1)
        print(f"{out} {width}x{height}")
    for f in tmp.glob("*"):
        f.unlink()
    tmp.rmdir()


if __name__ == "__main__":
    main()
