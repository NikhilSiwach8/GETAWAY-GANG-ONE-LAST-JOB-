"""Write docs/ASSET_PROMPTS_ROUND2_FIXES.txt: correction prompts for round-2 deliveries.
Run: python3 docs/make_round2_fix_prompts.py"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = open(os.path.join(HERE, "ASSET_PROMPTS.txt"), encoding="UTF-8").read()
GAME = 'the original online video slot game "GETAWAY GANG: ONE LAST JOB!" (a 6-reel × 4-row, 4,096-ways action-comedy heist slot)'
STYLE_3D = re.search(r"(Art style: premium stylized 3D.*?) Colour palette:", MASTER).group(1)
PALETTE = re.search(r"(Colour palette: .*?) Deliverable:", MASTER).group(1)
AVOID = re.search(r"(Avoid: .*?)\n", MASTER).group(1)

CREW_LOCK = (
    "CHARACTER LOCK — the four crew must look exactly like their existing character art (attach CHR-ROXY-POSE, "
    "CHR-BYTE-POSE, CHR-TANK-POSE and CHR-FUSE-POSE as reference images if your tool allows): "
    "ROXY is a slim young WOMAN with a long auburn-red high ponytail, red racing goggles pushed up on her head, "
    "a cherry-red racing jacket with white stripes and a lightning-bolt patch over a white top, black fingerless "
    "gloves, dark cargo trousers and red-and-white high-top boots; she holds a red-and-white steering wheel. "
    "BYTE is a lanky young MAN (not a woman) with short curly dark-brown hair, green-tinted tech glasses with a "
    "small antenna, a purple hoodie with pixel-invader prints, a backpack and cables, baggy dark cargo trousers, "
    "purple-and-orange sneakers; he holds a glowing GREEN holographic laptop. Byte has NO purple hair, NO ponytail "
    "and NO headphones. "
    "TANK is a huge broad MAN with a thick brown beard, a red bandana, an orange high-visibility safety vest over a "
    "grey T-shirt, heavy gloves, a tool belt with wrenches, and a big yellow-and-black industrial drill. "
    "FUSE is a young WOMAN (not a man) with messy black hair streaked electric BLUE, aviator goggles on her head, a "
    "cropped blue bomber jacket covered in smiley-face and bomb patches over a grey crop top, ripped dark cargo "
    "trousers with a knee pad, cartoon round bombs on her belt, and a yellow-and-black plunger detonator box. Fuse "
    "has NO brown hair, NO blue hoodie and is NOT male. "
    "Each character keeps their own colour: Roxy red, Byte purple, Tank orange, Fuse blue."
)
SYMBOL_LOCK = (
    "Only show symbols that exist in the game: blue cut Diamond, brown Money Bag with a $ sign, stacked Gold Bars, "
    "a gold Luxury Watch with a blue face, the letters A K Q J in chunky gold-rimmed lettering, the red-and-white "
    "Getaway Van with the word WILD, and the blue rolled Bank Blueprint scroll marked BONUS. Do NOT draw cash "
    "stacks, rubies or red gems, safes, coins as reel symbols, or a character's face as a reel symbol."
)


def art(id_, name, body, size, deliv, crew=True, symbols=False):
    parts = [f'Create the asset "{name}" for {GAME}.', body]
    if crew:
        parts.append(CREW_LOCK)
    if symbols:
        parts.append(SYMBOL_LOCK)
    parts += [f"Size: {size}.", STYLE_3D, PALETTE, deliv, AVOID, "Also avoid: swapping the characters' genders, hair or outfits."]
    return id_, name, " ".join(parts)


FONT_DELIV = ("Deliverable: transparent PNG/WebP (real alpha, no white or checkerboard background), every glyph separated "
              "by at least 40 px of empty space so each can be cut out cleanly, all digits identical width and identical "
              "baseline. Embedded text is expected for this asset.")
FULL = "Deliverable: full-bleed PNG/WebP, no text anywhere in the image; layered or high-res source."
TRANSP = "Deliverable: PNG/WebP on a transparent background (real alpha, no white box or checkerboard)."

ITEMS = [
    ("FONTS (the digit 8 is missing from both sheets)", [
        art("FONT-WIN", "Win counter font — complete sheet",
            "A complete glyph sheet for the win counter in EXACTLY the same style as the delivered gold sheet: chunky "
            "rounded display numerals in polished treasure gold with a thick dark-brown outline, warm top highlight and a "
            "soft brown drop shadow. Row 1 must contain ALL TEN digits in this order: 0 1 2 3 4 5 6 7 8 9 — check that the "
            "8 is present (two stacked closed loops). Row 2: , . × $ € £ + . Nothing else.",
            "2400×800 px, digit height about 300 px", FONT_DELIV, crew=False),
        art("FONT-WIN-8", "Win counter font — digit 8 only (alternative)",
            "Only if you prefer not to redo the whole sheet: a single digit 8 matching the delivered gold win-counter "
            "numerals exactly — same chunky rounded shape, same polished gold, same thick dark-brown outline, same top "
            "highlight and brown drop shadow, same height and stroke weight as the 0 and 9 of that sheet.",
            "300×330 px", FONT_DELIV, crew=False),
        art("FONT-COUNTER", "Counter font (silver) — complete sheet",
            "A complete glyph sheet in EXACTLY the same style as the delivered silver sheet: chunky rounded numerals in "
            "brushed silver-white with a thick navy-blue outline and a cool blue rim light. Row 1 must contain ALL TEN "
            "digits in this order: 0 1 2 3 4 5 6 7 8 9 — check that the 8 is present. Row 2: , . × $ € £ + . Nothing else.",
            "2400×800 px, digit height about 300 px", FONT_DELIV, crew=False),
        art("FONT-COUNTER-8", "Counter font (silver) — digit 8 only (alternative)",
            "Only if you prefer not to redo the whole sheet: a single digit 8 matching the delivered silver counter "
            "numerals exactly — same shape, brushed silver-white face, thick navy outline, blue rim light, same height "
            "and stroke weight as the 0 and 9 of that sheet.",
            "300×330 px", FONT_DELIV, crew=False),
    ]),
    ("BUY BONUS CARDS (Byte and Fuse were swapped)", [
        art("BUY-HEIST-CARD", "Buy Bonus card art — THE HEIST",
            "Card illustration for buying THE HEIST: the four crew squeezing through a freshly drilled, smoking hole in a "
            "vault wall into a glowing bank vault packed with gold bars, money bags and blue diamonds. Tank in front with "
            "his smoking drill; Roxy crawling through grinning; Byte beside her showing a green holographic vault schematic "
            "on his laptop; Fuse behind them giving a thumbs-up with her detonator box. Warm gold light spills from the vault "
            "on the right. Keep the top 22% calm dark navy for the title and the bottom 25% darker for the price overlay.",
            "1600×900 px (16:9)", FULL),
        art("BUY-ESCAPE-CARD", "Buy Bonus card art — THE PERFECT ESCAPE",
            "Card illustration for buying THE PERFECT ESCAPE: the red-and-white getaway van mid-drift on a rain-slick neon "
            "city highway at night, magenta and cyan reflections, money bills streaming from the open back doors, police "
            "lights far behind. Roxy at the wheel, Tank leaning out of the side window fist-pumping, Byte in the middle "
            "window holding his green holo-laptop and cheering, Fuse standing up through the sunroof waving her detonator. "
            "Keep the top 22% calm dark navy for the title and the bottom 25% darker for the price overlay.",
            "1600×900 px (16:9)", FULL),
    ]),
    ("RULES ILLUSTRATIONS (Byte and Fuse were swapped; Crew Chaos showed symbols that are not in the game)", [
        art("RULE-CREW-CHAOS", "Rules illustration — Crew Chaos",
            "Explainer illustration: a 6×4 slot reel grid in the game's steel-and-gold reel frame, seen at a slight angle, "
            "with the four crew around it each demonstrating their ability on the board with clear comic arrows and glows: "
            "Roxy (top left) points at two whole reels swapping places, shown with a red curved double arrow between two "
            "columns; Byte (top right) projects purple holographic copies of a blue Diamond onto three cells; Tank (bottom "
            "left) has drilled open a 2×2 glowing vault area on the grid that is full of gold bars and diamonds; Fuse (bottom "
            "right) points at a cell where a Jack card symbol upgrades into a Money Bag with a blue sparkle arrow. Clear and "
            "diagrammatic, readable when small. No text.",
            "1600×900 px", TRANSP, symbols=True),
        art("RULE-PBP", "Rules illustration — Perfectly Bad Plan",
            "All four crew piled in a comedic heap on top of the reel grid, each caught mid-mistake: Roxy yanking a gear "
            "lever the wrong way, Byte holding his smoking green holo-laptop with a panicked face, Tank drilling straight "
            "through the wrong wall in a burst of rubble, Fuse holding a fizzing cartoon bomb that went off too early. A big "
            "glossy gold '×3' with a red outline bursts in a starburst behind them. No other text.",
            "1600×900 px", TRANSP, symbols=True),
        art("RULE-FINAL-ESCAPE", "Rules illustration — Final Escape",
            "The red-and-white getaway van bursting through a torn paper banner onto a highway at sunrise, a blank green "
            "road sign and a city skyline behind. Roxy driving, Tank and Byte cheering out of the windows, Fuse standing "
            "up through the sunroof. Four star-shaped 'LV3' badges fly out of the van, one in each crew colour: red (Roxy), "
            "purple (Byte), orange (Tank), blue (Fuse). No text except the four LV3 badges.",
            "1600×900 px", TRANSP),
    ]),
]

out = [
    "GETAWAY GANG: ONE LAST JOB! - ROUND 2 CORRECTION PROMPTS",
    "Copy the text under PROMPT. Save each file with its Asset ID as the name and send it like before.",
    "",
    "What was wrong:",
    " - FONT-WIN and FONT-COUNTER: the digit 8 is missing (sheets read 0 1 2 3 4 5 6 7 9).",
    "   Redo the full sheet, OR send only the -8 file for each.",
    " - BUY-HEIST-CARD, BUY-ESCAPE-CARD, RULE-CREW-CHAOS, RULE-PBP, RULE-FINAL-ESCAPE: Byte was drawn as a",
    "   purple-haired woman and Fuse as a brown-haired man. In the game Byte is a man and Fuse is a woman.",
    " - RULE-CREW-CHAOS also showed cash stacks, rubies, safes and Roxy's face as reel symbols.",
    "",
    "TIP: attach the existing CHR-BYTE-POSE and CHR-FUSE-POSE images as reference images with every crew prompt.",
    "",
]
n = 0
for title, items in ITEMS:
    out += ["=" * 78, title, "=" * 78, ""]
    for id_, name, prompt in items:
        n += 1
        out += [f"[{n:02d}] {id_} - {name}", "PROMPT:", prompt, "", "-" * 78, ""]
open(os.path.join(HERE, "ASSET_PROMPTS_ROUND2_FIXES.txt"), "w", encoding="UTF-8").write("\n".join(out))
print("wrote", n)
