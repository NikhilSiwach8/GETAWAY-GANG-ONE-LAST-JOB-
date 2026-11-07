"""Pack the FX-COINS sprite frames (video/out/sprites/FX-COINS-*/) into one transparent atlas with a
Pixi/TexturePacker JSON (frames + animations). Output: art/animations/FX-COINS.png + FX-COINS.json.
Run: python3 art/pack_sprites.py"""
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "video", "out", "sprites")
OUT = os.path.join(ROOT, "art", "animations")
CELL = 128

groups = {}
for d in sorted(os.listdir(SRC)):
    if d.startswith("FX-COINS-"):
        files = sorted(f for f in os.listdir(os.path.join(SRC, d)) if f.endswith(".png"))
        groups[d.replace("FX-COINS-", "").lower()] = [os.path.join(SRC, d, f) for f in files]

cols = max(len(v) for v in groups.values())
atlas = Image.new("RGBA", (cols * CELL, len(groups) * CELL), (0, 0, 0, 0))
frames, animations = {}, {}
for row, (name, files) in enumerate(groups.items()):
    animations[name] = []
    for col, f in enumerate(files):
        im = Image.open(f).convert("RGBA").resize((CELL, CELL), Image.LANCZOS)
        atlas.paste(im, (col * CELL, row * CELL))
        key = f"{name}_{col}"
        frames[key] = {
            "frame": {"x": col * CELL, "y": row * CELL, "w": CELL, "h": CELL},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
            "sourceSize": {"w": CELL, "h": CELL},
        }
        animations[name].append(key)

os.makedirs(OUT, exist_ok=True)
atlas.save(os.path.join(OUT, "FX-COINS.png"))
with open(os.path.join(OUT, "FX-COINS.json"), "w", encoding="UTF-8") as fh:
    json.dump(
        {
            "frames": frames,
            "animations": animations,
            "meta": {"image": "FX-COINS.png", "format": "RGBA8888", "size": {"w": atlas.width, "h": atlas.height}, "scale": "1"},
        },
        fh,
        indent=1,
    )
print("atlas", atlas.size, {k: len(v) for k, v in animations.items()})
