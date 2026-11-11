"""Turn delivered art (art/delivery) into game-ready files (frontend/getaway_gang/static/assets/gg).

Resizes to in-game sizes (at least 2x the largest on-screen size, for sharp high-DPI rendering), keeps
alpha, writes LOSSLESS WebP (no compression artefacts), and writes layout.json with measurements the
frontend needs (e.g. the reel frame's window).
Run: python3 art/process_assets.py
     GG_MASTER=1 python3 art/process_assets.py   -> 2x masters for the Remotion clips (video/public/gg)
"""

import json
import numpy as np
import os

from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "delivery")
MASTER = os.environ.get("GG_MASTER") == "1"
# the Remotion clips zoom and crop the art: they get masters at twice the game size (never above the delivery)
OUT = os.path.join(ROOT, "video", "public", "gg") if MASTER else os.path.join(ROOT, "frontend", "getaway_gang", "static", "assets", "gg")
K = 2 if MASTER else 1


def save(img, path):
    """Lossless WebP: pixel-exact, keeps alpha; method 6 = smallest lossless file."""
    img.save(path, "WEBP", lossless=True, quality=100, method=6, exact=True)

# asset id -> (target width, target height or None to keep aspect)
PLAN = {
    **{s: (512, 512) for s in ["SYM-H1", "SYM-H2", "SYM-H3", "SYM-H4", "SYM-L1", "SYM-L2", "SYM-L3", "SYM-L4",
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
    **{c: (None, 1254) for c in ["CHR-ROXY-POSE", "CHR-BYTE-POSE", "CHR-TANK-POSE", "CHR-FUSE-POSE"]},
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


def respin_states(im):
    """UI-RESPIN (800 wide) paints two gold and two grey padlocks. Split it into UI-RESPIN-BASE (all four
    padlocks grey, gold glow and chain removed) and UI-RESPIN-LOCK-ON (the gold padlock with its glow,
    navy plate keyed out) so the game shows each lock's real state instead of dimming boxes over the art."""
    W = im.width
    k = W / 800
    box = lambda cx, hw, y0, y1: tuple(round(v * k) for v in (cx - hw, y0, cx + hw, y1))
    base = im.copy()
    # grey padlock (4th slot, with its plate and grey chain) blended over slots 1-3 through a feathered mask
    hw, y0, y1 = 66, 80, 228
    grey = im.crop(box(666, hw, y0, y1))
    gw, gh = grey.size
    yy, xx = np.mgrid[0:gh, 0:gw]
    feather = 16 * k
    edge = np.minimum.reduce([xx, gw - 1 - xx, yy, gh - 1 - yy]).astype(np.float32)
    mask = Image.fromarray((np.clip(edge / feather, 0, 1) * 255).astype(np.uint8), "L")
    for cx in (262, 398, 531):
        base.paste(grey, box(cx, hw, y0, y1)[:2], mask)
    # the chain between slots 1-2 and 2-3 is gold: grey it like the 3-4 link
    arr = np.asarray(base).astype(np.float32)
    for x0, x1 in ((300, 360), (436, 494)):
        sl = arr[round(140 * k):round(186 * k), round(x0 * k):round(x1 * k)]
        warm = np.clip((sl[..., 0] - sl[..., 2] - 10) / 70, 0, 1)[..., None]
        lum = (sl[..., :3] @ np.array([0.3, 0.55, 0.15]))[..., None] * np.array([0.92, 0.97, 1.08])
        sl[..., :3] = sl[..., :3] * (1 - warm) + lum * warm
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    # gold padlock + glow: alpha from "warmth" (gold/orange pixels are red-heavy, the navy plate is blue)
    lock = im.crop(box(262, 66, 80, 228)).convert("RGBA")
    a = np.asarray(lock).astype(np.float32)
    warm = np.clip((a[..., 0] - a[..., 2] - 10) / 70, 0, 1)
    dark = (a[..., :3].max(-1) < 70) & (warm == 0)  # keyhole / outlines inside the lock body
    h, w = warm.shape
    yy, xx = np.mgrid[0:h, 0:w]
    inside = (abs(xx - w / 2) < w * 0.40) & (yy > h * 0.42) & (yy < h * 0.86)
    alpha = np.where(dark & inside, 1.0, warm)
    # drop the chain stubs and the frame bits at the crop edges: fade out beyond the lock body
    dx = np.abs(xx - w / 2) / (w / 2)
    alpha *= np.clip((1.0 - dx) / 0.22, 0, 1)
    alpha *= np.clip(yy / (8 * k), 0, 1)
    a[..., 3] = alpha * 255
    return base, Image.fromarray(a.astype(np.uint8), "RGBA")


def console_parts(frame, scale=2.0):
    """The bet console rail, cut from the reel frame's own bottom edge (UI-REEL-FRAME, 1536 wide): octagonal
    end caps, a clean stretchable stretch of brushed-steel rail with its gold trim, the centre plate and a
    round rivet. The game assembles them to the screen's full width (GGConsole.svelte). Stored at 2x."""
    y0, y1 = 872, 1006
    strip = frame.crop((0, y0, 1536, y1))
    h = y1 - y0
    up = lambda im: im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    riv = frame.crop((265, 923, 309, 967)).convert("RGBA")
    yy, xx = np.mgrid[0:44, 0:44]
    d = np.hypot(xx - 21.5, yy - 21.5)
    a = np.asarray(riv).copy()
    a[..., 3] = (np.clip((19.5 - d) / 2.0, 0, 1) * a[..., 3]).astype(np.uint8)
    return {
        "UI-CONSOLE-CAP-L": up(strip.crop((0, 0, 215, h))),
        "UI-CONSOLE-CAP-R": up(strip.crop((1321, 0, 1536, h))),
        "UI-CONSOLE-RAIL": up(strip.crop((330, 0, 560, h))),
        "UI-CONSOLE-PLATE": up(strip.crop((632, 0, 904, h))),
        "UI-CONSOLE-RIVET": up(Image.fromarray(a, "RGBA")),
    }


def write_console(layout, done):
    frame_src = find("UI-REEL-FRAME")
    if not frame_src:
        return
    for out_id, img in console_parts(Image.open(frame_src).convert("RGBA")).items():
        save(img, os.path.join(OUT, out_id + ".webp"))
        layout[out_id] = {"width": img.width, "height": img.height}
        done.append(out_id)


def blob_bbox(mask):
    ys, xs = np.where(mask)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else None


def trimmed(im, thr=16):
    bbox = im.getchannel("A").point(lambda v: 255 if v > thr else 0).getbbox()
    return im.crop(bbox) if bbox else im


def gold_star(n):
    from PIL import ImageDraw
    ss = 4
    N = n * ss
    c = N / 2
    R, r = N * 0.47, N * 0.47 * 0.48
    ang = [(-90 + 36 * i) * np.pi / 180 for i in range(10)]
    pts = [(c + (R if i % 2 == 0 else r) * np.cos(a), c + 4 * ss + (R if i % 2 == 0 else r) * np.sin(a)) for i, a in enumerate(ang)]
    img = Image.new("RGBA", (N, N))
    d = ImageDraw.Draw(img)
    # outline + drop shadow
    d.polygon([(x + 3 * ss, y + 5 * ss) for x, y in pts], fill=(40, 18, 0, 150))
    d.polygon(pts, fill=(74, 36, 0, 255))
    inset = [(c + (x - c) * 0.9, c + 4 * ss + (y - c - 4 * ss) * 0.9) for x, y in pts]
    cen = (c, c + 4 * ss)
    light = np.array([-0.6, -0.8])  # upper-left key light
    for i in range(10):
        p0, p1 = inset[i], inset[(i + 1) % 10]
        # each facet: centre -> edge; brightness from its outward normal vs the light
        mx, my = (p0[0] + p1[0]) / 2 - cen[0], (p0[1] + p1[1]) / 2 - cen[1]
        nrm = np.array([mx, my]) / (np.hypot(mx, my) + 1e-6)
        k = 0.55 + 0.45 * float(np.dot(nrm, light))
        col = tuple(int(v) for v in np.array([255, 205, 60]) * (0.62 + 0.62 * k))
        col = tuple(min(255, v) for v in col)
        d.polygon([cen, p0, p1], fill=col + (255,))
    return img.resize((n, n), Image.LANCZOS)


def style_parts():
    """Pieces cut from the delivered art so in-game overlays match it instead of being drawn in code
    (point 4 of the review): star, close button, banner scroll, milestone plate, cell glow."""
    out = {}
    # lit gold star (the stars in the delivered art are ~26 px, too small to cut): a faceted, bevelled gold
    # star in the art's gold palette, lit from the upper left like every asset, with a dark outline
    out["UI-STAR-ON"] = gold_star(256)
    # red close button from the settings panel's top-right corner
    p = find("UI-SETTINGS-PANEL")
    if p:
        im = Image.open(p).convert("RGBA")
        W, H = im.size
        x_from = int(W * 0.865)  # right of the SETTINGS title plate
        corner = np.asarray(im.crop((x_from, 0, W, int(H * 0.25)))).astype(int)
        red = (corner[..., 0] > 140) & (corner[..., 0] - corner[..., 1] > 90) & (corner[..., 0] - corner[..., 2] > 90)
        bb = blob_bbox(red)
        if bb:
            rr = (bb[2] - bb[0]) / 2          # the button is round: its width gives the radius
            cx = x_from + (bb[0] + bb[2]) / 2
            cy = bb[1] + rr
            r = rr + 6
            r = int(r)
            padded = Image.new("RGBA", (W + 2 * r, H + 2 * r))  # the button touches the panel's top edge
            padded.alpha_composite(im, (r, r))
            btn = padded.crop((int(cx), int(cy), int(cx) + 2 * r, int(cy) + 2 * r))
            n = btn.width
            yy, xx = np.mgrid[0:n, 0:n]
            d = np.hypot(xx - (n - 1) / 2, yy - (n - 1) / 2)
            ba = np.asarray(btn).copy()
            ba[..., 3] = (np.clip((n / 2 - 1 - d) / 2.5, 0, 1) * ba[..., 3]).astype(np.uint8)
            out["UI-CLOSE"] = Image.fromarray(ba, "RGBA").resize((256, 256), Image.LANCZOS)
    p = find("UI-INFO-HEADER")
    if p:
        out["UI-BANNER"] = fit(trimmed(Image.open(p).convert("RGBA")), 1600, None)
    p = find("UI-MULT")
    if p:
        out["UI-MILESTONE"] = fit(trimmed(Image.open(p).convert("RGBA")), 600, None)
    # cell glow: a bevelled rounded frame with a soft outer glow, near-white so the game tints it per crew
    n, pad, rad = 512, 40, 70
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    def sdf(x, y, half, r):
        qx = np.abs(x - n / 2) - (half - r)
        qy = np.abs(y - n / 2) - (half - r)
        return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    dd = sdf(xx, yy, n / 2 - pad, rad)
    ring = np.clip(1 - np.abs(dd + 9) / 10, 0, 1)            # 20 px frame
    glow = np.exp(-np.maximum(dd, 0) / 14) * (dd > -2) * 0.75  # outside glow
    inner = np.exp(-np.maximum(-dd, 0) / 26) * (dd < 0) * 0.35  # inner light
    shade = 0.78 + 0.22 * np.clip((n / 2 - yy) / (n / 2), -1, 1)  # lit from the top
    lum = np.clip(ring * shade + 0.0, 0, 1)
    alpha = np.clip(np.maximum.reduce([ring, glow, inner]), 0, 1)
    rgb = np.stack([np.clip(200 + 55 * lum, 0, 255)] * 3, -1)
    out["UI-CELL-GLOW"] = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA")
    # shine band for the symbol win sweep: soft white vertical stripe with a bright core
    w, h = 160, 512
    xx = np.linspace(-1, 1, w)[None, :].repeat(h, 0)
    band = np.exp(-(xx / 0.42) ** 2) * 0.75 + np.exp(-(xx / 0.1) ** 2) * 0.25
    yy = np.linspace(-1, 1, h)[:, None].repeat(w, 1)
    band *= np.clip((1 - np.abs(yy)) * 6, 0, 1)
    out["UI-SHINE"] = Image.fromarray(np.dstack([np.full((h, w, 3), 255), band * 255]).astype(np.uint8), "RGBA")
    # soft radial glow (halo behind winning symbols, flashes)
    n = 256
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5) / (n / 2)
    g = np.clip(1 - d, 0, 1) ** 2.2
    out["UI-SOFT-GLOW"] = Image.fromarray(np.dstack([np.full((n, n, 3), 255), g * 255]).astype(np.uint8), "RGBA")
    # light rays for the big-win backdrop: 18 soft tapered beams fading out from the centre
    n = 1024
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    ang = np.arctan2(yy - n / 2, xx - n / 2)
    rad = np.hypot(xx - n / 2, yy - n / 2) / (n / 2)
    beams = np.clip(np.cos(ang * 18) * 1.6 - 0.6, 0, 1) ** 1.5
    fall = np.clip(1 - rad, 0, 1) ** 1.4 * np.clip(rad * 6, 0, 1)
    out["UI-RAYS"] = Image.fromarray(np.dstack([np.full((n, n, 3), 255), beams * fall * 255]).astype(np.uint8), "RGBA")
    # gold coin cut from BG-HIDDEN (art/prep_fx.py) for the live coin showers
    coin = os.path.join(ROOT, "video", "public", "gg", "FX-COIN.webp")
    if os.path.exists(coin):
        out["FX-COIN"] = Image.open(coin).convert("RGBA")
    return out


def write_style_parts(layout, done):
    for out_id, img in style_parts().items():
        save(img, os.path.join(OUT, out_id + ".webp"))
        layout[out_id] = {"width": img.width, "height": img.height}
        done.append(out_id)


def find(aid):
    for dirpath, _, files in os.walk(SRC):
        for f in files:
            if os.path.splitext(f)[0].upper() == aid:
                return os.path.join(dirpath, f)
    return None


def fit(im, w, h, allow_up=False):
    w, h = (w and w * K), (h and h * K)
    if not allow_up:
        # never upscale delivered art: extra pixels add no detail, only blur and file size
        r = min((w or 10**9) / im.width, (h or 10**9) / im.height)
        if r > 1:
            w, h = (w and round(w / r)), (h and round(h / r))
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
    W = 512 * K
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)  # W x 3W
    extra = 4 * W - im.height
    h = im.height
    sky = (int(h * 0.10), int(h * 0.20))
    road = (int(h * 0.82), int(h * 0.92))
    add_top, add_bot = extra // 2, extra - extra // 2
    parts = [
        im.crop((0, 0, W, sky[0])),
        im.crop((0, sky[0], W, sky[1])).resize((W, sky[1] - sky[0] + add_top), Image.LANCZOS),
        im.crop((0, sky[1], W, road[0])),
        im.crop((0, road[0], W, road[1])).resize((W, road[1] - road[0] + add_bot), Image.LANCZOS),
        im.crop((0, road[1], W, h)),
    ]
    out = Image.new("RGBA", (W, 4 * W))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height
    assert y == 4 * W
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
        out = fit(im, w, h, allow_up=aid.startswith("BG-"))
        if aid == "UI-REEL-BG":
            out, n = strip_reel_lines(out)
            print(f"UI-REEL-BG: removed {n} painted column lines")
        save(out, os.path.join(OUT, aid + ".webp"))
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
        "UI-BUY-BONUS": [("UI-BUY-BONUS-0", (0, 0, 0.5, 0.5), 1040), ("UI-BUY-BONUS-1", (0.5, 0, 1, 0.5), 1040),
                         ("UI-BUY-BONUS-2", (0, 0.5, 0.5, 1), 1040), ("UI-BUY-BONUS-3", (0.5, 0.5, 1, 1), 1040)],
        "UI-PAYTABLE-BTN": [("UI-PAYTABLE-0", (0, 0, 0.5, 0.5), 512), ("UI-PAYTABLE-1", (0.5, 0, 1, 0.5), 512)],
        "UI-VOLATILITY": [("UI-VOL-ON", (0, 0, 0.5, 1), 192), ("UI-VOL-OFF", (0.5, 0, 1, 1), 192)],
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
            save(part, os.path.join(OUT, out_id + ".webp"))
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
            target = 1024 if "PANEL" in out_id else 512
            part = fit(part, target, None) if part.width >= part.height else fit(part, None, target)
            save(part, os.path.join(OUT, out_id + ".webp"))
            layout[out_id] = {"width": part.width, "height": part.height}
            done.append(out_id)
    if "UI-RESPIN" in layout:
        base, lock = respin_states(Image.open(os.path.join(OUT, "UI-RESPIN.webp")).convert("RGBA"))
        for out_id, img in (("UI-RESPIN-BASE", base), ("UI-RESPIN-LOCK-ON", lock)):
            save(img, os.path.join(OUT, out_id + ".webp"))
            layout[out_id] = {"width": img.width, "height": img.height}
            done.append(out_id)
    # bet console rail pieces, art-matched overlay pieces and the whole UI-BET unit
    write_console(layout, done)
    write_style_parts(layout, done)
    bet_src = find("UI-BET")
    if bet_src:
        # whole plate (minus + value window + plus): the layout puts the -/+ touch zones on it; no trimming,
        # so the -/+ crops (fractions of this image) line up exactly
        unit = fit(Image.open(bet_src).convert("RGBA"), 1400, None)
        save(unit, os.path.join(OUT, "UI-BET-UNIT.webp"))
        layout["UI-BET-UNIT"] = {"width": unit.width, "height": unit.height}
        done.append("UI-BET-UNIT")
    p = find("SYM-WILD-REEL")
    if p:
        wr = wild_reel(Image.open(p).convert("RGBA"))
        save(wr, os.path.join(OUT, "SYM-WILD-REEL.webp"))
        layout["SYM-WILD-REEL"] = {"width": wr.width, "height": wr.height}
        done.append("SYM-WILD-REEL")
    if MASTER:
        print(f"masters: {len(done)} assets -> {OUT}")
        return
    with open(os.path.join(OUT, "layout.json"), "w", encoding="UTF-8") as f:
        json.dump(layout, f, indent=1)
    write_ts(layout)
    total = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
    print(f"processed {len(done)} assets, {total / 1e6:.1f} MB; missing: {missing or 'none'}")
    print("reel frame window:", layout.get("UI-REEL-FRAME", {}).get("window"))


if __name__ == "__main__":
    if os.environ.get("GG_ONLY_CONSOLE") == "1":  # quick path: just the console pieces
        lay = json.load(open(os.path.join(OUT, "layout.json"), encoding="UTF-8"))
        for k in ("UI-CONSOLE", "UI-CONSOLE-PORTRAIT"):
            lay.pop(k, None)
            if os.path.exists(os.path.join(OUT, k + ".webp")):
                os.remove(os.path.join(OUT, k + ".webp"))
        write_console(lay, [])
        write_style_parts(lay, [])
        json.dump(lay, open(os.path.join(OUT, "layout.json"), "w", encoding="UTF-8"), indent=1)
        write_ts(lay)
    else:
        main()
