"""Write docs/ASSET_PROMPTS_HIDDEN_BONUS.txt: assets for the Mystery Vault buy and the Hidden Bonus.
Style blocks come from docs/ASSET_PROMPTS.txt; the crew lock from the round-2 fixes. Numbers come from the math.
Run: python3 docs/make_hidden_prompts.py"""
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
STYLE_UI = re.search(r"(Art style: chunky, tactile premium slot-game UI.*?) Colour palette:", MASTER).group(1)
PALETTE = re.search(r"(Colour palette: .*?) Deliverable:", MASTER).group(1)
AVOID = re.search(r"(Avoid: .*?)\n", MASTER).group(1)
CREW_LOCK = re.search(r'CREW_LOCK = \(\n(.*?)\n\)', FIXES, re.S).group(1)
CREW_LOCK = "".join(re.findall(r'"(.*?)"', CREW_LOCK))
AUDIO_TAIL = re.search(r'AUDIO_TAIL = "(.*?)"', open(os.path.join(HERE, "make_round2_prompts.py"), encoding="UTF-8").read()).group(1)
HIDDEN = (f"THE HIDDEN BONUS is the secret, upgraded version of The Perfect Escape, unlocked only from the Mystery Vault: "
          f"{gc.HIDDEN_FS} free spins, every crew member starts at Level {gc.HIDDEN_START_LEVEL}, and a guaranteed win of at least "
          f"{gc.HIDDEN_FLOOR}× the bet. Its look: The Perfect Escape's neon night highway, but bathed in molten gold — gold light "
          f"spilling from the van, gold-tinted neon, gold coins in the air — clearly 'the jackpot version'.")
FULL = "Deliverable: full-bleed PNG/WebP, no text unless stated; layered or high-res source."
TRANSP = "Deliverable: PNG/WebP on a transparent background (real alpha, no white box or checkerboard)."
UI_DELIV = "Deliverable: PNG/WebP at @2x and @1x on a transparent background (real alpha), layered source file."


def art(id_, name, body, size, deliv, crew=False, ui=False):
    parts = [f'Create the asset "{name}" for {GAME}.', body]
    if crew:
        parts.append(CREW_LOCK)
    parts += [f"Size: {size}.", STYLE_UI if ui else STYLE_3D, PALETTE, deliv, AVOID]
    if crew:
        parts.append("Also avoid: swapping the characters' genders, hair or outfits.")
    return id_, name, " ".join(parts)


def sfx(id_, name, body):
    return id_, name, f"Original sound effect for {GAME}: {name} — {body}. {AUDIO_TAIL}"


S = gc.MYSTERY_SPLIT
SECTIONS = [
    ("1. MYSTERY VAULT (bonus buy)", [
        art("BUY-MYSTERY-CARD", "Buy Bonus card art — MYSTERY VAULT",
            "Card illustration for buying the MYSTERY VAULT: a colossal round bank-vault door in the centre, closed, its brass dial "
            "glowing, a big glowing question mark of golden light leaking through the seams of the door; the four crew crowd in front "
            "of it — Tank with his ear pressed to the door, Byte scanning it with his green holo-laptop, Roxy leaning on it twirling "
            "her steering wheel, Fuse holding a fizzing cartoon bomb behind her back with a grin. Moody navy vault corridor, warm gold "
            "rim light. Keep the top 22% calm dark navy for the title and the bottom 25% darker for the price overlay. No text.",
            "1600×900 px (16:9)", FULL, crew=True),
        art("MYSTERY-VAULT-DOOR", "Mystery Vault — vault door (animation layer)",
            "Front view of the same colossal round bank-vault door, perfectly centred and symmetrical, closed: thick brushed-steel "
            "ring with rivets, a big brass combination dial in the middle, six chrome locking bolts around the edge. Clean edges, no "
            "background, so it can rotate the dial, retract the bolts and swing open as separate parts.",
            "1400×1400 px", TRANSP + " Supply the door slab, the dial, the bolts and the outer ring as separate transparent layers."),
        art("MYSTERY-REVEAL-HIDDEN", "Mystery Vault — inside: HIDDEN BONUS",
            "What is behind the open vault door when the result is the HIDDEN BONUS: a blinding wall of molten-gold light, stacks of "
            "gold bars and diamonds, and the red-and-white getaway van parked inside, painted in gleaming gold, headlights on. "
            "Framed as seen through a round vault opening (circular composition, dark edges).",
            "1400×1400 px", FULL),
        art("MYSTERY-REVEAL-ESCAPE", "Mystery Vault — inside: THE PERFECT ESCAPE",
            "What is behind the open vault door when the result is THE PERFECT ESCAPE: the normal red-and-white getaway van with its "
            "engine revving, neon-magenta and cyan light, a road map with an escape route pinned to the wall. Circular composition as "
            "seen through a round vault opening.",
            "1400×1400 px", FULL),
        art("MYSTERY-REVEAL-EMPTY", "Mystery Vault — inside: EMPTY",
            "What is behind the open vault door when the vault is empty: a comically empty, dusty vault — one cobweb, a single moth "
            "fluttering out, and a tiny hand-written note pinned to the back wall that just reads 'OOPS'. Funny, not sad. Circular "
            "composition as seen through a round vault opening. The only text is 'OOPS' on the note.",
            "1400×1400 px", FULL),
        art("UI-MYSTERY-BADGE", "Mystery Vault — odds badge",
            f"A small three-part badge for the buy card showing the fixed odds: a gold segment '{round(S['hidden'] * 100)}% HIDDEN BONUS', "
            f"a blue segment '{round(S['escape'] * 100)}% PERFECT ESCAPE' and a grey segment '{round(S['basegame'] * 100)}% EMPTY', in "
            "chunky steel-and-gold UI style. Embedded text is expected for this asset.",
            "900×200 px @2x", UI_DELIV, ui=True),
    ]),
    ("2. HIDDEN BONUS (screens and background)", [
        art("SCR-HIDDEN-INTRO", "THE HIDDEN BONUS intro screen",
            HIDDEN + " Intro screen: the golden getaway van bursting out of the open vault onto the golden neon highway, all four "
            "crew cheering on and in the van; title lettering 'HIDDEN BONUS' in huge gold chrome comic letters, a badge "
            f"'{gc.HIDDEN_FS} FREE SPINS', a ribbon 'ALL CREW START AT LEVEL {gc.HIDDEN_START_LEVEL}', a gold stamp "
            f"'GUARANTEED {gc.HIDDEN_FLOOR}× WIN', and a small line '» PRESS ANYWHERE TO CONTINUE «' at the bottom. Same layout "
            "family as the existing THE PERFECT ESCAPE intro: art on the left, title stack on the right. Embedded text is expected "
            "for this asset; spell every word exactly.",
            "1920×1080 px (16:9)", FULL, crew=True),
        art("BG-HIDDEN", "THE HIDDEN BONUS background",
            HIDDEN + " Game background behind the reels: the golden neon highway at night, gold-tinted skyscrapers, drifting gold "
            "coins and light streaks, the open bank vault glowing far away on the horizon. The centre 60% must stay calm and darker "
            "so the reels read clearly on top. No characters, no text.",
            "3840×2160 px (16:9)", FULL),
        art("SCR-HIDDEN-OUTRO", "THE HIDDEN BONUS end screen",
            HIDDEN + " End screen: the crew relaxing on the golden van's roof with sunglasses on, sunrise over the golden city, a "
            "mountain of gold in the open van doors. Leave a large empty dark panel area in the centre for the total-win counter "
            "(the game draws the number). Title 'HIDDEN BONUS!' in gold chrome comic letters at the top. The only text is the title.",
            "1920×1080 px (16:9)", FULL, crew=True),
        art("UI-VAULT-GUARANTEE", "Vault Guarantee stamp",
            f"A big rubber-stamp style badge 'VAULT GUARANTEE' with a smaller line 'AT LEAST {gc.HIDDEN_FLOOR}× BET', gold and red "
            "ink, slightly rotated, with a vault-dial emblem — slammed onto the screen when the Hidden Bonus is topped up to its "
            "guaranteed win. Embedded text is expected for this asset.",
            "1000×600 px @2x", UI_DELIV, ui=True),
    ]),
    ("3. AUDIO", [
        sfx("SFX-MYSTERY-SPIN", "Mystery Vault dial spin", "a heavy combination dial whirring and clicking faster and faster with a rising drum roll, stereo, 2.0 s"),
        sfx("SFX-VAULT-OPEN", "Vault door opening", "bolts retracting with big metallic clunks, then a deep hydraulic hiss as the door swings, stereo, 1.5 s"),
        sfx("SFX-REVEAL-HIDDEN", "Hidden Bonus revealed", "an angelic choir 'aah' bursting into a huge brass fanfare with coin showers, stereo, 3.0 s"),
        sfx("SFX-REVEAL-ESCAPE", "Perfect Escape revealed", "a van engine roar into a punchy brass hit, stereo, 2.0 s"),
        sfx("SFX-REVEAL-EMPTY", "Empty vault revealed", "a comedic sad trombone 'wah-wah' with a tiny moth flutter and a cough of dust, stereo, 1.8 s"),
        sfx("SFX-VAULT-GUARANTEE", "Vault Guarantee top-up", "a heavy stamp slam then a cash-register 'ka-ching' and coins pouring, stereo, 1.8 s"),
        ("MUS-HIDDEN", "THE HIDDEN BONUS music",
         f"Original music for {GAME}: the Hidden Bonus theme — The Perfect Escape's synth-funk chase energy (118–124 BPM) lifted "
         "into a triumphant jackpot version: brass section and choir pads on top, sparkling glockenspiel, a big key change at the "
         "loop's midpoint; 1:30 seamless loop. Must stay instrumental (no lyrics), feel like a premium animated heist comedy, and mix "
         "cleanly under sound effects. Deliverable: 48 kHz 24-bit WAV master plus OGG and M4A, loudness −16 LUFS integrated, true "
         "peak −1 dBTP, seamless loop points trimmed at zero crossings with no click, stems supplied separately."),
    ]),
]

total = sum(len(i) for _, i in SECTIONS)
out = [
    "GETAWAY GANG: ONE LAST JOB! - ASSET PROMPTS: MYSTERY VAULT & HIDDEN BONUS",
    f"{total} assets. Copy the text under PROMPT. Save each file with its Asset ID as the name and send it like before.",
    "",
    f"The feature: the MYSTERY VAULT bonus buy costs {gc.BUY_COST['mystery']}x the bet and reveals {round(S['hidden'] * 100)}% HIDDEN BONUS "
    f"(5 Scatters), {round(S['escape'] * 100)}% THE PERFECT ESCAPE (4 Scatters) or {round(S['basegame'] * 100)}% an empty vault (normal spin).",
    f"The Hidden Bonus: {gc.HIDDEN_FS} free spins, crew start at Level {gc.HIDDEN_START_LEVEL}, guaranteed win of at least {gc.HIDDEN_FLOOR}x bet.",
    "The vault-reveal and guarantee animations are rendered from these stills with Remotion, like the other clips.",
    "TIP: attach CHR-ROXY-POSE, CHR-BYTE-POSE, CHR-TANK-POSE and CHR-FUSE-POSE as reference images with every crew prompt.",
    "",
]
n = 0
for title, items in SECTIONS:
    out += ["=" * 78, title, "=" * 78, ""]
    for id_, name, prompt in items:
        n += 1
        out += [f"[{n:02d}] {id_} - {name}", "PROMPT:", prompt, "", "-" * 78, ""]
open(os.path.join(HERE, "ASSET_PROMPTS_HIDDEN_BONUS.txt"), "w", encoding="UTF-8").write("\n".join(out))
print("wrote", total)
