import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'S') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()],
		});
	}

	if (rawSymbol.name === 'W') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForCascading({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSymbolLand,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

const freshHud = () => ({
	bonus: null as null | 'heist' | 'escape' | 'hidden',
	/** Mystery Vault outcome of the current bought round (null otherwise). */
	mystery: null as null | 'hidden' | 'escape' | 'none',
	meterPoints: 0,
	meterStage: 0,
	lootPoints: 0,
	levels: { R: 1, B: 1, T: 1, F: 1 } as Record<'R' | 'B' | 'T' | 'F', number>,
	multiplier: 1,
	respinChain: 0,
	respinRemaining: 0,
});

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	hud: freshHud(),
});

/** Reset per-round HUD (Stake rounds are stateless; bonus progress lives inside one round). */
export const resetHud = () => {
	stateGame.hud = freshHud();
};

// ---------------------------------------------------------------- board mutation helpers
// Feature events change individual cells or swap whole reels; positions include the padding row.
export const setCell = (reel: number, row: number, name: RawSymbol['name']) => {
	const reelSymbol = stateGame.board[reel]?.reelState.symbols[row];
	if (!reelSymbol) return;
	reelSymbol.rawSymbol = { name };
	reelSymbol.symbolState = 'static';
};

export const swapReels = (a: number, b: number) => {
	if (a === b) return;
	const symsA = stateGame.board[a].reelState.symbols;
	const symsB = stateGame.board[b].reelState.symbols;
	const rawA = symsA.map((s) => s.rawSymbol);
	const rawB = symsB.map((s) => s.rawSymbol);
	symsA.forEach((s, i) => (s.rawSymbol = rawB[i]));
	symsB.forEach((s, i) => (s.rawSymbol = rawA[i]));
};

export const getCellName = (reel: number, row: number) =>
	stateGame.board[reel]?.reelState.symbols[row]?.rawSymbol.name;

const boardLayout = () => ({
	x: stateLayoutDerived.mainLayout().width * 0.5,
	y: stateLayoutDerived.mainLayout().height * 0.5,
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
