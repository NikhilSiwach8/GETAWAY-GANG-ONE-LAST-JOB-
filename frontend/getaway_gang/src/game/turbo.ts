/**
 * Turbo for presentations. In the base game turbo speeds everything up. Inside a bonus round (free spins, or
 * any bought bonus from the buy to the Total Win) turbo only speeds up the reels: abilities, combos, title
 * cards, wins, transitions and the Total Win count play at normal pace, so a bonus is never a blur.
 */
import { stateBet } from 'state-shared';
import { stateGame } from './stateGame.svelte';

const BASE_MODES = new Set(['BASE', 'ANTE']);
// set when a bonus triggers (before its entry card and transition), cleared when the next paid round starts
let triggered = false;
export const markBonusRound = (on: boolean) => void (triggered = on);

export const inBonusRound = () =>
	triggered || stateGame.gameType === 'freegame' || stateGame.hud.bonus !== null || !BASE_MODES.has(stateBet.activeBetModeKey);

/** true when presentations (clips, cards, wins, counts) should run at turbo speed */
export const presentTurbo = () => stateBet.isTurbo && !inBonusRound();
