# Release Checklist — GETAWAY GANG: ONE LAST JOB!

Status key: ✅ done and verified · ⬜ open · ⛔ blocks submission

## Math
- ✅ Implemented on the official Stake Engine Math SDK (`math/games/getaway_gang`), with 30 unit and property tests
- ✅ Three bet modes: `base` (1×, 1,000,000 books), `heist` bonus buy (43×, 300,000 books), `escape` bonus buy (450×, 150,000 books)
- ✅ SDK RGS verification passes for all three modes (SHA-256, payout hash, 6/6 risk checks)
- ✅ Every published lookup table is exactly 96.0000% RTP (exact rational arithmetic), never above; modes within ±0.5%
- ✅ The 12,000× cap is enforced by one controller; max win occurs naturally (`docs/RTP_REPORT.md`)
- ✅ All meter milestones are reachable (frequencies in `docs/RTP_REPORT.md`)
- ⬜ Upload the math files (index.json + books + lookup table per mode) through the Stake ACP — download links in the `stake-upload` GitHub release

## Frontend: functional (verified by `frontend/tests/playthrough.cjs` with zero console errors)
- ✅ Base game, The Heist, The Perfect Escape, Perfectly Bad Plan, re-spin chains and a 12,000× max win play and settle against the real books over the Stake RGS API
- ✅ Bonus buys: Buy Bonus button → cards priced from the math → confirm → round charged cost × bet and settled
- ✅ The board shown is always the board the math evaluated (`boardTransformed` settles it)
- ✅ Interrupted rounds resume: a reloaded session replays the open round
- ✅ Spacebar starts a bet (verified in the portrait phone play-through)
- ✅ Desktop, landscape phone and portrait phone layouts: HUD and free-spin counter positioned for each
- ✅ Paytable (symbol art, pays at the current bet) and How to Play (7 tabs with the rules illustrations) written for this game
- ⬜ Translations: game-specific strings are English only

## Frontend: platform compliance
- ✅ **No external network requests.** Fonts bundled (Nunito + Luckiest Guy, SIL OFL) and Typekit loader replaced at build time; sample image URLs stripped from the shared defaults. Only the RGS is contacted
- ✅ **All visuals are Getaway Gang art:** symbols, backgrounds, reel frame, HUD, UI buttons (incl. Buy Bonus and Paytable), loading screen + loading bar, "tap/press anywhere", bitmap fonts (gold win counter, silver counters), 93 animation clips (abilities, combos, cinematics, wins, symbol and cell effects, character animations, reel anticipation, scene transition, bonus end screens), coin/banknote particles, Buy Bonus cards and panel, rules illustrations
- ✅ No placeholder labels: PRE-RELEASE watermark and TEMP asset tags removed
- ✅ Clip fallbacks: browsers without transparent WebM (Safari/iOS) get coded equivalents for every clip; the game stays fully playable
- ⛔ **Audio.** Still the web-sdk sample sound set. Replace with the MUS-, SFX- and VO- assets (`docs/ASSET_PROMPTS_ROUND2.txt` §5–8)
- ⬜ Backgrounds are 1672×941 Lanczos-upscaled to 2560×1440; an AI upscale pass (e.g. Real-ESRGAN) would sharpen them on large screens

## Dev-only items (not shipped)
- `frontend/dev-rgs` (local LGS, self-signed TLS proxy, `BASE` mode alias) is for local play and tests only
- The dev book set's RTP has sampling noise of about ±1.5%; the published table is exact
