import { GG_LAYOUT } from './ggAssets';

/** HUD panel width in desktop/landscape (board units); portrait scales the same panels into rows. */
export const HUD_W = 230;
const h = (id: keyof typeof GG_LAYOUT, w = HUD_W) => (w * GG_LAYOUT[id].height) / GG_LAYOUT[id].width;
const GAP = 12;

/**
 * Portrait: the reels fill the width, so the HUD sits in rows between the logo and the reel frame.
 *   row 1: Getaway Meter | Chaos Re-spins | multiplier badge
 *   row 2 (bonus): Loot Meter or Crew Levels | free-spin counter
 * Returns positions in the same board-space coordinates the HUD components already use.
 */
export const portraitRows = (
	board: { x: number; y: number },
	frame: { width: number; height: number },
	bonus: 'heist' | 'escape' | null,
) => {
	const mH = h('UI-METER-GETAWAY');
	const multW = (mH * GG_LAYOUT['UI-MULT'].width) / GG_LAYOUT['UI-MULT'].height;
	const r1 = HUD_W + GAP + HUD_W + GAP + multW;
	const s1 = frame.width / r1;
	const left = board.x - frame.width / 2;
	const frameTop = board.y - frame.height / 2;
	const row1Y = frameTop - mH * s1 - 6;
	const h2 = bonus === 'escape' ? h('UI-CREW-LEVELS') : h('UI-METER-LOOT');
	const fsW = (h2 * GG_LAYOUT['UI-FS-COUNTER'].width) / GG_LAYOUT['UI-FS-COUNTER'].height;
	const s2 = Math.min(s1, frame.width / (HUD_W + GAP + fsW));
	const row2Y = row1Y - h2 * s2 - 6;
	return {
		left,
		s1,
		row1Y,
		respinX: HUD_W + GAP,
		multX: 2 * (HUD_W + GAP),
		multW,
		s2,
		row2Y,
		fsX: left + (HUD_W + GAP) * s2,
		fsW: fsW * s2,
	};
};
