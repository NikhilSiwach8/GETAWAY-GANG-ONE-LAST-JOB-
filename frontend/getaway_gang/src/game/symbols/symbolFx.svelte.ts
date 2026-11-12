/**
 * Board-wide symbol presentation state shared by every SymbolView: which cells are highlighted (mirrors the
 * existing `cellHighlight` emitter events, so no game logic changes) and which cell has the idle glint.
 */
import type { Position } from '../types';

const key = (reel: number, row: number) => `${reel}:${row}`;

export const symbolFx = $state({
	/** "reel:row" -> accent colour override (0 = use the symbol's own accent) */
	highlighted: {} as Record<string, number>,
	/** cell currently catching an idle glint, and when it started (performance.now) */
	glint: { cell: '', at: 0 },
});

export const cellKey = key;

/** Highlight cells for `ms` (from cellHighlight events). Overlapping highlights keep the latest colour. */
export const highlightCells = (positions: Position[], color: number, ms: number) => {
	const keys = positions.map((p) => key(p.reel, p.row));
	for (const k of keys) symbolFx.highlighted[k] = color;
	setTimeout(() => {
		for (const k of keys) if (symbolFx.highlighted[k] === color) delete symbolFx.highlighted[k];
	}, ms);
};

/**
 * Idle glints: every few seconds one random visible cell may catch the light (only highs and specials react,
 * and only while idle). One at a time across the board, so the board never twinkles all over.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
export const startIdleGlints = (reels: number, rows: number) => {
	stopIdleGlints();
	const next = () => {
		timer = setTimeout(
			() => {
				if (!document.hidden) {
					const reel = Math.floor(Math.random() * reels);
					const row = 1 + Math.floor(Math.random() * rows);
					symbolFx.glint = { cell: key(reel, row), at: performance.now() };
				}
				next();
			},
			1400 + Math.random() * 1600,
		);
	};
	next();
};
export const stopIdleGlints = () => clearTimeout(timer);
