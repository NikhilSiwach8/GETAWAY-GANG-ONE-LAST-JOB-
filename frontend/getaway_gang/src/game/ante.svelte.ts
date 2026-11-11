/**
 * ANTE SPIN: an 'activate' bet mode (web-sdk applies its costMultiplier to every spin while it is the active
 * mode). `ante.on` remembers the player's choice, so a bonus buy (which switches the mode to the buy for one
 * round) hands back to ANTE when its round ends instead of to BASE.
 */
import { stateBet } from 'state-shared';

export const ante = $state({ on: false });

export const setAnte = (on: boolean) => {
	ante.on = on;
	stateBet.activeBetModeKey = on ? 'ANTE' : 'BASE';
};

/** After a round: a bought round leaves the buy mode active; return to the player's ante choice. */
export const restoreAnte = () => {
	const k = String(stateBet.activeBetModeKey).toUpperCase();
	if (ante.on && k !== 'ANTE') stateBet.activeBetModeKey = 'ANTE';
	if (!ante.on && k === 'ANTE') stateBet.activeBetModeKey = 'BASE';
};
