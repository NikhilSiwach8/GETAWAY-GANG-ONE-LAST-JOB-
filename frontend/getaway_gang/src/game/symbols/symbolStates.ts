/**
 * Visual states of a symbol and how the game's symbol state maps onto them.
 *
 *   idle         at rest on the board (occasional glint on highs and specials)
 *   highlighted  a feature points at this cell (cellHighlight): lifted, accent rim light, slow pulse
 *   winning      part of a win: anticipation dip, pop, wobble, accent halo, shine, star burst, held pulse
 *   dimmed       a win is shown elsewhere: darker, slightly smaller, shadow fades
 *   animated     a one-off motion: landing squash (and the ability morph pop, done by ReelSymbol)
 *   reset        not a separate pose: every visual channel eases back to idle (about 200 ms) when a state
 *                ends, so no symbol ever snaps from win or dim to rest
 *
 * Priority when several apply: winning > animated > highlighted > dimmed > idle.
 */
import type { SymbolState } from '../types';

export type SymbolVisualState = 'idle' | 'highlighted' | 'winning' | 'dimmed' | 'animated';

export const resolveVisualState = (s: { state: SymbolState; dimmed?: boolean; highlighted?: boolean }): SymbolVisualState => {
	if (s.state === 'win') return 'winning';
	if (s.state === 'land') return 'animated';
	if (s.highlighted) return 'highlighted';
	if (s.dimmed) return 'dimmed';
	return 'idle';
};

/** Resting value of each blended channel per state (the renderer eases toward these). */
export type Channels = { lift: number; light: number; dim: number; shadow: number };

export const CHANNELS: Record<SymbolVisualState, Channels> = {
	idle: { lift: 1, light: 0, dim: 0, shadow: 1 },
	highlighted: { lift: 1.06, light: 0.65, dim: 0, shadow: 0.8 },
	winning: { lift: 1, light: 0, dim: 0, shadow: 0.5 }, // the win sequence drives its own scale and halo
	dimmed: { lift: 0.97, light: 0, dim: 1, shadow: 0.4 },
	animated: { lift: 1, light: 0, dim: 0, shadow: 1 },
};

/** Time constant (s) of the ease back to rest. */
export const RESET_TAU = 0.07;
