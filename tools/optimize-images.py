#!/usr/bin/env python3
"""Optimise portfolio media into media/ (WebP) and write media/manifest.json.

Usage: python3 tools/optimize-images.py --repos <dir of cloned repos>

Manifest shape:
  { "<path relative to repo root>": { "src", "w", "h", "bytes" [, "role"] } }
Repo images use a repo-relative "src"; logos from cloned repos use
"repos:<FolderName>/<path inside repo>"; generated art uses "generated".
Event photos are numbered NN = 1-based position in the original site's
gallery arrays (order frozen below), so cover/hero keep their roles.
"""
import argparse
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent

QUALITY = 72   # WebP quality (lowered from 78 on 2026-11-25 to cut weight; still clean for photos and certificate text)
METHOD = 6
GALLERY_LONG = 1400   # long edge of full-size event photos
THUMB_LONG = 640      # long edge of event thumbnails
CERT_LONG = 1600
POSTER_LONG = 1600
PORTRAIT_SIZES = (1200, 640)  # widths
LOGO_BOX = 800

INK = (0x0E, 0x11, 0x16)
BONE = (0xF5, 0xF1, 0xEA)
VERMILION = (0xFF, 0x5A, 0x36)

# source folder -> (output folder, cover, hero, gallery in original order)
EVENTS = {
    "human-rights": {
        "cover": "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.31 (1).jpeg",
        "hero": "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.31.jpeg",
        "gallery": [
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.31 (1).jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.31.jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.32.jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.33 (1).jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.33.jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.34 (1).jpeg",
            "Images/humanrights/WhatsApp Image 2026-02-05 at 20.19.34.jpeg"
        ]
    },
    "telkom10x": {
        "cover": "Images/telkom10x/54800282502_ab8be95d1c_o.jpg",
        "hero": "Images/telkom10x/54801137346_00e70e52d4_o.jpg",
        "gallery": [
            "Images/telkom10x/54800282502_ab8be95d1c_o.jpg",
            "Images/telkom10x/54801137346_00e70e52d4_o.jpg",
            "Images/telkom10x/54801377124_6d16a8262e_o.jpg",
            "Images/telkom10x/54801378034_94ef7fcc2e_o.jpg",
            "Images/telkom10x/54801388458_c4e1e5b563_o.jpg",
            "Images/telkom10x/54801389838_963e0e8ea2_o.jpg",
            "Images/telkom10x/54801389843_4af24e5b9f_o.jpg",
            "Images/telkom10x/54801390018_dca0737342_o.jpg",
            "Images/telkom10x/54801474155_6e6ef4c05f_o.jpg",
            "Images/telkom10x/54801474435_16b2d75563_o (1).jpg",
            "Images/telkom10x/54801474435_16b2d75563_o.jpg",
            "Images/telkom10x/54801474450_95f53fb006_o.jpg",
            "Images/telkom10x/54801474465_91fb8b528c_o.jpg",
            "Images/telkom10x/54801474630_d6028e2612_o (1).jpg",
            "Images/telkom10x/54801474630_d6028e2612_o.jpg",
            "Images/telkom10x/54801474745_8680be3e02_o.jpg",
            "Images/telkom10x/54809716746_9c954bac08_o.jpg",
            "Images/telkom10x/54809718331_e9f3e5836f_o.jpg",
            "Images/telkom10x/54809718771_4650c5fd1a_k.jpg",
            "Images/telkom10x/54809718771_4d7820369d_o.jpg",
            "Images/telkom10x/54809975813_f9cff248c8_o.jpg",
            "Images/telkom10x/54809979299_9210a8757b_o.jpg",
            "Images/telkom10x/54810062025_3203ebbfe0_o.jpg",
            "Images/telkom10x/54810062930_1bcc408cb7_o.jpg",
            "Images/telkom10x/Code.jpg",
            "Images/telkom10x/Image .jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.57 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.57 (2).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.57.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.58 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.58.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.59 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.59 (2).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.54.59.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.00 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.00.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.01 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.01 (2).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.01.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.02 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.02 (2).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.02.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.03 (1).jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.03.jpeg",
            "Images/telkom10x/WhatsApp Image 2025-09-21 at 22.55.10.jpeg"
        ]
    },
    "uct-cortex-hub": {
        "cover": "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.36.jpeg",
        "hero": "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.37.jpeg",
        "gallery": [
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.36.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.37.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.39.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.44.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.45 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.45.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.46.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.47 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.13.47.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.35.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.36.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.49.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.50.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.51 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.51.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.52 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.52 (2).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.52 (3).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.52.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.53 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.53 (2).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.53.jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.54 (1).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.54 (2).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.54 (3).jpeg",
            "Images/uct-cortexhub/WhatsApp Image 2026-02-05 at 20.19.54.jpeg"
        ]
    },
    "startup-grind": {
        "cover": "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.30.48.jpeg",
        "hero": "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.00.jpeg",
        "gallery": [
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.30.48.jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.30.52.jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.30.53.jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.30.54.jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.00 (1).jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.00 (2).jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.00.jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.01 (1).jpeg",
            "Images/startupgrind/WhatsApp Image 2026-02-05 at 20.31.01.jpeg"
        ]
    }
}

EVENT_FOLDERS = {
    "Images/humanrights": "human-rights",
    "Images/telkom10x": "telkom10x",
    "Images/uct-cortexhub": "uct-cortex-hub",
    "Images/startupgrind": "startup-grind",
}

CERTIFICATES = [
    ("Images/certificates/Screenshot-2026-01-21-013354.png", "fnb-full-stack"),
    ("Images/certificates/Screenshot-2026-01-21-013447.png", "digital-learning"),
    ("Images/certificates/Screenshot-2026-01-21-014335.png", "hp-effective-business-websites"),
    ("Images/certificates/Screenshot-2026-01-21-014354.png", "hp-ai-for-beginners"),
    ("Images/certificates/Screenshot-2026-01-21-014420.png", "hp-starting-small-business"),
    ("Images/certificates/Screenshot-2026-01-21-014441.png", "hp-finding-funding"),
]

POSTERS = [
    ("Images/projects/Screenshot-2026-01-21-015109.png", "placeme"),
    ("Images/projects/Screenshot-2025-09-17-232627.png", "edurand"),
    ("Images/projects/Screenshot-2025-09-21-072807.png", "journeymap"),
    ("Images/projects/image.png", "laundry"),
]

PORTRAIT_SRC = "Images/profile/Image.jpeg"  # image.png is not a valid image

# slug -> (repo folder, path inside repo)
LOGOS = {
    "tutorconnect": ("BigGee6566_TutorConnect", "Images/branding/tutorconnect-logo.png"),
    "studylink": ("BigGee6566_StudyLink", "Images/branding/studylink-logo.png"),
    "smartshelf": ("BigGee6566_SmartShelf", "Images/smartshelf-logo.png"),
    "busnova": ("BigGee6566_BusNova_System", "BusNova_System_NoDB/Images/logo.jpeg"),
    "logisticore": ("BigGee6566_C-Sharp-Shooter", "Images/web/logo.png"),
}

# Big Shoulders Display (OFL, see tools/fonts/OFL.txt); DejaVu Sans Bold fallback.
FONT_CANDIDATES = [
    (ROOT / "tools/fonts/BigShouldersDisplay[wght].ttf", 800),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), None),
]

OUT_ROOT = ROOT   # where media/ lives; overridable with --out-root (tests)
STAGE = None      # staging dir for this run

manifest = {}


def load(path):
    im = Image.open(path)
    im.load()
    return ImageOps.exif_transpose(im)


def fit(im, long_edge=None, width=None, box=None):
    """Downscale only. long_edge: cap longest side; width: cap width; box: fit in box x box."""
    w, h = im.size
    scale = 1.0
    if long_edge:
        scale = min(1.0, long_edge / max(w, h))
    elif width:
        scale = min(1.0, width / w)
    elif box:
        scale = min(1.0, box / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return im


def save(im, rel, src, role=None):
    out = STAGE / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    im = im.convert("RGBA" if has_alpha else "RGB")
    im.save(out, "WEBP", quality=QUALITY, method=METHOD, alpha_quality=100)
    entry = {"src": src, "w": im.size[0], "h": im.size[1], "bytes": out.stat().st_size}
    if role:
        entry["role"] = role
    manifest[rel] = entry


def do_events():
    for src_folder, out_folder in EVENT_FOLDERS.items():
        ev = EVENTS[out_folder]
        for i, src in enumerate(ev["gallery"], 1):
            nn = f"{i:02d}"
            role = "cover" if src == ev["cover"] else "hero" if src == ev["hero"] else None
            im = load(ROOT / src)
            save(fit(im, long_edge=GALLERY_LONG),
                 f"media/events/{out_folder}/{nn}-{GALLERY_LONG}.webp", src, role)
            save(fit(im, long_edge=THUMB_LONG),
                 f"media/events/{out_folder}/{nn}-{THUMB_LONG}.webp", src, role)


def do_simple(items, long_edge, pattern):
    for src, slug in items:
        save(fit(load(ROOT / src), long_edge=long_edge), pattern.format(slug=slug), src)


def do_portrait():
    im = load(ROOT / PORTRAIT_SRC)
    for w in PORTRAIT_SIZES:
        save(fit(im, width=w), f"media/profile/portrait-{w}.webp", PORTRAIT_SRC)


def do_logos(repos):
    for slug, (folder, inner) in LOGOS.items():
        p = repos / folder / inner
        if not p.is_file():
            sys.exit(f"missing logo source: {p}")
        save(fit(load(p), box=LOGO_BOX), f"media/projects/{slug}/logo.webp", f"repos:{folder}/{inner}")


def font(size):
    for path, weight in FONT_CANDIDATES:
        if path.is_file():
            f = ImageFont.truetype(str(path), size)
            if weight:
                f.set_variation_by_axes([weight])
            return f
    sys.exit("no usable font found (need tools/fonts/BigShouldersDisplay[wght].ttf or DejaVu Sans Bold)")


def do_pending_cover():
    W, H = 1440, 900
    im = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(im)
    text = "Running capture coming soon"
    f = font(96)
    box = d.textbbox((0, 0), text, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    x, y = (W - tw) // 2 - box[0], (H - th) // 2 - box[1] - 20
    d.text((x, y), text, font=f, fill=BONE)
    rule_y = (H + th) // 2 + 20
    d.rectangle([(W - tw) // 2, rule_y, (W + tw) // 2, rule_y + 2], fill=VERMILION)
    save(im, "media/projects/pending-cover.webp", "generated")


def publish(manifest_new):
    """Swap staged files into media/. Touches only paths in the old or new manifest."""
    media = OUT_ROOT / "media"
    mpath = media / "manifest.json"
    old = {}
    if mpath.is_file():
        old = json.loads(mpath.read_text())
    for rel in old:
        if rel not in manifest_new:
            (OUT_ROOT / rel).unlink(missing_ok=True)
    for rel in manifest_new:
        dest = OUT_ROOT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        os.replace(STAGE / rel, dest)
    tmp = media / "manifest.json.tmp"
    tmp.write_text(json.dumps({k: manifest_new[k] for k in sorted(manifest_new)}, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, mpath)


def main():
    global OUT_ROOT, STAGE
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repos", required=True, help="directory containing the cloned repos")
    ap.add_argument("--out-root", help="write media/ under this directory instead of the repo root (tests)")
    args = ap.parse_args()
    repos = Path(args.repos).resolve()
    if args.out_root:
        OUT_ROOT = Path(args.out_root).resolve()
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    STAGE = Path(tempfile.mkdtemp(prefix=".media-stage-", dir=OUT_ROOT))
    try:
        do_events()
        do_simple(CERTIFICATES, CERT_LONG, "media/certificates/{slug}.webp")
        do_portrait()
        do_simple(POSTERS, POSTER_LONG, "media/projects/{slug}/poster.webp")
        do_logos(repos)
        do_pending_cover()
        publish(manifest)
    finally:
        shutil.rmtree(STAGE, ignore_errors=True)
    print(f"wrote {len(manifest)} entries to media/manifest.json")


if __name__ == "__main__":
    main()
