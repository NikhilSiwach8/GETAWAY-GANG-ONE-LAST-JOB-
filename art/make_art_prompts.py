"""
Generate docs/ART_PROMPTS.md: one complete, self-contained image prompt per art asset of GETAWAY GANG.

Every prompt carries the full style bible, lighting and palette (nothing is "see above"), so any single prompt can be
pasted into an image generator, or handed to an artist, on its own. Keeping the shared parts in one place here is what
keeps all assets consistent, which is the main thing that stops a set from looking AI-generated.

    python3 art/make_art_prompts.py
"""
from __future__ import annotations

import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'docs', 'ART_PROMPTS.md')

STYLE = (
    "Art style: hand-painted 2D comic illustration for a heist-caper slot game, in the spirit of 1960s caper-film "
    "posters and modern European comic albums (clean ink line meets painterly colour), definitely not a 3D render. "
    "Confident hand-inked outlines in warm near-black #1A0D00 with varying line weight: heavy on the outer "
    "silhouette, half weight for inner detail. Cel shading with exactly three tones per material (shadow, mid, light) "
    "plus one small, sharp highlight; flat colour areas carry a subtle gouache texture with fine visible brush grain "
    "and a light paper tooth. Shapes are simplified and chunky, with exaggerated, appealing proportions, readable at "
    "small size; detail stops where it would no longer read at 60 px."
)
LIGHT = (
    "Lighting: one warm key light from the upper left at 45 degrees (#FFE7B0), a thin cool rim light on the right edge "
    "(#8FD8FF), and a soft contact shadow directly below the subject. No glow, no bloom, no sparkles, no lens flare: "
    "the game adds all light effects live."
)
PALETTE = (
    "Palette, use only these: gold #FFF1B0 #F7C947 #B7791F #6A3D00; navy #0A1633 #1B2450 #2E3F7A; steel #C9D2EA "
    "#7F8AA8 #3A4566; crew accents Roxy red #FF4C36, Byte purple #A34BFF, Tank orange #FFA12B, Fuse cyan #28B9EF; "
    "feature accents scatter blue #1D6FE0, alarm red #D62828, diamond ice #BFE9FF; skin tones in warm painted "
    "naturals."
)
NEG = (
    "3D render, CGI, octane, unreal engine, Pixar style, plastic or glossy toy look, airbrushed smooth gradients, "
    "bloom, glow, lens flare, sparkles, star bursts, bokeh, chromatic aberration, HDR, oversaturated neon, excessive "
    "micro-detail, noisy texture, photorealism, text, letters, numbers, logo, watermark, signature, border, frame "
    "around the image, extra fingers, warped hands, mismatched eyes, melted or merged shapes, duplicated objects, "
    "cropped subject, busy background"
)

CREW = {
    'ROXY': "Roxy, the getaway driver: a confident young woman, voluminous auburn-red hair in a high ponytail, aviator "
            "goggles pushed up on her head, fingerless black gloves, a red racing jacket with a white stripe and a "
            "small lightning-bolt patch, black cargo pants, red high-top boots; holds a red-and-black steering wheel; "
            "sly half-smile",
    'BYTE': "Byte, the hacker: a lanky teenage boy, curly brown hair, bright green tinted glasses, a purple hoodie with "
            "a small pixel-skull print, headphones round his neck, holding a chunky laptop with a green screen; "
            "excited open grin",
    'TANK': "Tank, the muscle: a huge, barrel-chested bearded man with a red bandana, an orange high-visibility "
            "work vest over a grey T-shirt, tool belt, rolled sleeves on enormous forearms, shouldering a "
            "comically large gold-and-steel drill; big laughing smile",
    'FUSE': "Fuse, the explosives expert: a wiry young woman, spiky black hair with cyan streaks, goggles on her "
            "forehead, soot smudge on one cheek, a cyan bomber jacket with patches, juggling a round black cartoon "
            "bomb with a lit fuse; mischievous wink",
}

# head-and-shoulders versions for the crew symbols (no boots or props that would not be in frame)
CREW_HEAD = {
    'ROXY': ("Roxy, the getaway driver: a confident young woman, voluminous auburn-red hair in a high ponytail, aviator goggles "
             "pushed up on her head, a red racing jacket collar with a white stripe, a sly half-smile", "Roxy red #FF4C36"),
    'BYTE': ("Byte, the hacker: a teenage boy, curly brown hair, bright green tinted glasses, a purple hoodie, headphones round "
             "his neck, an excited open grin", "Byte purple #A34BFF"),
    'TANK': ("Tank, the muscle: a huge bearded man with a red bandana, thick neck, an orange high-visibility vest strap over a "
             "grey T-shirt, a big laughing smile", "Tank orange #FFA12B"),
    'FUSE': ("Fuse, the explosives expert: a wiry young woman, spiky black hair with cyan streaks, goggles on her forehead, a "
             "soot smudge on one cheek, a cyan bomber jacket collar, a mischievous wink", "Fuse cyan #28B9EF"),
}
# negative prompt for assets that are themselves letters or signs (royals, info i, bet +/-)
NEG_GLYPH = NEG.replace('text, letters, numbers, ', 'extra text, other letters, words, numbers, ')


def sym(name, content, notes, fill='The subject fills about 60 % of the canvas, centred, with even margins.', neg=None):
    return dict(
        neg=neg,
        size='1254 × 1254 px, transparent background (generate on flat chroma green #00FF00, key it out), 3 % empty margin on every side. Shown in game at about 60–230 px.',
        prompt=f"Slot machine symbol: {content}. {fill} Camera: {'straight front-on view, no perspective' if neg else 'three-quarter view from slightly above, 20° to the left, 50 mm lens, no wide-angle distortion'}. "
               f"Isolated single object on a perfectly flat #00FF00 background, no scenery, no floor, no cast shadow beyond a soft contact shadow.",
        checks=notes,
    )


ASSETS: list[tuple[str, str, list[tuple[str, str, dict]]]] = []

# ------------------------------------------------------------------ symbols
ASSETS.append(('Symbols', 'Highest priority: the symbols are on screen all the time.', [
    ('SYM-H1', 'Diamond (top high symbol)', sym('Diamond',
        "a large round brilliant-cut diamond in a slim four-prong gold setting; the facets are painted as clear flat planes alternating pale ice #BFE9FF, mid blue #2E3F7A and deep navy #0A1633 so the cut reads graphically; at most 12 % of the stone is near-white",
        ["Facets read as distinct planes at 64 px, not a white blur", "No baked sparkle stars", "Gold setting matches the gold palette exactly"])),
    ('SYM-H2', 'Money bag', sym('Money bag',
        "a plump burlap money bag tied with a rope, a stitched gold patch with a dollar sign on the front, a few banknotes and three gold coins spilling from the mouth; the coins sit separate from the bag (not touching) so the game can animate them",
        ["Coins are separate shapes", "Dollar sign is a simple bold shape, no other text", "Burlap texture is painted, not photographic"])),
    ('SYM-H3', 'Gold bars', sym('Gold bars',
        "a neat stack of three trapezoid gold ingots, two on the bottom and one on top; the top face of each ingot is one clean flat plane (the game runs glints along it); a tiny stamped emblem of a bank column on each end, no letters",
        ["Top faces are clean flat planes", "No engraved text", "Three tones of gold, one sharp highlight per bar"])),
    ('SYM-H4', 'Luxury watch', sym('Watch',
        "a chunky gold-and-steel luxury wristwatch with a navy dial and a short coiled bracelet; plain baton hour marks, no numerals, no brand text; deliver a second version of the same image with the hands removed (the game turns the hands)",
        ["Two files: with hands and without hands", "No numerals or text on the dial", "Dial is navy #1B2450"])),
    ('SYM-L1', 'Ace (royal)', sym('A',
        "a bold chunky capital letter A built as a bevelled gold frame with a flat red #FF4C36 face and four small round rivets; the letter stands upright, front-on",
        ["All four royals share the same bevel width, rivet size and height", "Front-on camera, not three-quarter", "No sparkle stars"], fill='The letter is 80 % of the canvas height, centred.', neg=NEG_GLYPH)),
    ('SYM-L2', 'King (royal)', sym('K',
        "a bold chunky capital letter K built as a bevelled gold frame with a flat purple #A34BFF face and four small round rivets; the letter stands upright, front-on",
        ["Matches the Ace, Queen and Jack exactly in bevel, rivets and height", "Front-on camera", "No sparkle stars"], fill='The letter is 80 % of the canvas height, centred.', neg=NEG_GLYPH)),
    ('SYM-L3', 'Queen (royal)', sym('Q',
        "a bold chunky capital letter Q built as a bevelled gold frame with a flat orange #FFA12B face and four small round rivets; the letter stands upright, front-on",
        ["Matches the other royals exactly", "Front-on camera", "No sparkle stars"], fill='The letter is 80 % of the canvas height, centred.', neg=NEG_GLYPH)),
    ('SYM-L4', 'Jack (royal)', sym('J',
        "a bold chunky capital letter J built as a bevelled gold frame with a flat cyan #28B9EF face and four small round rivets; the letter stands upright, front-on",
        ["Matches the other royals exactly", "Front-on camera", "No sparkle stars"], fill='The letter is 80 % of the canvas height, centred.', neg=NEG_GLYPH)),
    ('SYM-WILD', 'Wild: the getaway van', sym('Wild',
        "a stubby cartoon red getaway van with white racing stripes and a gold roof rack, front three-quarter view, a blank gold license plate on the grille (the game writes WILD on it), round headlights and an amber roof light bar; deliver one extra layer with only the headlights and roof lights, so the game can flash them",
        ["Plate is blank (no letters)", "Extra layer: lights only", "Reads as a van at 64 px"], fill='The van fills up to 95 % of the canvas width, centred.')),
    ('SYM-WILD-REEL', 'Expanded Wild (full reel)', dict(
        size='512 × 2048 px (1 : 4, a full reel), transparent background (generate on flat #00FF00).',
        prompt="Tall slot-reel panel showing the red cartoon getaway van with white racing stripes and a gold roof rack bursting upward out of a cloud of tyre smoke, seen from the front and slightly below, filling the whole tall frame; motion lines are painted ink strokes, not blur. Isolated on a flat #00FF00 background.",
        checks=["Same van design as SYM-WILD", "Composition works when only the middle 50 % is visible", "No text"])),
    ('SYM-SCATTER', 'Scatter: the bank blueprint', sym('Scatter',
        "a rolled-open architectural blueprint of a grand bank building in white line art on scatter blue #1D6FE0 paper, edges curling, with a bold red target circle drawn over the vault; deliver one extra layer with only the red target, so the game can pulse it; leave a blank gold plate across the bottom (the game writes BONUS on it)",
        ["Blueprint line art is simple and bold", "Plate is blank", "Extra layer: target only"], fill='Fills up to 95 % of the canvas, centred.')),
] + [
    (f'SYM-{k}', f'Crew symbol: {k.title()}', sym(k.title(),
        f"a head-and-shoulders portrait of {CREW_HEAD[k][0]}, inside a round medallion ring painted in {CREW_HEAD[k][1]} with a gold inner rim and four rivets; the whole ring sits fully inside the canvas (nothing cropped)",
        ["Likeness matches the character sheet", "Ring fully inside the canvas", "Crew colour ring exactly per palette"], fill='The medallion fills 95 % of the canvas, centred.'))
    for k in ('ROXY', 'BYTE', 'TANK', 'FUSE')
]))

# ------------------------------------------------------------------ characters
ASSETS.append(('Characters', 'Full bodies for the side mascot, big-win scenes and key art.', [
    (f'CHR-{k}-POSE', f'{k.title()} full body', dict(
        size='2508 px tall, width as needed, transparent background (generate on flat #00FF00). Also deliver the same pose split into layers (head, torso, each arm, each leg, prop) if your tool allows, for rigging.',
        prompt=f"Full-body character illustration of {CREW[k]}. Standing three-quarter pose, weight on one leg, a clear readable silhouette with the prop held away from the body, feet fully in frame, centred. Expression and pose show personality without being frantic. "
               f"Isolated on a flat #00FF00 background, no scenery.",
        checks=["Hands drawn correctly (five fingers, believable grip)", "Feet and prop fully in frame", "Same face as the crew symbol"]))
    for k in ('ROXY', 'BYTE', 'TANK', 'FUSE')
] + [
    ('CHR-EXPRESSIONS', 'Expression sheet (all four crew)', dict(
        size='3840 × 2160 px, flat #00FF00 background, a 4 × 4 grid.',
        prompt="Character expression sheet, a clean 4 × 4 grid on a flat #00FF00 background: four rows, one per crew member, each row showing the same head in four expressions — neutral, cheering, shouting, wincing. Rows: "
               + "; ".join(CREW[k] for k in ('ROXY', 'BYTE', 'TANK', 'FUSE')) + ". Heads the same size and angle within each row.",
        checks=["Identical head angle and scale per row", "Clear difference between the four expressions", "No text labels"])),
]))

# ------------------------------------------------------------------ backgrounds
def bg(scene):
    return dict(
        size='3840 × 2160 px (16 : 9). The reels cover the centre 60 % × 70 %: keep that area calmer and slightly darker. No text or signs with letters anywhere.',
        prompt=f"Wide background painting for a slot game, {scene} Composition: interesting shapes and light sources around the edges and corners, the centre calm and slightly darker because the reel frame sits there; strong depth in three planes (far, mid, near) so the game can drift them for parallax. "
               "Painted environment in the same comic style as the characters, with simplified architecture and no photographic texture.",
        checks=["Centre 60 % × 70 % is calm", "No readable text or logos on signs", "Light sources (windows, lamps, neon shapes) are distinct so they can be animated"],
    )


ASSETS.append(('Backgrounds', 'One per mode. Ask for the same scene also split into layers (sky / far, mid buildings with lights on their own layer, near props, ground) when possible.', [
    ('BG-MAIN', 'Base game: outside the bank at night', bg("night street outside a grand old bank with stone columns, a clock above the entrance, heavy bronze doors, red banners with a gold bank-column emblem (no letters), two stone lions, wet cobblestones reflecting warm windows; the red getaway van parked at the far left, engine smoking; a moonlit city skyline behind with searchlights.")),
    ('BG-HEIST', 'The Heist bonus: inside the vault hall', bg("the bank's grand vault hall: marble floor with a big bank-column emblem inlaid, a crystal chandelier, velvet rope stands knocked over, an open safe-deposit wall on the right, a giant round vault door hanging open on the left with spilled gold coins and bars, warm golden light.")),
    ('BG-ESCAPE', 'The Perfect Escape bonus: the getaway highway', bg("a night highway overpass through a neon city: the red getaway van speeding at the left with money bags in the back and banknotes flying, police light shapes far behind, wet asphalt with long reflections of coloured lights, city towers with neon shapes (a diamond, a bank column), a full moon.")),
    ('BG-HIDDEN', 'The Hidden Bonus: the golden secret vault', bg("a secret golden vault opening onto a night skyline: everything warm gold, a curving road of light leading to a huge open vault door on the right, coins drifting, the city glittering behind; richer and warmer than the other scenes.")),
    ('UI-REEL-BG', 'Behind the reels', dict(
        size='2000 × 1333 px, opaque.',
        prompt="Dark navy #0A1633 to #1B2450 panel texture for behind slot reels: very subtle painted brush grain, faint vertical separators between six columns in #2E3F7A, a gentle darker vignette at the edges. Deliberately quiet so symbols pop. Flat front view, no perspective.",
        checks=["Very low contrast", "Six columns evenly spaced", "No shine or glow"])),
]))

# ------------------------------------------------------------------ frame + UI
def ui(content, size, checks, neg=None):
    return dict(size=size, neg=neg, prompt=f"Game UI element: {content} Flat front view, centred, symmetrical where it should be. Isolated on a flat #00FF00 background.", checks=checks)


BEZEL = "Built from the shared UI material: a brushed steel #C9D2EA/#7F8AA8 outer ring with round rivets, a bevelled gold #F7C947 inner rim, and a navy #1B2450 face."
ASSETS.append(('Reel frame', '', [
    ('UI-REEL-FRAME', 'The frame around the reels', ui(
        f"a heavy bank-vault style frame around a six-by-four slot reel window: steel plates with rivets, gold corner caps, yellow-and-black hazard stripes on the sides, a small vault wheel centred on the top edge; the inner window is fully transparent. {BEZEL} Deliver the top vault wheel, its hub and the hazard stripes also as separate layers.",
        '2600 × 1733 px, transparent window; draw it at the proportion it is shown in game (the window is 6 : 4 cells).',
        ["Window edges straight and clean", "Separate layers: wheel, hub, stripes", "No glow on the frame"])),
]))

BUTTONS = [
    ('UI-SPIN-0', 'Spin button', "a large round spin button: two curved arrows chasing each other, painted ivory, on a gold face"),
    ('UI-SPIN-1', 'Stop button (during a spin)', "the same large round button as the spin button but with a rounded ivory stop square on the gold face"),
    ('UI-AUTOPLAY-RING', 'Autoplay button', "a round autoplay button: a circular arrow loop with a small play triangle"),
    ('UI-TURBO-0', 'Turbo button (off)', "a round turbo button: a lightning bolt in dull steel on a navy face (off state)"),
    ('UI-TURBO-1', 'Turbo button (on)', "the same round turbo button with the lightning bolt in bright gold (on state)"),
    ('UI-SETTINGS-0', 'Menu / settings button', "a round settings button: a gear icon"),
    ('UI-SOUND-0', 'Sound button (on)', "a round sound button: a speaker with two sound waves"),
    ('UI-SOUND-1', 'Sound button (muted)', "the same round sound button with the speaker crossed out"),
    ('UI-INFO-0', 'Info button', "a round info button: a bold lowercase i shape (simple graphic, not lettering)"),
    ('UI-PAYTABLE-0', 'Paytable button', "a round paytable button: a short stack of coins beside a list sheet"),
    ('UI-CLOSE', 'Close button', "a round close button: a chunky ivory X on an alarm-red #D62828 face inside a gold rim"),
    ('UI-BET-MINUS', 'Bet minus', "a small round minus button"),
    ('UI-BET-PLUS', 'Bet plus', "a small round plus button"),
]
ASSETS.append(('Buttons', 'Every button shares one bezel. For each, also deliver hover (slightly brighter), pressed (slightly darker, pushed in) and disabled (desaturated) versions.', [
    (aid, title, ui(f"{c}. {BEZEL} The icon is a simple bold shape in ivory #FFF6E0 with a dark outline, centred on the face.", '512 × 512 px, transparent background, the button fills 96 % of the canvas.',
                    ["Icon readable at 48 px", "Same bezel as every other button", "Hover / pressed / disabled versions delivered"],
                    neg=NEG_GLYPH if aid in ('UI-INFO-0', 'UI-BET-MINUS', 'UI-BET-PLUS', 'UI-CLOSE') else None))
    for aid, title, c in BUTTONS
] + [
    ('UI-BUY-BONUS-0', 'Buy Bonus button', ui(f"a wide pill-shaped gold button with a money bag and two gold bars on the left end and a long empty space on the right for the words BUY BONUS (added by the game). {BEZEL.replace('a navy #1B2450 face', 'a gold #F7C947 face')}",
                                              '1040 × 430 px, transparent background; also hover, pressed and disabled versions.', ["Text area empty", "Money bag reads at small size", "Four state versions"])),
]))

PANELS = [
    ('UI-BUY-PANEL', 'Dialog panel', "a large rectangular dialog panel: riveted brushed-steel frame with gold corner caps, a gold nameplate centred on the top edge under a small vault wheel, a small gold plate centred on the bottom edge, and a dark navy glass interior with a faint diagonal reflection", '2000 × 1500 px, transparent outside the frame.', ["Top nameplate empty", "Corners identical (it is used as a 9-slice frame)", "Glass interior calm"]),
    ('UI-BANNER', 'Feature title scroll', "a horizontal blueprint scroll banner: navy-blue paper with faint white bank line art, rolled ends on both sides, a gold rim, a small vault wheel at the top centre; the middle is empty for a title", '1600 × 416 px, transparent background.', ["Middle empty for text", "Rolled ends symmetrical", "Line art faint"]),
    ('UI-INFO-HEADER', 'Info screen header', "the same blueprint scroll banner as the feature title scroll, wider and slimmer, for screen headers; the middle empty", '2000 × 666 px, transparent background.', ["Middle empty", "Matches UI-BANNER"]),
    ('UI-FS-COUNTER', 'Free-spin counter plate', "a free-spin counter: a small gold-rimmed navy nameplate on top, a large steel-framed navy window in the middle for numbers, and a long gold-rimmed red plate along the bottom, all on a curled blueprint sheet with a drafting compass and a gear peeking out", '900 × 600 px, transparent background.', ["All plates empty", "Plates have clean octagonal rims", "Compass and gear small"]),
    ('UI-METER-GETAWAY', 'Getaway Meter', "a horizontal progress meter: a speedometer dial at the left, a long empty navy channel with a steel rim, and five small milestone pins above it with tiny icons (van, chevrons, re-spin arrows, x2, chequered flag)", '1400 × 466 px, transparent background.', ["Channel empty (the game fills it)", "Five pins evenly placed", "No text"]),
    ('UI-METER-LOOT', 'Loot Meter', "a horizontal progress meter: an open money sack at the left, a long empty navy channel with a gold rim, and four milestone pins with small coin-stack icons", '1400 × 466 px, transparent background.', ["Channel empty", "Four pins evenly placed", "No text"]),
    ('UI-RESPIN-BASE', 'Chaos Re-spins plate', "a horizontal plate with a round red re-spin arrows badge at the left and four grey steel padlocks in a row, under an empty gold nameplate", '1400 × 466 px, transparent background.', ["Nameplate empty", "Four padlocks identical", "No text"]),
    ('UI-RESPIN-LOCK-ON', 'Lit padlock', "one padlock exactly matching the padlocks on the Chaos Re-spins plate, but lit: bright gold with a warm inner light, shackle closed", '231 × 259 px, transparent background.', ["Same size and shape as the grey padlocks"]),
    ('UI-CREW-LEVELS', 'Crew levels plate', "a wide plate with four round crew medallion slots (red, purple, orange, cyan rims) and three empty star sockets under each", '1400 × 699 px, transparent background.', ["Slots empty", "Crew colours exact"]),
    ('UI-MULT', 'Win multiplier plate', "a compact gold-rimmed navy plate with a bevelled frame, empty in the middle for a multiplier number", '720 × 480 px, transparent background.', ["Middle empty"]),
    ('UI-MILESTONE', 'Loot milestone plate', "a gold-rimmed navy plate with a starburst of gold spikes behind it and a red plate along the bottom, both empty", '600 × 475 px, transparent background.', ["Both plates empty"]),
    ('UI-LOADING-BAR-FRAME', 'Loading bar frame', "a long horizontal loading bar frame with a vault wheel at the left end and a latch at the right end, empty navy channel", '1400 × 199 px, transparent background.', ["Channel empty"]),
    ('UI-LOADING-BAR-FILL', 'Loading bar fill', "a long horizontal molten-gold fill strip with subtle painted diagonal bands, to sit inside the loading bar channel", '1300 × 116 px, transparent background.', ["Tiles horizontally if repeated", "No glow"]),
    ('UI-STAR-ON', 'Star', "a single chunky five-pointed gold star with a bevel and one sharp highlight", '256 × 256 px, transparent background.', ["Matches the gold of every other element"]),
    ('UI-PLATE-NAVY', 'Navy plate (buttons)', "a small long octagonal nameplate: gold bevelled rim, navy #1B2450 face, a round rivet at each end, empty", '900 × 280 px, transparent background.', ["Empty", "Clean octagon"]),
    ('UI-PLATE-RED', 'Red plate (primary buttons)', "a long octagonal nameplate: gold bevelled rim, red #D62828 face, a round rivet at each end, empty", '1400 × 240 px, transparent background.', ["Empty", "Clean octagon"]),
]
ASSETS.append(('Panels, meters and plates', 'All plates are delivered empty: every word and number is set by the game in its painted lettering.', [
    (aid, title, ui(f"{c}. {BEZEL}", size, checks)) for aid, title, c, size, checks in PANELS
]))


# ------------------------------------------------------------------ key art
def key(scene, size='1920 × 1080 px (render at 3840 × 2160), opaque.', checks=None, title=True):
    tail = ' Leave the described area calm and empty for the title the game adds; no text anywhere in the image.' if title else ' No text anywhere in the image.'
    return dict(size=size, prompt=f"Key-art illustration for a slot game, {scene}{tail}",
                checks=checks or ["No text in the image", "Characters on model (match the character sheets)", "Empty title area is clean"])


ALL4 = '; '.join(CREW[k] for k in ('ROXY', 'BYTE', 'TANK', 'FUSE'))
ASSETS.append(('Key art: loading, bonus cards and screens', 'These are full scenes. Titles, counts and buttons are added by the game.', [
    ('LOGO-EMBLEM', 'Logo emblem (lettering added separately)', dict(
        size='1600 × 800 px, transparent background.',
        prompt="Logo emblem for a heist-caper slot game: a speeding red cartoon getaway van seen from the front three-quarter, bursting through a gold vault-door ring, with two empty banner shapes (a large one across the middle, a smaller red ribbon below) where the title GETAWAY GANG and the tagline ONE LAST JOB! will be lettered by a designer. Isolated on a flat #00FF00 background.",
        checks=["Banners are empty: the lettering is set by a designer, not generated", "Reads at 300 px wide"])),
    ('SCR-LOADING', 'Loading screen', key(f"all four crew members posed together in front of the bank at night, the red van at the left: {ALL4}. A clean lower band across the bottom 25 % for the loading bar, and the top-centre area for the logo.")),
    ('SCR-HEIST-INTRO', 'The Heist entry card', key(f"the crew bursting into a vault full of gold bars and coin piles, Tank's drill still smoking, Byte with his laptop, Roxy and Fuse cheering: {ALL4}. Characters on the left 55 %, the right 45 % a calmer gold-lit vault wall for the title and counts.")),
    ('SCR-ESCAPE-INTRO', 'The Perfect Escape entry card', key(f"the red getaway van racing toward the viewer on a neon night highway with the whole crew hanging out of the windows, police light shapes far behind: {ALL4}. The van on the left 55 %, the right 45 % calm night sky for the title.")),
    ('SCR-HIDDEN-INTRO', 'Hidden Bonus entry card', key(f"the van turned solid gold, driving out of an enormous open vault onto a road of light, the crew celebrating on and in it: {ALL4}. Scene on the left 55 %, the right 45 % warm gold haze for the title.")),
    ('SCR-HEIST-OUTRO', 'The Heist total-win screen', key(f"the crew lined up across the bottom third, arms around each other, sacks of loot at their feet, inside the vault: {ALL4}. The upper 60 % centre is calm for the TOTAL WIN plaque.")),
    ('SCR-ESCAPE-OUTRO', 'The Perfect Escape total-win screen', key(f"the crew celebrating on top of the parked red van on a rooftop at dawn over the city: {ALL4}. The upper 60 % centre is calm for the TOTAL WIN plaque.")),
    ('SCR-HIDDEN-OUTRO', 'Hidden Bonus total-win screen', key(f"the crew relaxing on a mountain of gold inside the secret vault, the golden van behind them: {ALL4}. The upper 60 % centre is calm for the TOTAL WIN plaque.")),
    ('BUY-HEIST-CARD', 'Buy card: The Heist', key(f"a wide banner of the crew breaking through a vault wall into gold, Tank drilling, dust and gold flying (painted, not glowing): {ALL4}. Keep a calm navy band across the top 12 % and bottom 12 % for text.", size='1920 × 1080 px, opaque; shown cropped to 16 : 7.4, keep the action in the middle band.')),
    ('BUY-ESCAPE-CARD', 'Buy card: The Perfect Escape', key(f"a wide banner of the red van in side view racing through neon streets, the crew waving from the windows, banknotes trailing: {ALL4}. Calm navy bands top and bottom.", size='1920 × 1080 px, opaque; shown cropped to 16 : 7.4.')),
    ('BUY-MYSTERY-CARD', 'Buy card: Mystery Vault', key(f"a wide banner of the crew gathered round a giant closed round vault door, a huge painted question-mark shape glowing softly on the door (a painted shape, not a light effect), Roxy turning the wheel: {ALL4}. Calm navy bands top and bottom.", size='1920 × 1080 px, opaque; shown cropped to 16 : 7.4.')),
]))

ASSETS.append(('Mystery Vault', 'The vault-opening animation is built from these parts.', [
    ('MYSTERY-VAULT-DOOR', 'Vault door (closed, front)', ui(
        f"a round bank-vault door seen straight on: brushed steel with a ring of bolts, a gold combination dial in the upper middle and a big gold spoked wheel below it, a heavy hinge on the left. Deliver the dial and the wheel also as separate layers, centred on their own canvases, so they can spin. {BEZEL}",
        '1254 × 1254 px, transparent background, the door circle fills the canvas.', ["Separate dial and wheel layers", "Perfect circle", "No text on the dial"])),
    ('MYSTERY-REVEAL-HIDDEN', 'Behind the door: Hidden Bonus', key(f"seen through a round open vault doorway (the open door painted on the left edge): the golden van loaded with the cheering crew inside a vault overflowing with gold: {ALL4}.", size='1254 × 1254 px, transparent outside the round doorway.', checks=["Round doorway lines up with the closed door", "No text"], title=False)),
    ('MYSTERY-REVEAL-ESCAPE', 'Behind the door: Perfect Escape', key(f"seen through the same round open vault doorway: the red van in a neon-lit garage with the crew ready to go, a city map on the wall: {ALL4}.", size='1254 × 1254 px, transparent outside the round doorway.', checks=["Same doorway as the other reveals", "No text"], title=False)),
    ('MYSTERY-REVEAL-EMPTY', 'Behind the door: Empty vault', key("seen through the same round open vault doorway: an empty dusty vault with bare shelves, a cobweb, a single paper note pinned to the back wall (blank paper, no writing), one shaft of light; funny, not sad.", size='1254 × 1254 px, transparent outside the round doorway.', checks=["Note is blank", "Reads as empty instantly"], title=False)),
]))

ASSETS.append(('Rules illustrations', 'Explanatory pictures in the game rules. Clear diagrams first, decoration second.', [
    ('RULE-CREW-CHAOS', 'Crew Chaos', key(f"a slot board of six columns and four rows in the game's style with the four crew members around it, each pointing at the cells their ability changes (Roxy swaps two columns, Byte copies a symbol, Tank drills an area, Fuse upgrades symbols): {ALL4}.", size='1600 × 900 px, opaque.')),
    ('RULE-RESPIN', 'Chaos Re-spins', key("a slot board where a few gold-locked cells stay in place while the other columns spin again, with four padlock badges above it, one lit.", size='1600 × 900 px, opaque.')),
    ('RULE-METER', 'Getaway Meter', key("the Getaway Meter dial and channel drawn large, the van racing along it past five milestone pins.", size='1600 × 600 px, opaque.')),
    ('RULE-LOOT-METER', 'Loot Meter', key("a tall illustration of the Loot Meter as a vertical gold sack filling with coins, four milestone pins at the side.", size='929 × 1300 px, opaque.')),
    ('RULE-PBP', 'Perfectly Bad Plan', key(f"all four crew members colliding in a comic chaotic heap of tools, laptop, drill and bomb, a bank floor plan flying overhead: {ALL4}.", size='1600 × 900 px, opaque.')),
    ('RULE-FINAL-ESCAPE', 'Final Escape', key(f"the van leaping off a ramp toward the sunrise with the crew cheering, each member's colour trailing behind like painted ribbons: {ALL4}.", size='1600 × 900 px, opaque.')),
]))

ASSETS.append(('Small FX art', 'Glows, shines and light rays are drawn by the game in code: no art needed for UI-SOFT-GLOW, UI-SHINE, UI-RAYS or UI-CELL-GLOW.', [
    ('FX-COIN', 'Gold coin (particles)', dict(size='256 × 256 px, transparent background.',
        prompt="A single thick gold coin seen at a slight angle, a simple bank-column emblem embossed on its face, bevelled edge with small reeding. Isolated on a flat #00FF00 background.",
        checks=["Reads at 24 px", "No text on the coin"])),
]))


def render() -> str:
    out = [
        '# GETAWAY GANG — Art prompts',
        '',
        'Generated by `art/make_art_prompts.py`. Every prompt below is **complete on its own**: it repeats the full style, lighting and palette, so you can paste any one into an image generator, or give it to an artist, without the others.',
        '',
        '## How to keep the set from looking AI-generic',
        '',
        '1. **Lock the style first.** Generate `SYM-H1` (the diamond) and `CHR-ROXY-POSE` first. Iterate until they look right, then use them as the *style reference* (or the same seed / style code) for every other asset. A set made from one reference looks drawn by one hand; that consistency is what reviewers read as quality.',
        '2. **Never accept glow, sparkle or text from the generator.** The game adds every light effect live and sets every word in its own painted lettering. Baked glow and fake lettering are the strongest "AI" signals.',
        '3. **Check every image against its list** (below each prompt), and look at it at the size the game shows it: symbols at 64 px, buttons at 48 px.',
        '4. **Do a paint-over pass.** Have an artist correct hands, faces, line weight and stray detail on every final image, especially characters and key art. Ten minutes per image removes most AI tells.',
        '5. **Same lighting everywhere:** warm key from the upper left, thin cool rim on the right. Mismatched light between assets is the second-strongest AI signal.',
        '6. After delivery, run `python3 art/process_assets.py` then `python3 art/measure_symbols.py`: the game picks up the new art, sizes and layers automatically.',
        '',
        '**Negative prompt** (included in every prompt below as well): ' + NEG + '.',
        '',
        '## Contents',
        '',
    ]
    for sec, _, items in ASSETS:
        out.append(f'- **{sec}:** ' + ', '.join(f'`{aid}`' for aid, _, _ in items))
    out.append('')
    n = 0
    for sec, intro, items in ASSETS:
        out += [f'## {sec}', '']
        if intro:
            out += [intro, '']
        for aid, title, a in items:
            n += 1
            full = f"{a['prompt']} {STYLE} {LIGHT} {PALETTE} Deliverable: {a['size']}"
            out += [
                f'### {aid} — {title}',
                '',
                f'**Deliver:** {a["size"]}',
                '',
                '**Prompt:**',
                '',
                '```text',
                full,
                '```',
                '',
                '**Negative prompt:**',
                '',
                '```text',
                a.get('neg') or NEG,
                '```',
                '',
                '**Check before accepting:**',
                '',
                *[f'- {c}' for c in a['checks']],
                '',
            ]
    out.insert(2, f'{n} prompts.')
    out.insert(3, '')
    return '\n'.join(out)


if __name__ == '__main__':
    md = render()
    open(OUT, 'w').write(md)
    print(OUT, md.count('### '), 'prompts', len(md.split()), 'words')
