"""Turn delivered art (art/delivery) into game-ready files (frontend/getaway_gang/static/assets/gg).

Resizes to in-game sizes (2x the on-screen size for sharp high-DPI rendering), keeps alpha, writes
WebP, and writes layout.json with measurements the frontend needs (e.g. the reel frame's window).
Run: python3 art/process_assets.py
"""

import json
import os

from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery")
OUT = os.path.join(ROOT, "frontend", "getaway_gang", "static", "assets", "gg")

# asset id -> (target width, target height or None to keep aspect)
PLAN = {
    **{s: (256, 256) for s in ["SYM-H1", "SYM-H2", "SYM-H3", "SYM-H4", "SYM-L1", "SYM-L2", "SYM-L3", "SYM-L4",
                               "SYM-WILD", "SYM-SCATTER", "SYM-ROXY", "SYM-BYTE", "SYM-TANK", "SYM-FUSE"]},
    **{b: (2560, 1440) for b in ["BG-MAIN", "BG-HEIST", "BG-ESCAPE", "BG-LOADING"]},
    **{s: (1920, 1080) for s in ["SCR-LOADING", "SCR-HEIST-INTRO", "SCR-ESCAPE-INTRO"]},
    "UI-LOGO": (1100, None),
    "UI-REEL-FRAME": (1536, None),
    "UI-REEL-BG": (1200, 800),
    "UI-METER-GETAWAY": (1000, None),
    "UI-METER-LOOT": (1000, None),
    "UI-CREW-LEVELS": (1000, None),
    "UI-FS-COUNTER": (640, None),
    "UI-MULT": (520, None),
    "UI-RESPIN": (800, None),
    **{c: (None, 900) for c in ["CHR-ROXY-POSE", "CHR-BYTE-POSE", "CHR-TANK-POSE", "CHR-FUSE-POSE"]},
    # round 2: HTML-only art (Buy Bonus, Paytable, How to Play) -- not loaded as Pixi textures
    "BUY-HEIST-CARD": (1280, 720),
    "BUY-ESCAPE-CARD": (1280, 720),
    "UI-INFO-HEADER": (1400, None),
    "UI-BUY-PANEL": (1200, None),
    **{r: (1100, None) for r in ["RULE-CREW-CHAOS", "RULE-RESPIN", "RULE-PBP", "RULE-FINAL-ESCAPE"]},
    "RULE-METER": (1100, None),
    "RULE-LOOT-METER": (None, 900),
    # Mystery Vault / Hidden Bonus (docs/ASSET_PROMPTS_HIDDEN_BONUS.txt); picked up automatically when delivered
    "BUY-MYSTERY-CARD": (1280, 720),
    "BG-HIDDEN": (2560, 1440),
    "SCR-HIDDEN-INTRO": (1920, 1080),
    "UI-MYSTERY-BADGE": (900, None),
    "SCR-HIDDEN-OUTRO": (1920, 1080),
    # cleaned outro stills (art/prep_outros.py): fallback when transparent WebM is unsupported
    "SCR-HEIST-OUTRO-CLEAN": (1920, 1080),
    "SCR-ESCAPE-OUTRO-CLEAN": (1920, 1080),
    "UI-VAULT-GUARANTEE": (1000, None),
}
# assets only used by the HTML modals: written to GG_HTML (URLs) instead of the Pixi asset loader
HTML_ONLY = {"BUY-HEIST-CARD", "BUY-ESCAPE-CARD", "UI-INFO-HEADER", "UI-BUY-PANEL", "RULE-CREW-CHAOS", "RULE-RESPIN",
             "RULE-PBP", "RULE-FINAL-ESCAPE", "RULE-METER", "RULE-LOOT-METER", "UI-VOL-ON", "UI-VOL-OFF",
             "BUY-MYSTERY-CARD", "UI-MYSTERY-BADGE"}


def find(aid):
    for dirpath, _, files in os.walk(SRC):
        for f in files:
            if os.path.splitext(f)[0].upper() == aid:
                return os.path.join(dirpath, f)
    return None


def fit(im, w, h):
    if w and h:
        size = (w, h)
    elif w:
        size = (w, round(im.height * w / im.width))
    else:
        size = (round(im.width * h / im.height), h)
    up = size[0] > im.width
    im = im.resize(size, Image.LANCZOS)
    if up:  # Lanczos upscale + light unsharp mask (stand-in until an AI upscaler pass)
        im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return im


def wild_reel(im):
    """1:3 delivery -> exact 1:4 (256x1024) without distorting the van: scale to 256 wide, then
    stretch two plain bands (sky near the top, road near the bottom) so corners and van stay intact."""
    im = im.resize((256, round(im.height * 256 / im.width)), Image.LANCZOS)  # 256 x 768
    extra = 1024 - im.height
    h = im.height
    sky = (int(h * 0.10), int(h * 0.20))
    road = (int(h * 0.82), int(h * 0.92))
    add_top, add_bot = extra // 2, extra - extra // 2
    parts = [
        im.crop((0, 0, 256, sky[0])),
        im.crop((0, sky[0], 256, sky[1])).resize((256, sky[1] - sky[0] + add_top), Image.LANCZOS),
        im.crop((0, sky[1], 256, road[0])),
        im.crop((0, road[0], 256, road[1])).resize((256, road[1] - road[0] + add_bot), Image.LANCZOS),
        im.crop((0, road[1], 256, h)),
    ]
    out = Image.new("RGBA", (256, 1024))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height
    assert y == 1024
    return out


def window_of(im):
    """Bounding box of the transparent window in the middle of a frame image (fractions of size)."""
    a = im.getchannel("A")
    w, h = im.size
    cx, cy = w // 2, h // 2
    x0 = cx
    while x0 > 0 and a.getpixel((x0 - 1, cy)) < 32:
        x0 -= 1
    x1 = cx
    while x1 < w - 1 and a.getpixel((x1 + 1, cy)) < 32:
        x1 += 1
    y0 = cy
    while y0 > 0 and a.getpixel((cx, y0 - 1)) < 32:
        y0 -= 1
    y1 = cy
    while y1 < h - 1 and a.getpixel((cx, y1 + 1)) < 32:
        y1 += 1
    return {"x": x0 / w, "y": y0 / h, "w": (x1 - x0 + 1) / w, "h": (y1 - y0 + 1) / h}


def strip_reel_lines(im):
    """UI-REEL-BG has its gold column dividers painted at uneven spacing (outer columns ~30% wider), so they
    can never match six equal symbol columns. Erase them (and their glow) by interpolating across each line;
    the game draws dividers exactly on the column boundaries instead (BoardFrame.svelte)."""
    import numpy as np

    a = np.array(im).astype(float)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    gold = (r > 120) & (g > 80) & (r > b + 40)
    cols = np.where(gold.mean(0) > 0.3)[0]
    groups = []
    for x in cols:
        if groups and x - groups[-1][-1] <= 2:
            groups[-1].append(int(x))
        else:
            groups.append([int(x)])
    w = a.shape[1]
    for grp in groups:
        x0, x1 = max(0, grp[0] - 9), min(w - 1, grp[-1] + 9)
        left, right = a[:, x0 - 1 if x0 > 0 else x0], a[:, x1 + 1 if x1 < w - 1 else x1]
        for x in range(x0, x1 + 1):
            t = (x - x0 + 1) / (x1 - x0 + 2)
            a[:, x] = left * (1 - t) + right * t
    return Image.fromarray(a.clip(0, 255).astype("uint8"), "RGBA"), len(groups)


def write_ts(layout):
    """frontend registry: one 'sprite' asset per processed file, keyed by asset ID."""
    ts = os.path.join(ROOT, "frontend", "getaway_gang", "src", "game", "ggAssets.ts")
    lines = ["// GENERATED by art/process_assets.py -- production art (art/delivery) for the asset loader.",
             "export const GG_LAYOUT = " + json.dumps(layout, indent="\t") + " as const;", "",
             "export const GG_ASSETS = {"]
    for aid in sorted(a for a in layout if a not in HTML_ONLY):
        pre = ", preload: true" if aid in ("SCR-LOADING", "UI-LOADING-BAR-FRAME", "UI-LOADING-BAR-FILL", "UI-PRESS-CONTINUE-TAP", "UI-PRESS-CONTINUE-PRESS") else ""
        lines.append(f"\t'{aid}': {{ type: 'sprite', src: new URL('../../assets/gg/{aid}.webp', import.meta.url).href{pre} }},")
    lines += ["} as const;", "", "/** HTML-only images (modals): plain URLs, never uploaded as GPU textures. */", "export const GG_HTML: Record<string, string> = {"]
    for aid in sorted(a for a in layout if a in HTML_ONLY):
        lines.append(f"\t'{aid}': new URL('../../assets/gg/{aid}.webp', import.meta.url).href,")
    lines += ["};", "", "export const hasArt = (id: string) => id in GG_ASSETS;",
              "/** URL of any processed image (Pixi or HTML-only). */",
              "export const ggUrl = (id: string): string => GG_HTML[id] ?? (GG_ASSETS as Record<string, { src: string }>)[id]?.src ?? '';", ""]
    open(ts, "w", encoding="UTF-8").write("\n".join(lines))


def main():
    os.makedirs(OUT, exist_ok=True)
    layout, done, missing = {}, [], []
    OPTIONAL = {"BUY-MYSTERY-CARD", "BG-HIDDEN", "SCR-HIDDEN-INTRO", "UI-MYSTERY-BADGE"}  # not delivered yet
    for aid, (w, h) in PLAN.items():
        path = find(aid)
        if not path:
            if aid not in OPTIONAL:
                missing.append(aid)
            continue
        im = Image.open(path).convert("RGBA")
        out = fit(im, w, h)
        if aid == "UI-REEL-BG":
            out, n = strip_reel_lines(out)
            print(f"UI-REEL-BG: removed {n} painted column lines")
        out.save(os.path.join(OUT, aid + ".webp"), "WEBP", quality=88, method=4)
        layout[aid] = {"width": out.width, "height": out.height}
        if aid == "UI-REEL-FRAME":
            layout[aid]["window"] = window_of(out)
        done.append(aid)
    # UI controls: split multi-state sheets and crop parts (fractions of the delivered image)
    CROPS = {
        "UI-SPIN": [("UI-SPIN-0", (0, 0, 0.5, 1)), ("UI-SPIN-1", (0.5, 0, 1, 1))],
        "UI-TURBO": [("UI-TURBO-0", (0, 0, 0.5, 1)), ("UI-TURBO-1", (0.5, 0, 1, 1))],
        "UI-SOUND": [("UI-SOUND-0", (0, 0, 0.5, 1)), ("UI-SOUND-1", (0.5, 0, 1, 1))],
        "UI-AUTOPLAY": [("UI-AUTOPLAY-0", (0, 0, 1, 1))],
        "UI-SETTINGS": [("UI-SETTINGS-0", (0, 0, 1, 1))],
        "UI-INFO": [("UI-INFO-0", (0, 0, 1, 1))],
        "UI-BET": [("UI-BET-MINUS", (0.06, 0.33, 0.24, 0.87)), ("UI-BET-PLUS", (0.76, 0.33, 0.94, 0.87)),
                   ("UI-BET-PANEL", (0.235, 0, 0.765, 1))],
        "UI-BALANCE": [("UI-BALANCE-PANEL", (0, 0, 1, 1))],
        "UI-WIN": [("UI-WIN-PANEL", (0, 0, 1, 1))],
    }
    # round-2 multi-state sheets: (out id, crop fractions, target long side)
    CROPS2 = {
        "UI-BUY-BONUS": [("UI-BUY-BONUS-0", (0, 0, 0.5, 0.5), 520), ("UI-BUY-BONUS-1", (0.5, 0, 1, 0.5), 520),
                         ("UI-BUY-BONUS-2", (0, 0.5, 0.5, 1), 520), ("UI-BUY-BONUS-3", (0.5, 0.5, 1, 1), 520)],
        "UI-PAYTABLE-BTN": [("UI-PAYTABLE-0", (0, 0, 0.5, 0.5), 256), ("UI-PAYTABLE-1", (0.5, 0, 1, 0.5), 256)],
        "UI-VOLATILITY": [("UI-VOL-ON", (0, 0, 0.5, 1), 96), ("UI-VOL-OFF", (0.5, 0, 1, 1), 96)],
        "UI-LOADING-BAR": [("UI-LOADING-BAR-FRAME", (0, 0, 1, 0.62), 1400), ("UI-LOADING-BAR-FILL", (0, 0.62, 1, 1), 1300)],
        "UI-PRESS-CONTINUE": [("UI-PRESS-CONTINUE-TAP", (0, 0, 1, 0.5), 1400), ("UI-PRESS-CONTINUE-PRESS", (0, 0.5, 1, 1), 1400)],
    }
    for aid, parts in CROPS2.items():
        path = find(aid)
        if not path:
            missing.append(aid)
            continue
        im = Image.open(path).convert("RGBA")
        for out_id, (a, b, c, d), target in parts:
            part = im.crop((round(a * im.width), round(b * im.height), round(c * im.width), round(d * im.height)))
            bbox = part.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
            if bbox:
                part = part.crop(bbox)
            part = fit(part, target, None) if part.width >= part.height else fit(part, None, target)
            part.save(os.path.join(OUT, out_id + ".webp"), "WEBP", quality=90, method=4)
            layout[out_id] = {"width": part.width, "height": part.height}
            done.append(out_id)
    for aid, parts in CROPS.items():
        path = find(aid)
        if not path:
            missing.append(aid)
            continue
        im = Image.open(path).convert("RGBA")
        for out_id, (a, b, c, d) in parts:
            part = im.crop((round(a * im.width), round(b * im.height), round(c * im.width), round(d * im.height)))
            bbox = part.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
            if bbox and "PANEL" not in out_id:
                part = part.crop(bbox)
            target = 512 if "PANEL" in out_id else 256
            part = fit(part, target, None) if part.width >= part.height else fit(part, None, target)
            part.save(os.path.join(OUT, out_id + ".webp"), "WEBP", quality=88, method=4)
            layout[out_id] = {"width": part.width, "height": part.height}
            done.append(out_id)
    p = find("SYM-WILD-REEL")
    if p:
        wild_reel(Image.open(p).convert("RGBA")).save(os.path.join(OUT, "SYM-WILD-REEL.webp"), "WEBP", quality=88, method=6)
        layout["SYM-WILD-REEL"] = {"width": 256, "height": 1024}
        done.append("SYM-WILD-REEL")
    with open(os.path.join(OUT, "layout.json"), "w", encoding="UTF-8") as f:
        json.dump(layout, f, indent=1)
    write_ts(layout)
    total = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
    print(f"processed {len(done)} assets, {total / 1e6:.1f} MB; missing: {missing or 'none'}")
    print("reel frame window:", layout.get("UI-REEL-FRAME", {}).get("window"))


if __name__ == "__main__":
    main()
