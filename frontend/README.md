# GETAWAY GANG — Frontend (Stake Engine web-sdk)

> Production art throughout: delivered stills (`art/delivery` → `art/process_assets.py`), animation clips
> rendered with Remotion (`video/` → `art/animations` → `art/sync_clips.py`), bitmap fonts built from the
> delivered glyph sheets (`art/make_fonts.py`). The only web-sdk sample asset left is the audio set.
> No external network requests: fonts are bundled (`src/lib/fonts`), sample URLs are stripped at build time.

## Layout

| Path | What |
|---|---|
| `getaway_gang/` | The game app (Svelte 5 + PixiJS 8), built from the web-sdk `ways` sample. It lives here and is registered in the `vendor/web-sdk` pnpm workspace by `setup.sh` |
| `getaway_gang/src/game/config.ts` | **Generated** from the math (`tools/gen_config.py`): paytable, grid, bet modes and bonus-buy prices, meter thresholds |
| `getaway_gang/src/game/bookEventHandlerMap.ts` | One handler per book event. Every board change is copied from the book; the frontend never computes an outcome |
| `getaway_gang/src/game/tempArt.ts` | All placeholder colours, labels and asset IDs, in one place |
| `getaway_gang/src/components/` | `Symbol` (temp tiles), `FeatureBanner` (title cards standing in for cinematics), `CellHighlights`, `Hud` (meters, levels, multiplier, re-spins), `FreeSpinCounter`, `Background`, `BoardFrame`, `TempWatermark`, `GameUI` (shared Stake UI), `GameModals` + `ModalGGBuyBonus` / `ModalGGPayTable` / `ModalGGRules` (game-specific Buy Bonus, Paytable and How to Play; every number read from config.ts), `ClipLayer` / `ClipSprite` (animation clips: in-memory Blob downloads, at most 14 live players, cross-fades) |
| `getaway_gang/src/game/meta.ts` | Bet modes for the shared UI: BASE plus the buy modes HEIST (43×) and ESCAPE (450×) |
| `dev-rgs/` | Local Stake-API RGS (`@slot-engine/lgs`) serving the real published books. HTTPS on :7771 |
| `tests/playthrough.cjs` | Playwright end-to-end play-through with forced feature books |

## Setup and build

```bash
frontend/setup.sh
```

It registers the app in the web-sdk workspace, installs pnpm 10.5 dependencies, builds the LGS and
runs the turbo build. To rebuild the app alone:

```bash
cd vendor/web-sdk && npx -y pnpm@10.5.0 --filter getaway_gang build
```

The output goes to `getaway_gang/build/`, as a static site, which Stake requires. Note that
`vite build` prints `✔ done` and then keeps running (the Sass helpers keep it alive). The build is
complete at `✔ done`, so stop the process then.

## Play locally (real math, no upload needed)

The math must be built first (`math/rebuild_all.sh`, which also writes the dev book set). Then run
the RGS, the static server and the browser:

```bash
node frontend/dev-rgs/server.mjs
```

```bash
cd frontend/getaway_gang/build && python3 -m http.server 3010
```

1. Open `https://localhost:7771/lgs` once and accept the self-signed certificate. The Stake RGS
   client always uses `https://`.
2. Open the **Play:** URL that `server.mjs` prints.

**Force any feature.** `frontend/dev-rgs/data/showcase.json` lists book IDs for every feature: each
crew member, each combo, Perfectly Bad Plan, every Getaway Meter stage, Loot milestones, re-spin
chains of length 1–4, retriggers, Final Escape with 1–4 masters, and the max win. To force one:

```bash
curl -X PUT localhost:7770/lgs/sessions/<sessionID>/force -H 'content-type: application/json' -d '{"force":{"bookId":7700}}'
```

Send `{"force":null}` to go back to weighted draws.

The server also serves the bonus-buy modes (`heist`, `escape`) with prices from the published
`index.json`; their dev books are a 3,000-book sample of each buy table (`build_dev_books.py --buy-only`).

The dev book set is a stratified sample of the published 1M books, with weights rescaled per
stratum. Its RTP has sampling noise, roughly ±1.5%. The published table is exactly 96.00%.

## End-to-end test

```bash
TURBO=1 NODE_PATH=$(npm root -g) node frontend/tests/playthrough.cjs http://localhost:3010 /tmp/shots base pbp heist maxwin
```

For each case it creates a fresh session, forces a showcase book, presses Space, and waits for the
round to settle on the RGS. It writes screenshots and `results.json`, which includes any console errors.

## Asset pipeline

| Step | Command | Output |
|---|---|---|
| Stills | `python3 art/process_assets.py` | `static/assets/gg/*.webp`, `src/game/ggAssets.ts` (Pixi assets + HTML-only `GG_HTML`) |
| Fonts | `python3 art/make_fonts.py` | `static/assets/fonts/ggGold`, `ggSilver` (BMFont) |
| Clips | `cd video && node render-all.mjs`, then `python3 art/sync_clips.py` | `static/assets/clips/*.webm`, `src/game/clipUrls.ts` |
| Coin particles | `cd video && node render-sprites.mjs`, then `python3 art/pack_sprites.py` | `art/animations/FX-COINS.*` → `static/assets/fx` |

Clips are cosmetic: when a browser cannot play transparent WebM (Safari/iOS), every clip has a coded
fallback (title card, fade transition, pulsing frame, drawn win title), so the game is fully playable.
