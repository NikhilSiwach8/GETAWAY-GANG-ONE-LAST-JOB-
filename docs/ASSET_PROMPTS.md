# GETAWAY GANG: ONE LAST JOB! — Asset Production Prompts

Every visual and audio asset the game needs, with a ready-to-use generation / commissioning prompt.
Each **asset ID** matches a `TEMP · <ID>` label in the playable build: the placeholder you see on
screen is replaced by the asset with the same ID. Assets that are not tied to a placeholder label
(character sheets, animation sets, audio, the cinematics without a title card) have IDs that start
with the same family prefix.

**How to use**
1. Paste the **Global Style Block** in front of every image or video prompt, so the whole game shares one look.
2. Then add the asset's own prompt, and its negative prompt where one is given.
3. Deliver files at the listed spec. Engineers swap them in by asset ID. No game logic changes.

Original IP: do not reference, imitate or resemble any existing slot game, studio, film, or
character. All characters, logos and environments are new.

---

## 0. Global Style Block (prepend to every visual prompt)

> Premium stylized 3D animated feature-film look, comic-book action-comedy energy. Characters have
> slightly exaggerated proportions, big expressive faces, clean readable silhouettes and rich
> material detail: fabric weave, worn leather, brushed and painted metal, glossy plastics, cut gems
> with real refraction. Cinematic three-point lighting with a warm vault-gold key (#F7C947), cool
> blue-navy rim and fill, soft global illumination and subtle ambient occlusion. Night palette of
> deep navy (#0D1530), charcoal (#1C1F26) and metallic grey, with saturated character accent colours:
> Roxy red #FF4C36, Byte purple #A34BFF, Tank orange #FFA12B, Fuse blue #28B9EF. Family-friendly
> cartoon tone with no realistic weapons, no blood, no menace. High detail, sharp focus, 4K render
> quality, consistent 3/4 front camera at eye level.

**Global negative prompt**
> flat vector, 2D clip-art, anime, photoreal humans, gore, guns, realistic weapons, horror, text,
> watermark, logo, signature, blurry, low-poly, noisy, oversaturated, inconsistent lighting,
> extra limbs, deformed hands, cropped heads, any resemblance to existing slot game characters.

**Deliverable conventions**

| Type | Format | Size | Notes |
|---|---|---|---|
| Symbols (static) | PNG/WebP, transparent | 512×512 (art inside 460×460 safe area) | Same camera and light for all symbols |
| Symbol animations | Spine 4.x (`.json` + `.atlas`), or WebP sequence at 30 fps | 512×512 | Tracks: `idle`, `land`, `win`, plus per-symbol extras |
| Characters (in-game) | Spine 4.x skeletons, or 3D renders to sprite sheets | 1024×1024 per frame | Transparent |
| Backgrounds | WebP, layered PSD source | 3840×2160 landscape **and** 2160×3840 portrait | Board area kept low-contrast |
| UI | PNG/WebP + 9-slice where noted | @2x | Min touch target 88×88 px @2x |
| Cinematics | Spine, or WebM (VP9 + alpha) 30 fps | 1920×1080 (portrait cut 1080×1920) | All skippable |
| Audio | OGG + M4A, 48 kHz, −16 LUFS integrated | — | Seamless loops trimmed at zero crossings |

All fonts and assets must be bundled for the Stake CDN. No runtime downloads from other origins.

---

## 1. Characters (CHR)

Each character needs: a **model / turnaround sheet**, an **expression sheet**, and the **animation
set** in §1.5. Base pose for in-game use: 3/4 front, full body, transparent background.

### CHR-ROXY — Roxy, The Wheelwoman (red #FF4C36)
> Original 3D cartoon character, a female getaway driver in her late 20s with a lean, angular, athletic
> silhouette. She wears a fitted cherry-red racing jacket with white stripe piping and a lightning-bolt
> patch, aviator goggles pushed up on a windswept auburn ponytail, fingerless black leather driving
> gloves, slim dark-grey sport trousers and scuffed high-top racing boots. She spins a chunky custom
> steering wheel on one finger like a basketball. Confident smirk, one eyebrow raised, chin up:
> reckless, sarcastic, fearless. Slightly exaggerated proportions (long legs, big hands and eyes).
> Turnaround sheet: front, 3/4, side, back, T-pose, plain neutral grey background.

### CHR-BYTE — Byte, The Hacker (purple #A34BFF)
> Original 3D cartoon character, a male hacker in his mid 20s with a slim, hunched, round-shouldered
> silhouette and a big head. He wears an oversized violet hoodie with circuit-trace embroidery,
> enormous rectangular digital glasses whose lenses scroll faint green code, a floating translucent
> holographic laptop, a lanyard of USB keys, mismatched sneakers and a small antenna-earpiece. His
> expressive, nervous face shows a wide-eyed, sweaty half-grin, like he's talking too fast:
> brilliant, nervous, sarcastic. Turnaround sheet: front, 3/4, side, back, T-pose, plain grey.

### CHR-TANK — Tank, The Safecracker (orange #FFA12B)
> Original 3D cartoon character, a huge, muscular, lovable safecracker with a wide rectangular
> silhouette, massive forearms and tiny legs. He wears a hi-vis orange utility vest over a grey
> T-shirt, heavy padded work gloves, a tool belt stuffed with stethoscope, wrenches and chalk, and a
> red bandana. He carries an oversized industrial vault drill with a glowing orange bit. He is loud,
> impatient and soft-hearted: a big toothy grin, a bushy beard, little eyes. Turnaround sheet: front,
> 3/4, side, back, T-pose, plain grey.

### CHR-FUSE — Fuse, The Demolition Expert (blue #28B9EF)
> Original 3D cartoon character, a female demolition expert in her early 20s with an asymmetric,
> spiky silhouette. She wears a cropped sky-blue bomber jacket covered in patches, a utility belt of
> cartoon-style round "boom" gadgets with confetti fuses, ripped navy cargo pants and chunky boots.
> Her messy short hair has electric-blue tips, plus goggles on her forehead and soot smudges on her
> cheeks. She holds a big cartoon plunger detonator. Mischievous wide grin and sparkling eyes:
> fearless, unpredictable, chaotic. Turnaround sheet: front, 3/4, side, back, T-pose, plain grey.

### CHR-EXPR — Expression sheets (one per character)
> Expression sheet of [CHARACTER], head and shoulders, 12 expressions in a 4×3 grid: neutral, idle
> smile, focused, surprised, panicked, laughing, smug, frustrated, celebrating, embarrassed,
> determined, winking. Same lighting and camera in every cell, plain grey background.

### 1.5 Character animation set (per character: ROXY, BYTE, TANK, FUSE)

| ID | Length | Description to animator |
|---|---|---|
| ANIM-[C]-IDLE | 4 s loop | Breathing, blinking and eye darts, a small personality fidget (Roxy taps the wheel, Byte pushes up his glasses, Tank cracks his knuckles, Fuse flips a gadget) |
| ANIM-[C]-ABILITY | 1.6–2.2 s | Feature activation (see §4). Ends on a hold pose for the board effect |
| ANIM-[C]-COMPLETE | 0.8 s | Proud beat after the ability resolves |
| ANIM-[C]-WIN | 1.2 s | Reacts to a win: fist pump / nervous cheer / chest bump / jump-spin |
| ANIM-[C]-LOSE | 1.0 s | Comedic shrug, eye roll or facepalm. Never sad or hurt |
| ANIM-[C]-BONUS-INTRO | 2.0 s | Runs into frame for the bonus intro, hero pose |
| ANIM-[C]-VICTORY | 3.0 s | End-of-bonus celebration, throws loot in the air |
| ANIM-[C]-COMBO | 1.5 s | Pose for each partner combo (§5); two characters interact in shot |

Voice lines (§10) are keyed to ABILITY and WIN.

---

## 2. Symbols (SYM)

All symbols share one camera, one key light (top-left, warm) and one rim light (bottom-right,
cool). Every symbol needs **static**, **land** (0.4 s squash and settle), **win** (1.0 s loop-able
glow and bounce) and a **separate highlight-glow layer** (additive PNG).

| ID | Symbol | Prompt |
|---|---|---|
| SYM-H1 | Diamond (top premium) | A single huge brilliant-cut diamond floating at a slight angle, ice-blue refraction with rainbow caustic sparkles, a thin gold bezel ring around it, crisp highlights, on a transparent background. Win: it spins 360° and throws prismatic light |
| SYM-H2 | Money Bag | A plump burlap money bag tied with gold rope and printed with a big gold "$". Stacks of cartoon banknotes peek out of the top. Soft fabric folds. Win: it bounces and coins spill |
| SYM-H3 | Gold Bars | A neat pyramid of three glossy gold bullion bars with stamped bank crests, warm reflections. Win: the bars clink and gleam in a sweep |
| SYM-H4 | Luxury Watch | An ornate gold-and-steel luxury wristwatch with a sapphire crystal and a navy dial, standing on its open bracelet. Win: the hands spin fast and the glass glints |
| SYM-L1 | Ace "A" | A chunky 3D letter "A" in brushed gold metal with a red enamel inlay (Roxy tint) and bevelled edges, a small rivet detail. Readable at 64 px |
| SYM-L2 | King "K" | A chunky 3D letter "K", brushed gold with purple enamel inlay (Byte tint) |
| SYM-L3 | Queen "Q" | A chunky 3D letter "Q", brushed gold with orange enamel inlay (Tank tint) |
| SYM-L4 | Jack "J" | A chunky 3D letter "J", brushed gold with blue enamel inlay (Fuse tint) |
| SYM-WILD | Getaway Van (Wild) | A stubby, heroic cartoon getaway van in glossy red with racing stripes, a roof spoiler, oversized wheels and headlights blazing. A bold gold "WILD" plate is on the grille. It must be **instantly recognisable** and brighter than every other symbol. Land: drops in with a tyre squeal. Win: headlights flash and it bounces on its suspension |
| SYM-WILD-REEL | Full-reel Wild variant | 1×4 tall version: the van bursts through a road sign that spans the whole reel, with tyre-smoke trails |
| SYM-SCATTER | Bank Blueprint (Scatter) | A rolled-open royal-blue architectural blueprint of a bank vault with glowing white lines, a red "X marks the spot" circle and a "BONUS" gold stamp, slightly curled corners. It must read as "this unlocks something". Land: it unrolls with a paper snap. Win: lines glow and trace to the X |
| SYM-ROXY | Roxy crew symbol | Roxy's head-and-shoulders portrait bursting out of a red circular badge frame with a chequered-flag rim, smirking, goggles on. Land: she pops out of the badge |
| SYM-BYTE | Byte crew symbol | Byte's portrait in a purple circuit-pattern badge, glasses flashing code. Land: a digital glitch-in |
| SYM-TANK | Tank crew symbol | Tank's portrait in an orange riveted vault-door badge, grinning. Land: the badge thuds down with dust |
| SYM-FUSE | Fuse crew symbol | Fuse's portrait in a blue badge with a sparking fuse running around the rim. Land: a confetti pop |

**Transformation animations (per symbol, used by features):**
`SYM-*-CLONE-IN` (purple holographic materialise, 0.5 s) · `SYM-*-UPGRADE-IN` (gold energy burst
and reveal, 0.5 s) · `SYM-*-VAULT-REVEAL` (rises out of the vault floor, 0.6 s) · `SYM-WILD-STAMP`
(the van screeches into the cell, 0.5 s) · `SYM-CREW-EXIT` (the character jumps out of the badge
toward the van and leaves the replacement symbol, 0.6 s).

---

## 3. Backgrounds and environments (BG)

Keep the area behind the 6×4 reels darker and lower in detail, so the symbols always read clearly.

| ID | Prompt |
|---|---|
| BG-MAIN | Wide establishing shot of an ultra-luxury private bank at night, a towering art-deco facade with gold trim, marble columns, a glowing clock and searchlights sweeping the sky. A rainy street reflects city lights, and the red getaway van idles at the kerb. Deep navy sky with warm gold window light. Cinematic depth of field |
| BG-MAIN-LOOP | Ambient loop for BG-MAIN: searchlights sweeping, rain streaks, flickering neon, the van's exhaust puffing. 12 s seamless |
| BG-VAULT | Interior of a colossal circular bank vault: a giant open round vault door with chrome bolts, piles of gold bars, money bags, sparkling jewels, laser grids in red. Warm gold light pours from the vault |
| BG-GARAGE | An underground crew garage hideout: the modified getaway van on a lift, tools, blueprints pinned on a corkboard, a neon "ONE LAST JOB" sign, string lights, a workbench with each crew member's gear |
| BG-HEIST | Free-spins environment for THE HEIST: a lavish bank interior and vault hall, gold overflowing from deposit boxes, a chandelier, velvet ropes, alarm lights flashing amber. Richer and warmer than BG-MAIN |
| BG-ESCAPE | Free-spins environment for THE PERFECT ESCAPE: the red getaway van racing along an elevated neon city highway at night, magenta and cyan signs, motion-blurred skyscrapers, police-light glow in the distance (cartoon, not threatening), banknotes fluttering out of the van |
| BG-ESCAPE-LOOP | Parallax loop for BG-ESCAPE: road lines rushing, signs passing, 8 s seamless |
| BG-LOADING | Loading screen: the getaway van parked outside the bank at dusk, the four crew around it checking equipment (Roxy on the bonnet, Byte typing, Tank hefting the drill, Fuse juggling gadgets), with the logo space at the top |
| BG-INTRO | Intro cinematic key art: the crew huddled in the garage over a bank blueprint, dramatic top-down lamp light, comic tension |

Portrait versions: re-compose with the reel area centred and the sky or ceiling extended.

---

## 4. Character ability effects (ANIM / FX)

| ID | Prompt / animation brief |
|---|---|
| ANIM-ROXY-ABILITY | Lane Switch: Roxy slides into frame on a rolling stool and yanks her steering wheel. Tyre-screech smoke rings appear, two reel columns **physically slide past each other** with motion blur and skid marks, and a getaway-van Wild is stamped into a cell. Reds and white smoke |
| ANIM-BYTE-ABILITY | System Clone: Byte opens his holographic laptop, the screen glitches, and purple scan-beams sweep across the reels. The chosen symbol is outlined, then **copies materialise** in other cells with pixel-dissolve and a "COPY" glyph. Glitch, chromatic aberration, purple |
| ANIM-TANK-ABILITY | Vault Breaker: Tank revs the drill, sparks fly, and the grid shakes. A 2×2 or 3×3 area becomes a **round vault door** that unbolts (bolts fly off in cartoon arcs) and swings open, and loot symbols rise from golden light inside. Orange sparks, dust |
| ANIM-FUSE-ABILITY | Big Bang Upgrade: Fuse slams her plunger, and a colourful cartoon explosion fills an area (confetti, stars, rainbow smoke, **no fire debris**). The smoke clears, and upgraded symbols emerge with golden energy and a shockwave ring. Blues and golds |
| FX-CREW-CHAOS | Board-wide "CREW CHAOS!" comic-book title burst with halftone dots and character colour streaks |
| FX-RESPIN | Chaos Re-spin: locked Wilds get a gold chain-lock outline, and unlocked cells blur upward. A "CHAOS RE-SPIN" stencil sign drops, with a counter "1/4" |
| FX-RETRIGGER | Blueprints fly in and stamp "+5 FREE SPINS" |
| FX-WIN-WAY | Win highlight: animated gold path tracing the winning ways left to right, plus a cell glow frame |

---

## 5. Combination cinematics (each must feel unique — never reuse one effect)

| ID | Combo | Brief |
|---|---|---|
| FX-COMBO-RB | Roxy + Byte, **HOT-WIRED CLONE** | Byte jacks a cable into Roxy's steering wheel, and the wheel screen shows a hacked dashboard. The column swap leaves purple holographic after-images that become extra clones. Red and purple light trails |
| FX-COMBO-BT | Byte + Tank, **VAULT CLONE** | Tank holds the vault door open while Byte scans the loot inside, and a copy beam fires two duplicates out of the vault into other cells. Orange vault glow with purple scan lines |
| FX-COMBO-TF | Tank + Fuse, **GOLDEN VAULT** | Fuse tosses a gadget into Tank's open vault, and a golden pressure blast makes every loot item glow and level up. Gold shockwave, orange sparks, blue confetti |
| FX-COMBO-FR | Fuse + Roxy, **BLAST DRIFT** | Fuse's explosion launches Roxy's van into a drift, and the van drags the reel with the upgraded symbols into reel 2. Blue smoke donut, red tail-lights |
| FX-COMBO-RT | Roxy + Tank, **ARMORED GETAWAY** | Tank chains the vault to Roxy's van bumper, and the van hauls the whole vault column into reel 1, with sparks dragging on the tarmac |
| CIN-PERFECTLY-BAD-PLAN | All four, **PERFECTLY BAD PLAN** | 3-second full-screen comic-panel sequence: four split panels show each crew member's mistake (Roxy reverses into the wall, Byte opens the wrong account, Tank drills the wrong door, Fuse detonates early). The panels shatter, the camera pulls back, and everything has worked out: loot everywhere, a giant "×3" stamp and a "PERFECTLY BAD PLAN!" title. Most energetic moment of the base game |
| CIN-CLEAN-GETAWAY | Getaway Meter stage 5 | The van speeds through a sequence of green traffic lights, the meter bursts and "CLEAN GETAWAY ×5" appears in chrome letters |

---

## 6. UI (UI)

Style: chunky, tactile, vault-metal and gold, with readable numbers. Bevelled brushed steel, gold
trim, navy glass panels. Every interactive element has idle, hover, pressed and disabled states.

| ID | Prompt |
|---|---|
| UI-LOGO | Game logo "GETAWAY GANG" in bold, chunky, comic-heist 3D lettering: gold chrome with red outline and a speed-line swoosh, with a getaway-van silhouette bursting through the "G". Subtitle "ONE LAST JOB!" on a red stencil tape strip below. Transparent PNG at 2048×1024. Also an animated version: the van drives through the letters (2 s) |
| UI-REEL-FRAME | 6×4 reel frame designed as a reinforced vault window: brushed-steel bezel, gold rivets, corner bolts, an inner navy glass panel. 9-slice. Bonus variant with an animated gold rim glow |
| UI-REEL-BG | Reel backing: dark navy panel with subtle bank-note guilloché pattern at 8% opacity, column separators as thin gold lines |
| UI-SPIN | Spin button: a big round vault dial in brushed steel with a gold centre and a white circular-arrow glyph. Spinning-state animation turns the dial. Stop state: a square stop glyph |
| UI-AUTOPLAY · UI-TURBO · UI-SOUND · UI-SETTINGS · UI-INFO | Round secondary buttons in the same metal-and-gold family, with glyphs for loop arrows, a lightning bolt, a speaker, a cog and an "i" |
| UI-BET | Bet panel: navy glass capsule with − and + buttons, the bet value in large tabular numerals |
| UI-BALANCE · UI-WIN | Balance and win display capsules. The win display has a gold count-up flare |
| UI-FS-COUNTER | Free-spin counter: a blueprint-styled plaque "FREE SPINS 3 / 10" |
| UI-METER-GETAWAY | Getaway Meter: a horizontal speedometer-styled bar with 5 notches labelled 1–5, filling with gold, plus a tiny van icon riding along the bar. Each stage notch pops with a reward icon (Wild, level-up chevron, re-spin arrow, ×2, chequered flag ×5) |
| UI-METER-LOOT | Loot Meter (Heist only): a vault-shaped bar filling with tumbling gold coins, with milestones at 4/8/12/16 showing +1 spin, ×2, +1 spin and +2 spins ×3 with a crew level-up |
| UI-CREW-LEVELS | Crew upgrade panel (Escape only): four character mini-portraits, each with three star pips that light in its colour as it levels up |
| UI-MULT | Multiplier badge: a chrome "×N" sticker with a gold burst |
| UI-RESPIN | Re-spin chain indicator: four small lock icons that light per re-spin |
| UI-PAYTABLE | Paytable and rules screens: navy pages with symbol renders, pay grids and feature diagrams, plus character illustrations explaining each ability |
| UI-SETTINGS-PANEL | Settings modal: music and SFX sliders, voice-line toggle, turbo, spacebar hint, history link |

---

## 7. Screens (SCR)

| ID | Prompt |
|---|---|
| SCR-LOADING | Use BG-LOADING with the animated logo and a loading bar shaped like a road, with the van driving from left to right |
| SCR-HEIST-INTRO | "THE HEIST" intro: the crew bursts through the vault door, gold coins spray toward the camera, and the title "THE HEIST" stamps in gold with "10 FREE SPINS" and a "LOOT METER ACTIVE" ribbon. Press-to-continue prompt |
| SCR-ESCAPE-INTRO | "THE PERFECT ESCAPE" intro: the van rockets out of the garage onto the neon highway, the crew poses on and inside it, the title is written in neon light trails, plus "12 FREE SPINS" and "CREW UPGRADES PERSIST" |
| SCR-HEIST-OUTRO | Heist end screen: the crew sits on a mountain of gold, a total-win counter and a Loot Meter summary |
| CIN-FINAL-ESCAPE | Final Escape cinematic: the van leaves the bank, cuts to each crew member reacting with their level shown (stars), any Level-3 "MASTER" bonus is stamped onto screen, and the final total counts up. **Only displays the award in the book. No new randomness** |
| SCR-ESCAPE-OUTRO | Escape end screen: the van parked on a cliff over the city at sunrise, the crew celebrating, and the total win |
| SCR-BONUS-RESUME | Resume-round splash for interrupted sessions: "Resuming your getaway…" |

---

## 8. Win celebrations (WIN)

Tiers are driven by the math's `winLevel`. Every celebration is skippable by tap or spacebar.

| ID | Trigger | Brief |
|---|---|---|
| WIN-SMALL | winLevel 2–5 (< 15×) | Gold sparkles on the winning cells, a coin chime that grows with the level |
| WIN-BIG | winLevel 6 (15×–30×) | "BIG WIN" chrome title, a coin fountain, the crew peeking in from the frame edges |
| WIN-SUPER | winLevel 7 (30×–50×) | "SUPER WIN": the van drifts across the screen dropping money bags |
| WIN-MEGA | winLevel 8 (50×–100×) | "MEGA WIN": gold bars rain down and Tank juggles a money bag |
| WIN-EPIC | winLevel 9 (100×–12,000×) | "EPIC WIN": the vault door blows open and a torrent of loot floods the screen, with all four crew surfing on money bags |
| CIN-MAX-WIN | winLevel 10 (12,000×) | The most elaborate sequence, 6–8 s with a skip after 2 s. The camera flies out of the bank through the city. The van does a victory donut in front of the bank, fireworks spell "MAXIMUM WIN", the crew poses on the van roof, and "12,000×" is rendered in giant gold numerals |

---

## 9. Music (MUS)

| ID | Brief |
|---|---|
| MUS-MAIN | Funky heist instrumental: clavinet, wah guitar, slap bass, a horn section, brushed drums. 96–104 BPM, cool and confident, 2:00 seamless loop with intensity layers (stems: rhythm, horns, percussion) |
| MUS-HEIST | Bigger, tenser funk-orchestral hybrid: staccato strings, a brass stab every 8 bars, a ticking clock percussion bed. 110 BPM, 1:30 loop |
| MUS-ESCAPE | High-energy synth-funk chase: driving bass, retro synth arps, a siren-like lead (non-alarming). 124 BPM, 1:30 loop |
| MUS-WIN-BIG · MUS-WIN-SUPER · MUS-WIN-MEGA · MUS-WIN-EPIC · MUS-WIN-MAX | Escalating celebration stingers, 4 / 5 / 6 / 8 / 12 s, each a key-step up, with the max win adding a full brass fanfare and a choir "hey!" |
| MUS-INTRO | 20 s cinematic theme for the intro and loading |

## 10. Sound effects (SFX) and voice (VO)

| ID | Brief |
|---|---|
| SFX-SPIN · SFX-REEL-STOP · SFX-LAND-PREMIUM · SFX-LAND-WILD · SFX-LAND-SCATTER-1..6 | A mechanical reel whoosh, a metallic stop thunk, gem chimes, a van horn honk, rising pitched blueprint snaps per scatter count |
| SFX-ROXY | Engine rev, tyre screech, gear shift |
| SFX-BYTE | Keyboard flurry, digital glitch, a scanning "bweep" |
| SFX-TANK | Drill whine, metal clank, bolts popping, heavy door creak |
| SFX-FUSE | Fuse sizzle, a cartoon "ka-POW" with confetti pop, a sparkle tail |
| SFX-COMBO-RB/BT/TF/FR/RT | A unique mix layer per combo, combining the two characters' palettes |
| SFX-PBP | Record scratch, comedic crash, then a triumphant horn hit |
| SFX-RESPIN · SFX-METER-STAGE-1..5 · SFX-LOOT-MILESTONE | A chain-lock clink, rising meter dings (stage 5 = big chime and engine roar), a coin cascade |
| SFX-WIN-COUNT | Coin counting loop for win tickers |
| VO-ROXY | "Everybody hold on!" · "Lane change!" · "Who needs brakes?" |
| VO-BYTE | "I may have opened the wrong account!" · "Copy that… literally." · "Okay, okay, don't panic!" |
| VO-TANK | "That's definitely not the right vault!" · "Stand back!" · "Shiny!" |
| VO-FUSE | "Good news. The door is gone!" · "Oops. Big oops!" · "Ka-boom!" |
| VO-CREW-PBP | All four together: "That… actually worked?!" |

VO: playful character actors, dry studio recordings, 3 takes each, family-friendly delivery.
Voice lines are optional and can be turned off in settings.

---

## 11. Replacement map (where each placeholder lives in code)

| Placeholder in the build | File | Replace with |
|---|---|---|
| Coloured symbol tiles `TEMP · SYM-*` | `frontend/getaway_gang/src/components/Symbol.svelte` + `game/tempArt.ts` | Sprite (static) + Spine (land/win/transform) per SYM-* |
| Feature title cards `TEMP · ANIM-*/FX-*/CIN-*` | `components/FeatureBanner.svelte` | Character, combo and cinematic animations (§4–5, §8) |
| Coloured cell outlines | `components/CellHighlights.svelte` | Feature FX layers (§4) |
| Flat background `TEMP BACKGROUND · BG-*` | `components/Background.svelte` | BG-MAIN / BG-HEIST / BG-ESCAPE + loops |
| Grey frame | `components/BoardFrame.svelte` | UI-REEL-FRAME |
| Text HUD | `components/Hud.svelte` | UI-METER-GETAWAY, UI-METER-LOOT, UI-CREW-LEVELS, UI-MULT, UI-RESPIN |
| `ONE LAST JOB! · TEMP LOGO` | `components/Game.svelte` | UI-LOGO |
| web-sdk sample loader, free-spin panels, big-win spine, coins, fonts, sounds | `game/assets.ts` | SCR-*, WIN-*, MUS-*, SFX-* |
| Red "TEMPORARY ART — NOT FOR RELEASE" watermark | `components/TempWatermark.svelte` | Remove for release |
