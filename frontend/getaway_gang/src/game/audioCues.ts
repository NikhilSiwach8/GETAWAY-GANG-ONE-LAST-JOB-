/**
 * Feature sound cues. Every feature moment already goes through an animation clip or a title card with
 * an asset id (playClip / playCellFx / featureBanner); this maps those ids to the game's own sounds, so a
 * crew ability, combo, meter stage, re-spin or vault reveal always sounds, whether its clip plays or its
 * fallback card shows. A cue for the same sound within DEDUPE_MS is skipped (a clip followed by its
 * explanatory card sounds once).
 */
import { eventEmitter } from './eventEmitter';
import type { SoundEffectName } from './sound';

const EXACT: Record<string, SoundEffectName> = {
	'FX-CREW-CHAOS': 'sfx_crew_chaos',
	'SYM-FX-WILD-STAMP': 'sfx_wild_stamp',
	'SYM-FX-CLONE-IN': 'sfx_clone',
	'SYM-FX-UPGRADE-IN': 'sfx_upgrade',
	'SYM-FX-VAULT-REVEAL': 'sfx_vault_reveal',
	'SYM-FX-CREW-EXIT': 'sfx_crew_exit',
	'FX-METER-STAGE': 'sfx_meter_stage',
	'UI-METER-GETAWAY': 'sfx_meter_stage',
	'CIN-CLEAN-GETAWAY': 'sfx_clean_getaway',
	'CIN-FINAL-ESCAPE': 'sfx_clean_getaway',
	'FX-LOOT-MILESTONE': 'sfx_loot_milestone',
	'UI-METER-LOOT': 'sfx_loot_milestone',
	'FX-RESPIN': 'sfx_respin',
	'UI-CREW-LEVELS': 'sfx_level_up',
	'UI-MULT': 'sfx_multiplier',
	'FX-MYSTERY': 'sfx_mystery',
	'FX-MYSTERY-HIDDEN': 'sfx_mystery',
	'FX-MYSTERY-ESCAPE': 'sfx_mystery',
	'FX-MYSTERY-NONE': 'sfx_mystery',
	'FX-VAULT-GUARANTEE': 'sfx_vault_reveal',
	'FX-TRANSITION': 'sfx_transition',
};
const PREFIX: [string, SoundEffectName][] = [
	['ANIM-ROXY-ABILITY', 'sfx_ability_roxy'],
	['ANIM-BYTE-ABILITY', 'sfx_ability_byte'],
	['ANIM-TANK-ABILITY', 'sfx_ability_tank'],
	['ANIM-FUSE-ABILITY', 'sfx_ability_fuse'],
	['FX-COMBO-', 'sfx_combo'],
	['UI-COMBO', 'sfx_combo'],
];

const DEDUPE_MS = 1500;
const last = new Map<SoundEffectName, number>();

export const cueFor = (id: string | undefined): SoundEffectName | undefined => {
	if (!id) return undefined;
	return EXACT[id] ?? PREFIX.find(([p]) => id.startsWith(p))?.[1];
};

/** Play the sound for a clip / card asset id (no-op for ids without a cue). */
export const cue = (id: string | undefined) => {
	const name = cueFor(id);
	if (!name) return;
	const now = performance.now();
	if (now - (last.get(name) ?? -Infinity) < DEDUPE_MS) return;
	last.set(name, now);
	eventEmitter.broadcast({ type: 'soundOnce', name });
};
