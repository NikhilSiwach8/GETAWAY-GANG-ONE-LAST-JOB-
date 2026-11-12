# GETAWAY GANG — Stage 4: Win Presentation System

Presentation only. Payouts, math, RGS events and game state transitions are unchanged. The book events are
the only source of truth:

- `winInfo.wins[]` supplies each win's symbol, cell positions and amount.
- `setWin` supplies the amount to count up and its `winLevel`.

The animation system never adds up, derives or estimates a win.

## Flow

```
reveal ─▶ winInfo ─▶ setWin ─▶ setTotalWin ─▶ (next event waits for settle)
           │           │
           │           └─ presentAmount():  3 counter ── small: counts alongside the cycle, lands with the last win
           │                                4 tier ──── big+: after the cycle, BIG → SUPER → MEGA → EPIC (→ MAX)
           │                                5 reset ─── counter fades, everything returns to idle
           └─ presentWins():  1 detect ── every winning cell flashes at once, the board takes a hit
                              2 cycle ─── each win in book order:
                                           anticipation → pop → impact (squash & stretch) → settle → held pulse
                                           light trail through the winning reels, cell frames in the symbol's accent,
                                           at the impact: sparks, the win's amount badge, a counter beat
                              (the handler returns at the first impact, so the counter starts on it)
```

The 11 requested parts:

| # | Requirement | Where |
|---|---|---|
| 1 | Win detection presentation | detect phase: `winDirector.presentWins`, `WinBoardFx.svelte` |
| 2 | Symbol anticipation | the 0–0.11 s wind-up of every symbol track (`sequences.ts`, `SYMBOL_WIN`) |
| 3 | Symbol highlighting | accent cell frames and the light trail (`WinBoardFx`); non-winning symbols dim (`SymbolView`) |
| 4 | Individual symbol animation | per-family keyframe tracks: highs, royals, specials, crew (`SYMBOL_WIN`), played by `SymbolView` |
| 5 | Impact and squash-and-stretch | `sx` / `sy` / `y` tracks (stretch into the pop, squash on impact, crew hop), board jolt on detect |
| 6 | Particle effects | `WinSparks.svelte` (pooled board sparks), `CoinShower.svelte` (pooled coins, tier rates) |
| 7 | Win counter synchronisation | count-up starts at the first impact and lands with the last win; beats on every impact (`Win.svelte`) |
| 8–10 | Big / Mega / Epic win | `BigWinScene.svelte` + `TIER_LOOK`: stage titles, palettes, ray layers, shake, flash, crew, coins, edge glow (Epic/Max) |
| 11 | Completion and reset | `presentAmount` → `resetAll()`; the board cycle restores dimming and symbol states; `win_check.cjs` verifies |

## Building blocks (`src/game/wins/`)

- **`easing.ts`:** named easing curves (sine, quad, cubic, expo, back, elastic) and keyframe tracks (`sample`).
  - There is no linear curve. Every movement, fade and count uses an ease.
- **`timeline.ts`:** `Timeline` holds eased tweens and cues at fixed times.
  - `finish()` jumps to the end and applies every final value; `kill()` stops without applying anything.
  - One shared runner drives all timelines from the PixiJS ticker, using delta time. It is only attached while a timeline runs.
- **`sequences.ts`:** all configuration lives here:
  - phase timings (normal and fast play)
  - symbol keyframe tracks per family
  - spark counts
  - tier looks (title, colours, ray layers, coin rates, shake, crew, edge glow)
  - count-up lengths per tier
- **`winDirector.svelte.ts`:** the single owner of the presentation. Its reactive state (`winFx`) is read by `WinBoardFx`, `Win` and `BigWinScene`.

Components:
- `WinBoardFx.svelte` + `WinSparks.svelte`: the board layer.
- `Win.svelte`: the counter.
- `BigWinScene.svelte`: the tiers.
- `CoinShower.svelte`: coins, also used by the bonus end screen.
- `SymbolView.svelte`: symbol tracks; it reports completion on the ticker clock.

## Guarantees

- **No overlap:** `bookEventHandlerMap` wraps every handler except `winInfo`, `setWin` and `setTotalWin`, so it first awaits `settle()`. Handlers, their order and every state change are unchanged.
- **Deterministic timing:** no random delays; the same outcome presents with the same rhythm. Spark directions follow fixed angles, and coins use a golden-ratio sequence for variety.
- **Fast play:** with `stateBet.isTurbo`, symbol tracks run about 1.9× faster, phases are shorter, and big-win count-ups are halved.
- **Skip:** a tap or Space during the counter completes the count-up at once (it lands exactly on the event amount); a second press ends the presentation.
- **Clean-up:**
  - Timelines resolve and leave the runner.
  - Ticker callbacks (runner, sparks, coins, scene clock, symbols) detach when idle.
  - The presentation state returns to idle, the board is undimmed, and no symbol is left in the win state.
- **Mobile:** half the spark pool and spark counts, half the coin pool and coin rates. There is no per-frame allocation: pooled `ParticleContainer`s, and no Svelte work per particle.

## Verification

- **`frontend/tests/win_check.cjs`:** replays real event sequences cut from the published books (`frontend/tests/fixtures_win_sequences.json`) on Playwright's fake clock. It checks:
  - the counter lands on the `setWin` amount
  - tier stages match the event level
  - clean reset
  - identical length on replay
  - fast play is shorter
  - skip works
  - no win is shown while the reels spin when two sequences overlap
- **`frontend/tests/win_record.cjs`:** frame-exact recordings of the same sequences, used for the before-and-after videos.
