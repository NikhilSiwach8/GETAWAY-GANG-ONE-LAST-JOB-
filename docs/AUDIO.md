# GETAWAY GANG — Audio

All music and sound effects are original compositions and designs.

- **Music and musical stingers** (horn fanfares, strings, timpani) are written as MIDI in code and
  played by a sampled band. The instruments are recorded samples from the MuseScore General
  SoundFont (MIT licence; parts public domain or CC0), rendered with FluidSynth (`art/audio/sampler.py`,
  `art/audio/music_real.py`). The performance is humanized (velocity, micro-timing, swing, ghost notes
  and fills), then mixed with convolution reverb, bus compression and limiting.
- **Effects** (impacts, whooshes, engines, coins, glitches) are synthesized (`art/audio/synth.py`,
  `art/audio/sfx.py`).
- No AI audio services are used.

The SoundFont is used only to render the WAV and Ogg files. The game ships rendered audio, not the
SoundFont.

**Requirements:**

```
apt-get install fluidsynth musescore-general-soundfont
pip install mido
```

**Rebuild:**

```
python3 art/audio/build.py
```

This renders every sound, normalizes it to its loudness target, and writes the sprite to
`frontend/getaway_gang/static/assets/audio/sounds.{ogg,m4a,mp3,json}`.

- Add `--only name1,name2` to re-render only those sounds; the rest come from the render cache.
- `art/audio/analyze.py` checks band balance, loudness and loop seams.
- `art/audio/music.py` is the earlier all-synth score, kept for reference.

## Music

The music is an original heist-caper theme in D minor (Dm9 – Bbmaj7 – Gm9 – A7♭9).

| Name | Use | Content |
|---|---|---|
| `bgm_main` | Base game (74 s loop) | 104 BPM funk-heist band, lightly swung: Room drum kit, fingered bass, muted guitar and Rhodes. The vibraphone carries the theme, then the horn section (trumpet, tenor sax, trombone) takes it, with strings underneath. |
| `bgm_freespin` | Free spins (63 s loop) | The same theme at 122 BPM: the horn section leads, with driving drums, string stabs, timpani and glockenspiel. |
| `bgm_winlevel_big` … `_max` | Big-win tiers (about 8 s loops) | A D-major fanfare for trumpets, trombone and French horn. Each tier adds weight: strings, then glockenspiel, then timpani and a key change, then extra brass. |

## Sound effects

| Moment | Sound |
|---|---|
| Spin button / UI buttons | `sfx_btn_spin` (lever latch and whoosh), `sfx_btn_general` (click) |
| Reel stops | `sfx_reel_stop_1`–`5` (a heavy clunk that differs per reel) |
| Scatter lands | `sfx_scatter_stop_1`–`5` (a bell ladder that climbs with each scatter) |
| Last-reel anticipation | `sfx_anticipation` (seamless tension loop) |
| Wild van lands | `sfx_multiplier_landing` (engine and horn) |
| Small win | `sfx_winlevel_small` |
| Big-win counter / end | `sfx_bigwin_coinloop` (coin-shower loop), `sfx_winlevel_end` |
| Bonus triggered | `sfx_scatter_win_v2`, `sfx_transition` (smoke-wall whoosh), `jng_intro_fs` (fanfare) |
| Mystery Vault | `sfx_mystery` (safe-dial clicks into the reveal) |
| Crew lands | `sfx_crew_chaos` |
| Abilities | `sfx_ability_roxy` (engine rev, tyre screech), `sfx_ability_byte` (digital glitch), `sfx_ability_tank` (drill and blast), `sfx_ability_fuse` (fuse hiss and explosion) |
| Board changes | `sfx_wild_stamp`, `sfx_clone`, `sfx_upgrade`, `sfx_vault_reveal`, `sfx_crew_exit`, `sfx_lane_swap` |
| Crew combo / Perfectly Bad Plan | `sfx_combo` / `sfx_superfreespin` |
| Meters, levels, multiplier | `sfx_meter_stage`, `sfx_clean_getaway`, `sfx_loot_milestone`, `sfx_level_up`, `sfx_multiplier` |
| Chaos Re-spin | `sfx_respin` (rewind and alarm chirps) |
| Total Win | `sfx_youwon_panel` (panel opens), `sfx_count_loop` (counter tick), `sfx_count_land` (ka-ching) |

### How feature sounds fire

Feature sounds are cued from the clip or title-card id they belong to (`src/game/audioCues.ts`).
Each one plays whether the animation clip runs or its fallback card shows. A repeat of the same
sound within 1.5 s is skipped.

## Mix

Loudness targets (integrated LUFS):

| Sound | Target |
|---|---|
| Base music | −19 |
| Free-spin music | −18 |
| Win tiers | −17 to −15 |
| Feature stingers | −13 to −15 |
| Board detail | −16 to −19 |
| Loops under the action | −18 to −21 |
| Reel stops and UI ticks | Peak-normalized |

The loops are folded over at the loop point, so reverb tails carry across it with no gap or click.
