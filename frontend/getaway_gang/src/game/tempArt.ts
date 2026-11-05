/**
 * TEMPORARY ART -- NOT FOR RELEASE.
 *
 * Every visual the game needs is drawn here with plain Pixi shapes + text so the game is playable
 * end to end before production art exists. Each entry carries the asset ID of its replacement in
 * docs/ASSET_PROMPTS.md (e.g. SYM-H1, CHR-ROXY). Swapping in real art = replacing these renderers
 * with Sprite/Spine components keyed by the same IDs; no game logic depends on this file.
 */

import config from './config';

export const TEMP_ART_BANNER = 'PRE-RELEASE — PLACEHOLDER EFFECTS, CINEMATICS & AUDIO';

export const PALETTE = {
	roxy: 0xff4c36,
	byte: 0xa34bff,
	tank: 0xffa12b,
	fuse: 0x28b9ef,
	gold: 0xf7c947,
	navy: 0x0d1530,
	charcoal: 0x1c1f26,
	metal: 0x6b7280,
	vault: 0xb7791f,
	white: 0xffffff,
} as const;

export type TempSymbolArt = {
	assetId: string;
	label: string;
	sub: string;
	fill: number;
	text: number;
	border: number;
	shape: 'gem' | 'card' | 'special' | 'crew';
};

export const TEMP_SYMBOL_ART: Record<string, TempSymbolArt> = {
	H1: { assetId: 'SYM-H1', label: '◆', sub: 'DIAMOND', fill: 0x2bb3d9, text: 0xffffff, border: PALETTE.gold, shape: 'gem' },
	H2: { assetId: 'SYM-H2', label: '$', sub: 'MONEY BAG', fill: 0x3f8f3f, text: 0xffffff, border: PALETTE.gold, shape: 'gem' },
	H3: { assetId: 'SYM-H3', label: '▤', sub: 'GOLD BARS', fill: 0xc99a2e, text: 0x3b2a00, border: PALETTE.gold, shape: 'gem' },
	H4: { assetId: 'SYM-H4', label: '◷', sub: 'WATCH', fill: 0x8a8f99, text: 0xffffff, border: PALETTE.gold, shape: 'gem' },
	L1: { assetId: 'SYM-L1', label: 'A', sub: 'ACE', fill: 0x2a3550, text: 0xff6b5a, border: 0x46557a, shape: 'card' },
	L2: { assetId: 'SYM-L2', label: 'K', sub: 'KING', fill: 0x2a3550, text: 0xc58bff, border: 0x46557a, shape: 'card' },
	L3: { assetId: 'SYM-L3', label: 'Q', sub: 'QUEEN', fill: 0x2a3550, text: 0xffbe5c, border: 0x46557a, shape: 'card' },
	L4: { assetId: 'SYM-L4', label: 'J', sub: 'JACK', fill: 0x2a3550, text: 0x6fd6ff, border: 0x46557a, shape: 'card' },
	W: { assetId: 'SYM-WILD', label: 'WILD', sub: 'GETAWAY VAN', fill: 0xd62828, text: 0xffffff, border: PALETTE.gold, shape: 'special' },
	S: { assetId: 'SYM-SCATTER', label: 'BONUS', sub: 'BLUEPRINT', fill: 0x1d4ed8, text: 0xffffff, border: 0xffffff, shape: 'special' },
	R: { assetId: 'SYM-ROXY', label: 'ROXY', sub: 'LANE SWITCH', fill: PALETTE.roxy, text: 0xffffff, border: 0xffffff, shape: 'crew' },
	B: { assetId: 'SYM-BYTE', label: 'BYTE', sub: 'SYSTEM CLONE', fill: PALETTE.byte, text: 0xffffff, border: 0xffffff, shape: 'crew' },
	T: { assetId: 'SYM-TANK', label: 'TANK', sub: 'VAULT BREAKER', fill: PALETTE.tank, text: 0x2a1600, border: 0xffffff, shape: 'crew' },
	F: { assetId: 'SYM-FUSE', label: 'FUSE', sub: 'BIG BANG', fill: PALETTE.fuse, text: 0x00202b, border: 0xffffff, shape: 'crew' },
};

export const CREW_INFO = {
	R: { name: 'ROXY', ability: 'LANE SWITCH', color: PALETTE.roxy, line: 'Everybody hold on!', assetId: 'CHR-ROXY' },
	B: { name: 'BYTE', ability: 'SYSTEM CLONE', color: PALETTE.byte, line: 'I may have opened the wrong account!', assetId: 'CHR-BYTE' },
	T: { name: 'TANK', ability: 'VAULT BREAKER', color: PALETTE.tank, line: "That's definitely not the right vault!", assetId: 'CHR-TANK' },
	F: { name: 'FUSE', ability: 'BIG BANG UPGRADE', color: PALETTE.fuse, line: 'Good news. The door is gone!', assetId: 'CHR-FUSE' },
} as const;

export type CrewKey = keyof typeof CREW_INFO;

export const COMBO_INFO: Record<string, { title: string; crew: CrewKey[]; assetId: string; detail: string }> = {
	hotwiredClone: { title: 'HOT-WIRED CLONE', crew: ['R', 'B'], assetId: 'FX-COMBO-RB', detail: '+2 extra clones' },
	vaultClone: { title: 'VAULT CLONE', crew: ['B', 'T'], assetId: 'FX-COMBO-BT', detail: 'Vault loot duplicated' },
	goldenVault: { title: 'GOLDEN VAULT', crew: ['T', 'F'], assetId: 'FX-COMBO-TF', detail: 'Vault loot upgraded' },
	blastDrift: { title: 'BLAST DRIFT', crew: ['F', 'R'], assetId: 'FX-COMBO-FR', detail: 'Upgraded reel moves to reel 2' },
	armoredGetaway: { title: 'ARMORED GETAWAY', crew: ['R', 'T'], assetId: 'FX-COMBO-RT', detail: 'Vault reel moves to reel 1' },
};

export const BACKGROUND_ART = {
	basegame: { assetId: 'BG-MAIN', label: 'BANK EXTERIOR — NIGHT', top: 0x0b1026, bottom: 0x1f2a4a },
	heist: { assetId: 'BG-HEIST', label: 'THE HEIST — VAULT INTERIOR', top: 0x2a1a05, bottom: 0x6b4a12 },
	escape: { assetId: 'BG-ESCAPE', label: 'THE PERFECT ESCAPE — NEON HIGHWAY', top: 0x120424, bottom: 0x0a3a5c },
} as const;

export const METER_STAGE_REWARDS = [
	'+1 Wild on crew reveals',
	'All crew +1 level',
	'+1 Chaos Re-spin',
	'×2 win multiplier',
	'CLEAN GETAWAY ×5',
];

export const METER_THRESHOLDS: readonly number[] = config.features.meterThresholds;
export const LOOT_THRESHOLDS: readonly number[] = config.features.lootThresholds;
export const LOOT_REWARDS = ['+1 free spin', '×2 loot multiplier', '+1 free spin', '+2 spins, ×3, crew +1 lvl'];
