/**
 * Win presentation configuration. Everything the win system does is described here as data: phase
 * timings (normal and fast play), the keyframe tracks of each symbol family's win animation, particle
 * counts, and the big / super / mega / epic / max presentations. Change the feel here, not in components.
 *
 * Timing is fixed (no random delays): the same outcome always presents with the same rhythm.
 */
import type { Track } from './easing';
import type { SymbolFamily } from '../symbols/catalog';

export type Speed = 'normal' | 'turbo';

/** Phase timings in seconds. */
export const WIN_TIMING = {
	normal: {
		/** all winning cells flash together before the first win is shown */
		detect: 0.42,
		/** one win: symbol sequence length (also the board's per-win step) */
		perWin: 1.15,
		/** moment of impact inside a win (badge, particles, counter beat) */
		impact: 0.34,
		/** small wins: shortest count-up */
		countMin: 0.8,
		/** fade of badges, trails and dimming after the last win */
		reset: 0.28,
	},
	turbo: { detect: 0.2, perWin: 0.6, impact: 0.18, countMin: 0.4, reset: 0.16 },
} as const;

export const timing = (speed: Speed) => WIN_TIMING[speed];

/** Track times are authored for normal speed; fast play compresses them by this factor. */
export const TURBO_TIME = WIN_TIMING.turbo.perWin / WIN_TIMING.normal.perWin;

// ---------------------------------------------------------------- symbol win animations (per family)
export type SymbolWinTracks = {
	/** uniform scale (on top of the optical fit) */
	scale: Track;
	/** squash & stretch: multiplies x and y separately (impact squash, stretch into the pop) */
	sx: Track;
	sy: Track;
	/** vertical hop in cell units (negative = up) */
	y: Track;
	/** rotation (radians) */
	rot: Track;
	/** accent halo intensity 0..1 */
	halo: Track;
	/** shine sweep progress 0..1 (clipped to the art) */
	shine: Track;
	/** spark particles at impact */
	sparks: number;
};

// shared beats (normal speed): anticipation 0-0.11 s, pop 0.11-0.34 s, impact squash 0.34-0.46 s,
// settle 0.46-0.75 s, held pulse to the end of the win (1.15 s)
const HOLD_PULSE: Track = [
	[0.75, 1.06],
	[0.95, 1.04, 'sineInOut'],
	[1.15, 1, 'sineInOut'],
];
const BASE_HALO: Track = [
	[0.08, 0],
	[0.3, 1, 'cubicOut'],
	[0.75, 0.75, 'sineInOut'],
	[1.15, 0, 'sineInOut'],
];

const make = (o: { pop: number; squash: number; hop?: number; wobble?: number; sparks: number; shine?: boolean }): SymbolWinTracks => ({
	scale: [
		[0, 1],
		[0.11, 0.93, 'quadIn'],
		[0.34, o.pop, 'backOut'],
		[0.46, o.pop - 0.04, 'quadOut'],
		[0.75, 1.06, 'cubicOut'],
		...HOLD_PULSE,
	],
	sx: [
		[0, 1],
		[0.11, 1.05, 'quadIn'],
		[0.3, 0.93, 'cubicOut'],
		[0.4, 1 + o.squash, 'quadOut'],
		[0.6, 1, 'elasticOut'],
	],
	sy: [
		[0, 1],
		[0.11, 0.9, 'quadIn'],
		[0.3, 1.1, 'cubicOut'],
		[0.4, 1 - o.squash, 'quadOut'],
		[0.6, 1, 'elasticOut'],
	],
	y: o.hop
		? [
				[0.11, 0],
				[0.3, -o.hop, 'cubicOut'],
				[0.42, 0, 'quadIn'],
				[0.5, -o.hop * 0.18, 'quadOut'],
				[0.6, 0, 'quadIn'],
			]
		: [[0, 0]],
	rot: o.wobble
		? [
				[0.3, 0],
				[0.42, o.wobble, 'quadOut'],
				[0.56, -o.wobble * 0.6, 'sineInOut'],
				[0.7, o.wobble * 0.25, 'sineInOut'],
				[0.84, 0, 'sineInOut'],
			]
		: [[0, 0]],
	halo: BASE_HALO,
	shine:
		o.shine === false
			? [[0, 0]]
			: [
					[0.22, 0],
					[0.64, 1, 'cubicInOut'],
				],
	sparks: o.sparks,
});

export const SYMBOL_WIN: Record<SymbolFamily, SymbolWinTracks> = {
	/** highs: full pop, polished shine, the most sparks */
	high: make({ pop: 1.22, squash: 0.1, wobble: 0.05, sparks: 10 }),
	/** royals: a tighter, punchier pop with a metallic sweep */
	royal: make({ pop: 1.16, squash: 0.08, sparks: 6 }),
	/** wild & scatter: the biggest pop and a heavier wobble */
	special: make({ pop: 1.28, squash: 0.12, wobble: 0.09, sparks: 14 }),
	/** crew medallions: a hop and a landing squash, no shine (faces stay readable) */
	crew: make({ pop: 1.14, squash: 0.12, hop: 0.12, sparks: 10, shine: false }),
};

// ---------------------------------------------------------------- big win tiers
export type TierAlias = 'big' | 'superwin' | 'mega' | 'epic' | 'max';
export type TierLook = {
	title: string;
	fill: number;
	shadow: number;
	/** ray layers: [tint, size (x 1080p), turn speed rad/s] */
	rays: [number, number, number][];
	/** coins per second: fountain, rain */
	coins: [number, number];
	/** screen shake amplitude (1080p px) at each stage impact */
	shake: number;
	/** crew [left, right] */
	crew: [string[], string[]];
	/** edge glow (epic and max) */
	edge: number;
};

export const TIER_LOOK: Record<TierAlias, TierLook> = {
	big: {
		title: 'BIG WIN',
		fill: 0xffe27a,
		shadow: 0xff4c36,
		rays: [[0xff8a3c, 2000, 0.16]],
		coins: [30, 4],
		shake: 10,
		crew: [['ROXY'], ['TANK']],
		edge: 0,
	},
	superwin: {
		title: 'SUPER WIN',
		fill: 0xbfeaff,
		shadow: 0x28b9ef,
		rays: [
			[0x28b9ef, 2100, 0.18],
			[0xffe27a, 1500, -0.26],
		],
		coins: [40, 12],
		shake: 13,
		crew: [['BYTE'], ['FUSE']],
		edge: 0,
	},
	mega: {
		title: 'MEGA WIN',
		fill: 0xf3d2ff,
		shadow: 0xa34bff,
		rays: [
			[0xa34bff, 2300, 0.2],
			[0xffe27a, 1600, -0.3],
		],
		coins: [52, 22],
		shake: 16,
		crew: [
			['ROXY', 'BYTE'],
			['TANK', 'FUSE'],
		],
		edge: 0,
	},
	epic: {
		title: 'EPIC WIN',
		fill: 0xffd59a,
		shadow: 0xffa12b,
		rays: [
			[0xff6a1a, 2500, 0.22],
			[0xffe27a, 1800, -0.34],
			[0xff3d2e, 1200, 0.5],
		],
		coins: [64, 34],
		shake: 20,
		crew: [
			['ROXY', 'BYTE'],
			['TANK', 'FUSE'],
		],
		edge: 0.55,
	},
	max: {
		title: 'MAXIMUM WIN',
		fill: 0xffffff,
		shadow: 0xff4c36,
		rays: [
			[0xff4c36, 2600, 0.24],
			[0xffe27a, 1900, -0.36],
			[0xffffff, 1300, 0.55],
		],
		coins: [70, 44],
		shake: 24,
		crew: [
			['ROXY', 'BYTE'],
			['TANK', 'FUSE'],
		],
		edge: 0.75,
	},
};

/**
 * The presentation escalates through the tiers up to the outcome's own tier (from setWin.winLevel):
 * an EPIC win shows BIG -> SUPER -> MEGA -> EPIC, one stage per equal share of the count-up. The amount shown
 * is always the event's amount; stages only pace the celebration.
 */
export const TIER_LADDER: TierAlias[] = ['big', 'superwin', 'mega', 'epic', 'max'];

/** Count-up length per tier (seconds, normal speed), and the hold after it lands. */
export const TIER_COUNT: Record<TierAlias, { count: number; hold: number }> = {
	big: { count: 3.2, hold: 1.2 },
	superwin: { count: 4.2, hold: 1.3 },
	mega: { count: 5.4, hold: 1.4 },
	epic: { count: 7, hold: 1.6 },
	max: { count: 7, hold: 1.8 },
};
export const TURBO_TIER = 0.5;

/** Particles: board sparks per impact (scaled by symbol family), and the mobile reduction. */
export const PARTICLES = { poolDesktop: 180, poolMobile: 90, mobileScale: 0.5 };
