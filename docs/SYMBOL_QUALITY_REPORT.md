# GETAWAY GANG — Stage 3: Symbol Quality Report

Audit of all 14 reel symbols plus the full-reel Wild, as shipped in `frontend/getaway_gang/static/assets/gg/`
(512 × 512 lossless WebP, cut from the 1254 × 1254 delivered RGBA masters in `art/delivery/symbols/`).

How the audit was done:
- **Measured:** `art/measure_symbols.py` writes `src/game/symbols/symbolMetrics.ts`. It records the body box (thin baked sparkle rays are ignored), coverage, brightest-highlight position, and the share of blown highlights.
- **Edges:** checked for fringes on navy and on magenta.
- **Readability:** checked at the real cell sizes:
  - desktop 1422 × 800: about 105 px per cell
  - phone portrait 430 × 932: about 58 px
  - phone landscape: about 44 px
  - plus a greyscale pass for value contrast
- **In-game:** checked on the running board in every state with `frontend/tests/symbol_check.cjs`.

## Summary

| Class | Symbols |
|---|---|
| **A. Keep and polish** | H2 Money Bag, H3 Gold Bars, H4 Watch, L1 A, L2 K, L3 Q, L4 J, WILD Van, SCATTER Blueprint, ROXY, BYTE, TANK, FUSE, SYM-WILD-REEL |
| **B. Rework** | H1 Diamond |
| **C. Replace** | none |

- **Why nothing is a "C":** every symbol already has a clear silhouette, a correct alpha edge and enough resolution, and each one holds an approved identity. The crew in particular must not change.
- **Why the set looked uneven:** presentation, not the art. Each symbol filled its cell differently, nothing grounded them, every glow was the same gold, and there was no shared state language. The new shared renderer fixes this without changing a pixel of the approved art.
- **The one real art problem** is the diamond's lighting and material (see H1 below).

## What the shared renderer now does to every symbol (all render-time, art untouched)

`src/components/SymbolView.svelte` draws every symbol, using the catalogue in `src/game/symbols/`:

1. **Optical fit:** each symbol is scaled and centred from its measured body. Highs get equal visual mass, royals get equal letter height, and specials and crew are kept 1.5 % clear of every cell edge. Corrections are small, between −8 % and +4 %.
2. **One contact shadow:** a soft shadow at the base of every symbol's body grounds it on the reel. It fades when the symbol is dimmed or winning.
3. **Family accent light:** highlight and win light use the symbol's own colour instead of one gold for everything:
   - diamond: ice blue
   - royals: their letter colour
   - Wild: amber
   - Scatter: blue
   - crew: their crew colour
4. **Grade:** H1 only gets a 6 % cool pull-down until its rework arrives (see H1).
5. **States:**
   - **idle:** at rest, with a rare glint (one cell at a time across the board, every 1.4–3 s). Glints only appear on highs, the Wild and the Scatter, placed on each symbol's own brightest highlight.
   - **highlighted:** follows the existing `cellHighlight` events. The symbol lifts 6 % and gets an accent rim light, a pulse and a wash over the art.
   - **winning:** anticipation dip, pop, wobble, accent halo, a shine clipped to the art's shape, and a star burst.
   - **dimmed:** 55 % brightness with a slight cool cast, so it reads as "in shadow" rather than grey. The symbol shrinks 3 % and its shadow fades.
   - **animated:** a landing squash planted on the symbol's own floor, with a flash for feature symbols. The ability "morph" pop stays in `ReelSymbol`.
   - **reset:** every channel eases back to idle in about 200 ms, with no snap. The test confirms the board returns to exactly the idle picture.
6. **Priority:** when several states apply, winning beats animated, which beats highlighted, which beats dimmed, which beats idle.
7. **Cost:** a symbol only runs a ticker callback while it is moving, so a board of 24 idle symbols costs nothing per frame. The old renderer ran `requestAnimationFrame` loops for landing and win animations.

## Asset by asset

Legend: ✔ good · ◐ acceptable / minor · ✖ problem. Readability is at 58 px (phone portrait); every symbol is fine at 105 px.

### H1 Diamond: **B. Rework**

| Image quality | Silhouette | Lighting | Material | Perspective | Edges | Resolution | Consistency | Mobile |
|---|---|---|---|---|---|---|---|---|
| ◐ | ✔ | ✖ | ✖ | ✖ | ◐ | ✔ | ✖ | ✔ |

- **Highlights:** 43 % of the body is pure white, the most of any symbol. The facets merge into a white blob, so the stone reads as "glow", not "cut gem".
- **Soft edge:** a baked outer glow gives a soft band 10× wider than any other symbol (`softEdge` 0.23 against 0.01–0.03).
- **Perspective:** the stone is seen straight on, while H2, H3 and H4 are seen in 3/4 from slightly above. It's the odd one out in the high-symbol row.
- **Interim fix (render):** a 6 % cool grade. The optical fit keeps it the same visual mass as the other highs.
- **Replacement brief:** at the end of this report.

### H2 Money Bag: **A. Keep and polish**
- **Strengths:** clear silhouette and strong gold "$". Good value contrast in greyscale.
- **Lighting:** top-left, consistent with the set.
- **Edges:** clean, with a 0.13 dark outline ratio.
- **Polish:** fit ×0.98 (it was the largest high). The idle glint sits on the coin.

### H3 Gold Bars: **A. Keep and polish**
- **Strengths:** strong material read (polished gold), 3/4 top view.
- **Weakness:** 28 % blown highlights. It's mid-value in greyscale, close to the money bag, but the shape separates them.
- **Polish:** fit ×1.03 and recentred (+0.6 %, −2.8 %). The glint sits on the top bar.

### H4 Luxury Watch: **A. Keep and polish**
- **Strengths:** the sharpest of the highs, clean bracelet detail, and the navy dial gives the best contrast in the set.
- **Polish:** fit ×1.00. The glint sits on the bezel.

### L1 A, L2 K, L3 Q, L4 J: **A. Keep and polish** (as a set)
- **Strengths:** consistent family (gold bevel, coloured face, rivets) and readable down to 44 px.
- **Issue: uneven letter height.** Body height ran from 0.81 to 0.87, so K and Q looked a size larger than A and J.
  - Polish: royal fit normalises letter height to 0.80 (A ×0.99, K ×0.95, Q ×0.92, J ×0.96).
  - J's narrow glyph is centred on its body (it was 2 % right of centre).
- **Issue: baked sparkle flares** at the letter corners.
  - Polish: these are excluded from the measured body so they don't distort the fit. Live glints are not added to royals, to avoid stacking sparkle on sparkle.
- **Note:** A (red) and Q (orange) are adjacent warm hues. Shape keeps them distinct at every tested size, so no change.

### WILD Getaway Van: **A. Keep and polish**
- **Strengths:** iconic silhouette, and the "WILD" plate is readable at 58 px.
- **Edges:** a 2 px safe margin; the dust cloud at bottom left is soft but deliberate.
- **Polish:** fit ×0.99. Amber accent. The glint sits on the headlights.

### SCATTER Blueprint: **A. Keep and polish**
- **Strengths:** the blue colour is unique on the board, and the "BONUS" plate is readable at 58 px.
- **Weakness:** the blueprint line detail becomes texture below 50 px, which is acceptable because colour carries it.
- **Polish:** fit ×1.00. Blue accent.

### ROXY, BYTE, TANK, FUSE: **A. Keep and polish** (approved identities: no changes to the art)
- **Strengths:** consistent medallion system, with each ring in its crew colour, so they read by colour at 44 px.
- **Defect in the delivered masters:** the ROXY, TANK and FUSE rings are cut off at the canvas bottom.
  - ROXY 161 px, TANK 116 px and FUSE 278 px of solid pixels on the last row of the 1254 px master, roughly 5–15 px of ring missing.
  - At gameplay size that's under 1 px, so it isn't visible today.
  - Polish: fit ×0.98 keeps them inside the safe margin.
  - Re-export brief at the end of this report.
- **Faces:** busy at 44 px (landscape phones), but identity holds through colour and silhouette (hair, goggles, drill, bomb).

### SYM-WILD-REEL (512 × 2048): **A. Keep**
- Drawn by `WildReels.svelte`, not by the symbol renderer. Unchanged and verified as served.

## Reference check (verified in the running game, `frontend/tests/symbol_check.cjs`)

- **Textures:** every catalogue symbol (14/14) has its texture loaded and its metrics present.
- **Files:** every `SYM-*.webp` plus `SYM-WILD-REEL.webp` is served with HTTP 200. These are the URLs the paytable and rules modals use (`ggUrl`).
- **Components:**
  - `Symbol.svelte` keeps its public API (`state`, `rawSymbol`, `oncomplete`), so `ReelSymbol` and the Storybook stories are unaffected.
  - Win and landing completion timing is unchanged.
- **Removed:** `SymbolArt.svelte` (superseded; nothing referenced it after the switch).
- **Asset ids:** `TEMP_SYMBOL_ART` asset ids, the cell-FX clips (`SYM-FX-*`) and the `cellHighlight` events are all untouched.
- **Results:** reset leaves the board identical to idle (pixel difference 0.0 at the 99th percentile) and no page errors.

---

## Replacement brief: SYM-H1 Diamond (B. Rework)

- **Deliverable:** one RGBA PNG, **1254 × 1254 px** (the same master size as every other symbol), sRGB, straight (unpremultiplied) alpha. The pipeline cuts it to 512 × 512.
- **Subject:** a single brilliant-cut diamond (round brilliant or cushion), the game's top-paying symbol. It may sit in a slim four-prong gold setting that matches H3's gold. No text, no logo.
- **Composition:**
  - The body fills **84 % of the width and 76 % of the height**, centred horizontally.
  - The stone's widest point is at 45 % of the height; the lowest point (culet or prongs) is at 90 %.
  - Keep **3 % clear padding on every side**; nothing touches the canvas edge.
- **Camera:** 3/4 view, **15° above the stone, 20° yaw to the left**. This matches the money bag, gold bars and watch. 50 mm equivalent, so there's no wide-angle distortion. The table facet must be readable.
- **Materials:**
  - Clear colourless diamond with crisp facet geometry.
  - Facets alternate between bright (ice white) and dark (deep navy refraction) so the cut reads at 58 px.
  - Restrained dispersion: small cyan, violet and amber fire flecks on 3–5 facets only.
  - Setting (if used): polished yellow gold, the same material and hue as H3.
- **Lighting:**
  - **Key light top-left at 45°**, matching the rest of the set; a soft cool rim light on the right edge.
  - **Highlights:** no more than **12 % of the body** may be at or near pure white (today it is 43 %).
  - Specular hits must be small and sharp, not blooms.
- **Colours:**
  - ice white `#F4F8FF`
  - ice blue `#BFE9FF`
  - facet steel `#7FA6C9`
  - deep refraction navy `#1E3A6E`
  - fire accents `#5FE3FF` / `#C58BFF` / `#FFC93C` (sparingly)
  - gold `#F7C947` / shadow gold `#B7791F`
- **Transparency:**
  - A clean anti-aliased silhouette edge of 1–2 px.
  - **No baked outer glow, halo, lens flares, star sparkles or drop shadow.** The game adds the glints, win halo and contact shadow live.
  - No matte fringe; check it on both black and magenta.
- **Must match:** the outline weight and gold of H2, H3 and H4; the saturation of the set (body mean saturation 0.55–0.75).
- **Acceptance:** after `python3 art/process_assets.py && python3 art/measure_symbols.py`:
  - `clipped` ≤ 0.12
  - the body box is within 0.82–0.86 wide and 0.74–0.78 tall
  - the diamond reads as a cut gem in the 58 px greyscale check

## Re-export brief: SYM-ROXY, SYM-TANK, SYM-FUSE (polish, same art)

- **Deliverable:** the same approved artwork, re-exported at **1254 × 1254 px** RGBA, with the full medallion ring (radius about 600 px) visible.
- **Padding:** a **3 % transparent margin** on every side. The only change is that the ring's bottom arc is no longer cut by the canvas.
- **Unchanged:** character pose, expression, colours and ring style. Hair or props that break the ring at the top (Roxy's hair, Fuse's fuse spark) stay where they are, inside the new margin.
- **Acceptance:** after re-processing, zero solid pixels on any canvas edge (`touchesEdge` < 0.05). Then re-run `art/measure_symbols.py`; the renderer picks up the new fit automatically.

## Art-direction notes for any future symbol work

- **Camera:** 3/4 from about 15° above for objects. Royals and medallions are front-on by design.
- **Lighting:** key light top-left at 45° with a cool rim light on the right.
- **Highlights:** keep blown highlights under 25 % of the body.
- **Nothing baked in:** no glows, flares or shadows in the art. The renderer owns light effects so they stay consistent and can animate.
- **Fill:** fill the 1254 canvas to the family targets (highs: visual mass about 0.58 of the canvas; royals: letter height 0.80; specials and crew: up to 0.97) with 3 % padding.
- **After replacing art:** run `art/measure_symbols.py` again. The renderer reads the new metrics, and nothing else needs to change.
