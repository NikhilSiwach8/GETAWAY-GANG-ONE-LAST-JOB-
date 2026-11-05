# Getaway Gang: One Last Job

A slot game for [Stake Engine](https://engine.stake.com/).

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

`slot-engine` declares Node >= 23.8 and pnpm 11; it installs and builds on Node 22 too. `vendor:install` runs pnpm 11 through `npx`.

### Claude Code skills (`.claude/skills/`)
Project-scoped skills that load automatically in Claude Code sessions opened in this repo:

- **From `stake-engine-skills`:** `stake-math-sdk`, `stake-web-sdk`
- **From `Slot-Casino-Game-Developer-Skills-for-Stake-Engine`:** 34 skills, including `stake-game-developer`, `game-math-director`, `senior-game-math-engineer`, `rtp-optimizer`, `book-generator`, `slot-mechanics-designer`, `pixi-svelte-integrator`, `slot-qa-engineer`, and more.

To update the skills, pull the submodules and copy the skill folders again:

```bash
git submodule update --remote vendor/skills/*
cp -R vendor/skills/slot-casino-skills/*/ .claude/skills/
cp -R vendor/skills/stake-engine-skills/stake-{math,web}-sdk .claude/skills/
```

The optional Stake docs MCP server (`vendor/skills/stake-engine-skills/install-mcp.sh`) is not installed here. It installs into your home directory and registers itself at user scope, so run it on your own machine if you want it.
