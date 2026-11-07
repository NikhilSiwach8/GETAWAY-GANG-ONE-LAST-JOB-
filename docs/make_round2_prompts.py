"""Write docs/ASSET_PROMPTS_ROUND2.txt: prompts for every asset still needed after the bonus-buy /
paytable / rules update. Style blocks are copied from docs/ASSET_PROMPTS.txt so new art matches the set.
Run: python3 docs/make_round2_prompts.py"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = open(os.path.join(HERE, "ASSET_PROMPTS.txt"), encoding="UTF-8").read()
GAME = 'the original online video slot game "GETAWAY GANG: ONE LAST JOB!" (a 6-reel × 4-row, 4,096-ways action-comedy heist slot)'
STYLE_3D = re.search(r"(Art style: premium stylized 3D.*?) Colour palette:", MASTER).group(1)
STYLE_UI = re.search(r"(Art style: chunky, tactile premium slot-game UI.*?) Colour palette:", MASTER).group(1)
PALETTE = re.search(r"(Colour palette: .*?) Deliverable:", MASTER).group(1)
AVOID = re.search(r"(Avoid: .*?)\n", MASTER).group(1)
AUDIO_TAIL = "Cartoon-punchy, premium and family-friendly, matched in loudness to the rest of the set. Deliverable: 48 kHz 24-bit WAV plus OGG and M4A, mono or stereo as noted, peak −3 dBFS, tight start with no silence, short natural tail, 3 variations where noted to avoid repetition."

UI_DELIV = "Deliverable: PNG/WebP at @2x and @1x on a transparent background (real alpha, no baked checkerboard or white box), with idle, hover, pressed and disabled states where it is a button; layered source file."
ART_DELIV = "Deliverable: PNG/WebP on a transparent background where noted, otherwise full-bleed; real alpha, no baked checkerboard; layered or 3D source."


def art(id_, name, body, size, ui=False, deliv=None):
    style = STYLE_UI if ui else STYLE_3D
    d = deliv or (UI_DELIV if ui else ART_DELIV)
    return id_, name, f'Create the asset "{name}" for {GAME}. {body} Size: {size}. {style} {PALETTE} {d} {AVOID}'


def sfx(id_, name, body):
    return id_, name, f"Original sound effect for {GAME}: {name} — {body}. {AUDIO_TAIL}"


def reissue(id_):
    m = re.search(r"\[\d+\] " + re.escape(id_) + r" - (.*?)\nPROMPT:\n(.*?)\n", MASTER)
    return id_, m.group(1), m.group(2)


SECTIONS = []

SECTIONS.append(("1. BONUS BUY (new feature)", [
    art("UI-BUY-BONUS", "Buy Bonus button",
        "A wide pill-shaped button in the steel-and-gold UI family: a gold bar ingot face with bevelled edges, a small cartoon money-bag icon on the left and the words BUY BONUS in bold white display lettering with a dark outline; idle has a slow gold sheen, hover brightens, pressed sinks 4 px, disabled is desaturated grey. It sits beside the spin button, so it must read at phone size.",
        "300×200 px @2x (aspect 3:2)", ui=True),
    art("BUY-HEIST-CARD", "Buy Bonus card art — THE HEIST",
        "Card illustration for buying THE HEIST: the four crew (Roxy red, Byte purple, Tank orange, Fuse blue) squeezing through a freshly drilled hole into a glowing bank vault packed with gold bars, money bags and diamonds; Tank's drill still smoking, Byte's hologram showing a vault schematic, warm gold light spilling out. Leave the top 22% calm for the title and the bottom 25% darker for the price text overlay. No text in the image.",
        "1600×900 px (16:9), full-bleed"),
    art("BUY-ESCAPE-CARD", "Buy Bonus card art — THE PERFECT ESCAPE",
        "Card illustration for buying THE PERFECT ESCAPE: the red-and-white getaway van mid-drift on a rain-slick neon city highway at night, Roxy at the wheel, Byte, Tank and Fuse hanging out of the windows cheering, money bills streaming from the back doors, magenta and cyan neon reflections. Leave the top 22% calm for the title and the bottom 25% darker for the price text overlay. No text in the image.",
        "1600×900 px (16:9), full-bleed"),
    art("UI-VOLATILITY", "Volatility indicator icons",
        "Two small icons for a 5-step volatility row: a chunky lit lightning bolt (gold #F7C947 with a white hot core and soft glow) and the same bolt unlit (dark charcoal with a thin steel outline). Identical silhouette and size so they line up.",
        "64×64 px @2x each, two files", ui=True),
    art("UI-BUY-PANEL", "Buy Bonus / modal panel frame (9-slice)",
        "A modal window frame styled as a bank-vault door panel: brushed steel border with rivets and gold corner brackets, deep-navy tinted glass centre at 85% opacity, a gold header plate area at the top. Must 9-slice cleanly: corners 96 px, edges tile without seams, centre plain.",
        "1200×900 px @2x plus the 9-slice guides", ui=True),
]))

SECTIONS.append(("2. PAYTABLE & GAME RULES", [
    art("UI-PAYTABLE-BTN", "Paytable button",
        "A round secondary button in the steel-and-gold family with a white coin-stack-and-list glyph, clearly different from the 'i' info button so players can tell paytable from rules.",
        "176×176 px @2x", ui=True),
    art("UI-INFO-HEADER", "Paytable / rules header banner",
        "A wide gold header banner for the PAYTABLE and HOW TO PLAY pages: a blueprint-paper ribbon with gold trim, rolled ends and a small vault-dial emblem in the centre; plain area in the middle for the page title text (no text in the art).",
        "1600×240 px @2x", ui=True),
    art("RULE-CREW-CHAOS", "Rules illustration — Crew Chaos",
        "A small explainer illustration: a 6×4 reel grid seen at a slight angle with the four crew symbols lit up and comic-style arrows showing them acting on the board (a swapped reel, cloned diamonds, an open vault, upgraded symbols). Clear, diagrammatic, readable when small. No text.",
        "800×450 px, transparent background"),
    art("RULE-RESPIN", "Rules illustration — Chaos Re-spin",
        "A reel grid where every Getaway Van Wild is locked with a glowing gold padlock outline while the other cells blur in a spin; a circular re-spin arrow badge in the corner. No text.",
        "800×450 px, transparent background"),
    art("RULE-METER", "Rules illustration — Getaway Meter",
        "The Getaway Meter as a horizontal fuel-gauge with 5 numbered stage notches, the needle pushing into the final 'CLEAN GETAWAY' zone, a chequered-flag icon at the end. Matches the delivered UI-METER-GETAWAY. No text other than the stage numbers 1–5.",
        "800×300 px, transparent background"),
    art("RULE-LOOT-METER", "Rules illustration — Loot Meter",
        "The Loot Meter as a vertical money-bag filling with gold coins, with 4 milestone markers (4, 8, 12, 16) and small reward icons beside them: +1 spin, ×2, +1 spin, ×3. Matches the delivered UI-METER-LOOT. No other text.",
        "500×700 px, transparent background"),
    art("RULE-PBP", "Rules illustration — Perfectly Bad Plan",
        "All four crew piled on top of each other in a comedic heap on the reels, each mid-mistake (Roxy reversing, Byte's laptop smoking, Tank drilling the wrong wall, Fuse's early explosion), with a big gold ×3 burst behind them. No text except the ×3.",
        "800×450 px, transparent background"),
    art("RULE-FINAL-ESCAPE", "Rules illustration — Final Escape",
        "The getaway van bursting through a paper banner at a city-limits sign at dawn, four crew level badges (gold LV3 stars in each crew colour) flying out of the windows. No text except the LV3 badges.",
        "800×450 px, transparent background"),
]))

SECTIONS.append(("3. REPLACE THE WEB-SDK SAMPLE ASSETS (required for Stake approval)", [
    art("FONT-WIN", "Win counter bitmap font",
        "A complete bitmap font sheet for the win counter: digits 0–9 plus , . × $ € £ + and space, chunky rounded display numerals in polished treasure gold with a dark-brown outline, warm top highlight and soft bottom shadow; all digits equal width (tabular). Replaces the sample 'mm_gold' font.",
        "glyph height 160 px @2x",
        ui=True,
        deliv="Deliverable: BMFont package (.fnt or .xml + .png atlas) with kerning, plus each glyph as a separate transparent PNG; real alpha. Embedded text is expected for this asset."),
    art("FONT-COUNTER", "Free-spin / meter counter bitmap font",
        "Same character set as FONT-WIN in brushed silver-white with a navy outline and a cool rim light, for the free-spin counter and meter numbers. Replaces the sample silver and purple fonts.",
        "glyph height 96 px @2x",
        ui=True,
        deliv="Deliverable: BMFont package (.fnt or .xml + .png atlas) plus each glyph as a separate transparent PNG; real alpha. Embedded text is expected for this asset."),
    art("UI-LOADING-BAR", "Loading bar",
        "A loading bar styled as a vault-door bolt track: a steel frame with rivets and a gold liquid-metal fill that glows at its leading edge; supplied as separate frame and fill layers so the fill can be scaled.",
        "1000×80 px @2x (frame) and 960×48 px (fill)", ui=True),
    art("UI-PRESS-CONTINUE", "'Tap anywhere to continue' text graphic",
        "The words TAP ANYWHERE TO CONTINUE in bold white comic display lettering with a navy outline and a soft gold glow, on one line; also a second version reading PRESS ANYWHERE TO CONTINUE. Replaces the sample 'press anywhere' sprite.",
        "1400×160 px @2x",
        ui=True,
        deliv="Deliverable: two transparent PNG/WebP files; real alpha. Embedded text is expected for this asset."),
    art("FX-ANTICIPATION", "Reel anticipation effect",
        "A vertical looping effect that frames one reel when a bonus is close: swirling gold sparks and blueprint-blue light streaks running up the reel edges, an electric shimmer, intensity pulsing once per second. Replaces the sample anticipation Spine.",
        "300×1000 px per frame, 30 fps, 1 s seamless loop",
        deliv="Deliverable: WebM VP9 with alpha (or transparent PNG sequence), seamless loop, real alpha; plus the first frame as a still."),
    art("FX-COINS", "Coin and cash particle sprites",
        "Particle sheet for win showers: a spinning gold coin with a vault-dial engraving (8 rotation frames), a green banknote fluttering (8 frames), a small diamond sparkle (4 frames) and a gold star twinkle (4 frames). Replaces the sample coin sprites.",
        "128×128 px per frame",
        deliv="Deliverable: one transparent PNG atlas per particle plus a JSON frame list (TexturePacker/Pixi format); real alpha."),
    art("FX-TRANSITION", "Scene transition wipe",
        "A 1.2 s full-screen transition: the getaway van screeches across the screen from left to right trailing a thick wall of cartoon smoke and confetti that fully covers the frame at the midpoint (frames 16–20) and clears to transparent by the end. Used between the base game and the bonuses. Replaces the sample transition Spine.",
        "1920×1080 px, 30 fps, 36 frames",
        deliv="Deliverable: WebM VP9 with alpha (or transparent PNG sequence); the covered midpoint must be fully opaque."),
]))

SECTIONS.append(("4. BONUS END SCREENS (redo)", [reissue("SCR-HEIST-OUTRO"), reissue("SCR-ESCAPE-OUTRO")]))

new_sfx = [
    sfx("SFX-CREW-CHAOS", "Crew Chaos sting", "a comic brass hit with a cartoon crash and a crowd 'whoa', stereo, 1.0 s"),
    sfx("SFX-ANTICIPATION", "Reel anticipation loop", "a rising tense string tremolo with a ticking clock, stereo, 1.0 s seamless loop"),
    sfx("SFX-BONUS-TRIGGER", "Bonus triggered", "a vault alarm 'whoop' turning into a triumphant horn fanfare, stereo, 2.0 s"),
    sfx("SFX-RETRIGGER", "Free-spins retrigger", "a quick ascending horn riff with a coin cascade, stereo, 1.2 s"),
    sfx("SFX-TRANSITION", "Scene transition", "a van engine rev, tyre screech and whoosh, stereo, 1.2 s, synced to FX-TRANSITION"),
    sfx("SFX-CELL-CLONE", "Clone-in", "a digital glitch blip with a sparkle, mono, 0.4 s, 3 variations"),
    sfx("SFX-CELL-UPGRADE", "Symbol upgrade", "a short rising magical 'bling', mono, 0.4 s, 3 variations"),
    sfx("SFX-CELL-VAULT", "Vault loot reveal", "a heavy bolt clunk followed by a gold glitter, mono, 0.5 s"),
    sfx("SFX-CELL-WILD", "Wild stamp", "a rubber-stamp thump with a van horn honk, mono, 0.4 s, 3 variations"),
    sfx("SFX-CELL-EXIT", "Crew exit", "a cartoon zip-away whoosh, mono, 0.3 s, 3 variations"),
    sfx("SFX-WIN-SMALL", "Small win", "a bright two-note coin chime, mono, 0.6 s, 3 variations"),
    sfx("SFX-WIN-COUNT-END", "Win counter end", "a satisfying cash-register 'ka-ching' that ends the count-up, stereo, 0.8 s"),
    sfx("SFX-FINAL-ESCAPE", "Final Escape", "a long van peel-out into an orchestral 'made it!' hit, stereo, 3.0 s"),
    sfx("SFX-MAX-WIN", "Maximum win", "a huge orchestral and brass climax with fireworks and a cheering crowd, stereo, 4.0 s"),
    sfx("SFX-BUY-OPEN", "Buy Bonus panel open", "a vault-door creak opening into a soft gold shimmer, stereo, 0.6 s"),
    sfx("SFX-BUY-CONFIRM", "Bonus bought", "a heavy cash-drawer slam and a short heist-theme horn sting, stereo, 1.0 s"),
    sfx("SFX-UI-OPEN", "Menu / paytable open", "a soft paper-blueprint unroll, mono, 0.3 s"),
    sfx("SFX-UI-CLOSE", "Menu / paytable close", "a soft paper roll-up, mono, 0.3 s"),
]
SECTIONS.append(("5. MUSIC (none delivered yet — the build still uses the sample's audio)",
                 [reissue(i) for i in ["MUS-INTRO", "MUS-MAIN", "MUS-HEIST", "MUS-ESCAPE", "MUS-WIN-BIG", "MUS-WIN-SUPER", "MUS-WIN-MEGA", "MUS-WIN-EPIC", "MUS-WIN-MAX"]]))
SECTIONS.append(("6. SOUND EFFECTS — from the master list (not delivered yet)",
                 [reissue(i) for i in ["SFX-SPIN", "SFX-REEL-STOP", "SFX-LAND-PREMIUM", "SFX-LAND-WILD", "SFX-LAND-SCATTER", "SFX-ROXY", "SFX-BYTE", "SFX-TANK", "SFX-FUSE", "SFX-COMBO-RB", "SFX-COMBO-BT", "SFX-COMBO-TF", "SFX-COMBO-FR", "SFX-COMBO-RT", "SFX-PBP", "SFX-RESPIN", "SFX-METER-STAGE", "SFX-LOOT-MILESTONE", "SFX-WIN-COUNT", "SFX-UI-CLICK"]]))
SECTIONS.append(("7. SOUND EFFECTS — new", new_sfx))
SECTIONS.append(("8. VOICE LINES (optional)", [reissue(i) for i in ["VO-ROXY", "VO-BYTE", "VO-TANK", "VO-FUSE", "VO-CREW-PBP"]]))

total = sum(len(items) for _, items in SECTIONS)
out = [
    "GETAWAY GANG: ONE LAST JOB! - ASSET PROMPTS, ROUND 2",
    f"{total} assets still needed after the bonus-buy, paytable and rules update.",
    "Each prompt is complete on its own: copy the text under PROMPT. Save files with the Asset ID as the name",
    "(e.g. UI-BUY-BONUS.png) and send them like before; they are swapped in by ID.",
    "Animations and clips are NOT in this list: they are rendered from your art by video/ (Remotion).",
    "",
    "Highest priority for Stake approval: section 3 (sample-asset replacements) and sections 5-7 (audio).",
    "",
]
n = 0
for title, items in SECTIONS:
    out += ["=" * 78, title, "=" * 78, ""]
    for id_, name, prompt in items:
        n += 1
        out += [f"[{n:03d}] {id_} - {name}", "PROMPT:", prompt, "", "-" * 78, ""]
open(os.path.join(HERE, "ASSET_PROMPTS_ROUND2.txt"), "w", encoding="UTF-8").write("\n".join(out))
print(f"wrote {total} prompts")
