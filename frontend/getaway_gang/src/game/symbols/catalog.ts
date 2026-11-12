/**
 * Symbol catalogue: the single description of every symbol's presentation. Art identity (asset ids, crew
 * colours) is unchanged; this adds the art-direction layer that makes the set read as one collection:
 * optical fit (measured, see symbolMetrics.ts), one shared contact shadow, one family accent per symbol for
 * highlight and win light, and a gentle per-symbol grade where the delivered art is out of line.
 */
import { PALETTE, TEMP_SYMBOL_ART } from '../tempArt';
import { SYMBOL_METRICS, type SymbolMetrics } from './symbolMetrics';

export type SymbolFamily = SymbolMetrics['family'];

export type SymbolLook = {
	name: string;
	assetId: string;
	family: SymbolFamily;
	metrics: SymbolMetrics;
	/** light colour for highlight halos and win light */
	accent: number;
	/** multiply tint applied to the art in every state (0xffffff = untouched) */
	grade: number;
	/** catches an occasional idle glint at its own brightest highlight */
	glints: boolean;
	/** lands with a light flash (feature symbols) */
	special: boolean;
};

const ASSET_TO_METRIC = (assetId: string) => assetId.replace(/^SYM-/, '');

const ACCENT: Record<string, number> = {
	H1: 0xbfe9ff, // diamond: cold white-blue
	H2: 0xffd45a,
	H3: 0xffc93c,
	H4: 0xffd45a,
	L1: 0xff6b5a,
	L2: 0xc58bff,
	L3: 0xffa64d,
	L4: 0x6fd6ff,
	W: 0xffb02e,
	S: 0x5aa8ff,
	R: PALETTE.roxy,
	B: PALETTE.byte,
	T: PALETTE.tank,
	F: PALETTE.fuse,
};

/**
 * Grade: the diamond has 43 % of its body at pure white and a baked outer glow, so it reads hotter and
 * flatter than the rest of the set; a 6 % cool pull-down brings it in line until the reworked art lands
 * (brief in docs/SYMBOL_QUALITY_REPORT.md). Everything else is left exactly as delivered.
 */
const GRADE: Record<string, number> = { H1: 0xeef1f7 };

export const SYMBOL_LOOKS: Record<string, SymbolLook> = Object.fromEntries(
	Object.entries(TEMP_SYMBOL_ART).map(([name, art]) => {
		const metrics = SYMBOL_METRICS[ASSET_TO_METRIC(art.assetId)];
		const look: SymbolLook = {
			name,
			assetId: art.assetId,
			family: metrics?.family ?? 'royal',
			metrics,
			accent: ACCENT[name] ?? PALETTE.gold,
			grade: GRADE[name] ?? 0xffffff,
			glints: ['H1', 'H2', 'H3', 'H4', 'W', 'S'].includes(name),
			special: ['W', 'S', 'R', 'B', 'T', 'F'].includes(name),
		};
		return [name, look];
	}),
);

export const getSymbolLook = (name: string): SymbolLook | undefined => SYMBOL_LOOKS[name];
