# GETAWAY GANG: ONE LAST JOB! — Game Design Document

> *Four criminals. One vault. Absolutely no plan B.*

| | |
|---|---|
| Genre | Modern action and crime comedy |
| Grid | 6 reels × 4 rows, **4,096 ways**, pays left to right |
| Volatility | High |
| RTP | 96.00% (published lookup table; see `docs/RTP_REPORT.md`) |
| Max win | **12,000× total bet**, hard cap per round |
| Signature mechanic | CREW CHAOS |
| Bonuses | THE HEIST (3 Scatters), THE PERFECT ESCAPE (4+ Scatters) |
| Platform | Stake Engine (Python Math SDK, Svelte/PixiJS web-sdk) |

Every rule in this document is implemented in `math/games/getaway_gang/`. Every number comes from
`game_config.py`. When the two disagree, the code is authoritative and this document has a bug.

---

## 1. Story and tone

Four crooks try to rob the most heavily protected private bank in the world. The plan has four
steps: get in, crack the vault, grab the loot, and escape in a souped-up getaway van. The crew is
terrible at working together, and every mistake makes things *better* for the player. Wilds come
from wrong turns, clones from hacking the wrong account, and the vault opens in the wrong place.

The tone is funny, energetic, slightly outrageous and family-friendly. Comedy comes from exaggerated
reactions and bad timing, never from violence. Explosions are colourful and cartoonish; nobody gets hurt.

## 2. The crew

| | ROXY — The Wheelwoman | BYTE — The Hacker | TANK — The Safecracker | FUSE — The Demolition Expert |
|---|---|---|---|---|
| Colour | Red `#FF4C36` | Purple `#A34BFF` | Orange `#FFA12B` | Blue `#28B9EF` |
| Look | Red racing jacket, aviator goggles, fingerless gloves, sporty trousers, boots | Purple hoodie, oversized digital glasses, holographic laptop, gadgets | Huge, orange utility vest, heavy gloves, tool belt, industrial drill | Blue bomber jacket, utility belt, messy hair, cartoon detonator |
| Personality | Reckless, sarcastic, fearless | Brilliant, nervous, never stops talking | Loud, impatient, lovable | Fearless, unpredictable, chaotic |
| Ability | **LANE SWITCH** | **SYSTEM CLONE** | **VAULT BREAKER** | **BIG BANG UPGRADE** |
| Voice line | "Everybody hold on!" | "I may have opened the wrong account!" | "That's definitely not the right vault!" | "Good news. The door is gone!" |

Silhouettes are distinct: Roxy is lean and angular, Byte hunched and round-shouldered, Tank a wide
rectangle, and Fuse an asymmetric spiky outline. Characters are recognisable from shape alone at
mobile size.

## 3. Symbols

| Code | Symbol | Role | Pays per way (3 / 4 / 5 / 6 of a kind) × total bet |
|---|---|---|---|
| H1 | Diamond | Premium | 0.5 / 1.0 / 2.5 / 5.0 |
| H2 | Money Bag | Premium | 0.4 / 0.8 / 2.0 / 4.0 |
| H3 | Gold Bars | Premium | 0.3 / 0.6 / 1.5 / 3.0 |
| H4 | Luxury Watch | Premium | 0.2 / 0.5 / 1.0 / 2.0 |
| L1 | Ace | Low | 0.1 / 0.3 / 0.6 / 1.2 |
| L2 | King | Low | 0.1 / 0.2 / 0.5 / 1.0 |
| L3 | Queen | Low | 0.1 / 0.2 / 0.4 / 0.8 |
| L4 | Jack | Low | 0.1 / 0.2 / 0.3 / 0.6 |
| W | Getaway Van | **Wild**: substitutes for all paying symbols, on any reel | — |
| S | Bank Blueprint | **Scatter**: triggers the bonuses | — |
| R B T F | Roxy, Byte, Tank, Fuse | **Crew**: activate abilities, non-paying | — |

Every pay value is a multiple of 0.1×. Ways counts and multipliers are integers, so every win lands
exactly on Stake Engine's 0.1× payout grid. There is never hidden rounding between the amount shown
and the amount paid.

**Ways rules.** A way starts on reel 1 and continues across adjacent reels while each reel shows
the symbol or a Wild. Ways equal the product of the matching positions per reel. Each symbol pays only its
longest combination, and combinations of different symbols add up. A combination must contain at least one
natural (non-Wild) symbol. Wilds can reach reel 1 through Lane Switch swaps, vault loot or Armored
Getaway; a Wild on reel 1 then starts ways for every symbol.

**Where symbols land.** Scatters can land on all reels, at most one per reel. Wilds land on reels
2–6. Crew symbols land on reels 2–5. Specials are never stacked on the strips, so at most one
special symbol shows per reel on an initial board.

## 4. Round flow

```
PAID SPIN ─► reveal ─► CREW CHAOS ─► evaluate ─► meters ─► Chaos Re-spin? ──yes──► re-spin reveal ─► …
                                                                  │no / max 4
                                                                  ▼
                                    3 Scatters on initial board? ─► THE HEIST (10 FS)
                                    4+ Scatters on initial board? ─► THE PERFECT ESCAPE (12 FS)
                                                                  ▼
                                                        settle round (≤ 12,000×)
```

Stake Engine games must be **stateless**: no information carries from one paid round to the next.
Every meter and level therefore starts from zero at the beginning of each paid round. See §10, decision D1.

## 5. CREW CHAOS — one reveal, step by step

Whenever at least one Crew symbol is on the board (initial reveal or re-spin):

1. **Detect.** Find every Crew symbol. Each character activates **once per reveal**, however many
   copies of it are showing.
2. **Abilities**, in the fixed order **ROXY → BYTE → TANK → FUSE**, at each character's current level (§9).
3. **Combos**, for each pair present, in this fixed order: Roxy+Byte, Byte+Tank, Tank+Fuse, Fuse+Roxy, Roxy+Tank.
4. **Perfectly Bad Plan**, if all four are present.
5. **Getaway Meter stage 1+**: +1 Wild.
6. **Crew exit.** Crew symbols leave the reels. In the bonuses, and on a Perfectly Bad Plan, each one
   leaves a Getaway Van Wild behind. In the base game it leaves an Ace (L1).
7. **Evaluate** the transformed board × multiplier. Pay through the cap controller.
8. **Update** the Getaway Meter, the Loot Meter (Heist) and crew levels (Escape).
9. **Decide** whether a Chaos Re-spin follows.

"Eligible cell" below means a cell holding a regular paying symbol. Wilds, Scatters and Crew are
never overwritten. All random choices (columns, cells, areas, loot) come from the seeded math RNG,
so a book replays identically every time.

### ROXY — LANE SWITCH
| Level | Effect |
|---|---|
| 1 Basic | Swap 1 pair of random columns, then place **1** Wild |
| 2 Enhanced | Swap 1 pair, place **2** Wilds |
| 3 Master | Swap 2 pairs (in sequence), place **3** Wilds |

Columns move whole, including any Scatters and Crew. Wilds go on random eligible cells on reels 2–6.

### BYTE — SYSTEM CLONE
**Target.** The paying symbol that appears most on reel 1; ties go to the higher-paying symbol. If
reel 1 has no paying symbol, the target is the highest-paying symbol on the board.
**Copies.** The target is copied onto random eligible cells on reels 2–6 that hold a different symbol:
Level 1 Basic **3** copies · Level 2 Multi Clone **5** · Level 3 Master Hack **7**.

### TANK — VAULT BREAKER
A random rectangle is drilled open: Level 1 Small Vault **2×2**, Level 2 Expanded Vault **3×3**,
Level 3 Master Vault **3×3** with richer loot. Each eligible cell inside becomes loot:

| Loot | H1 | H2 | H3 | H4 | Wild |
|---|---|---|---|---|---|
| Levels 1–2 weight | 10 | 15 | 20 | 25 | 5 |
| Level 3 weight | 20 | 20 | 20 | 15 | 10 |

### FUSE — BIG BANG UPGRADE
A random area is blasted, and every eligible cell in it moves up the ladder
`J → Q → K → A → Watch → Gold Bars → Money Bag → Diamond` (Diamond is the top):
Level 1 Basic **2×2, +2 steps** · Level 2 Advanced **3×3, +2 steps** · Level 3 Maximum **3×3, +3 steps**.

### Two-character combos (run after all individual abilities)
| Combo | Name | Exact effect |
|---|---|---|
| Roxy + Byte | Hot-Wired Clone | Lane Switch has already run before System Clone, then **+2 extra copies** of Byte's target |
| Byte + Tank | Vault Clone | The highest-paying symbol now inside the vault is cloned to **2** eligible cells *outside* the vault |
| Tank + Fuse | Golden Vault | Every paying vault cell is upgraded **+1 step** |
| Fuse + Roxy | Blast Drift | The column holding the most Fuse-upgraded cells is swapped into **reel 2** |
| Roxy + Tank | Armored Getaway | The column holding the most vault loot is swapped into **reel 1** |

Combos run in this table's order. A combo whose inputs no longer exist still fires, with no visible
effect; for example, Vault Clone does nothing if the vault held no paying cells.

### PERFECTLY BAD PLAN (all four crew on one reveal)
All four abilities and all five combos run, and then:
- **+2 Wilds**, and every Crew symbol leaves a Wild (in the base game too);
- **×3 Crew Combo multiplier** on that reveal's ways win;
- a guaranteed **Chaos Re-spin**, subject to the chain cap;
- the dedicated cinematic and celebration.

### Termination
Each ability runs at most once per reveal, each combo at most once, and PBP at most once. There are
no recursive triggers: nothing created by an ability activates another ability on the same reveal.

## 6. CHAOS RE-SPINS

| Rule | Value |
|---|---|
| Awarded when | **≥2 different characters** activated on the reveal (+1), Getaway Meter reaches stage 3 (+1, once), stage 5 (+1, once) |
| Hard cap | **4 re-spins per chain.** A chain belongs to one paid spin or one free spin, whatever the source |
| Locked | Every Wild on the board, including Crew-exit Wilds, stays in place |
| Redrawn | Every other cell, from a Scatter-free copy of the current reel set |
| Each re-spin | New Crew can land and activate, wins are evaluated and paid, meters update |

Scatters only count on a spin's initial board, so re-spins can never trigger or retrigger a bonus.
The book event `chaosRespinAward` lists every reason, how many re-spins were requested and how many
were granted. The UI uses it to show the player *why* a re-spin happened.

## 7. GETAWAY METER

Points: +1 per character activation, +1 per combo, +2 for Perfectly Bad Plan. Points are capped at 20.

| Stage | Points | Reward |
|---|---|---|
| 1 | 3 | +1 extra Wild on every later reveal that has a Crew activation |
| 2 | 6 | Every crew ability +1 level, up to the maximum of 3 |
| 3 | 10 | +1 Chaos Re-spin, once |
| 4 | 15 | ×2 multiplier on all later reveal wins |
| 5 | 20 | **CLEAN GETAWAY**: ×5 replaces ×2, plus +1 Chaos Re-spin, once |

**Reset and rollover.** In the base game the meter lives for one paid round, including its re-spins,
because the platform is stateless. On entering a bonus it resets to 0, and it then persists for the
whole bonus. Nothing carries out of a bonus. The meter multiplier never stacks above ×5.

## 8. THE HEIST — 3 Scatters, 10 free spins

Set in a lavish bank vault overflowing with loot. Crew Chaos, Chaos Re-spins and the Getaway Meter
all stay active. Board transformations reset after every free spin; the meters persist for the
whole bonus.

**Loot Meter.** It earns +1 per activation, +1 when Tank opens a vault, and +1 per combo:

| Points | Reward | Reached in (measured) |
|---|---|---|
| 4 | +1 free spin | ≈ 49% of Heists |
| 8 | +1 free spin | ≈ 11% |
| 12 | Loot multiplier ×2, for the rest of the bonus | ≈ 1.4% |
| 16 | +2 free spins, loot multiplier ×3 and every crew ability +1 level | ≈ 0.17% |

The thresholds were lowered from 10/20/30/40 after measurement showed the 30 and 40 milestones were
never reached. A meter must not advertise rewards players cannot get.

Retrigger: 3+ Scatters on a free spin's initial board give +5 free spins. Total free spins are
capped at **30**.

## 9. THE PERFECT ESCAPE — 4+ Scatters, 12 free spins

The premium bonus. The crew races through a neon city at night in the getaway van. It uses its own
reel set, with more Crew and more Wilds than The Heist.

**Persistent crew upgrades.** Each character starts at Level 1. A character reaches **Level 2 after
2 activations** and **Level 3 after 3**, counted across the whole bonus, including re-spins and
retriggers. The maximum is Level 3. Effective level = persistent level + Getaway Meter stage-2
bonus, capped at 3. Everything resets when the bonus ends.

Retrigger: 3+ Scatters give +5 free spins. Total free spins are capped at **40**.

**Final Escape.** When the last free spin ends, the van makes its getaway. Each character at Level 3
pays **30× bet**, or **300×** in total if all four reached Level 3. This is the only end-of-bonus
award. It is in the math and the books, and the cinematic only displays it.

**Effective multiplier ceiling.** ×3 (PBP) × ×5 (meter) × ×3 (loot) = ×45. The code asserts this ceiling on every reveal.

## 10. Maximum win

The cap controller (`GameExecutables.pay`) is the only place any payout is credited. It tracks the
running round total. It truncates the payout that would cross 12,000× and emits `payoutCapped` and
`wincap`. It then stops every reward-producing action: no more re-spins, free spins or Final Escape.
The round settles at exactly 12,000×.

## 11. Design decisions where the brief was ambiguous

| # | Ambiguity | Decision and reason |
|---|---|---|
| D1 | "Persistent" Getaway Meter vs Stake Engine's stateless rule | The meter lives for one paid round in base, or one bonus. Carrying state between bets is forbidden on Stake Engine |
| D2 | "Select two eligible columns" (Roxy), "select an area" (Tank/Fuse) | The RNG chooses uniformly; the board's contents never steer a choice. This is simple to verify and replay |
| D3 | What happens to Crew symbols after acting | They leave a Wild in bonuses and on PBP, and an Ace in the base game. Leaving a Wild in base made Crew Chaos worth about 50% RTP alone and broke the budget |
| D4 | Several copies of one character on a board | One activation per character per reveal, so value is predictable and bounded |
| D5 | Resolution order when a combo needs a later character's output (Byte+Tank) | Individual abilities run first in R→B→T→F order, then combos. "Vault rewards become eligible for duplication" is a separate Vault Clone step |
| D6 | Scatters during re-spins | Scatters count only on initial boards. Re-spins use Scatter-free strips, so features cannot loop into bonuses |
| D7 | Zero-win bonus rounds | The Heist can pay 0 (about 2.8% of Heists). No minimum is guaranteed, because that would hide a dead zone in the distribution |
| D8 | 5 or 6 Scatters | Same as 4: 12 free spins of The Perfect Escape, as the brief specifies |
| D9 | RTP target exactly 96.00% with "must not exceed" | Publish at exactly 96.0000% (table RTP ≤ 0.96, verified with exact rational arithmetic) |
| D10 | Payout increments | Stake's RGS requires multiples of 0.1×. All per-way pays are multiples of 0.1×, so no rounding is ever applied to a win |

## 12. Book events (math → frontend contract)

The frontend replays these events in order and never computes an outcome.

| Event | Meaning |
|---|---|
| `reveal` | Board, with one padding symbol above and below each reel (SDK standard) |
| `crewLanded` | Characters present, their positions and levels |
| `laneSwitch` · `systemClone` · `vaultBreaker` · `bigBangUpgrade` | Ability results: swaps, cells, loot and upgrades, `from`→`to` |
| `crewCombo` | `hotwiredClone`, `vaultClone`, `goldenVault`, `blastDrift`, `armoredGetaway`, with details |
| `perfectlyBadPlan` | ×3 and the extra Wild cells |
| `meterWilds` · `crewExit` | Stage-1 Wilds; Crew leaving the reels and what they leave behind |
| `boardTransformed` | The authoritative board that is evaluated |
| `winMultiplier` | Total multiplier and its parts (`crewCombo`, `getawayMeter`, `lootMeter`) |
| `winInfo` · `setWin` · `setTotalWin` | SDK standard win events |
| `getawayMeter` · `lootMeter` · `crewLevels` | Progression updates and milestones reached |
| `chaosRespinAward` · `chaosRespinStart` | Re-spin reasons (requested/granted), locked cells |
| `freeSpinTrigger` · `bonusStart` · `updateFreeSpin` · `freeSpinRetrigger` · `freeSpinsAdded` · `freeSpinEnd` | Bonus flow |
| `finalEscape` | Levels, masters and the award |
| `payoutCapped` · `wincap` · `finalWin` | Settlement |

Positions use the SDK convention: `row` includes the +1 padding offset.
