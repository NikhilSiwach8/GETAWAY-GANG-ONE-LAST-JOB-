import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

// book events shared with scatter game
type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		kind: number;
		win: number;
		positions: Position[];
		meta: {
			lineIndex: number;
			multiplier: number;
			winWithoutMult: number;
			globalMult: number;
			lineMultiplier: number;
		};
	}[];
};

// customised
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

// ---------------------------------------------------------------- GETAWAY GANG events
// Mirrors math/games/getaway_gang/game_events.py. Positions include the +1 padding row offset.
export type CrewKey = 'R' | 'B' | 'T' | 'F';
type Ev<T extends string, P> = { index: number; type: T } & P;
type Cell = Position & { symbol: SymbolName };
type Upgrade = Position & { from: SymbolName; to: SymbolName };
type Swap = { from: number; to: number };

type BookEventGG =
	| Ev<'bonusStart', { bonus: 'heist' | 'escape'; totalFs: number }>
	| Ev<'crewLanded', { crew: { character: CrewKey; positions: Position[]; level: number }[] }>
	| Ev<'laneSwitch', { level: number; swaps: Swap[]; wilds: Position[] }>
	| Ev<'systemClone', { level: number; symbol: SymbolName | null; positions: Position[]; source: string }>
	| Ev<'vaultBreaker', { level: number; area: Position[]; loot: Cell[] }>
	| Ev<'bigBangUpgrade', { level: number; source: string; area: Position[]; upgrades: Upgrade[] }>
	| Ev<
			'crewCombo',
			{
				combo: string;
				characters: CrewKey[];
				symbol?: SymbolName | null;
				positions?: Position[];
				upgrades?: Upgrade[];
				swap?: Swap | null;
			}
	  >
	| Ev<'perfectlyBadPlan', { multiplier: number; wilds: Position[] }>
	| Ev<'meterWilds', { positions: Position[] }>
	| Ev<'crewExit', { positions: Position[]; symbol: SymbolName }>
	| Ev<'boardTransformed', { board: RawSymbol[][] }>
	| Ev<'winMultiplier', { multiplier: number; parts: Record<string, number> }>
	| Ev<'getawayMeter', { points: number; stage: number; gained: number; newStages: number[] }>
	| Ev<'lootMeter', { points: number; gained: number; rewards: ({ at: number } & Record<string, number>)[] }>
	| Ev<'crewLevels', { levels: Record<CrewKey, number>; activations: Record<CrewKey, number> }>
	| Ev<
			'chaosRespinAward',
			{ reasons: { reason: string; requested: number; granted: number }[]; remaining: number; chain: number }
	  >
	| Ev<'chaosRespinStart', { chain: number; locked: Position[] }>
	| Ev<'freeSpinRetrigger', { totalFs: number; positions: Position[] }>
	| Ev<'freeSpinsAdded', { amount: number; totalFs: number; reason: string }>
	| Ev<'finalEscape', { levels: Record<CrewKey, number>; masters: CrewKey[]; award: number }>
	| Ev<'payoutCapped', { requested: number; paid: number }>
	| Ev<'wincap', { amount: number }>;

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventCreateBonusSnapshot
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	| BookEventGG
	// customised
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
