"""Regenerate src/components/courier/courierSlipAssets.js from the source slip art.

The renderer composites the CONTENTS rows from per-item tiles so a zero-quantity
content never appears. This script produces:
  - SLIP_BLANK_PNG  : the source template with the CONTENTS *rows* painted out
                      (header/QTY label, SHIP TO / DISPATCHED FROM, sidebar, footer kept).
  - SLIP_ITEM_TILES : the six original per-item bands (label + empty badge) cropped
                      from the source art, keyed vol/ban/mat/sco/bibo/bibg.
The Barlow font payloads and SLIP_PAGE_PT are carried over from the existing file.

Usage:
  python scripts/genCourierSlipAssets.py path/to/slip_template.png

The source PNG is the 2x (2880x1620) raster of the official artwork. If you don't
have it, decode the current SLIP_BLANK_PNG is NOT enough (rows are erased) — keep the
original full-art raster alongside this script when regenerating.
"""
import sys, re, io, base64
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "components" / "courier" / "courierSlipAssets.js"

SCALE = 2                       # source raster is 2x the 1440x810pt page
CREAM = (251, 247, 239)         # page background
# Rows region to erase for the blank (pt): clears labels, badges and dividers but keeps
# the CONTENTS/QTY header (above 372), the footer bar (below 746) and the vertical column
# separator at x~668 (erase starts at 672, just right of it).
ERASE = dict(x0=672, x1=1256, y0=372, y1=746)
# Per-item slot centres (pt). Item tiles carry the *label only* (cut left of the badge at
# 1010pt; the longest label reaches ~900pt). The badge is composited separately so its
# colour can alternate by row position. Two badge tiles are cropped from the source art:
# the navy badge from slot 0 and the orange badge from slot 1.
SLOT_CENTERS = [410.0, 468.5, 522.75, 579.0, 640.75, 706.0]
KEYS = ["vol", "ban", "mat", "sco", "bibo", "bibg"]
TILE_X0, TILE_X1, TILE_HALF = 690, 1010, 25
BADGE_X0, BADGE_X1, BADGE_HALF = 1187.5, 1227.5, 20
BADGE_SRC = {"navy": SLOT_CENTERS[0], "orange": SLOT_CENTERS[1]}


def P(v):
    return int(round(v * SCALE))


def b64png(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def grab(src, name):
    m = re.search(rf"export const {name}\s*=\s*'([^']*)'", src)
    if not m:
        raise SystemExit(f"could not find {name} in existing assets file")
    return m.group(1)


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: python scripts/genCourierSlipAssets.py <slip_template.png>")
    im = Image.open(sys.argv[1]).convert("RGB")

    blank = im.copy()
    px = blank.load()
    for y in range(P(ERASE["y0"]), P(ERASE["y1"])):
        for x in range(P(ERASE["x0"]), P(ERASE["x1"])):
            px[x, y] = CREAM
    blank_url = "data:image/png;base64," + b64png(blank)

    tiles = {}
    for key, cy in zip(KEYS, SLOT_CENTERS):
        tile = im.crop((P(TILE_X0), P(cy - TILE_HALF), P(TILE_X1), P(cy + TILE_HALF)))
        tiles[key] = "data:image/png;base64," + b64png(tile)

    badges = {}
    for key, cy in BADGE_SRC.items():
        b = im.crop((P(BADGE_X0), P(cy - BADGE_HALF), P(BADGE_X1), P(cy + BADGE_HALF)))
        badges[key] = "data:image/png;base64," + b64png(b)

    src = ASSETS.read_text(encoding="utf-8")
    breg, bbold, bxb = (grab(src, n) for n in
                        ("BARLOW_REGULAR_TTF", "BARLOW_BOLD_TTF", "BARLOW_EXTRABOLD_TTF"))

    lines = [
        "// Auto-generated from the official IKF package-slip artwork (new TYGER-IKF Trial Kit design).",
        "// Do not hand-edit; regenerate with scripts/genCourierSlipAssets.py.",
        "// SLIP_BLANK_PNG is the static template with the CONTENTS *rows* erased (header, SHIP TO /",
        "// DISPATCHED FROM labels, sidebar, footer and the CONTENTS/QTY header are intact).",
        "// SLIP_ITEM_TILES are the original per-item labels cropped from the source art; the renderer",
        "// stacks only the non-zero items into the original row slots so a zero-quantity content never",
        "// appears. SLIP_BADGE_TILES are the navy/orange badges, composited so colour alternates by row",
        "// position. QTY numbers and the REP logo are still drawn live.",
        "export const SLIP_PAGE_PT = [1440, 810];",
        f"export const SLIP_BLANK_PNG = '{blank_url}';",
        "export const SLIP_ITEM_TILES = {",
    ]
    lines += [f"  {k}: '{tiles[k]}'," for k in KEYS]
    lines += ["};", "export const SLIP_BADGE_TILES = {"]
    lines += [f"  {k}: '{badges[k]}'," for k in ("navy", "orange")]
    lines += [
        "};",
        f"export const BARLOW_REGULAR_TTF = '{breg}';",
        f"export const BARLOW_BOLD_TTF = '{bbold}';",
        f"export const BARLOW_EXTRABOLD_TTF = '{bxb}';",
    ]
    ASSETS.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print("wrote", ASSETS)


if __name__ == "__main__":
    main()
