/**
 * Shared layout of the Total Win clips (clip pixels). The game draws the amount in `plaque`, and the Heist loot
 * milestones / Escape crew levels in `info`, at exactly these places.
 * KEEP IN SYNC with frontend/getaway_gang/src/game/bonusTotal.ts (TOTAL_LAYOUT).
 */
export const TOTAL_INTRO_FRAMES = 105;
export const TOTAL_LOOP_FRAMES = 90;
/** frame at which the plaque has landed: the game shows the amount and starts counting from here */
export const TOTAL_HANDOVER_FRAME = 52;

export type Box = { x: number; y: number; w: number; h: number };
export type TotalLayout = {
	width: number;
	height: number;
	title: { x: number; y: number; size: number };
	plaque: Box;
	ribbon: { x: number; y: number };
	info: Box;
	crewX: number[];
	crewH: number;
	crewFeet: number;
};

export const TOTAL_LAYOUT: { landscape: TotalLayout; portrait: TotalLayout } = {
	landscape: {
		width: 1920,
		height: 1080,
		title: { x: 960, y: 165, size: 165 },
		plaque: { x: 960, y: 375, w: 980, h: 200 },
		ribbon: { x: 960, y: 535 },
		info: { x: 960, y: 715, w: 1100, h: 220 },
		crewX: [0.095, 0.205, 0.795, 0.905],
		crewH: 0.6,
		crewFeet: 1.04,
	},
	portrait: {
		width: 1080,
		height: 1920,
		title: { x: 540, y: 300, size: 150 },
		plaque: { x: 540, y: 520, w: 960, h: 200 },
		ribbon: { x: 540, y: 690 },
		info: { x: 540, y: 910, w: 1000, h: 250 },
		crewX: [0.14, 0.38, 0.62, 0.86],
		crewH: 0.36,
		crewFeet: 1.03,
	},
};
