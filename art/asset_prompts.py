"""Generate docs/ASSET_PROMPTS.md: one complete, self-contained production prompt per asset.

Shared facts (palette, characters, specs) are written once here so every prompt states them
identically; the output document repeats them in full inside every prompt so each one can be
copied on its own.  Run:  python3 art/asset_prompts.py
"""

import os

OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "ASSET_PROMPTS.md")
GAME = 'the original online video slot game "GETAWAY GANG: ONE LAST JOB!" (a 6-reel × 4-row, 4,096-ways action-comedy heist slot)'

PALETTE = (
    "Colour palette: deep night navy #0D1530, charcoal #1C1F26 and brushed metallic grey for environments; "
    "warm treasure gold #F7C947 for loot, highlights and key light; character accent colours used consistently "
    "everywhere: Roxy red #FF4C36, Byte purple #A34BFF, Tank orange #FFA12B, Fuse blue #28B9EF."
)
STYLE_3D = (
    "Art style: premium stylized 3D, the look of a high-end animated feature film crossed with comic-book "
    "action-comedy energy. Slightly exaggerated cartoon proportions, big expressive faces, clean readable "
    "silhouettes, rich physically-based materials (fabric weave, worn leather, brushed and painted metal, glossy "
    "plastic, cut gems with real refraction). Cinematic three-point lighting: warm gold key light from upper "
    "left, cool blue-navy rim light from lower right, soft global illumination and subtle ambient occlusion. "
    "Family-friendly: no realistic weapons, no blood, no menace. Ultra-detailed, sharp focus, 4K render quality."
)
STYLE_UI = (
    "Art style: chunky, tactile premium slot-game UI in the same stylized-3D world as the game: bevelled brushed "
    "steel, polished gold trim and rivets, deep-navy tinted glass panels, soft inner glow, crisp edges, subtle "
    "noise-free gradients. Readable at phone size; numbers use a bold tabular display face."
)
NEG = (
    "Avoid: flat vector clip-art, anime style, photoreal humans, gore, guns or realistic weapons, horror, "
    "embedded text or watermarks (unless the asset is a text/logo asset), signatures, blur, low-poly, noise, "
    "oversaturation, inconsistent lighting, extra fingers or limbs, cropped heads, and any resemblance to "
    "characters, logos or artwork from existing slot games, films or brands."
)
CHARS = {
    "ROXY": "Roxy, the Wheelwoman — a female getaway driver in her late twenties with a lean, angular, athletic silhouette; fitted cherry-red (#FF4C36) racing jacket with white stripe piping and a lightning-bolt shoulder patch, aviator goggles pushed up on a windswept auburn ponytail, fingerless black leather driving gloves, slim dark-grey sport trousers, scuffed red-and-white high-top racing boots; carries a chunky custom steering wheel; confident smirk, one eyebrow raised — reckless, sarcastic, fearless",
    "BYTE": "Byte, the Hacker — a male hacker in his mid twenties with a slim, hunched, round-shouldered silhouette and a big head; oversized violet (#A34BFF) hoodie with circuit-trace embroidery, enormous rectangular digital glasses whose lenses scroll faint green code, a translucent floating holographic laptop, a lanyard of USB keys, mismatched sneakers, a small antenna earpiece; wide-eyed sweaty half-grin — brilliant, nervous, sarcastic, never stops talking",
    "TANK": "Tank, the Safecracker — a huge, muscular, lovable man with a wide rectangular silhouette, massive forearms and comically short legs; hi-vis orange (#FFA12B) utility vest over a grey T-shirt, heavy padded work gloves, a tool belt with stethoscope, wrenches and chalk, a red bandana, bushy brown beard; carries an oversized industrial vault drill with a glowing orange bit; big toothy grin, small eyes — loud, impatient, soft-hearted",
    "FUSE": "Fuse, the Demolition Expert — a female demolition expert in her early twenties with an asymmetric spiky silhouette; cropped sky-blue (#28B9EF) bomber jacket covered in patches, utility belt of round cartoon 'boom' gadgets with confetti fuses, ripped navy cargo pants, chunky boots, messy short hair with electric-blue tips, goggles on her forehead, soot smudges on her cheeks; holds a big cartoon plunger detonator; mischievous wide grin and sparkling eyes — fearless, unpredictable, chaotic",
}
SPEC = {
    "symbol": "Deliverable: transparent-background PNG and WebP, 512×512 px, subject centred inside a 460×460 px safe area, consistent 3/4-front camera at eye level and identical lighting to every other symbol; also export a separate additive highlight-glow layer (PNG) and a layered source file.",
    "symbol_anim": "Deliverable: Spine 4.x skeleton (.json + .atlas + PNG pages) or a 30 fps transparent WebP/PNG sequence, 512×512 px canvas, pivot at the cell centre, starts and ends on the static pose so it blends with the static symbol.",
    "char_sheet": "Deliverable: 4096×2048 px PNG on a plain neutral-grey (#8A8F99) background with orthographic-style views evenly spaced, plus the clean 3D source or high-res renders of each view on transparent backgrounds.",
    "char_anim": "Deliverable: Spine 4.x skeleton (.json + .atlas) or a 30 fps transparent PNG/WebM-with-alpha sequence, 1024×1024 px per frame, character anchored at the feet centre, consistent scale with every other character animation; include the first and last frame as stills.",
    "bg": "Deliverable: layered source (PSD or EXR passes) and flattened WebP at 3840×2160 px (landscape) plus a re-composed 2160×3840 px portrait version; the central area behind the 6×4 reels (about 60% width × 70% height, centred slightly above middle) must stay darker and low in detail so symbols always read clearly; separate foreground, midground and sky layers for parallax.",
    "bg_loop": "Deliverable: seamless 30 fps loop as layered Spine animation or WebM (VP9) at 1920×1080 px (and a 1080×1920 portrait cut), first and last frame identical, file under 8 MB.",
    "fx": "Deliverable: Spine 4.x animation or 30 fps WebM with alpha at 1920×1080 px aligned to a 6×4 reel grid of 100×100 px cells (grid origin documented), with separate additive glow and particle layers; must read clearly at 2× speed (turbo) and at phone size.",
    "cinematic": "Deliverable: 30 fps WebM (VP9 with alpha where overlaid) at 1920×1080 px plus a 1080×1920 portrait cut, or a Spine scene; skippable at any point (provide a clean 'skip' end frame); title text delivered as a separate layer so it can be localised.",
    "ui": "Deliverable: PNG/WebP at @2x and @1x on transparent background with idle, hover, pressed and disabled states; minimum touch target 88×88 px at @2x; include a 9-slice version where noted and a layered source file.",
    "screen": "Deliverable: 1920×1080 px landscape and 1080×1920 px portrait layouts as layered source plus Spine/WebM animation, with all text on separate layers for localisation and a clear 'press anywhere to continue' area.",
    "music": "Deliverable: 48 kHz 24-bit WAV master plus OGG and M4A, loudness −16 LUFS integrated, true peak −1 dBTP, seamless loop points trimmed at zero crossings with no click, stems supplied separately.",
    "sfx": "Deliverable: 48 kHz 24-bit WAV plus OGG and M4A, mono or stereo as noted, peak −3 dBFS, tight start with no silence, short natural tail, 3 variations where noted to avoid repetition.",
    "vo": "Deliverable: dry studio recording, 48 kHz 24-bit WAV plus OGG and M4A, no music or reverb, 3 takes per line, family-friendly delivery, each line trimmed with 50 ms head and tail.",
}

ASSETS = []  # (section, id, title, kind, body)


def add(section, aid, title, kind, body):
    ASSETS.append((section, aid, title, kind, body))


# ------------------------------------------------------------------ characters
for key, desc in CHARS.items():
    name = key.title()
    add("1. Characters", f"CHR-{key}", f"{name} — character model sheet", "char_sheet",
        f"Character turnaround and model sheet of {desc}. Show five full-body views in a neutral A-pose standing on the same baseline: front, three-quarter front, side, back and three-quarter back, plus close-ups of the face, hands holding the signature prop, and key costume details (patches, buckles, gadgets). Proportions and colours must stay identical in every view; the silhouette must be recognisable as a black shape alone.")
    add("1. Characters", f"CHR-{key}-EXPR", f"{name} — expression sheet", "char_sheet",
        f"Facial expression sheet of {desc}. A 4×3 grid of head-and-shoulders portraits from the same three-quarter camera with identical lighting: neutral, idle smile, focused, surprised, panicked, laughing, smug, frustrated, celebrating, embarrassed, determined, winking. Expressions are broad and cartoon-readable at small size, with eye direction and eyebrows doing most of the acting.")
    add("1. Characters", f"CHR-{key}-POSE", f"{name} — in-game hero pose render", "char_anim",
        f"Full-body hero pose render of {desc}, three-quarter front view, dynamic confident pose showing the signature prop, standing slightly turned toward the reels as if about to jump into action; transparent background; used beside the reels and on intro screens.")
    anims = [
        ("IDLE", "4-second seamless idle loop", "breathing, natural blinking and eye darts, a subtle weight shift and a personality fidget (Roxy spins the steering wheel on one finger, Byte pushes up his glasses and glances at his laptop, Tank cracks his knuckles and pats the drill, Fuse flips a gadget and catches it)"),
        ("ABILITY", "1.6–2.2-second feature-activation animation", "the signature ability wind-up: Roxy yanks her steering wheel and shouts, Byte flips open the holographic laptop and types furiously, Tank revs the drill with both hands, Fuse slams the plunger detonator; ends on a strong held pose while the board effect plays"),
        ("COMPLETE", "0.8-second feature-completion beat", "a proud satisfied reaction right after the ability resolves: a quick nod, thumbs-up or smug shrug in character"),
        ("WIN", "1.2-second winning reaction", "celebrates a win: Roxy fist-pumps, Byte does a nervous cheer and adjusts his glasses, Tank chest-bumps the air, Fuse jump-spins"),
        ("LOSE", "1.0-second non-winning reaction", "a comedic shrug, eye-roll or facepalm — never sad, hurt or angry"),
        ("BONUS-INTRO", "2.0-second bonus introduction", "runs or slides into frame and lands in a hero pose for the bonus intro screen"),
        ("VICTORY", "3.0-second end-of-bonus victory celebration", "throws loot into the air, laughs and poses as coins rain down"),
        ("COMBO", "1.5-second combination pose", "interacts with a partner crew member for the combination cinematics: a high-five, fist bump or comedic collision, staged so two characters read clearly in one frame"),
    ]
    for code, length, action in anims:
        add("1. Characters", f"ANIM-{key}-{code}", f"{name} — {code.lower().replace('-', ' ')} animation", "char_anim",
            f"A {length} of {desc}. Action: {action}. Keep the feet planted on a consistent ground line, exaggerate anticipation and follow-through like a high-end animated film, and keep secondary motion on hair, clothing and props.")

# ------------------------------------------------------------------ symbols
SYMS = [
    ("SYM-H1", "Diamond (highest-paying premium symbol)", "a single huge brilliant-cut diamond floating at a slight tilt, ice-blue body with rainbow caustic sparkles, set in a thin polished gold bezel ring, crisp specular highlights, a soft gold glow behind it", "it slowly rotates 360° and throws prismatic light beams"),
    ("SYM-H2", "Money Bag (premium symbol)", "a plump burlap money bag tied with a gold rope and printed with a bold gold dollar sign, cartoon banknotes and coins peeking out of the top, soft fabric folds and stitching", "it bounces, the rope loosens and gold coins spill out in an arc"),
    ("SYM-H3", "Gold Bars (premium symbol)", "a neat pyramid of three glossy gold bullion bars with stamped bank crests and bevelled edges, warm mirror-like reflections", "the bars clink together and a bright gleam sweeps across them"),
    ("SYM-H4", "Luxury Watch (premium symbol)", "an ornate gold-and-steel luxury wristwatch with a sapphire crystal, a deep navy dial with gold indices, standing upright on its open bracelet", "the hands spin rapidly and a glint flashes across the glass"),
    ("SYM-L1", "Ace — letter 'A' (low symbol)", "a chunky 3D letter 'A' in brushed gold metal with a red (#FF4C36) enamel inlay, bevelled edges and two small rivets, readable at 64 px", "it pops forward, the enamel glows and a gold shine sweeps over it"),
    ("SYM-L2", "King — letter 'K' (low symbol)", "a chunky 3D letter 'K' in brushed gold metal with a purple (#A34BFF) enamel inlay, bevelled edges and two small rivets, readable at 64 px", "it pops forward, the enamel glows and a gold shine sweeps over it"),
    ("SYM-L3", "Queen — letter 'Q' (low symbol)", "a chunky 3D letter 'Q' in brushed gold metal with an orange (#FFA12B) enamel inlay, bevelled edges and two small rivets, readable at 64 px", "it pops forward, the enamel glows and a gold shine sweeps over it"),
    ("SYM-L4", "Jack — letter 'J' (low symbol)", "a chunky 3D letter 'J' in brushed gold metal with a blue (#28B9EF) enamel inlay, bevelled edges and two small rivets, readable at 64 px", "it pops forward, the enamel glows and a gold shine sweeps over it"),
    ("SYM-WILD", "Getaway Van — WILD symbol", "a stubby, heroic cartoon getaway van in glossy red with white racing stripes, a roof spoiler, oversized chunky wheels and blazing headlights, a bold gold plate reading 'WILD' mounted on the grille; it must be instantly recognisable as the Wild and be the brightest, most saturated symbol on the reels", "the headlights flash, it bounces on its suspension and tyre smoke puffs out"),
    ("SYM-WILD-REEL", "Full-reel Wild (1×4 tall variant)", "a tall version of the red getaway van Wild spanning a whole reel (one cell wide, four cells tall): the van bursts upward through a road sign with tyre-smoke trails and speed lines filling the column, gold 'WILD' plate prominent", "the van revs, smoke streams and the column pulses with gold light"),
    ("SYM-SCATTER", "Bank Blueprint — SCATTER / bonus symbol", "a rolled-open royal-blue architectural blueprint of a bank vault with glowing white plan lines, a red 'X marks the spot' circle and a gold 'BONUS' stamp, curled corners and pushpins; it must clearly communicate 'this unlocks the bonus'", "the plan lines light up and trace toward the X while the stamp slams down"),
    ("SYM-ROXY", "Roxy crew symbol", "Roxy's head-and-shoulders portrait bursting out of a red (#FF4C36) circular badge frame with a chequered-flag rim; " + CHARS["ROXY"].split(" — ", 1)[1], "she pops out of the badge, winks and the badge rim spins like a wheel"),
    ("SYM-BYTE", "Byte crew symbol", "Byte's head-and-shoulders portrait inside a purple (#A34BFF) circuit-pattern badge, glasses flashing code; " + CHARS["BYTE"].split(" — ", 1)[1], "he glitches in, the circuit lines light up and he gives a nervous thumbs-up"),
    ("SYM-TANK", "Tank crew symbol", "Tank's head-and-shoulders portrait inside an orange (#FFA12B) riveted round vault-door badge; " + CHARS["TANK"].split(" — ", 1)[1], "the vault-door badge thuds down with dust and Tank grins"),
    ("SYM-FUSE", "Fuse crew symbol", "Fuse's head-and-shoulders portrait inside a blue (#28B9EF) badge with a sparking fuse running around the rim; " + CHARS["FUSE"].split(" — ", 1)[1], "the fuse fizzes around the rim and she pops out with a burst of confetti"),
]
for aid, title, subject, win in SYMS:
    add("2. Symbols", aid, f"{title} — static", "symbol",
        f"A single slot-machine symbol: {subject}. Isolated object centred on a transparent background, three-quarter front camera at eye level, identical scale, perspective and lighting to every other symbol in the set, strong silhouette and contrast so it reads instantly on a dark navy reel at phone size.")
    add("2. Symbols", f"{aid}-ANIM", f"{title} — land and win animations", "symbol_anim",
        f"Two animations for the slot symbol: {subject}. (1) LAND, 0.4 s: drops into its cell with a squash on impact and a springy settle. (2) WIN, 1.0 s, loopable: {win}, with a gold highlight pulse around the cell edge. Also a 4-second subtle IDLE loop (gentle shimmer or breathing glow).")
TRANSFORMS = [
    ("SYM-FX-CLONE-IN", "Clone-in transformation (Byte's System Clone)", "a symbol materialises in a cell through a purple (#A34BFF) holographic pixel-dissolve: scan lines sweep top to bottom, chromatic-aberration fringes flicker, a small 'COPY' glyph flashes, then the symbol solidifies", "0.5 s"),
    ("SYM-FX-UPGRADE-IN", "Upgrade transformation (Fuse's Big Bang Upgrade)", "the old symbol is engulfed by a colourful cartoon puff of rainbow smoke and stars, then the upgraded symbol bursts out with golden energy streaks and a shockwave ring", "0.5 s"),
    ("SYM-FX-VAULT-REVEAL", "Vault-loot reveal (Tank's Vault Breaker)", "the cell floor opens like a tiny vault hatch with gold light pouring up, and the loot symbol rises out on a pillar of golden sparkles", "0.6 s"),
    ("SYM-FX-WILD-STAMP", "Wild stamp (Roxy and meter Wilds)", "the red getaway van screeches sideways into the cell, leaving skid marks and tyre smoke, and parks with a bounce as its gold 'WILD' plate flashes", "0.5 s"),
    ("SYM-FX-CREW-EXIT", "Crew exit (crew symbol leaves the reels)", "the character jumps out of their badge toward the camera and runs off-frame toward the getaway van, and the replacement symbol (Wild in bonuses, Ace in the base game) drops into the empty cell", "0.6 s"),
]
for aid, title, action, length in TRANSFORMS:
    add("2. Symbols", aid, title, "symbol_anim",
        f"A {length} cell-sized transformation effect for slot symbols: {action}. Works on top of any of the 14 symbols, reads clearly at 2× speed, and ends exactly on the new symbol's static pose.")

# ------------------------------------------------------------------ backgrounds
BGS = [
    ("BG-MAIN", "Main base-game background — luxury bank exterior at night", "bg",
     "A wide cinematic establishing shot of an ultra-luxurious private bank at night: a towering art-deco façade with gold trim, marble columns, a glowing clock above huge bronze doors, searchlights sweeping a deep navy sky, rain-slick street reflecting warm gold window light and city neon; the red getaway van idles at the kerb on the lower left with exhaust puffing. Moody, inviting and slightly comedic (a 'CLOSED' sign hanging crooked)."),
    ("BG-MAIN-LOOP", "Main background ambient animation loop", "bg_loop",
     "A 12-second seamless ambient loop for the bank-exterior-at-night background: searchlights sweep slowly across the sky, fine rain streaks fall, puddles ripple, neon signs flicker gently, the getaway van's exhaust puffs and its hazard lights blink."),
    ("BG-VAULT", "Bank vault interior", "bg",
     "The interior of a colossal circular bank vault: a giant open round vault door with chrome locking bolts on the left, stacks of gold bars, overflowing money bags and sparkling jewels on shelves, a criss-cross of red laser beams, warm gold light pouring out of the vault onto polished marble floors."),
    ("BG-GARAGE", "Crew garage hideout", "bg",
     "An underground garage hideout: the modified red getaway van raised on a hydraulic lift, a cluttered workbench with each crew member's gear (Roxy's helmet, Byte's laptops, Tank's drills, Fuse's boxes of cartoon gadgets), bank blueprints pinned to a corkboard with red string, string lights, a buzzing neon sign reading 'ONE LAST JOB', oil stains and a coffee machine."),
    ("BG-HEIST", "THE HEIST bonus background — lavish bank interior", "bg",
     "The free-spins environment for The Heist: a lavish bank hall turned treasure trove, deposit boxes spilling gold coins, a crystal chandelier, velvet ropes knocked over, amber alarm lights flashing on marble walls and gold dust in the air; richer, warmer and more golden than the base game."),
    ("BG-ESCAPE", "THE PERFECT ESCAPE bonus background — neon city highway", "bg",
     "The free-spins environment for The Perfect Escape: the red getaway van racing along an elevated city highway at night, magenta and cyan neon signs and billboards, motion-blurred skyscrapers, light trails, distant cartoon police-light glow (playful, not threatening), banknotes fluttering out of the van's back doors; cooler and more electric than every other environment."),
    ("BG-ESCAPE-LOOP", "Perfect Escape parallax loop", "bg_loop",
     "An 8-second seamless parallax loop for the neon highway: road markings rushing toward the camera, signs and street lights passing on three depth layers, neon flicker, banknotes swirling in the slipstream."),
    ("BG-LOADING", "Loading-screen key art", "bg",
     "Loading-screen key art at dusk: the red getaway van parked outside the luxury bank with the four crew preparing around it — Roxy sitting on the bonnet spinning her steering wheel, Byte typing on his holographic laptop, Tank hefting the vault drill onto his shoulder, Fuse juggling cartoon gadgets — leaving clear space at the top centre for the game logo and at the bottom for a loading bar. Characters: " + "; ".join(CHARS.values()) + "."),
    ("BG-INTRO", "Intro cinematic key art", "bg",
     "Intro key art: the four crew members huddled around a bank blueprint spread on the garage workbench under a single dramatic top-down lamp, each reacting in character (Roxy confident, Byte sweating, Tank cracking knuckles, Fuse grinning mischievously), comic tension, deep shadows and gold rim light. Characters: " + "; ".join(CHARS.values()) + "."),
]
for aid, title, kind, body in BGS:
    add("3. Backgrounds and environments", aid, title, kind, body)

# ------------------------------------------------------------------ ability FX
ABIL = [
    ("ANIM-ROXY-ABILITY-FX", "Roxy — LANE SWITCH board effect", "Roxy slides into frame on a rolling mechanic's stool and yanks her steering wheel; tyre-screech smoke rings burst, two whole reel columns physically slide past each other with motion blur and skid marks on the reel glass, then a getaway-van Wild screeches into a cell. Dominant colours: Roxy red #FF4C36, white smoke, gold sparks."),
    ("ANIM-BYTE-ABILITY-FX", "Byte — SYSTEM CLONE board effect", "Byte flips open his holographic laptop, the screen glitches, purple scan beams sweep across the reels, the chosen symbol gets a pulsing purple outline, and copies of it materialise in other cells with pixel-dissolve, chromatic aberration and 'COPY' glyphs. Dominant colours: Byte purple #A34BFF, code green, white."),
    ("ANIM-TANK-ABILITY-FX", "Tank — VAULT BREAKER board effect", "Tank revs his drill, orange sparks spray, the whole grid shakes; a 2×2 or 3×3 block of cells turns into a round chrome vault door that unbolts (bolts fly off in cartoon arcs) and swings open, and loot symbols rise out of golden light inside. Dominant colours: Tank orange #FFA12B, chrome, gold."),
    ("ANIM-FUSE-ABILITY-FX", "Fuse — BIG BANG UPGRADE board effect", "Fuse slams her plunger detonator; a colourful cartoon explosion fills a 2×2 or 3×3 area (confetti, stars, rainbow smoke, no fire or debris), the smoke clears and upgraded symbols emerge with golden energy and an expanding shockwave ring. Dominant colours: Fuse blue #28B9EF, rainbow confetti, gold."),
    ("FX-CREW-CHAOS", "'CREW CHAOS!' title burst", "a board-wide comic-book title burst reading 'CREW CHAOS!' in chunky gold-and-red lettering with halftone dots, speed lines and colour streaks in each landed character's colour, punching in toward the camera and shattering away after 1 second."),
    ("FX-RESPIN", "Chaos Re-spin effect", "locked Wilds get a gold chain-and-padlock outline, all unlocked cells blur upward, a stencilled road sign reading 'CHAOS RE-SPIN' drops in from the top with a counter plate showing '1/4' (counter digit on a separate layer), then everything spins."),
    ("FX-RETRIGGER", "Free-spins retrigger effect", "rolled blueprints fly in from the Scatter positions, unroll in the centre of the reels and get stamped with a gold '+5 FREE SPINS' stamp (number on a separate layer), with paper confetti."),
    ("FX-WIN-WAY", "Winning-ways highlight", "an animated gold light path that traces each winning way from reel 1 to the last matching reel, plus a glowing gold frame on every winning cell, with small sparkles travelling along the path; subtle enough to show several ways at once."),
    ("FX-METER-STAGE", "Getaway Meter stage-reached burst", "a burst from the Getaway Meter: the gauge needle slams forward, the reached stage notch explodes in gold sparks and its reward icon (Wild, level chevron, re-spin arrow, ×2, chequered flag) flies to the reels."),
    ("FX-LOOT-MILESTONE", "Loot Meter milestone burst", "the vault-shaped Loot Meter overflows, gold coins cascade out and the milestone reward icon (+1 spin, ×2, +2 spins ×3) pops with a coin shower."),
]
for aid, title, body in ABIL:
    add("4. Feature effects", aid, title, "fx",
        f"A slot-game board effect: {body} Timing 1.2–2.2 s at normal speed; every beat must make clear which cells are affected so the player understands what happened.")

# ------------------------------------------------------------------ combos
COMBOS = [
    ("FX-COMBO-RB", "Roxy + Byte — HOT-WIRED CLONE", "Byte jacks a glowing cable into Roxy's steering wheel; the wheel's centre becomes a hacked dashboard screen; as Roxy swerves, the swapping reel columns leave purple holographic after-images that solidify into two extra clones of the cloned symbol. Red and purple light trails intertwine. Title 'HOT-WIRED CLONE' in red-to-purple chrome."),
    ("FX-COMBO-BT", "Byte + Tank — VAULT CLONE", "Tank holds the heavy vault door open with one arm while Byte scans the loot inside with his laptop; a purple copy beam fires two duplicates of the best loot symbol out of the vault into other cells. Orange vault glow cut with purple scan lines. Title 'VAULT CLONE' in orange-to-purple chrome."),
    ("FX-COMBO-TF", "Tank + Fuse — GOLDEN VAULT", "Fuse tosses a sparkling gadget into Tank's open vault; a golden pressure blast blows out of the door and every loot item inside glows and levels up. Gold shockwave, orange sparks, blue confetti. Title 'GOLDEN VAULT' in orange-to-blue chrome."),
    ("FX-COMBO-FR", "Fuse + Roxy — BLAST DRIFT", "Fuse's explosion launches Roxy's van into a sideways drift; the van hooks the reel column holding the most upgraded symbols and drags it into reel 2, leaving a blue smoke donut and red tail-light streaks. Title 'BLAST DRIFT' in blue-to-red chrome."),
    ("FX-COMBO-RT", "Roxy + Tank — ARMORED GETAWAY", "Tank chains the vault to Roxy's van bumper and the van floors it, hauling the whole vault column across the board into reel 1 with sparks dragging on the asphalt and the chain snapping taut. Title 'ARMORED GETAWAY' in red-to-orange chrome."),
]
for aid, title, body in COMBOS:
    add("5. Combination cinematics", aid, title, "cinematic",
        f"A 1.5–2.0-second combination cinematic for two crew members, staged over the reels: {body} It must look and sound unlike every other combo — no shared explosion or transition. Characters: " + "; ".join(CHARS.values()) + ".")
add("5. Combination cinematics", "CIN-PERFECTLY-BAD-PLAN", "PERFECTLY BAD PLAN — all four crew", "cinematic",
    "A 3-second full-screen comic-panel cinematic, the most energetic moment of the base game: the screen splits into four tilted comic panels, each showing one crew member's mistake (Roxy reverses the van into the wall, Byte opens the wrong account and money pours out of his laptop, Tank drills the wrong door and finds a broom cupboard, Fuse detonates too early and blows confetti everywhere); the panels shatter, the camera pulls back and reveals it all worked out — loot everywhere — then a giant gold '×3' stamp and the title 'PERFECTLY BAD PLAN!' slam onto the screen. Characters: " + "; ".join(CHARS.values()) + ".")
add("5. Combination cinematics", "CIN-CLEAN-GETAWAY", "CLEAN GETAWAY — Getaway Meter stage 5", "cinematic",
    "A 2-second cinematic: the red getaway van speeds through a row of traffic lights that all flick to green in sequence, the Getaway Meter gauge bursts, and chrome letters reading 'CLEAN GETAWAY ×5' race across the screen with a chequered-flag wipe.")

# ------------------------------------------------------------------ UI
UI = [
    ("UI-LOGO", "Game logo", "The game logo: 'GETAWAY GANG' in bold, chunky, comic-heist 3D lettering with gold chrome faces, a thick red (#FF4C36) outline and a speed-line swoosh, with a red getaway-van silhouette bursting through the first 'G'; below it, the subtitle 'ONE LAST JOB!' on a red stencilled tape strip. Text must be spelled exactly as written. 2048×1024 px transparent PNG plus an animated version (2 s) where the van drives through the letters and they bounce into place."),
    ("UI-REEL-FRAME", "Reel frame (6×4)", "A frame around a 6-column × 4-row reel window designed as a reinforced vault window: brushed-steel bezel, gold rivets, chunky corner bolts, inner bevel and a deep-navy glass inner edge. Provide a 9-slice version and a bonus variant with an animated gold rim glow."),
    ("UI-REEL-BG", "Reel background", "The panel behind the reels: deep navy (#0D1530) with a subtle banknote guilloché pattern at about 8% opacity and thin gold column separators between the 6 reels; must not compete with the symbols."),
    ("UI-SPIN", "Spin button", "A large round spin button styled as a vault combination dial: brushed steel with tick marks around the rim, a gold centre with a white circular-arrow glyph; spinning state rotates the dial; a stop state shows a white square glyph. 240×240 px @2x."),
    ("UI-AUTOPLAY", "Autoplay button", "A round secondary button in the same steel-and-gold family with a white looping-arrows glyph and a small counter badge slot for remaining spins."),
    ("UI-TURBO", "Turbo button", "A round secondary button in the steel-and-gold family with a white lightning-bolt glyph; active state glows gold."),
    ("UI-SOUND", "Sound button", "A round secondary button in the steel-and-gold family with a white speaker glyph; muted state shows the speaker with a red slash."),
    ("UI-SETTINGS", "Settings button", "A round secondary button in the steel-and-gold family with a white cog glyph."),
    ("UI-INFO", "Info / paytable button", "A round secondary button in the steel-and-gold family with a white 'i' glyph."),
    ("UI-BET", "Bet panel", "A horizontal deep-navy glass capsule with steel − and + buttons on each side and the bet value in large white tabular numerals in the centre, with a small 'BET' label above; 9-slice."),
    ("UI-BALANCE", "Balance display", "A deep-navy glass capsule with a small 'BALANCE' label and a large white tabular-numeral value; 9-slice."),
    ("UI-WIN", "Win display", "A deep-navy glass capsule with a small 'WIN' label and a large gold tabular-numeral value, plus a gold flare animation that plays while the number counts up; 9-slice."),
    ("UI-FS-COUNTER", "Free-spin counter", "A plaque styled as a blueprint tag reading 'FREE SPINS' with a large counter area 'N / M' (numbers on a separate layer) and a slot for the active bonus name ('THE HEIST' or 'THE PERFECT ESCAPE')."),
    ("UI-METER-GETAWAY", "Getaway Meter", "A horizontal speedometer-styled progress bar with 5 numbered notches (1–5) that fills with gold from left to right, a tiny red getaway-van icon riding the leading edge, and a reward icon above each notch: a Wild van, a level-up chevron, a re-spin arrow, a '×2' badge and a chequered flag with '×5'; reached notches glow."),
    ("UI-METER-LOOT", "Loot Meter (The Heist only)", "A vault-shaped progress bar that fills with tumbling gold coins, with four milestone markers at 4, 8, 12 and 16 points showing their rewards: '+1 spin', '×2', '+1 spin', and '+2 spins ×3' with a crew level-up chevron; reached milestones light up."),
    ("UI-CREW-LEVELS", "Crew upgrade panel (The Perfect Escape only)", "A panel with four circular mini-portraits (Roxy, Byte, Tank, Fuse in their badge frames) each with three star pips that light up in the character's colour as the character levels from 1 to 3, and a 'MASTER' ribbon at level 3."),
    ("UI-MULT", "Multiplier badge", "A chrome sticker badge reading '×N' (number on a separate layer) with a gold burst behind it and a small label slot for its source (Crew Combo, Getaway Meter, Loot Meter)."),
    ("UI-RESPIN", "Re-spin chain indicator", "Four small padlock icons in a row that light up gold one by one as Chaos Re-spins are used, with a 'CHAOS RE-SPINS' label."),
    ("UI-PAYTABLE", "Paytable and rules pages", "A set of deep-navy rules pages with gold headers: the symbol paytable (each symbol render with its 3/4/5/6-of-a-kind pays), a 4,096-ways diagram, one illustrated page per crew ability showing a before/after mini-board, a combo page, the Getaway Meter, The Heist and The Perfect Escape pages; text on separate layers for localisation."),
    ("UI-SETTINGS-PANEL", "Settings panel", "A modal panel in steel and navy glass with sliders for music volume and sound-effects volume, toggles for voice lines, turbo and intro animations, a spacebar hint and a game-history link; large touch-friendly controls."),
]
for aid, title, body in UI:
    add("6. User interface", aid, title, "ui", body)

# ------------------------------------------------------------------ screens
SCREENS = [
    ("SCR-LOADING", "Loading screen", "screen", "The loading screen: the loading key art (getaway van outside the bank at dusk with the four crew preparing) with the animated GETAWAY GANG logo at the top and a loading bar shaped like a road along which the little red van drives from left to right as loading progresses; 'Loading…' label on a separate layer."),
    ("SCR-HEIST-INTRO", "THE HEIST intro screen", "screen", "The Heist bonus intro: the crew bursts through a giant vault door, gold coins spray toward the camera, the title 'THE HEIST' stamps in gold, with a '10 FREE SPINS' plaque and a 'LOOT METER ACTIVE' ribbon (numbers and text on separate layers) and a 'press anywhere to continue' prompt."),
    ("SCR-ESCAPE-INTRO", "THE PERFECT ESCAPE intro screen", "screen", "The Perfect Escape bonus intro: the red van rockets out of the garage onto the neon highway with the four crew posing on and in it, the title 'THE PERFECT ESCAPE' written in neon light trails, a '12 FREE SPINS' plaque and a 'CREW UPGRADES PERSIST' ribbon, plus a 'press anywhere to continue' prompt."),
    ("SCR-HEIST-OUTRO", "THE HEIST end screen", "screen", "The Heist end screen: the crew lounging on a mountain of gold inside the vault, a large total-win counter in gold numerals and a Loot Meter summary showing the milestones reached."),
    ("SCR-ESCAPE-OUTRO", "THE PERFECT ESCAPE end screen", "screen", "The Perfect Escape end screen: the getaway van parked on a cliff above the city at sunrise, the crew celebrating on its roof, each character's final level shown as stars, and a large total-win counter."),
    ("CIN-FINAL-ESCAPE", "Final Escape cinematic", "cinematic", "The end-of-bonus Final Escape cinematic for The Perfect Escape (6–8 s, skippable): the van screeches away from the bank, quick cuts to each crew member reacting with their level shown as three stars, any character at Level 3 gets a 'MASTER' stamp, and the Final Escape award ('+30×' per master, '+300×' if all four, numbers on a separate layer) counts up into the total. It only displays the award already in the game result — it never implies a new random event."),
    ("SCR-BONUS-RESUME", "Resume screen", "screen", "A splash for resuming an interrupted round: the crew peeking out of the van's back doors with the text 'Resuming your getaway…' and a small spinner shaped like a steering wheel."),
]
for aid, title, kind, body in SCREENS:
    add("7. Screens", aid, title, kind, body)

# ------------------------------------------------------------------ wins
WINS = [
    ("WIN-SMALL", "Small win (win level 2–5, under 15× bet)", "gold sparkles on the winning cells and a soft coin glint along the winning ways; no full-screen takeover; 0.8–1.5 s depending on size"),
    ("WIN-BIG", "BIG WIN (15×–30× bet)", "a chrome 'BIG WIN' title punches in over the reels, a coin fountain erupts from the bottom of the screen, and the four crew peek in from the frame edges cheering; 4 s with a gold win counter"),
    ("WIN-SUPER", "SUPER WIN (30×–50× bet)", "a chrome 'SUPER WIN' title, the getaway van drifts across the screen dropping money bags that burst into coins; 5 s"),
    ("WIN-MEGA", "MEGA WIN (50×–100× bet)", "a gold 'MEGA WIN' title, gold bars rain from the top of the screen and Tank juggles a money bag in the foreground; 6 s"),
    ("WIN-EPIC", "EPIC WIN (100×–12,000× bet)", "an 'EPIC WIN' title in giant gold chrome, the vault door blows open and a torrent of loot floods the screen while all four crew surf on money bags; 8 s"),
    ("CIN-MAX-WIN", "MAXIMUM WIN (12,000× bet)", "the most elaborate sequence in the game, 8–10 s: the camera flies out of the bank through the night city, the van does a victory donut in front of the bank, fireworks spell 'MAXIMUM WIN', the crew poses on the van roof and '12,000×' appears in giant gold numerals; the skip button appears after 2 s"),
]
for aid, title, body in WINS:
    add("8. Win celebrations", aid, title, "cinematic",
        f"A slot win celebration for {title}: {body}. The win amount counter (gold tabular numerals) sits on its own layer and counts up in sync; every celebration is skippable by tap or spacebar and must scale cleanly to phone portrait. Characters: " + "; ".join(CHARS.values()) + ".")

# ------------------------------------------------------------------ audio
MUSIC = [
    ("MUS-MAIN", "Base-game music", "a funky heist-caper instrumental: clavinet riffs, wah-wah guitar, slap bass, a tight horn section and brushed drums, 96–104 BPM, cool and confident with a wink of comedy; 2:00 seamless loop with stems for rhythm, bass, horns and percussion so intensity can rise during features"),
    ("MUS-HEIST", "THE HEIST bonus music", "a bigger, tenser funk-orchestral hybrid: staccato strings, brass stabs every 8 bars, a ticking-clock percussion bed and a sneaky bass line, 110 BPM; 1:30 seamless loop"),
    ("MUS-ESCAPE", "THE PERFECT ESCAPE bonus music", "a high-energy synth-funk chase: driving bass, retro synth arpeggios, punchy drums and a playful siren-like lead (never alarming), 124 BPM; 1:30 seamless loop"),
    ("MUS-INTRO", "Intro and loading theme", "a 20-second cinematic version of the main theme that builds from a lone clavinet to the full band and ends on a big horn hit"),
    ("MUS-WIN-BIG", "Big Win stinger", "a 4-second celebratory funk stinger with horns and a cymbal swell, in the key of the main theme"),
    ("MUS-WIN-SUPER", "Super Win stinger", "a 5-second stinger one step up in key with added guitar licks"),
    ("MUS-WIN-MEGA", "Mega Win stinger", "a 6-second stinger with full horns, choir 'hey!' shouts and a drum fill"),
    ("MUS-WIN-EPIC", "Epic Win stinger", "an 8-second triumphant stinger with orchestra and band together and a rising key change"),
    ("MUS-WIN-MAX", "Maximum Win fanfare", "a 12-second all-out fanfare: full brass, choir, timpani rolls and a final sustained chord with fireworks-like percussion hits"),
]
for aid, title, body in MUSIC:
    add("9. Music", aid, title, "music", f"Original music for {GAME}: {body}. Must stay instrumental (no lyrics), feel like a premium animated heist comedy, and mix cleanly under sound effects.")
SFX = [
    ("SFX-SPIN", "Reel spin start", "a mechanical whoosh with a light vault-dial click, stereo, 0.5 s, 3 variations"),
    ("SFX-REEL-STOP", "Reel stop", "a short metallic thunk with a gold ting, mono, 0.25 s, 3 variations"),
    ("SFX-LAND-PREMIUM", "Premium symbol land", "a bright gem or coin chime, mono, 0.4 s, one variant per premium symbol"),
    ("SFX-LAND-WILD", "Wild land", "a cartoon van horn honk with a tyre chirp, stereo, 0.6 s"),
    ("SFX-LAND-SCATTER", "Scatter land (1–6)", "a crisp paper blueprint snap followed by a rising chime, six versions rising in pitch for the 1st to 6th Scatter, mono, 0.6 s"),
    ("SFX-ROXY", "Roxy ability", "an engine rev, a long tyre screech and a gear shift clunk, stereo, 1.8 s"),
    ("SFX-BYTE", "Byte ability", "a frantic keyboard flurry, a digital glitch stutter and a scanning 'bweep', stereo, 1.8 s"),
    ("SFX-TANK", "Tank ability", "a drill whine winding up, metal clanks, bolts popping off and a heavy vault-door creak, stereo, 2.0 s"),
    ("SFX-FUSE", "Fuse ability", "a fuse sizzle, a cartoon 'ka-POW' with a confetti pop and a sparkly tail, stereo, 1.8 s"),
    ("SFX-COMBO-RB", "Combo Hot-Wired Clone", "an engine rev glitched through a digital filter, ending on a copy 'bweep' chord, stereo, 1.6 s"),
    ("SFX-COMBO-BT", "Combo Vault Clone", "a heavy vault creak overlaid with a scanning beam and two duplicate chimes, stereo, 1.6 s"),
    ("SFX-COMBO-TF", "Combo Golden Vault", "a pressure blast from inside a metal vault with golden shimmer and coin rattle, stereo, 1.6 s"),
    ("SFX-COMBO-FR", "Combo Blast Drift", "a cartoon explosion that turns into a long tyre drift, stereo, 1.6 s"),
    ("SFX-COMBO-RT", "Combo Armored Getaway", "a chain snapping taut, an engine roar and metal dragging on asphalt with sparks, stereo, 1.8 s"),
    ("SFX-PBP", "Perfectly Bad Plan", "a record scratch, a comedic multi-layer crash (car horn, cash register, confetti pop) and a triumphant horn hit, stereo, 3.0 s"),
    ("SFX-RESPIN", "Chaos Re-spin", "a chain-lock clink and a quick rising whoosh, stereo, 0.8 s"),
    ("SFX-METER-STAGE", "Getaway Meter stage (1–5)", "rising gauge dings, five versions climbing in pitch; stage 5 adds an engine roar and a big chime, stereo, 0.8–1.5 s"),
    ("SFX-LOOT-MILESTONE", "Loot Meter milestone", "a cascade of gold coins with a cash-register 'ka-ching', stereo, 1.2 s"),
    ("SFX-WIN-COUNT", "Win counter loop", "a seamless coin-counting tick loop for the win ticker, mono, 2 s loop"),
    ("SFX-UI-CLICK", "UI button press", "a soft tactile steel click, mono, 0.1 s, 3 variations"),
]
for aid, title, body in SFX:
    add("10. Sound effects", aid, title, "sfx", f"Original sound effect for {GAME}: {title} — {body}. Cartoon-punchy, premium and family-friendly, matched in loudness to the rest of the set.")
VO = [
    ("VO-ROXY", "Roxy voice lines", "a confident, sarcastic woman in her late twenties with a quick, playful drawl", ['"Everybody hold on!"', '"Lane change!"', '"Who needs brakes?"']),
    ("VO-BYTE", "Byte voice lines", "a nervous, fast-talking young man whose voice cracks when excited", ['"I may have opened the wrong account!"', '"Copy that… literally."', '"Okay, okay, don\'t panic!"']),
    ("VO-TANK", "Tank voice lines", "a big, booming, warm baritone who sounds impatient but lovable", ['"That\'s definitely not the right vault!"', '"Stand back!"', '"Shiny!"']),
    ("VO-FUSE", "Fuse voice lines", "an energetic, mischievous young woman who giggles mid-sentence", ['"Good news. The door is gone!"', '"Oops. Big oops!"', '"Ka-boom!"']),
    ("VO-CREW-PBP", "All-crew Perfectly Bad Plan line", "all four crew voices together, surprised and delighted", ['"That… actually worked?!"']),
]
for aid, title, voice, lines in VO:
    add("11. Voice", aid, title, "vo", f"Character voice recording for {GAME}: {voice}. Lines: {'; '.join(lines)}. Comedic animated-film performance, clear diction, no profanity; voice lines are optional in game settings.")


def render():
    out = []
    w = out.append
    w("# GETAWAY GANG: ONE LAST JOB! — Asset Production Prompts\n")
    w("One complete, self-contained prompt per asset. Copy any single prompt into an image, video or audio "
      "generator, or send it to an artist; it carries everything needed: purpose, subject, composition, style, "
      "palette, animation and delivery spec.\n")
    w("Each **asset ID** matches a `TEMP · <ID>` label in the playable build, or the placeholder that will be replaced. "
      "Swapping in the delivered file with the same ID needs no game-logic change (see "
      "[`frontend/README.md`](../frontend/README.md)). All characters, logos and environments are original IP.\n")
    w(f"Generated by `art/asset_prompts.py`: **{len(ASSETS)} assets**.\n")
    sections = []
    for sec, *_ in ASSETS:
        if sec not in sections:
            sections.append(sec)
    w("## Contents\n")
    for sec in sections:
        n = sum(1 for a in ASSETS if a[0] == sec)
        anchor = sec.lower().replace(" ", "-").replace(".", "").replace(",", "")
        w(f"- [{sec}](#{anchor}) — {n} assets")
    w("")
    visual = {"char_sheet", "char_anim", "symbol", "symbol_anim", "bg", "bg_loop", "fx", "cinematic", "ui", "screen"}
    for sec in sections:
        w(f"## {sec}\n")
        for s2, aid, title, kind, body in ASSETS:
            if s2 != sec:
                continue
            w(f"### {aid} — {title}\n")
            if kind in visual:
                style = STYLE_UI if kind == "ui" else STYLE_3D
                prompt = (f"Create the asset \"{title}\" for {GAME}. {body} {style} {PALETTE} {SPEC[kind]} {NEG}")
            else:
                prompt = f"{body} {SPEC[kind]}"
            w("```text\n" + prompt + "\n```\n")
    w("## Replacement map (where each placeholder lives in code)\n")
    w("| Placeholder in the build | File | Replaced by |\n|---|---|---|")
    for row in [
        ("Coloured symbol tiles `TEMP · SYM-*`", "`frontend/getaway_gang/src/components/Symbol.svelte`, `game/tempArt.ts`", "SYM-* statics + SYM-*-ANIM + SYM-FX-*"),
        ("Feature title cards `TEMP · ANIM-*/FX-*/CIN-*`", "`components/FeatureBanner.svelte`", "ANIM-*-ABILITY-FX, FX-*, FX-COMBO-*, CIN-*"),
        ("Coloured cell outlines", "`components/CellHighlights.svelte`", "FX-WIN-WAY and the ability effects"),
        ("Flat background `TEMP BACKGROUND · BG-*`", "`components/Background.svelte`", "BG-MAIN/BG-HEIST/BG-ESCAPE + loops"),
        ("Grey reel frame", "`components/BoardFrame.svelte`", "UI-REEL-FRAME, UI-REEL-BG"),
        ("Text HUD", "`components/Hud.svelte`", "UI-METER-GETAWAY, UI-METER-LOOT, UI-CREW-LEVELS, UI-MULT, UI-RESPIN"),
        ("Free-spin panel", "`components/FreeSpinCounter.svelte`", "UI-FS-COUNTER"),
        ("`ONE LAST JOB! · TEMP LOGO`", "`components/Game.svelte`", "UI-LOGO"),
        ("web-sdk sample loader, free-spin intro/outro, big-win spine, coins, fonts, sounds", "`game/assets.ts`", "SCR-*, WIN-*, CIN-MAX-WIN, MUS-*, SFX-*, VO-*"),
        ("Red `TEMPORARY ART — NOT FOR RELEASE` watermark", "`components/TempWatermark.svelte`", "Remove for release"),
    ]:
        w("| " + " | ".join(row) + " |")
    w("")
    with open(OUT, "w", encoding="UTF-8") as f:
        f.write("\n".join(out))
    print(f"wrote {OUT}: {len(ASSETS)} prompts")


if __name__ == "__main__":
    render()
