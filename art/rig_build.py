"""Assemble a character from its rig part sheet (art/prep_rig.py) using art/rig/<NAME>/rig.json, and
export the parts for the game.

rig.json: {"parts": {name: {"id": <component id>, "pivot": [fx, fy], "at": [x, y], "s": scale, "z": z,
                            "flip": false, "parent": "head" (optional; then "at" is relative to the head pivot)}}}
  pivot: the joint, as a fraction of the part's box (0,0 top-left); at: where that joint sits in body space
  (sheet pixels; origin = neck base); s: extra scale (face features are drawn larger than the head).
Writes art/rig/<NAME>/assembled.png (preview), frontend/.../gg/RIG-<NAME>-<part>.webp and src/game/rigs.ts.
Run: python3 art/rig_build.py [NAME ...]"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RIG = os.path.join(ROOT, "art", "rig")
GG = os.path.join(ROOT, "frontend", "getaway_gang", "static", "assets", "gg")
TS = os.path.join(ROOT, "frontend", "getaway_gang", "src", "game", "rigs.ts")


def cut(name, cid):
    sheet = np.asarray(Image.open(os.path.join(RIG, name, "sheet.png"))).copy()
    lab = np.load(os.path.join(RIG, name, "labels.npy"))
    parts = json.load(open(os.path.join(RIG, name, "parts.json")))
    ids = cid if isinstance(cid, list) else [cid]
    box = None
    mask = np.zeros(lab.shape, bool)
    for i in ids:
        x0, y0, x1, y1, li = parts[str(i)]
        mask |= lab == li
        box = (x0, y0, x1, y1) if box is None else (min(box[0], x0), min(box[1], y0), max(box[2], x1), max(box[3], y1))
    a = sheet.copy()
    a[..., 3] = np.where(mask, a[..., 3], 0)
    x0, y0, x1, y1 = box
    return Image.fromarray(a[y0:y1, x0:x1], "RGBA")


def build(name):
    spec = json.load(open(os.path.join(RIG, name, "rig.json")))
    placed = []
    out = {}
    for pname, p in spec["parts"].items():
        img = cut(name, p["id"])
        if p.get("flip"):
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        s = p.get("s", 1.0)
        par = spec["parts"].get(p.get("parent") or "", {})
        s *= par.get("s", 1.0)  # children scale with their parent (face features with the head)
        if s != 1.0:
            img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        px, py = p.get("pivot", [0.5, 0.5])
        ax, ay = p["at"]
        if p.get("parent"):
            hp = par["at"]
            ax, ay = hp[0] + ax * par.get("s", 1.0), hp[1] + ay * par.get("s", 1.0)
        if not p.get("hidden"):  # alternate states (blink, other mouths) are off in the preview
            placed.append((p.get("z", 0), img, ax - px * img.width, ay - py * img.height))
        out[pname] = {"w": img.width, "h": img.height, "pivot": [px, py], "at": p["at"], "z": p.get("z", 0), "parent": p.get("parent"), "s": s, "img": img}
    xs = [x for _, im, x, _ in placed] + [x + im.width for _, im, x, _ in placed]
    ys = [y for _, im, _, y in placed] + [y + im.height for _, im, _, y in placed]
    ox, oy = -min(xs) + 10, -min(ys) + 10
    W, H = int(max(xs) - min(xs)) + 20, int(max(ys) - min(ys)) + 20
    prev = Image.new("RGBA", (W, H), (40, 44, 70, 255))
    for z, im, x, y in sorted(placed, key=lambda t: t[0]):
        prev.alpha_composite(im, (int(x + ox), int(y + oy)))
    prev.save(os.path.join(RIG, name, "assembled.png"))
    return out


def main(names):
    allrigs = {}
    for name in names:
        rig = build(name)
        for pname, p in rig.items():
            p.pop("img").save(os.path.join(GG, f"RIG-{name}-{pname}.webp"), "WEBP", lossless=True, quality=100, method=6)
        allrigs[name] = rig
        print(name, len(rig), "parts")
    return allrigs


if __name__ == "__main__":
    names = sys.argv[1:] or ["BYTE", "TANK", "ROXY", "FUSE"]
    main(names)
