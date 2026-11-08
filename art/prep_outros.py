"""Clean the delivered SCR-HEIST-OUTRO / SCR-ESCAPE-OUTRO screens of baked-in example values so the game can draw
the real ones: the total-win amounts, the Heist "Loot Meter summary" contents and the Escape crew levels/stars.
Writes SCR-*-OUTRO-CLEAN (1920x1080) to art/delivery/generated (picked up by process_assets) and video/public/gg.
All boxes are in 1920x1080 coordinates, measured on the delivered art. Run: python3 art/prep_outros.py"""
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery", "screens")
GEN = os.path.join(ROOT, "art", "delivery", "generated")
VID = os.path.join(ROOT, "video", "public", "gg")


def load(name):
    return cv2.cvtColor(np.array(Image.open(os.path.join(SRC, name + ".webp")).convert("RGB").resize((1920, 1080), Image.LANCZOS)), cv2.COLOR_RGB2BGR)


def inpaint_where(img, box, select, grow=4, radius=7):
    """Inpaint the pixels inside box (x0, y0, x1, y1) chosen by select(bgr_region) -> bool mask."""
    x0, y0, x1, y1 = box
    mask = np.zeros(img.shape[:2], np.uint8)
    region = img[y0:y1, x0:x1]
    m = select(region).astype(np.uint8) * 255
    if grow:
        m = cv2.dilate(m, np.ones((grow * 2 + 1, grow * 2 + 1), np.uint8))
    mask[y0:y1, x0:x1] = m
    return cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)


def bright_gold(r):  # gold / white lettering and stars on a darker plate
    b, g, rr = r[:, :, 0].astype(int), r[:, :, 1].astype(int), r[:, :, 2].astype(int)
    return (rr > 170) & (g > 120)


def dark_text(r):  # dark-brown lettering on a gold plate
    return r.astype(int).sum(2) < 260


def smooth_fill(img, box, radius=15):
    """Replace a whole panel interior with a smooth fill grown from its border."""
    x0, y0, x1, y1 = box
    mask = np.zeros(img.shape[:2], np.uint8)
    mask[y0:y1, x0:x1] = 255
    small = cv2.resize(img, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    sm = cv2.resize(mask, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_NEAREST)
    filled = cv2.inpaint(small, sm, radius, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(cv2.resize(filled, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC), (0, 0), 6)
    out = img.copy()
    feather = cv2.GaussianBlur(mask, (0, 0), 3).astype(float)[:, :, None] / 255
    return (out * (1 - feather) + filled * feather).astype(np.uint8)


def save(img, name):
    rgb = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    os.makedirs(GEN, exist_ok=True)
    rgb.save(os.path.join(GEN, name + ".webp"), "WEBP", quality=92)
    rgb.save(os.path.join(VID, name + ".webp"), "WEBP", quality=92)


heist = load("SCR-HEIST-OUTRO")
heist = smooth_fill(heist, (572, 370, 1352, 553))  # "2,346.00": whole plaque interior (digits have dark outlines)
heist = smooth_fill(heist, (585, 700, 1352, 898))  # Loot Meter summary contents (chests, ticks, rewards)
save(heist, "SCR-HEIST-OUTRO-CLEAN")

esc = load("SCR-ESCAPE-OUTRO")
esc = smooth_fill(esc, (1116, 497, 1834, 663))  # "3,840.00": whole plaque interior
for hexbox, stars in [
    ((112, 112, 200, 192), (212, 140, 392, 186)),  # TANK
    ((48, 402, 128, 478), (143, 428, 322, 470)),  # BYTE
    ((866, 362, 946, 438), (958, 388, 1142, 430)),  # FUSE
    ((266, 694, 346, 772), (362, 718, 552, 762)),  # ROXY
]:
    esc = inpaint_where(esc, hexbox, dark_text, grow=3, radius=5)  # "LV.n"
    esc = inpaint_where(esc, stars, bright_gold, grow=3, radius=5)  # baked stars
save(esc, "SCR-ESCAPE-OUTRO-CLEAN")
print("ok")
