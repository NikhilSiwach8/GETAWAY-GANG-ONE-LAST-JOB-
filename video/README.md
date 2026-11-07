# GETAWAY GANG — animation clips (Remotion)

Every animated asset from `docs/ASSET_PROMPTS.txt` that can be built from the delivered stills, as
Remotion compositions. **Composition ids are the asset ids** (e.g. `FX-COMBO-TF`, `WIN-EPIC`).

| Folder in Studio | Clips | Output |
|---|---|---|
| Feature-effects | FX-CREW-CHAOS, ANIM-ROXY/BYTE/TANK/FUSE-ABILITY-FX, FX-RESPIN, FX-RETRIGGER, FX-METER-STAGE, FX-LOOT-MILESTONE | 1920×1080 WebM with alpha (overlays) |
| Combination-cinematics | FX-COMBO-RB/BT/TF/FR/RT, CIN-PERFECTLY-BAD-PLAN, CIN-CLEAN-GETAWAY | overlays (PBP is full-frame) |
| Win-celebrations | WIN-BIG, WIN-SUPER, WIN-MEGA, WIN-EPIC, CIN-MAX-WIN | overlays; Max Win full-frame. The game draws the counting amount |
| Backgrounds-and-screens | BG-MAIN-LOOP (12 s), BG-ESCAPE-LOOP (8 s), CIN-FINAL-ESCAPE | seamless full-frame loops; Final Escape takes `levels`/`award` props |
| Symbol-animations | `<SYM>-ANIM-LAND` (0.4 s) and `<SYM>-ANIM-WIN` (1 s loop) for all 14 symbols; SYM-FX-CLONE-IN / UPGRADE-IN / VAULT-REVEAL / WILD-STAMP / CREW-EXIT | 512×512 WebM with alpha |
| Character-animations | ANIM-<ROXY/BYTE/TANK/FUSE>-<IDLE/ABILITY/COMPLETE/WIN/LOSE/BONUS-INTRO/VICTORY/COMBO> | 1024×1024 WebM with alpha |

**Limitation — characters.** Each character exists as one still pose, so character clips animate the
whole body (breathing, hops, leans, slides) plus effects. There is no blinking, facial acting or limb
motion. For the premium build, replace them with rigged Spine/3D animation or AI image-to-video clips.

## Use

```bash
cd video
npm i
npx remotion studio            # preview and tweak every clip
node render-all.mjs            # render all to out/<id>.webm (VP9; overlays keep alpha)
node render-all.mjs FX- WIN-   # only ids starting with these prefixes
```

Art comes from `public/gg/`, a copy of `frontend/getaway_gang/static/assets/gg/` (produced from your
delivered files by `art/process_assets.py`). Re-copy after new art arrives. The title font is Luckiest
Guy (SIL OFL) bundled in `public/fonts/`. Rendering uses the sandbox's pre-installed Chromium
(`remotion.config.ts`, `render-all.mjs`); on your own machine remove that line to use Remotion's browser.

**License:** Remotion is free for individuals and companies of up to 3 people; larger companies need a
company license (see the `remotion-license` skill / remotion.pro/license).
