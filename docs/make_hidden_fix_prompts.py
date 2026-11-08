"""Write docs/ASSET_PROMPTS_HIDDEN_BONUS_2.txt: the two remaining Mystery Vault assets, matched to the delivered
MYSTERY-REVEAL-ESCAPE / MYSTERY-REVEAL-EMPTY framing. Run: vendor/math-sdk/env/bin/python -I docs/make_hidden_fix_prompts.py"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, "..", "math", "games", "getaway_gang"), os.path.join(HERE, "..", "vendor", "math-sdk")]
os.chdir(os.path.join(HERE, "..", "vendor", "math-sdk"))
import game_config as gc  # noqa: E402

MASTER = open(os.path.join(HERE, "ASSET_PROMPTS.txt"), encoding="UTF-8").read()
FIXES = open(os.path.join(HERE, "make_round2_fix_prompts.py"), encoding="UTF-8").read()
GAME = 'the original online video slot game "GETAWAY GANG: ONE LAST JOB!" (a 6-reel × 4-row, 4,096-ways action-comedy heist slot)'
STYLE_3D = re.search(r"(Art style: premium stylized 3D.*?) Colour palette:", MASTER).group(1)
PALETTE = re.search(r"(Colour palette: .*?) Deliverable:", MASTER).group(1)
AVOID = re.search(r"(Avoid: .*?)\n", MASTER).group(1)
CREW_LOCK = "".join(re.findall(r'"(.*?)"', re.search(r'CREW_LOCK = \(\n(.*?)\n\)', FIXES, re.S).group(1)))
MATCH = ("MATCH THE TWO DELIVERED REVEAL SCENES EXACTLY (attach MYSTERY-REVEAL-ESCAPE and MYSTERY-REVEAL-EMPTY as reference "
         "images): the same square framing, the same thick round vault-door ring of brushed steel with a polished gold inner band "
         "and gold rivets filling the whole image edge to edge, the same massive open door slab hinged on the LEFT edge (gold "
         "six-spoke wheel, chrome hinges), the same camera height and lens.")
ALPHA = ("Deliverable: PNG (not JPG/WebP) with a REAL transparent alpha channel: everything outside the outer ring and the open "
         "door must be fully transparent — not black, not white, not a checkerboard pattern drawn into the image.")

items = [
    ("MYSTERY-REVEAL-HIDDEN", "Mystery Vault — inside: HIDDEN BONUS (golden van)",
     f'Create the asset "Mystery Vault — inside: HIDDEN BONUS" for {GAME}. ' + MATCH + " What is behind the open door when the "
     "result is the HIDDEN BONUS, the jackpot outcome: the same getaway van as in the Perfect Escape reveal, same angle and same "
     "pose (driving out toward the viewer, front three-quarter view, headlights blazing), but the whole van is plated in "
     "gleaming polished GOLD with the white stripes and lightning bolt in bright chrome; the crew inside exactly as in the Escape "
     "reveal — Roxy at the wheel, Byte and Tank cheering from the windows, Fuse standing through the roof with a fist up — but now "
     "wearing gold sunglasses and laughing harder. The vault interior is stacked floor to ceiling with gold bars, money bags and "
     "blue diamonds, a blinding wall of warm golden light behind the van, gold coins raining and bouncing, sparkles everywhere. It "
     "must read instantly as 'the best possible result', clearly richer and brighter than the Escape scene. No text. "
     + CREW_LOCK + " Size: 1254×1254 px (square), same as the other reveals. " + STYLE_3D + " " + PALETTE + " " + ALPHA + " " + AVOID
     + " Also avoid: swapping the characters' genders, hair or outfits; changing the vault ring design between scenes."),
    ("MYSTERY-VAULT-DOOR", "Mystery Vault — closed vault door (animation layers)",
     f'Create the asset "Mystery Vault — closed vault door" for {GAME}. ' + MATCH + " Show the SAME vault but with the door "
     "CLOSED, seen straight on, perfectly centred and symmetrical: the round door slab sits inside the ring and fills it, with the "
     "big gold six-spoke handle wheel in the centre, a brass combination dial above the wheel (numbers 0–90 engraved around it, "
     "a red pointer at the top), six thick chrome locking bolts visible around the door's edge pushed into the ring, rivets and "
     "a faint golden glow leaking through the seam between door and ring (something valuable is inside). No people, no text "
     "except the dial numbers. Supply FIVE separate transparent PNG layers at the same canvas size and position so they stack "
     "perfectly: (1) the outer ring alone (with the open hole in the middle), (2) the door slab alone without the wheel, dial or "
     "bolts, (3) the six-spoke wheel alone, centred, (4) the combination dial alone, (5) the six locking bolts alone. Also supply "
     "the flattened combined image. Size: 1254×1254 px (square), same as the reveals. " + STYLE_3D + " " + PALETTE + " " + ALPHA
     + " " + AVOID),
]
out = ["GETAWAY GANG: ONE LAST JOB! - MYSTERY VAULT: LAST TWO ASSETS",
       "Copy the text under PROMPT. Attach MYSTERY-REVEAL-ESCAPE and MYSTERY-REVEAL-EMPTY as references so the vault matches.",
       "Save as PNG with real transparency; name each file with its Asset ID (the door layers: MYSTERY-VAULT-DOOR-RING, -SLAB, -WHEEL, -DIAL, -BOLTS).",
       ""]
for n, (i, name, p) in enumerate(items, 1):
    out += [f"[{n:02d}] {i} - {name}", "PROMPT:", p, "", "-" * 78, ""]
open(os.path.join(HERE, "ASSET_PROMPTS_HIDDEN_BONUS_2.txt"), "w", encoding="UTF-8").write("\n".join(out))
print("ok")
