"""Prepare the Mystery Vault art for the Remotion clips (video/public/gg):
- MYSTERY-REVEAL-ESCAPE / -EMPTY were delivered on black: everything near-black connected to the image border
  becomes transparent (the round vault ring and the open door stay).
- MYSTERY-VAULT-DOOR was delivered flat: the combination dial and the handle wheel are cut out as their own layers,
  and the door slab underneath is inpainted so they can rotate without a painted copy showing through.
Run: python3 art/prep_mystery.py"""
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery", "hidden")
OUT = os.path.join(ROOT, "video", "public", "gg")


def key_black(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    a = np.array(im).astype(int)
    dark = np.ascontiguousarray((a.sum(2) < 40).astype(np.uint8) * 255)
    fill = np.zeros((h + 2, w + 2), np.uint8)
    border = [(x, 0) for x in range(0, w, 4)] + [(x, h - 1) for x in range(0, w, 4)]
    border += [(0, y) for y in range(0, h, 4)] + [(w - 1, y) for y in range(0, h, 4)]
    for x, y in border:  # every dark border pixel seeds the background fill
        if dark[y, x] == 255:
            cv2.floodFill(dark, fill, (x, y), 128)
    bg = dark == 128
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (5, 5), 0)  # soften the cut edge
    rgba = np.dstack([np.array(im), alpha])
    return Image.fromarray(rgba, "RGBA")


def door_layers():
    im = Image.open(os.path.join(SRC, "MYSTERY-VAULT-DOOR.webp")).convert("RGBA")
    arr = np.array(im)
    w, h = im.size
    # measured on the delivered art (1254 px): dial and wheel centres / radii
    dial = (int(0.5168 * w), int(0.2346 * h), int(0.112 * w))
    wheel = (int(0.5104 * w), int(0.5303 * h), int(0.196 * w))
    layers = {}
    for name, (cx, cy, r) in {"DIAL": dial, "WHEEL": wheel}.items():
        m = np.zeros((h, w), np.uint8)
        cv2.circle(m, (cx, cy), r, 255, -1)
        lay = arr.copy()
        lay[:, :, 3] = np.minimum(lay[:, :, 3], m)
        layers[name] = Image.fromarray(lay, "RGBA").crop((cx - r, cy - r, cx + r, cy + r))
    # slab: inpaint both discs from the surrounding brushed steel
    hole = np.zeros((h, w), np.uint8)
    for cx, cy, r in (dial, wheel):
        cv2.circle(hole, (cx, cy), r + 3, 255, -1)
    bgr = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR)
    filled = cv2.inpaint(bgr, hole, 9, cv2.INPAINT_TELEA)
    slab = arr.copy()
    slab[:, :, :3] = cv2.cvtColor(filled, cv2.COLOR_BGR2RGB)
    layers["SLAB"] = Image.fromarray(slab, "RGBA")
    layers["_GEOM"] = (dial, wheel, (w, h))
    return layers


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in ("MYSTERY-REVEAL-ESCAPE", "MYSTERY-REVEAL-EMPTY"):
        key_black(os.path.join(SRC, f + ".webp")).save(os.path.join(OUT, f + ".webp"), "WEBP", quality=90)
    Image.open(os.path.join(SRC, "MYSTERY-REVEAL-HIDDEN.webp")).convert("RGBA").save(os.path.join(OUT, "MYSTERY-REVEAL-HIDDEN.webp"), "WEBP", quality=90)
    L = door_layers()
    geom = L.pop("_GEOM")
    for k, im in L.items():
        im.save(os.path.join(OUT, f"MYSTERY-VAULT-DOOR-{k}.webp"), "WEBP", quality=92)
    Image.open(os.path.join(SRC, "MYSTERY-VAULT-DOOR.webp")).convert("RGBA").save(os.path.join(OUT, "MYSTERY-VAULT-DOOR.webp"), "WEBP", quality=92)
    for f in ("SCR-HIDDEN-INTRO", "SCR-HIDDEN-OUTRO", "BG-HIDDEN"):
        Image.open(os.path.join(SRC, f + ".webp")).convert("RGB").resize((1920, 1080), Image.LANCZOS).save(os.path.join(OUT, f + ".webp"), "WEBP", quality=90)
    Image.open(os.path.join(SRC, "UI-VAULT-GUARANTEE.webp")).convert("RGBA").save(os.path.join(OUT, "UI-VAULT-GUARANTEE.webp"), "WEBP", quality=92)
    print("dial, wheel, size:", geom)
