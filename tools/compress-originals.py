"""Compress the original photos and screenshots in Images/ in place.

Why: Images/ holds the source files that tools/optimize-images.py turns into the
WebP copies the site actually loads (media/). The originals are never shown on the
site, but they are committed and GitHub Pages still serves them, so they should be
small and carry no camera metadata (EXIF).

What it does, per JPEG/PNG file (names and formats never change, so
optimize-images.py keeps finding them):
  - applies the EXIF rotation to the pixels, then drops ALL metadata (EXIF, GPS,
    camera model, comments);
  - shrinks the long edge to at most --max-long pixels (default 2000; never upscales,
    and stays above the 1400 px the site needs);
  - JPEG: re-saves at --jpeg-quality (default 82), optimised and progressive;
  - PNG: re-saves losslessly with optimize=True.
A file is replaced only if the new version is smaller, or if the old one carried
metadata (stripping it always wins). Unreadable files are skipped and reported.

Usage: python3 tools/compress-originals.py [--root Images] [--max-long 2000] [--jpeg-quality 82]
"""
import argparse
import io
import os
import sys

from PIL import Image, ImageOps


def has_metadata(im):
    # EXIF, XMP, ICC comments etc. all land in im.info or getexif()
    return bool(im.getexif()) or any(k in im.info for k in ("exif", "xmp", "comment", "XML:com.adobe.xmp"))


def compress(path, max_long, jpeg_quality):
    """Return (old_bytes, new_bytes, action) for one file."""
    old = os.path.getsize(path)
    with Image.open(path) as src:
        fmt = (src.format or "").upper()
        had_meta = has_metadata(src)
        im = ImageOps.exif_transpose(src)  # bake rotation into pixels before metadata is dropped
        if max(im.size) > max_long:
            im.thumbnail((max_long, max_long), Image.LANCZOS)  # keeps aspect ratio, never upscales
        buf = io.BytesIO()
        if fmt == "JPEG":
            im.convert("RGB").save(buf, "JPEG", quality=jpeg_quality, optimize=True, progressive=True)
        elif fmt == "PNG":
            im.save(buf, "PNG", optimize=True)  # lossless; no metadata is passed through
        else:
            return old, old, f"skipped ({fmt or 'unknown'} format)"
    new = buf.tell()
    if new < old or had_meta:
        with open(path, "wb") as fh:
            fh.write(buf.getvalue())
        return old, new, "compressed" + (" + metadata stripped" if had_meta else "")
    return old, old, "kept (already smaller)"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default="Images")
    ap.add_argument("--max-long", type=int, default=2000)
    ap.add_argument("--jpeg-quality", type=int, default=82)
    args = ap.parse_args()

    total_old = total_new = 0
    counts = {}
    for dirpath, _dirs, files in os.walk(args.root):
        for name in sorted(files):
            if not name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(dirpath, name)
            try:
                old, new, action = compress(path, args.max_long, args.jpeg_quality)
            except Exception as exc:  # unreadable or not really an image: report, never crash the run
                old = new = os.path.getsize(path)
                action = f"skipped (unreadable: {type(exc).__name__})"
                print(f"  {path}: {action}", file=sys.stderr)
            total_old += old
            total_new += new
            key = action.split(" (")[0]
            counts[key] = counts.get(key, 0) + 1
    print(f"{args.root}: {total_old/1e6:.2f} MB -> {total_new/1e6:.2f} MB")
    for k, v in sorted(counts.items()):
        print(f"  {v:3d} {k}")


if __name__ == "__main__":
    main()
