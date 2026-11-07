# Getaway Gang: One Last Job!

A high-volatility 6×4, 4,096-ways slot for [Stake Engine](https://engine.stake.com/).
*Four criminals. One vault. Absolutely no plan B.*

## Status

| Phase | State |
|---|---|
| Math model (Stake Engine Math SDK, Python) | **Done.** Calibrated, 1M publishable books, SDK RGS verification passes (6/6 risk checks) |
| RTP | **96.0000%** published table; independent Monte Carlo 96.18% ± 0.67% (95% CI) |
| Max win | 12,000× hard cap; occurs naturally, 1 in 683k rounds |
| Game design document | `docs/GAME_DESIGN.md` |
| Frontend (Stake web-sdk, Svelte + PixiJS) | Not started; SDK cloned and installed in `vendor/web-sdk` |
| Art, animation, audio | Not started; needs a production asset source (see below) |

## Documents

- `docs/GAME_DESIGN.md`: rules, paytable, every feature rule with exact numbers, design decisions, book-event contract
- `docs/MATH_PIPELINE.md`: SDK integration, book weighting, how to reproduce every number, calibration log
- `docs/RTP_REPORT.md`: generated RTP, volatility and feature-frequency report

## Math quick start

```bash
math/setup.sh
cd vendor/math-sdk
env/bin/python -m pytest ../../math/games/getaway_gang/tests -q
GG_SIMS=1000000 env/bin/python games/getaway_gang/run.py   # ~5 min on 4 cores, ~800 MB of books
```

## Setup

```bash
git clone --recurse-submodules <this repo>
npm install                # stake-engine RGS client + @slot-engine/* libraries
npm run vendor:install     # optional: install deps inside the vendored source repos
```

If you cloned without `--recurse-submodules`, run `npm run vendor:init` first.

## What's installed

### npm dependencies (`package.json`)
| Package | Purpose |
|---|---|
| `stake-engine` | TypeScript RGS client (`RGSClient`, `ParseAmount`, `DisplayAmount`), from `engineio/ts-client` |
| `@slot-engine/core` | Configure and simulate slot games; outputs Stake Engine-compatible books |
| `@slot-engine/optimizer` | Tune lookup tables to a target RTP |
| `@slot-engine/lgs` | Local gaming server for testing without uploading to Engine |
| `@slot-engine/panel` (dev) | Web GUI for simulations and stats |

### Source repos (git submodules under `vendor/`)
| Path | Upstream |
|---|---|
| `vendor/ts-client` | https://github.com/engineio/ts-client |
| `vendor/slot-engine` | https://github.com/slot-engine/slot-engine (includes `examples/`) |
| `vendor/skills/slot-casino-skills` | https://github.com/egorfedorov/Slot-Casino-Game-Developer-Skills-for-Stake-Engine |
| `vendor/skills/stake-engine-skills` | https://github.com/ReSkin-Games/stake-engine-skills |
| `vendor/math-sdk` | https://github.com/StakeEngine/math-sdk (the official Python Math SDK) |
| `vendor/web-sdk` | https://github.com/StakeEngine/web-sdk (the official frontend SDK) |

`slot-engine` declares Node >= 23.8 and pnpm 11; it installs and builds on Node 22 too. `vendor:install` runs pnpm 11 through `npx`.

### Claude Code skills (`.claude/skills/`)
Project-scoped skills that load automatically in Claude Code sessions opened in this repo:

- **From `stake-engine-skills`:** `stake-math-sdk`, `stake-web-sdk`
- **From [`remotion-dev/remotion`](https://github.com/remotion-dev/remotion) (`packages/skills/skills`, commit d38623d):** 13 Remotion skills for making videos in React: `remotion-best-practices` (router), `remotion-create`, `remotion-markup`, `remotion-studio`, `remotion-render`, `remotion-captions`, `remotion-multimedia`, `remotion-interactivity`, `remotion-maps`, `remotion-saas`, `remotion-docs`, `remotion-upgrade`, `remotion-license`. Not a submodule (the Remotion monorepo is very large); re-copy that folder to update.
- **From `Slot-Casino-Game-Developer-Skills-for-Stake-Engine`:** 34 skills, including `stake-game-developer`, `game-math-director`, `senior-game-math-engineer`, `rtp-optimizer`, `book-generator`, `slot-mechanics-designer`, `pixi-svelte-integrator`, `slot-qa-engineer`, and more.

To update the skills, pull the submodules and copy the skill folders again:

```bash
git submodule update --remote vendor/skills/*
cp -R vendor/skills/slot-casino-skills/*/ .claude/skills/
cp -R vendor/skills/stake-engine-skills/stake-{math,web}-sdk .claude/skills/
```

The optional Stake docs MCP server (`vendor/skills/stake-engine-skills/install-mcp.sh`) is not installed here. It installs into your home directory and registers itself at user scope, so run it on your own machine if you want it.
