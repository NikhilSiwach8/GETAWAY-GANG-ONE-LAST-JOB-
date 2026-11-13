# GETAWAY GANG — Art Direction Brief

For the artist (or the art generator, used with one shared style brief) who redraws the game's art.

**Why this brief exists:** reviewers said the game "looks too AI-generated". Code-side animation, grading and polish are done (see "Already handled in code"). What remains is the art: every piece was generated separately, so lighting, outline, detail and colour don't match from one asset to the next. That mismatch is what reads as AI. Redrawn art from one hand and one brief fixes it.

Priority order: **1 symbols → 2 reel frame → 3 backgrounds (layered) → 4 characters → 5 UI.**

---

## The one style

- **Genre:** cartoon heist caper, comic illustration with clean shapes. Think stylised animation key art, not hyper-real 3D.
- **Line:** a dark outline on every object: 6 px on a 1254 px symbol master, colour `#1A0D00` (warm near-black, never pure black). Inner detail lines are half that weight.
- **Lighting (applies everywhere):**
  - Key light from the top left at 45°, warm (`#FFE7B0`).
  - Rim light from the right, cool (`#8FD8FF`), thin.
  - Contact shadow straight down.
- **Shading:** three tones per material (shadow / mid / light), plus one small sharp highlight. No airbrushed gradients, no soft bloom, no lens flares.
- **Detail:** stop at what reads at 58 px (a phone cell). No micro-texture, no tiny text, no fake engravings.
- **Glow and sparkle:** none baked into the art. The game adds glints, glows and sparkle live, where and when it needs them. Baked glow is the single strongest "AI" signal.
- **Text:** none in symbols or backgrounds. All titles, numbers and labels are set by the game.

### Palette (use only these)

| Role | Colours |
|---|---|
| Gold (frame, plates, gold bars, rims) | light `#FFF1B0`, mid `#F7C947`, shadow `#B7791F`, deep `#6A3D00` |
| Navy (panels, windows, night) | `#0A1633`, `#1B2450`, `#2E3F7A` |
| Steel (frame, van bumpers) | `#C9D2EA`, `#7F8AA8`, `#3A4566` |
| Crew accents | Roxy `#FF4C36`, Byte `#A34BFF`, Tank `#FFA12B`, Fuse `#28B9EF` |
| Feature accents | Scatter blue `#1D6FE0`, alarm red `#D62828`, diamond ice `#BFE9FF` |

---

## 1. Symbols (highest priority)

- **Canvas:** 1254 × 1254 px RGBA PNG per symbol, with a 3 % transparent margin on every side. One file per symbol.
- **Camera:**
  - Objects: 3/4 view from 15° above, 20° yaw to the left, 50 mm (no wide-angle distortion).
  - Royals: front-on.
  - Crew: in round medallions.
- **Fill targets:**
  - High symbols: visual mass about 58 % of the canvas.
  - Royals: letter height 80 % of the canvas.
  - Wild, Scatter and crew: up to 97 %.

| Symbol | Content | Notes |
|---|---|---|
| H1 Diamond | Round brilliant-cut stone in a slim four-prong gold setting | Facets alternate light and dark navy so the cut reads; at most 12 % of the stone near white |
| H2 Money bag | Burlap bag, gold "$" patch, a few bills and coins at the mouth | Coins are separate from the bag, so the game can burst them out |
| H3 Gold bars | Stack of three bars | The top face of each bar is a clean flat plane (the game runs glints along it) |
| H4 Watch | Gold and steel watch, navy dial | **Deliver the hands as a separate layer** (the game turns them) |
| L1–L4 A K Q J | Bevelled gold letters with a coloured face (A red, K purple, Q orange, J blue) | Same bevel width, rivets and height for all four; no baked sparkle stars |
| W Wild | The red getaway van, front 3/4, a "WILD" plate on the grille | **Headlights and roof lights as separate layers** (the game flashes them) |
| S Scatter | Rolled blueprint of the bank with a red target | **The target as a separate layer** (the game pulses it); the "BONUS" plate stays |
| Crew R B T F | Head and shoulders in a medallion ring in the crew colour | The ring is fully inside the canvas (today's art crops it at the bottom); keep the approved likenesses |

## 2. Reel frame

- **Size:** 2600 × 1733 px, transparent window matching today's position (`layout.json` → `UI-REEL-FRAME.window`).
- **Proportion:** draw it at the proportion it's shown at in game (about 20 % taller than today's art, which is stretched to fit). Otherwise the bezel art stays distorted.
- **Separate layers:** the top vault wheel (so it can turn without warping), the wheel hub, and the hazard stripes.

## 3. Backgrounds (layered)

Each scene (main street, vault, highway, Mystery Vault) as a layered PSD, 3840 × 2160, with these layers:

1. **Sky / far:** sky, moon, far city. The game drifts it slowly.
2. **Mid:** buildings and bank façade. Light sources (windows, lamps, neon) on their own layer, so the game can flicker them.
3. **Near:** lions, bollards, crates, the van at the left. The game parallaxes it.
4. **Ground:** street or floor, with reflections painted in.

Keep the centre 60 % × 70 % calm and darker: the reels sit there, and the art shouldn't compete with the symbols.

## 4. Characters

- **Format:** Roxy, Byte, Tank and Fuse each as a full-body pose, 2508 px tall, transparent.
- **Rig parts:** split as separate parts (head, torso, each arm, each leg, prop) for rigging, either as a Spine project or as layered PSDs.
- **Expressions:** blink and mouth shapes per character: neutral, cheer, shout and wince (one row each).

## 5. UI

Buttons and panels share one bezel: steel ring, gold inner rim, navy face. Deliver each one at 512 px with idle, hover, pressed and disabled states:

- **Buttons:** SPIN, autoplay, turbo, settings, paytable, and −/+.
- **Panels:** the Buy Bonus pill, and the ANTE pill with on/off states.

---

## Already handled in code (don't bake these into art)

- **Background:** camera drift and zoom, a kick as the reels stop, the light swelling on wins, drifting fog, ambient lights and beams, and one colour grade with a vignette.
- **Symbol win animations:**
  - Every symbol: pop, squash and stretch, contact shadow, accent light, idle glints.
  - Per-symbol signatures:
    - **Diamond:** facets flash, prism ring.
    - **Money bag:** coins burst out.
    - **Gold bars:** glints run along them.
    - **Watch:** second hand sweeps.
    - **Royals:** metal glint.
    - **Van:** lights flash, exhaust puff.
    - **Blueprint:** target pulses.
    - **Crew:** colour shock ring.
- **Big wins, the bonus entry and Total Win cards:** live and video animation built from the delivered art.

When new art arrives, run `python3 art/process_assets.py` and then `python3 art/measure_symbols.py`. The renderer picks up the new sizes and centring automatically; layered parts (watch hands, headlights, target, frame wheel) then replace the painted-on effects with real moving parts.
