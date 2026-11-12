# GETAWAY GANG — Stage 1: Frontend Technical Audit

Read-only audit of the game as it stands (branch `claude/awesome-albattani-eyqqn6`, commit `dc3dd0f`).
Nothing was changed. All paths are relative to the repository root; `FE` = `frontend/getaway_gang`.

Feedback being addressed: background too static · symbols need polishing · symbol win animations need work ·
overall look "too AI-generated".

---

## A. Project architecture

### A.1 Top-level layout

| Folder | What it is |
|---|---|
| `math/games/getaway_gang/` | Stake Math SDK game (Python): reels, features, bet modes, lookup-table weighting. **Source of truth for every outcome.** |
| `vendor/math-sdk/` | Stake Engine Math SDK (simulation, books, verification). |
| `vendor/web-sdk/` | Stake Engine web-sdk monorepo (Svelte packages, PixiJS bindings, RGS client, state machine). Used unmodified except via the overrides below. |
| `FE/` | The game frontend (SvelteKit static app). |
| `frontend/dev-rgs/` | Local RGS for testing (serves books + lookup tables). |
| `frontend/tests/` | Playwright scripts (buy flow, intro, UI, transition, profiling). |
| `video/` | Remotion 4.0.541 project that renders every animation clip (WebM VP9). |
| `art/` | Delivered art (`art/delivery`), processing scripts, rendered clips (`art/animations`), upscaler (`art/upscale`). |
| `downloads/`, `.github/workflows/stake-upload-release.yml` | Split upload files + the release job that rebuilds and publishes them. |

### A.2 Runtime stack

| Layer | Technology | Version |
|---|---|---|
| App framework | SvelteKit (static adapter) + Svelte 5 (runes) | kit 2.17.3, svelte 5.20.5 |
| Bundler | Vite (+ 4 custom plugins in `FE/vite.config.js`: UI overrides, local fonts, no sample URLs, bet limits) | 6.2.0 |
| Renderer | **PixiJS 8.8.1 (WebGL)** via the web-sdk's `pixi-svelte` (declarative Svelte components over Pixi objects) | 8.8.1 |
| Optional deps present but unused | `@esotericsoftware/spine-pixi-v8` 4.2.74 (Spine runtime), `pixi-filters` 6.1.0 | — |
| Game flow | XState 5 machines from `utils-xstate` (bet → play book → settle) | 5.19.2 |
| Book playback | `utils-book` — each RGS book event is dispatched to `FE/src/game/bookEventHandlerMap.ts` | — |
| RGS | `rgs-requests` / `rgs-fetcher` (authenticate, play, end-round) — untouched | — |
| HTML UI | `components-ui-html` (bet menu, autoplay, settings) + game modals (Buy Bonus, Paytable, Rules) | — |
| Clip authoring | Remotion → VP9 WebM (alpha for overlays), played as Pixi `VideoSource` textures | 4.0.541 |

Pixi application: `antialias: true`, `resolution: devicePixelRatio` (`vendor/web-sdk/packages/pixi-svelte/src/lib/components/InitialiseApplication.svelte`), `resizeTo: window`.

### A.3 Data flow (one spin)

```
Spin/Space → utils-xstate bet machine → RGS /wallet/play (mode BASE|ANTE|HEIST|…)
  → book (list of events) → utils-book → bookEventHandlerMap[event.type](event)
      reveal ─────────▶ stateGame.board (reels fall in)          [Board, ReelSymbol, Symbol, SymbolArt]
      crewLanded / laneSwitch / systemClone / … ▶ clips + setCell [ClipLayer, CellFxLayer, FeatureBanner]
      winInfo ────────▶ boardWithAnimateSymbols (per win)         [Board → symbolState 'win']
      setWin ─────────▶ winUpdate (count-up, big-win tier)        [Win, BigWinScene, CoinShower]
      freeSpinTrigger/End ▶ intro / outro screens                 [FreeSpinIntro, FreeSpinOutro]
      finalWin ───────▶ settle, ante restore
```

Every visual change is a *reaction to a book event*. The frontend never decides an outcome, so all
recommendations below stay inside presentation code and keep math, RTP, payouts, RGS and rules intact.

### A.4 Layout and scaling

- `utils-layout` gives three layout types: **desktop** (1422×800 main area), **landscape** (1600×900), **portrait** (800×1422) — `FE/src/game/constants.ts`. The main container is scaled to fit the canvas (`stateLayoutDerived.mainLayout().scale`); backgrounds are cover-fitted to the full canvas.
- Board: 6 reels × 4 rows, `SYMBOL_SIZE = 100` main-area units per cell (≈ 135 px on a 1080p desktop, ≈ 270 device px on a 2× retina screen). The reel frame (`BoardFrame.svelte`) is measured from the art (`layout.json` window).
- HUD positions: `FE/src/game/hudLayout.ts` (portrait rows) and inline in `Hud.svelte`.
- Bet console: `GGLayoutDesktop.svelte` (desktop, landscape, tablet — scales up to 1.3× on wide phones) and `GGLayoutPortrait.svelte` (drawer/fold behaviour kept from the SDK).

---

## B. Source file map (where each visual system lives)

| System | Files |
|---|---|
| App shell / layer order | `FE/src/components/Game.svelte` (Background → Board stack → HUD → UI → Win/Intro/Outro → ClipLayer → Transition), `FE/src/routes/+layout.svelte` (fonts, Pixi defaults, UI CSS) |
| **Background** | `FE/src/components/Background.svelte` (still per scene + looping clip), clips `BG-MAIN/HEIST/ESCAPE/HIDDEN-LOOP` from `video/src/clips/Loops.tsx` |
| Reel frame, dividers, reel window | `FE/src/components/BoardFrame.svelte`, `BoardMask.svelte`, `BoardContainer.svelte` (also the stop jolt) |
| **Reels / spin motion** | `FE/src/game/stateGame.svelte.ts` (reels via `utils-slots` `createReelForCascading`, `setCell`, `swapReels`, `boardFx`), `FE/src/game/constants.ts` (`SPIN_OPTIONS_*`), `Board.svelte`, `BoardBase.svelte` |
| **Symbol rendering** | `ReelSymbol.svelte` (position, speed stretch, dim, morph pop) → `SymbolWrap.svelte` (visibility/clipping) → `Symbol.svelte` (art vs. placeholder) → `SymbolArt.svelte` (live land/win animation) |
| Symbol metadata | `FE/src/game/tempArt.ts` (asset ids, crew info, palette), `FE/src/game/utils.ts` (`getSymbolInfo`, `getSymbolX`) |
| Full-reel Wild | `WildReels.svelte` (`SYM-WILD-REEL`) |
| Cell effects | `CellFxLayer.svelte` (`SYM-FX-*` clips), `CellHighlights.svelte` (crew-tinted glow frames) |
| Anticipation | `Anticipations.svelte`, `Anticipation.svelte` (`FX-ANTICIPATION` clip) |
| **Win detection & presentation** | `bookEventHandlerMap.ts` (`winInfo`, `setWin`, `animateSymbols`), `Board.svelte` (`boardWithAnimateSymbols`), `winLevelMap.ts` (tiers, durations), `Win.svelte` (count-up), `BigWinScene.svelte` (BIG/SUPER/MEGA/EPIC), `CoinShower.svelte` |
| Feature presentation | `bookEventHandlerMap.ts` (abilities, combos, re-spins, meters), `FeatureBanner.svelte`, `ClipLayer.svelte` (full-screen clips) |
| Characters | `CrewMascot.svelte` + `LivePose.svelte` (mesh-deformed poses), also used in `BigWinScene.svelte`, `FeatureBanner.svelte` |
| HUD | `Hud.svelte`, `MeterFill.svelte`, `RespinLock.svelte`, `FreeSpinCounter.svelte` |
| Bonus screens | `FreeSpinIntro.svelte`, `FreeSpinOutro.svelte`, `TransitionAnimation.svelte`, `Transition.svelte`, `PressToContinue.svelte` |
| Bet console & buttons | `GGLayoutDesktop.svelte`, `GGLayoutPortrait.svelte`, `GGConsole.svelte`, `ButtonAnte.svelte`, `FE/src/gg-overrides/*` (SDK button/label overrides) |
| HTML modals | `ModalGGBuyBonus.svelte`, `ModalGGPayTable.svelte`, `ModalGGRules.svelte`, `BetStepper.svelte`, `FE/src/lib/gg-ui.css` (SDK window skin) |
| **Clip engine** | `FE/src/game/clips.svelte.ts` (download budget, player pool, `playClip`, `ensureClip`, mascot/cell-fx state), `ClipSprite.svelte`, `ClipLayer.svelte`, `FE/src/game/clipUrls.ts` (generated) |
| Asset manifest | `FE/src/game/ggAssets.ts` + `FE/static/assets/gg/layout.json` (generated by `art/process_assets.py`), `FE/src/game/assets.ts` |
| Fonts | `FE/src/lib/fonts/register.ts` (Luckiest Guy via FontFace), bitmap fonts `FE/static/assets/fonts/ggGold`, `ggSilver` (`art/make_fonts.py`) |
| Rendering defaults / GPU safety | `FE/src/game/pixiDefaults.ts` (WebGL context-loss reload) |
| Clip sources | `video/src/Root.tsx` (registry), `video/src/clips/*.tsx` (Stories, BonusIntro, Outros, Mystery, Abilities, Combos, Feature, Wins, Loops, Symbols, Characters, Round2), `video/src/lib/{fx,ui,assets,font}.tsx` |
| Asset pipeline | `art/process_assets.py` (resize, lossless WebP, cut-outs), `art/prep_*.py`, `art/sync_clips.py`, `art/upscale/*` (Real-ESRGAN 2×), `video/render-all.mjs` |

**Must not change (math / RGS / rules):** `math/**`, `FE/src/game/config.ts` (generated from the math), RGS packages in `vendor/web-sdk`, the *logic* in `bookEventHandlerMap.ts` (which events set which cells/state). Only its presentation calls (clips, banners, highlights, timings) are in scope.

---

## C. Animation inventory

### C.1 Live (real-time PixiJS, code-driven)

| Animation | File | What it does today |
|---|---|---|
| Reel spin & stop | `utils-slots` + `constants.ts` | Symbols fall in per reel with a back-out bounce; turbo variant. |
| Speed stretch | `ReelSymbol.svelte` | Falling symbols stretch vertically and fade slightly with speed. |
| Reel stop jolt | `BoardContainer.svelte` | Damped 4.5 px vertical bounce of the board per reel stop. |
| Symbol land | `SymbolArt.svelte` | Squash & stretch; specials flash a soft halo. |
| Symbol win | `SymbolArt.svelte` | Anticipation dip → back-ease pop → wobble → pulsing halo → one shine sweep (masked) → 7-star burst → small held pulse. |
| Non-win dimming | `ReelSymbol.svelte` + `Board.svelte` | Non-winning symbols tint darker during a win. |
| Transform pop | `ReelSymbol.svelte` (`morph`) | Ability-changed cells shrink and pop into the new symbol. |
| Cell highlight | `CellHighlights.svelte` | Crew-tinted glow frame (static sprite, timed). |
| Character idle/act | `LivePose.svelte` | 12×16 mesh bend: breathing, sway, cheer jump, ability lunge, slump; shine sweep. |
| Big win | `BigWinScene.svelte` | Counter-rotating rays, elastic title, screen shake, crew slide-in. |
| Coin shower | `CoinShower.svelte` | Up to 220 physics coins (fountain + rain). |
| Win amount | `Win.svelte` | Elastic punch-in, breathing while counting. |
| Banners | `FeatureBanner.svelte` | Pop-in scroll banner, crew poses, level stars. |
| HUD | `MeterFill.svelte`, `RespinLock.svelte` | Eased fill + flash; padlock pop. |
| Buttons | `gg-overrides/*`, `ButtonAnte.svelte` | Hover/press scale; ante glow tween. |
| Press to continue | `PressToContinue.svelte` | Pulse. |
| Transition | `TransitionAnimation.svelte` | Clip-or-wipe scene transition. |

### C.2 Pre-rendered clips (Remotion → WebM, 42 shipped, 434 MB)

| Group | Clips (seconds, alpha?) |
|---|---|
| Backgrounds (opaque, looped) | BG-MAIN-LOOP 12.0, BG-HEIST-LOOP 8.0, BG-ESCAPE-LOOP 8.0, BG-HIDDEN-LOOP 8.0 |
| Bonus intros (opaque) | SCR-HEIST/ESCAPE/HIDDEN-INTRO 7.2 (story) + -INTRO-LOOP 3.0 each |
| Bonus end screens (opaque) | SCR-HEIST/ESCAPE/HIDDEN-OUTRO 8.2 (story) |
| Mystery Vault (opaque) | FX-MYSTERY-HIDDEN 5.0, -ESCAPE 4.2, -NONE 3.8 |
| Cinematics (opaque) | CIN-MAX-WIN 9.0, CIN-FINAL-ESCAPE 7.0, CIN-PERFECTLY-BAD-PLAN 3.0 |
| Ability / combo overlays (alpha) | ANIM-ROXY/BYTE/TANK/FUSE-ABILITY-FX 3.6, FX-COMBO-RB/BT/TF/FR/RT 3.0, FX-CREW-CHAOS 1.2 |
| Feature overlays (alpha) | FX-RESPIN 1.8, FX-RETRIGGER 1.5, FX-METER-STAGE 1.0, FX-LOOT-MILESTONE 1.3, FX-VAULT-GUARANTEE 2.2, CIN-CLEAN-GETAWAY 2.0, FX-TRANSITION 1.2 |
| Cell clips (alpha, 512²) | SYM-FX-CLONE-IN, -UPGRADE-IN, -VAULT-REVEAL, -WILD-STAMP, -CREW-EXIT (0.5–0.6) |
| Reel anticipation (alpha, 300×1000) | FX-ANTICIPATION 1.0 |

All clips are built by moving, scaling, masking and compositing the **flat delivered pictures** plus CSS-style
particles. None contains true frame-by-frame or rigged animation; characters, symbols and scenery never deform
internally except through the live mesh in `LivePose`.

---

## D. Asset inventory

97 game textures (lossless WebP, 89 MB on disk, ≈ 276 MB as GPU textures at RGBA8) + 14 HTML-only images.
Source art: 84 delivered images (max 1774 px long side), super-resolved 2× with Real-ESRGAN before processing.

| Category | Assets (in-game size) |
|---|---|
| Backgrounds | BG-MAIN, BG-HEIST, BG-ESCAPE, BG-HIDDEN, BG-LOADING (2560×1440 each). Delivered but unused: BG-GARAGE, BG-INTRO, BG-VAULT. |
| Screens | SCR-HEIST/ESCAPE/HIDDEN-INTRO, SCR-HEIST/ESCAPE-OUTRO-CLEAN, SCR-HIDDEN-OUTRO, SCR-LOADING (1920×1080) |
| Symbols | SYM-H1 diamond, H2 money bag, H3 gold bars, H4 watch, L1–L4 (A K Q J), WILD (van), SCATTER (blueprint), ROXY, BYTE, TANK, FUSE (512×512); SYM-WILD-REEL (512×2048) |
| Characters | CHR-ROXY/BYTE/TANK/FUSE-POSE (≈1254 px). Delivered but unused in game: CHR-*-EXPR (expression sheets), CHR-* turnarounds. Rig sheets: `art/delivery/rig/RIG-*` (not used, off-model). |
| Reel & frame | UI-REEL-FRAME (2600×1733), UI-REEL-BG (2000×1333) |
| HUD | UI-METER-GETAWAY, UI-METER-LOOT, UI-CREW-LEVELS, UI-RESPIN(-BASE, -LOCK-ON), UI-MULT, UI-FS-COUNTER, UI-MILESTONE, UI-STAR-ON |
| Console & buttons | UI-CONSOLE-CAP-L/R, -RAIL, -PLATE, -RIVET; UI-BALANCE-PANEL, UI-WIN-PANEL, UI-ANTE-PANEL, UI-BET-UNIT/PANEL/MINUS/PLUS; UI-SPIN-0/1, UI-TURBO-0/1, UI-AUTOPLAY-0, UI-SOUND-0/1, UI-SETTINGS-0, UI-INFO-0, UI-PAYTABLE-0/1, UI-BUY-BONUS-0…3, UI-CLOSE |
| Banners / panels | UI-BANNER (blueprint scroll), UI-INFO-HEADER, UI-BUY-PANEL, BUY-HEIST/ESCAPE/MYSTERY-CARD (1920×1080), UI-MYSTERY-BADGE, UI-VAULT-GUARANTEE, RULE-* (6) |
| Loading | UI-LOADING-BAR-FRAME/FILL, UI-PRESS-CONTINUE-TAP/PRESS, UI-LOGO |
| Generated FX textures | UI-CELL-GLOW, UI-SOFT-GLOW, UI-SHINE, UI-RAYS, FX-COIN (cut from BG-HIDDEN), UI-STAR-ON (drawn) |
| Fonts | Luckiest Guy (all text), bitmap ggGold / ggSilver (win numerals) |
| Audio | `FE/static/assets/audio/sounds.*` — **the web-sdk sample sound sprite, not game audio** (game audio is still outstanding). |

Loading strategy: every Pixi texture is preloaded at start by the SDK `AssetsLoader` (progress bar);
background stills are drawn only after load; clips download in the background in priority order into an
in-memory budget (240 MB desktop / 96 MB mobile, least-recently-used release), with `ensureClip` waiting for
screens that depend on a clip.

---

## E. Missing animation capabilities

1. **No layered background.** Each scene is one flat picture + one baked overlay video. No foreground/midground/background separation, so no parallax, no depth of field, no camera drift reacting to the game.
2. **No real-time ambient particles.** Rain, dust, searchlights, neon flicker, money drift are baked into the loop video (15 fps texture updates) and cannot react to spins, wins or anticipation.
3. **No per-symbol bespoke win animation.** All 14 symbols share one generic pop/shine/stars recipe. A slot at this level usually gives each high symbol its own effect (diamond facet sparkle, money bag bounce + bills, gold bar shine, watch hands spinning) and the crew symbols character beats.
4. **No idle life on the board.** Static symbols are fully still between spins (no periodic glints on highs or breathing on crew icons).
5. **No win-line / ways presentation.** `winInfo` carries the symbol, count and amount per win, but only the cells animate: no per-win amount pop-ups, no connecting glow across reels, no win cycling on long win lists.
6. **No reel-level effects.** No motion-blurred symbol textures, no reel-stop dust or sparks, no landing spotlight on Scatters or Wilds beyond the shared halo.
7. **No rigged characters.** `LivePose` bends the whole picture; there are no blinks, mouth shapes or limb motion (the delivered rig sheets do not match the character art).
8. **No GPU post-processing.** No colour grading, bloom, vignette or chromatic accents; `pixi-filters` is installed but unused.
9. **No shared timeline/tween layer.** Each component runs its own `requestAnimationFrame` loop and easing maths; there is no common tween utility, so timings are hard to tune consistently.
10. **Spine runtime unused** (`spine-pixi-v8` is installed), so no path for animator-made assets yet.

### Why it reads as "AI-generated" (visual causes, not code)

- **Inconsistent rendering across assets:** each image came from a separate generation, so lighting direction, outline weight, saturation and level of detail differ between symbols, frame, backgrounds and characters.
- **Over-glow and over-detail:** heavy bloom, sparkle clutter and "everything shiny" surfaces; the royals (A K Q J) are especially generic.
- **Uneven symbol framing:** symbols fill their 512² canvas by different amounts and sit at different visual weights, so the grid looks irregular.
- **Static, poster-like compositions:** frozen scenes with motion only from overlays read as stills with effects on top.
- **Small AI artefacts:** soft or garbled micro-detail (straps, lettering, hands) and baked text inside art.

---

## F. Performance and rendering bottlenecks

| # | Issue | Where | Impact |
|---|---|---|---|
| F1 | **Full-HD VP9 alpha overlays.** Browsers decode alpha VP9 in software; 1920×1080 alpha clips (abilities, combos) cost heavy CPU per frame and upload an 8 MB texture per frame. | `clips.svelte.ts`, all `ANIM-*/FX-*` clips | Dropped frames on mid/low phones during feature clips. |
| F2 | **434 MB of clips, 540 MB build.** Long first-play downloads; memory budget can evict clips, forcing re-download. | `FE/static/assets/clips`, `render-all.mjs` | Slow loading, possible title-card fallbacks on slow networks. |
| F3 | **≈ 276 MB GPU textures preloaded** (5 backgrounds at 2560×1440, 7 screens at 1920×1080, large panels). | `process_assets.py` PLAN, `ggAssets.ts` | Risk of WebGL context loss on low-memory devices (a reload safety net exists). |
| F4 | **Background loop at 1920×1080 cover-scaled.** Softer than the 2560 still on large or retina screens; updated at 15 fps. | `Background.svelte`, `Loops.tsx` | Visible softness, stepped motion. |
| F5 | **Many independent rAF loops + Svelte state writes per frame:** each of 24+ `SymbolArt` instances, `ReelSymbol`, `LivePose`, `CoinShower`, `BigWinScene`, `Win`, etc. | listed in C.1 | Main-thread overhead from per-frame reactive updates. |
| F6 | **`CoinShower` rebuilds an array of up to 220 objects per frame** rendered through a Svelte keyed `{#each}` (keyed by index). | `CoinShower.svelte` | Allocation churn + diffing; better as a Pixi `ParticleContainer`. |
| F7 | **Masks and additive blends break batching:** each winning symbol uses a sprite mask for its shine; many `blendMode="add"` sprites. | `SymbolArt.svelte`, `LivePose.svelte`, `BigWinScene.svelte` | Extra draw calls during multi-symbol wins. |
| F8 | **`LivePose` rewrites 192 mesh vertices every frame** and also runs a masked shine. | `LivePose.svelte` | Moderate; fine for 1–4 characters. |
| F9 | **Text objects re-rendered on change** (Pixi `Text` re-rasterises when its string or style changes, e.g. counters, banners). | `Hud.svelte`, `FeatureBanner.svelte`, `GGLabel.svelte` | Small hitches; bitmap fonts already used for big numbers. |
| F10 | **Dead code / unused assets:** `WinCoins.svelte` (unused), placeholder branch in `Symbol.svelte`, unused delivered backgrounds/expression sheets. | `FE/src/components` | Maintenance only. |

Device notes: alpha WebM is unsupported on Safari/iOS (fallbacks exist, opaque clips play); mobile gets a
smaller clip budget and fewer players; layout covers desktop, landscape and portrait.

---

## G. Prioritised implementation plan

Every item below is presentation-only: no change to `math/**`, `config.ts`, RGS packages, or the event *logic*
in `bookEventHandlerMap.ts`.

### Priority 1 — Living background (fixes "too static")

**1.1 Layered parallax scenes.** Split each background into 3–4 depth layers and animate them live in Pixi: a slow
camera drift, small parallax on reel-stop jolts and wins, and a slight zoom during anticipation.
- New: `FE/src/components/SceneParallax.svelte`, `art/prep_layers.py` (cut layers from the delivered art with masks + inpainting behind them).
- Change: `FE/src/components/Background.svelte` (use layers; keep still + loop as fallback), `art/process_assets.py` (export layers), `FE/src/game/ggAssets.ts` (generated).
- Art note: clean separation is much better if the artist supplies layered PSDs; without them, layers are cut from the flat art (some inpainting artefacts).

**1.2 Real-time ambient particles** per scene (rain and searchlight beams for the main scene; dust motes and chandelier glints for the heist; neon flicker and road streaks for the escape; gold dust for the hidden bonus) in a Pixi `ParticleContainer`, reacting to game state (they intensify on anticipation and big wins).
- New: `FE/src/components/AmbientFx.svelte`, `FE/src/game/fx/particles.ts`.
- Change: `Background.svelte`, `Game.svelte` (layer order), `bookEventHandlerMap.ts` (presentation hooks only: anticipation / win intensity).

**1.3 Retire or demote the baked BG-*-LOOP videos** once 1.1 and 1.2 cover them, saving CPU and about 24 MB.
- Change: `Background.svelte`, `art/sync_clips.py` (skip list), `FE/src/game/clips.svelte.ts` (prefetch list).

### Priority 2 — Symbol polish (fixes "symbols need polishing" and the AI look on the grid)

**2.1 Symbol normalisation pass:** consistent visual size and centre per symbol (trim to the content, then scale to one shared fill ratio); unified outer outline and contact shadow; colour grade to one shared palette and lighting direction; clean-up of artefacts.
- Change: `art/process_assets.py` (new `normalise_symbols` step), re-export `FE/static/assets/gg/SYM-*.webp`; `FE/src/components/SymbolArt.svelte` (shared drop shadow layer).
- Optional art: ask the artist for a consistent re-paint of the royals (A K Q J), which read as the most generic.

**2.2 Idle life:** occasional staggered glints on high symbols (never all at once), gentle breathing on crew icons, a slow shimmer on the Wild.
- Change: `SymbolArt.svelte` (idle mode), `ReelSymbol.svelte` (stagger seed).

### Priority 3 — Win animations (fixes "symbol win animations need improvement")

**3.1 Per-symbol signature win animations** (live, on the delivered art, using 2–3 cut-out parts per symbol where needed):
- **H1 diamond:** facet flashes and a prism sparkle.
- **H2 money bag:** squash bounce, bills puff out.
- **H3 gold bars:** a glint runs along each bar, then a stack bounce.
- **H4 watch:** the hands spin and a glint crosses the glass.
- **Royals A K Q J:** a metallic sweep plus a punchy scale.
- **Wild van:** headlights flash, the van bounces with exhaust puffs.
- **Scatter blueprint:** unrolls with a glow.
- **Crew icons:** a character beat (Roxy wheel turn, Byte screen flicker, Tank drill spin, Fuse fuse spark).
- New: `FE/src/components/symbols/` (one small component per symbol family), `art/prep_symbol_parts.py` (cut parts).
- Change: `SymbolArt.svelte` (dispatch by symbol), `Symbol.svelte` (timing), `art/process_assets.py`.

**3.2 Ways-win presentation:** per win, a light trail connects the winning cells across reels and a small amount pop-up is shown (`winInfo.wins[].win`). Long win lists cycle with a total.
- New: `FE/src/components/WinPresentation.svelte`.
- Change: `bookEventHandlerMap.ts` (`winInfo` handler: presentation only; amounts already in the event), `Board.svelte`, `Game.svelte` (layer).

**3.3 Win-tier escalation on the board** before the big-win screen (small → nice → big: rising sparks, background reaction, coins). Reuses 1.2 and the `CoinShower`, moved to a `ParticleContainer`.
- Change: `CoinShower.svelte` (ParticleContainer rewrite), `Win.svelte`, `AmbientFx.svelte`.

### Priority 4 — Cohesive, less "AI" look

**4.1 Global colour grade + light post-FX:** one shared colour LUT/grade, subtle vignette, gentle bloom on gold only, restrained glows (reduce the current halo strengths), using `pixi-filters`.
- New: `FE/src/game/fx/postfx.ts`.
- Change: `Game.svelte` (filters on the scene layer), `SymbolArt.svelte`, `CellHighlights.svelte`, `BigWinScene.svelte` (lower glow levels).

**4.2 Asset consistency audit and art brief:** a list of assets to re-paint for one style (royals, symbol frames, HUD plates), with prompts or a brief for the artist. Delivered art cannot be fully unified in code alone.
- New: `docs/ART_CONSISTENCY_BRIEF.md`.

### Priority 5 — Performance (do alongside 1–3)

- **5.1 Shared tween/ticker:** one `Ticker`-driven animation helper instead of per-component rAF loops (F5). New `FE/src/game/fx/tween.ts`; change `SymbolArt.svelte`, `ReelSymbol.svelte`, `BoardContainer.svelte`, `BigWinScene.svelte`, `Win.svelte`, `MeterFill.svelte`, `LivePose.svelte`.
- **5.2 ParticleContainer for coins and ambient particles** (F6). Change `CoinShower.svelte`.
- **5.3 Lighter alpha overlays on mobile:** render a 960×540 variant of each alpha clip for phones and pick per device (F1, F2). Change `video/render-all.mjs`, `art/sync_clips.py`, `FE/src/game/clips.svelte.ts`, `FE/src/game/clipUrls.ts` (generated).
- **5.4 Mobile texture tier:** half-size backgrounds and screens for phones (F3). Change `art/process_assets.py` (second output set), `FE/src/game/ggAssets.ts` (pick by device).
- **5.5 Remove the symbol shine mask** in favour of a pre-masked shine texture per symbol (F7). Change `art/process_assets.py`, `SymbolArt.svelte`.
- **5.6 Clean-up:** delete `WinCoins.svelte` and the placeholder branch of `Symbol.svelte`.

### Suggested order and verification

1. **Stage 2:** 2.1 symbol normalisation + 5.1 shared ticker. These are the foundation, low risk and visible on every spin.
2. **Stage 3:** 3.1 signature win animations + 3.2 ways presentation + 5.2.
3. **Stage 4:** 1.1 parallax + 1.2 ambient particles + 1.3.
4. **Stage 5:** 4.1 post-FX/grade + 4.2 art brief.
5. **Stage 6:** 5.3, 5.4, 5.5, 5.6 performance tiering for mobile.

**Verification for every stage:**
- **Math and RGS:** math tests (`math/games/getaway_gang/tests`, 36 tests) and an unchanged `index.json` and lookup tables.
- **Playthroughs:** full Playwright runs for base, ante, Heist, Escape and Mystery (`frontend/tests/buy_check.cjs`, `playthrough.cjs`).
- **Visual checks:** desktop, landscape and portrait screenshots.
- **Performance:** a frame-time profile (`frontend/tests/profile_bonus.cjs`), ideally on a real mid-range phone. This sandbox has no GPU, so it cannot measure real frame rates.
