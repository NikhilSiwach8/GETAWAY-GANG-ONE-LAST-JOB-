# Asset delivery

Put finished assets here. Each file is named **exactly** by its asset ID from
`docs/ASSET_PROMPTS.txt`. Sub-folders are optional and only for your own tidiness.

```
art/delivery/
  symbols/     SYM-H1.png  SYM-H1-ANIM.json  SYM-H1-ANIM.atlas  SYM-H1-ANIM.png
  characters/  CHR-ROXY.png  CHR-ROXY-POSE.png  ANIM-ROXY-IDLE.json …
  backgrounds/ BG-MAIN.webp  BG-MAIN-portrait.webp  BG-MAIN-LOOP.webm
  fx/          FX-COMBO-RB.json …   ui/  UI-LOGO.png …   audio/  MUS-MAIN.ogg  SFX-ROXY.ogg …
```

## Naming rules
- The file name is the asset ID, plus an optional suffix after a dash for variants: `BG-MAIN.webp`,
  `BG-MAIN-portrait.webp`, `UI-SPIN-pressed.png`. The checker matches the full name, so name a
  variant's main file by the bare ID as well.
- Spine animations come as three files with the same base name: `.json`, `.atlas` and the `.png` page(s).
- Videos: `.webm` (VP9, with alpha for overlays). Audio: `.ogg` plus `.m4a`; keep `.wav` masters outside git.
- Symbols and UI must be transparent PNG or WebP. Symbols are 512×512 px. Backgrounds are 3840×2160 px.

## Check what's done

```bash
python3 art/check_assets.py
```

It writes `art/delivery/STATUS.md`: delivered ✅, missing ⬜, or needs fixing ⚠️ (for example wrong
size, no transparency, or a Spine file without its atlas), grouped by priority.

## What to make first

| Tier | Assets | Why |
|---|---|---|
| **1** (21 assets) | The 15 symbol statics (`SYM-H1`…`SYM-FUSE`, `SYM-WILD-REEL`), `BG-MAIN`, `BG-HEIST`, `BG-ESCAPE`, `UI-LOGO`, `UI-REEL-FRAME`, `UI-REEL-BG` | Replaces almost every placeholder the player sees on every spin |
| **2** (55 assets) | Symbol land/win animations, symbol transformation effects, the 4 ability effects and other feature effects, all UI, the character hero poses and idle loops | Makes features and wins look real |
| **3** (the rest) | Combo and bonus cinematics, win celebrations, screens, the remaining character animations, music, sound effects, voice | The premium layer |

Deliver in batches. Each batch gets wired in and checked in the game, so problems show up early.

## How to get files to the project
- **Git:** commit into `art/delivery/` and push. Files over 50 MB, such as long videos or WAV
  masters, should go through Git LFS or be shared as a link; GitHub rejects files over 100 MB.
- **Chat:** attach the files and say which asset IDs they are.
