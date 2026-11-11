"""Split the delivered rigging sheets (art/delivery/rig/RIG-<NAME>.webp) into separate parts.
1) background: real alpha (Byte, Fuse) or a painted grey/white checkerboard (Tank, Roxy), removed by a
   flood fill from the border over low-saturation light pixels (interior whites such as eye whites and
   Roxy's top are enclosed by the part and survive);
2) parts: connected components of the alpha (small specks dropped, components very close together merged);
3) writes art/rig/<NAME>/parts.json (id -> bbox) and a numbered preview for naming the parts.
Run: python3 art/prep_rig.py"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery", "rig")
OUT = os.path.join(ROOT, "art", "rig")


def alpha_of(im):
    a = np.asarray(im.convert("RGBA")).copy()
    if (a[..., 3] < 250).mean() > 0.2:  # real transparency
        return a
    rgb = a[..., :3].astype(int)
    sat = rgb.max(-1) - rgb.min(-1)
    bg_like = ((sat < 22) & (rgb.min(-1) > 170)).astype(np.uint8)
    lab, _ = ndimage.label(bg_like)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    # enclosed holes showing the checkerboard (inside the steering wheel, ponytail, drill handle): light,
    # unsaturated regions that are two-tone (checker squares), unlike smooth white surfaces (Roxy's top)
    v = rgb.min(-1)
    for i in range(1, lab.max() + 1):
        if i in border:
            continue
        reg = lab == i
        n = reg.sum()
        if n < 150:
            continue
        vals = v[reg]
        hi = (vals > 246).mean()
        lo = ((vals > 200) & (vals < 236)).mean()
        if hi > 0.2 and lo > 0.2:
            bg |= ndimage.binary_dilation(reg, iterations=1)
    # soften the cut edge by 1 px
    fg = (~bg).astype(np.float32)
    fg = cv2.GaussianBlur(fg, (3, 3), 0.7)
    a[..., 3] = (np.minimum(a[..., 3] / 255, fg) * 255).astype(np.uint8)
    return a


def components(a, min_area=180, gap=1):
    m = a[..., 3] > 40
    grown = ndimage.binary_dilation(m, iterations=gap)
    lab, n = ndimage.label(grown)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = int((m[sl] & (lab[sl] == i)).sum())
        if area < min_area:
            continue
        ys, xs = sl
        boxes.append((xs.start, ys.start, xs.stop, ys.stop, i))
    boxes.sort(key=lambda b: (round(b[1] / 60), b[0]))
    return lab, boxes


for name in ("BYTE", "TANK", "ROXY", "FUSE"):
    im = Image.open(os.path.join(SRC, f"RIG-{name}.webp"))
    a = alpha_of(im)
    lab, boxes = components(a)
    d = os.path.join(OUT, name)
    os.makedirs(d, exist_ok=True)
    Image.fromarray(a, "RGBA").save(os.path.join(d, "sheet.png"))
    parts = {}
    prev = Image.new("RGBA", im.size, (40, 44, 70, 255))
    prev.alpha_composite(Image.fromarray(a, "RGBA"))
    dr = ImageDraw.Draw(prev)
    for k, (x0, y0, x1, y1, li) in enumerate(boxes):
        parts[str(k)] = [int(x0), int(y0), int(x1), int(y1), int(li)]
        dr.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=2)
        dr.rectangle((x0, y0, x0 + 30, y0 + 22), fill=(255, 0, 255))
        dr.text((x0 + 4, y0 + 4), str(k), fill=(255, 255, 255))
    np.save(os.path.join(d, "labels.npy"), lab.astype(np.int32))
    json.dump(parts, open(os.path.join(d, "parts.json"), "w"), indent=0)
    prev.convert("RGB").save(os.path.join(d, "preview.png"))
    print(name, len(parts), "parts")
