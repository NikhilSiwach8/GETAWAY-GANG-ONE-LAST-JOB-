import { GG_LAYOUT } from './ggAssets';

/** Reel-frame size: its transparent window wraps the 6x4 board with a small margin. The frame art's
 *  window is wider than 6:4, so it is scaled slightly non-uniformly (metal bezel tolerates it). */
export const frameRect = (board: { width: number; height: number }) => {
	const win = GG_LAYOUT['UI-REEL-FRAME'].window;
	return { width: (board.width * 1.08) / win.w, height: (board.height * 1.06) / win.h };
};
