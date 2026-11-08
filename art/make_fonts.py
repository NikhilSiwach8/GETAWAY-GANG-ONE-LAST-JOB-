"""Build bitmap fonts (BMFont XML + PNG atlas) from the delivered glyph sheets.
FONT-WIN -> face 'ggGold' (win counters), FONT-COUNTER -> face 'ggSilver' (counters).
Row 1 = 0123456789 (outlines touch, so digits are split at the thinnest column between their bright faces),
row 2 = , . × $ € £ + (separate shapes). Run: python3 art/make_fonts.py"""
import os

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery", "round2")
OUT = os.path.join(ROOT, "frontend", "getaway_gang", "static", "assets", "fonts")
ROW2 = [",", ".", "×", "$", "€", "£", "+"]
GLYPH_H = 320  # max digit height in the atlas (capped at the delivered height: never upscaled)


def bands(mask):
    rows = mask.any(1)
    out, start = [], None
    for y, v in enumerate(list(rows) + [False]):
        if v and start is None:
            start = y
        elif not v and start is not None:
            out.append((start, y))
            start = None
    return [b for b in out if b[1] - b[0] > 40]


def segments(cols, min_w=8):
    out, start = [], None
    for x, v in enumerate(list(cols) + [False]):
        if v and start is None:
            start = x
        elif not v and start is not None:
            if x - start >= min_w:
                out.append((start, x))
            start = None
    return out


def split_digits(rgba, alpha, y0, y1):
    """The ten digits sit side by side at a near-constant pitch and their outlines touch. Cut at the thinnest
    column (fewest opaque pixels, ties -> darkest) inside a window around each expected boundary."""
    band = alpha[y0:y1]
    cols = np.where(band.any(0))[0]
    x0, x1 = int(cols[0]), int(cols[-1]) + 1
    seg = (x1 - x0) / 10
    thick = band.sum(0).astype(float)
    lum = rgba[y0:y1, :, :3].mean(2)
    bright = ((lum > 150) & band).sum(0)  # letter faces are bright, outlines dark
    score = bright * 4 + thick * 0.05
    cuts = [x0]
    for i in range(1, 10):
        lo = int(x0 + (i - 0.38) * seg)
        hi = int(x0 + (i + 0.38) * seg)
        cuts.append(lo + int(np.argmin(score[lo:hi])))
    cuts.append(x1)
    return [(cuts[i], cuts[i + 1]) for i in range(10)]


def keep_main_shape(g):
    """Drop slivers of a neighbouring digit's outline left at the cut: keep only components that are a
    real part of this glyph (>=4% of the largest one, e.g. the dot of a punctuation mark stays)."""
    from scipy import ndimage

    arr = np.array(g)
    lab, n = ndimage.label(arr[:, :, 3] > 20)
    if n <= 1:
        return g
    sizes = ndimage.sum(np.ones_like(lab), lab, index=range(1, n + 1))
    keep = {i + 1 for i, sz in enumerate(sizes) if sz >= 0.04 * sizes.max()}
    # a thin full-height strip at the left/right edge is a neighbour's outline even if large-ish
    for i in list(keep):
        ys, xs = np.where(lab == i)
        if xs.max() - xs.min() < 0.12 * arr.shape[1] and (xs.min() <= 1 or xs.max() >= arr.shape[1] - 2) and len(keep) > 1:
            keep.discard(i)
    mask = np.isin(lab, list(keep))
    arr[~mask, 3] = 0
    return Image.fromarray(arr)


def build(sheet, face_name, folder):
    im = Image.open(os.path.join(SRC, sheet)).convert("RGBA")
    rgba = np.array(im)
    alpha = rgba[:, :, 3] > 40
    (r1y0, r1y1), (r2y0, r2y1) = bands(alpha)[:2]
    glyphs = {}
    for ch, (x0, x1) in zip("0123456789", split_digits(rgba, alpha, r1y0, r1y1)):
        glyphs[ch] = im.crop((x0, r1y0, x1, r1y1))
    for ch, (x0, x1) in zip(ROW2, segments(alpha[r2y0:r2y1].any(0))):
        glyphs[ch] = im.crop((x0, r1y0 + (r2y0 - r1y0), x1, r2y1))
    # trim each glyph horizontally to its own pixels; keep a common vertical frame per row
    scale = min(1.0, GLYPH_H / (r1y1 - r1y0))
    base_h = round((r1y1 - r1y0) * scale)
    pad = 4
    tiles = {}
    for ch, g in glyphs.items():
        g = keep_main_shape(g)
        a = np.array(g)[:, :, 3] > 20
        xs = np.where(a.any(0))[0]
        g = g.crop((int(xs[0]), 0, int(xs[-1]) + 1, g.height))
        w = max(1, round(g.width * scale))
        h = max(1, round(g.height * scale))
        tiles[ch] = g.resize((w, h), Image.LANCZOS)
    # punctuation sits on the digit baseline: '.' and ',' bottom-aligned; others vertically centred
    atlas_w = sum(t.width + pad for t in tiles.values()) + pad
    atlas_h = base_h + 2 * pad + 40
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    chars, x = [], pad
    for ch, t in tiles.items():
        atlas.paste(t, (x, pad))
        if ch in ".,":
            yoff = base_h - t.height + (12 if ch == "," else 0)
        else:
            yoff = (base_h - t.height) // 2
        adv = t.width - round(base_h * 0.04)  # outlines overlap slightly, like the art
        chars.append((ord(ch), x, pad, t.width, t.height, 0, yoff, adv))
        x += t.width + pad
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    png = f"{folder}.png"
    atlas.save(os.path.join(OUT, folder, png))
    space = round(base_h * 0.3)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<font>",
        f'  <info face="{face_name}" size="{base_h}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="1,1" outline="0"/>',
        f'  <common lineHeight="{base_h}" base="{base_h}" scaleW="{atlas_w}" scaleH="{atlas_h}" pages="1" packed="0"/>',
        "  <pages>",
        f'    <page id="0" file="{png}"/>',
        "  </pages>",
        f'  <chars count="{len(chars) + 1}">',
        f'    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="{space}" page="0" chnl="15"/>',
    ]
    for cid, cx, cy, cw, chh, xo, yo, adv in chars:
        lines.append(f'    <char id="{cid}" x="{cx}" y="{cy}" width="{cw}" height="{chh}" xoffset="{xo}" yoffset="{yo}" xadvance="{adv}" page="0" chnl="15"/>')
    lines += ["  </chars>", "</font>", ""]
    xml = os.path.join(OUT, folder, f"{folder}.xml")
    open(xml, "w", encoding="UTF-8").write("\n".join(lines))
    print(face_name, atlas.size, "glyphs", len(chars))
    return atlas


if __name__ == "__main__":
    a = build("FONT-WIN.webp", "ggGold", "ggGold")
    b = build("FONT-COUNTER.webp", "ggSilver", "ggSilver")
