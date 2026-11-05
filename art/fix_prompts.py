"""Corrected prompts for delivered assets that need fixing -> docs/ASSET_PROMPTS_FIXES.txt"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import asset_prompts as ap

ALPHA = ("Background: genuinely transparent (alpha channel), exported as PNG or WebP with alpha. Do NOT paint a "
         "checkerboard, white or grey pattern to suggest transparency. If your tool cannot export transparency, place "
         "the asset on a perfectly flat, solid pure green (#00FF00) background with no gradient, no shadow on the "
         "background and no glow spilling onto it, so it can be keyed out cleanly.")
EMPTY = ("Leave every number, value and changing label OUT of the image: the game draws those live. Any area that "
         "shows a value must be an empty, clean plate.")
FIXES = [
 ("UI-CREW-LEVELS", "Crew upgrade panel (The Perfect Escape only)", "ui",
  "The portraits were generic and did not match the crew, and the background was not transparent.",
  "A panel for the Perfect Escape bonus with four circular mini-portrait badges in a row, each badge framed in that "
  "character's colour, and under each badge a row of three empty star pips (unlit, dark gold outline only). The four "
  "portraits must match the established characters exactly: " + "; ".join(ap.CHARS.values()) +
  ". Order left to right: Roxy (red frame), Byte (purple), Tank (orange), Fuse (blue). Small header plate reading "
  "'CREW UPGRADES'. Deliver separately: (a) the panel with unlit stars, (b) a single lit star pip in each of the four "
  "character colours, (c) a small 'MASTER' ribbon. " + ALPHA),
 ("UI-PAYTABLE", "Paytable and rules page frames", "ui",
  "The art contained invented pay values, made crew symbols look like paying symbols, showed a ×5 Crew Combo (the "
  "real value is ×3), showed Fuse creating Wilds (she upgrades symbols), and used generic portraits.",
  "A set of EMPTY rules-page frames in the game's UI style: a deep-navy page panel with a gold header plate (empty), "
  "page-navigation arrows left and right, a close button, and empty content panels: (1) a 4×2 grid of symbol slots "
  "each with an empty pay-value plate beside it, (2) a wide empty panel for a diagram, (3) a two-column panel with an "
  "empty 'before' mini-board and an empty 'after' mini-board joined by a gold arrow. No symbols, no characters, no "
  "numbers and no rules text anywhere: the game fills all content from its real math. " + ALPHA),
 ("UI-FS-COUNTER", "Free-spin counter plaque", "ui",
  "'0 / 10' and 'THE HEIST' were drawn into the image, but both change during play.",
  "A plaque styled as a blueprint tag with metal and gold trim: a small empty header plate on top (for the label), an "
  "empty centre area for the large counter, and an empty name ribbon at the bottom (for the active bonus name). "
  + EMPTY + " " + ALPHA),
 ("UI-METER-GETAWAY", "Getaway Meter (empty) + fill layer", "ui",
  "The bar was drawn already filled to stage 3 and the background was not transparent.",
  "A horizontal speedometer-styled progress bar housing with 5 numbered notches (1 to 5) and a reward icon badge above "
  "each notch: a red getaway-van Wild, a gold level-up chevron, a blue re-spin arrow, a '×2' badge and a chequered flag "
  "with '×5'. The bar channel must be completely EMPTY (dark navy) and all notches unlit, plus a 'GETAWAY METER' plate "
  "underneath. Deliver as separate files: (a) the empty housing with icons, (b) the glowing gold fill strip alone, at "
  "full length on its own transparent canvas, (c) one lit-notch glow, (d) the small red van marker alone. " + ALPHA),
 ("UI-METER-LOOT", "Loot Meter (empty) + coin fill layer", "ui",
  "The bar was drawn already filled with coins and the background was not transparent. The milestone rewards were correct.",
  "A vault-shaped progress bar housing with a round vault door on the left and four milestone markers at 4, 8, 12 and "
  "16 points, each with its reward badge above: '+1 SPIN', '×2', '+1 SPIN', and '+2 SPINS ×3' with a crew level-up "
  "chevron; a 'THE HEIST – LOOT METER' plate underneath. The bar channel must be EMPTY and the markers unlit. Deliver "
  "separately: (a) the empty housing, (b) the heap-of-gold-coins fill alone at full length on its own transparent "
  "canvas, (c) one lit-marker glow. " + ALPHA),
 ("UI-MULT", "Multiplier badge (blank)", "ui",
  "It read '×5 CREW COMBO': the Crew Combo multiplier is ×3, and one badge must show multipliers from several sources.",
  "A chrome-and-gold sticker badge with a spiky gold burst behind it, a large EMPTY centre area for the multiplier "
  "number, and an EMPTY label plate underneath for the source name. " + EMPTY + " " + ALPHA),
 ("UI-BALANCE", "Balance display (empty)", "ui",
  "'10,000.00' was drawn in, and the background was not transparent.",
  "A horizontal capsule of brushed steel and gold with a small 'BALANCE' header plate on top and a deep-navy glass "
  "value window that is completely EMPTY. Also deliver a 9-slice version. " + EMPTY + " " + ALPHA),
 ("UI-BET", "Bet panel (empty)", "ui",
  "'100.00' was drawn in, and the background was not transparent.",
  "A horizontal capsule of brushed steel and gold with a small 'BET' header plate, a steel '−' button on the left, a "
  "steel '+' button on the right, and a deep-navy glass value window between them that is completely EMPTY. Deliver the "
  "− and + buttons also as separate files in normal, pressed and disabled states. " + EMPTY + " " + ALPHA),
 ("UI-WIN", "Win display (empty) + flare", "ui",
  "'2,500.00' was drawn in, and the background was not transparent.",
  "A horizontal capsule of brushed steel and gold with a small 'WIN' header plate and a deep-navy glass value window "
  "that is completely EMPTY. Deliver the gold sunburst flare separately on its own transparent canvas, so it can play "
  "while the number counts up. " + EMPTY + " " + ALPHA),
 ("UI-SETTINGS-PANEL", "Settings panel (empty) + controls", "ui",
  "Slider positions, percentages and ON/OFF switch states were drawn in place, so they could not move.",
  "A modal panel in steel and deep-navy glass with a 'SETTINGS' header plate, a red close button, and five empty rows, "
  "each with an icon and label: Music volume (note icon), SFX volume (speaker), Voice lines (microphone), Turbo "
  "(triple arrow), Intro animations (clapper). Rows contain NO slider, NO switch and NO percentage. A bottom strip with "
  "a 'SPACE' key-cap and 'SPIN (SPACEBAR)' label, and an empty 'GAME HISTORY' button. Deliver separately: (a) an empty "
  "slider track, (b) the gold slider fill strip, (c) the slider knob, (d) the toggle switch in its ON state and (e) in "
  "its OFF state. " + ALPHA),
 ("SYM-WILD-REEL", "Full-reel Wild (1×4)", "symbol",
  "It was 1:2 (887×1774), but a reel is one cell wide and four cells tall, so it must be 1:4.",
  "A tall full-reel Wild exactly ONE cell wide and FOUR cells tall (aspect ratio 1:4, delivered at 512×2048 px): the red "
  "getaway van with white racing stripes, roof light bar and bold gold 'WILD' plate bursts upward through a red-and-white "
  "road barrier, with tyre smoke, flying debris, speed lines and a night city with a police helicopter spotlight above, "
  "all inside a gold riveted frame that runs the full height. Keep the van and the WILD plate in the middle half so "
  "they read when the reel is partly visible. " + ALPHA),
 ("CHR-TANK-POSE", "Tank — hero pose (transparent)", "char_anim",
  "A checkerboard pattern was painted into the image, with no real transparency.",
  "Full-body hero pose of " + ap.CHARS["TANK"] + ", three-quarter front view, holding the drill across his body, grinning, "
  "standing slightly turned toward the reels. " + ALPHA),
 ("CHR-ROXY-POSE", "Roxy — hero pose (transparent)", "char_anim",
  "A checkerboard pattern was painted into the image, with no real transparency.",
  "Full-body hero pose of " + ap.CHARS["ROXY"] + ", three-quarter front view, one hand on her hip and the steering wheel "
  "held up beside her, confident smirk, standing slightly turned toward the reels. " + ALPHA),
 ("UI-LOGO", "Game logo (transparent)", "ui",
  "The design is good; only the background was not transparent.",
  "The game logo: 'GETAWAY GANG' in bold, chunky, comic-heist 3D lettering with gold chrome faces, a thick red outline "
  "and a speed-line swoosh, with a red getaway-van silhouette bursting through the first 'G'; below it, the subtitle "
  "'ONE LAST JOB!' on a red stencilled tape strip. Spell the text exactly as written. Keep the same design as the "
  "approved version. " + ALPHA),
]
SAME = [("UI-AUTOPLAY", "Autoplay button, 3 states"), ("UI-SOUND", "Sound button, 3 states"),
        ("UI-SPIN", "Spin button: idle, spinning, stop"), ("UI-REEL-FRAME", "Reel frame (6×4)"),
        ("UI-SETTINGS", "Settings button, 3 states"), ("UI-TURBO", "Turbo button, 3 states"),
        ("UI-INFO", "Info button, 3 states")]

def full(title, kind, body):
    style = ap.STYLE_UI if kind == "ui" else ap.STYLE_3D
    return f'Create the asset "{title}" for {ap.GAME}. {body} {style} {ap.PALETTE} {ap.SPEC[kind]} {ap.NEG}'

bar = "=" * 78
L = ["GETAWAY GANG: ONE LAST JOB! - CORRECTED PROMPTS FOR DELIVERED ASSETS", "",
     "Only assets that need redoing are listed. Every prompt is complete: copy the text under PROMPT as-is.", "",
     bar, "A. REDO WITH A NEW PROMPT", bar, ""]
for n, (aid, title, kind, why, body) in enumerate(FIXES, 1):
    L += [f"[{n:02d}] {aid} - {title}", f"WHAT WAS WRONG: {why}", "PROMPT:", full(title, kind, body), "", "-" * 78, ""]
BY_ID = {x[1]: x for x in ap.ASSETS}
HIRES = ("Resolution: render at 3840x2160 px (16:9) or the highest native resolution available; if your tool's "
         "maximum is lower, generate at that maximum and upscale with an AI upscaler to 3840x2160 keeping all detail sharp. "
         "Keep the same composition, lighting and colours as the approved version.")
n = len(FIXES)
L += [bar, "B. SAME DESIGN, REAL TRANSPARENCY", bar, ""]
for aid, _ in SAME:
    _, _, title, kind, body = BY_ID[aid]
    n += 1
    L += [f"[{n:02d}] {aid} - {title}", "WHAT WAS WRONG: The design is approved; only the background was not transparent.",
          "PROMPT:", full(title, kind, body + " Keep the same design as the approved version. " + ALPHA), "", "-" * 78, ""]
L += [bar, "C. SAME DESIGN, HIGHER RESOLUTION", bar, ""]
for aid in ["BG-MAIN", "BG-HEIST", "BG-ESCAPE", "BG-VAULT", "BG-GARAGE", "BG-LOADING", "BG-INTRO"]:
    _, _, title, kind, body = BY_ID[aid]
    n += 1
    L += [f"[{n:02d}] {aid} - {title}", "WHAT WAS WRONG: The design is approved; it was 1672x941 instead of 3840x2160.",
          "PROMPT:", full(title, kind, body + " " + HIRES), "", "-" * 78, ""]
L += [bar, "D. RE-SEND AS FILES (no new prompt)", bar, "",
      "These arrived only as chat previews, so no file was saved. Send the same images again as attachments:",
      "UI-SETTINGS, UI-TURBO, UI-INFO, SYM-WILD.", ""]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "ASSET_PROMPTS_FIXES.txt")
open(out, "w", encoding="UTF-8").write("\n".join(L))
print("wrote", out, len(FIXES), "prompts")
