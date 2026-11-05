# Release Checklist — GETAWAY GANG: ONE LAST JOB!

Status key: ✅ done and verified · ⬜ open · ⛔ blocks submission

## Math
- ✅ Implemented on the official Stake Engine Math SDK (`math/games/getaway_gang`), with 30 unit and property tests
- ✅ 1,000,000 publishable books; SDK RGS verification passes (SHA-256, payout hash, 6/6 risk checks)
- ✅ Published lookup table RTP is exactly 96.0000% (exact rational arithmetic), never above
- ✅ The 12,000× cap is enforced by one controller; max win occurs naturally (`docs/RTP_REPORT.md`)
- ✅ All meter milestones are reachable (frequencies in `docs/RTP_REPORT.md`)
- ⬜ Upload `math/games/getaway_gang/library/publish_files/*` and `configs/*` through the Stake ACP. Regenerate them with `math/rebuild_all.sh`; they are not in git because of their size

## Frontend: functional (verified by `frontend/tests/playthrough.cjs` with zero console errors from game code)
- ✅ The base game, The Heist, The Perfect Escape, Perfectly Bad Plan and a 12,000× max win all play and settle against the real books over the Stake RGS API
- ✅ The board shown is always the board the math evaluated (`boardTransformed` settles it)
- ✅ Interrupted rounds resume: a reloaded session replays the open round
- ✅ No Buy Bonus button (single `base` mode)
- ⬜ Verify the spacebar starts a bet in every layout (Stake requirement). The shared web-sdk hotkey is unmodified; automated presses sometimes arrive before the UI is idle
- ⬜ Check mobile portrait, landscape, tablet and the mini-player. The HUD and free-spin counter are positioned for desktop only
- ⬜ Paytable and rules screens: write the Getaway Gang rules content (`docs/GAME_DESIGN.md` §3–§10). The current modals are the web-sdk defaults
- ⬜ Translations: the new HUD and title-card strings are English only

## Frontend: platform compliance ⛔
- ⛔ **External network requests.** Stake requires every asset to come from the Stake CDN bundle. Inherited from the web-sdk sample:
  - `pixi-svelte` `preloadFont()` loads a Typekit kit (`use.typekit.net`) on every start. Replace it with bundled font files
  - `components-ui-html` modals reference images on `staging-1-0.twist-game.app` and an S3 bucket. Replace them with bundled assets
  - (`src/app.html` Typekit link: ✅ removed)
- ⛔ **Temporary art.** Replace every `TEMP · <ID>` placeholder and every web-sdk sample asset per `docs/ASSET_PROMPTS.md`, then remove `TempWatermark`
- ⛔ **Audio.** Replace the sample sounds with MUS-, SFX- and VO- assets, with separate music and SFX volume controls

## Dev-only items (not shipped)
- `frontend/dev-rgs` (local LGS, self-signed TLS proxy, `BASE` mode alias) is for local play and tests only
- The dev book set's RTP has sampling noise of about ±1.5%; the published table is exact
