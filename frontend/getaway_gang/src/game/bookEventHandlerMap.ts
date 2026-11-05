import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';
import { sequence } from 'utils-shared/sequence';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived, setCell, swapReels, resetHud } from './stateGame.svelte';
import { CREW_INFO, COMBO_INFO, METER_STAGE_REWARDS, LOOT_REWARDS, LOOT_THRESHOLDS, PALETTE, type CrewKey } from './tempArt';
import config from './config';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};


// ---------------------------------------------------------------- GETAWAY GANG presentation helpers
// Every board change below is copied from the book event; the frontend never decides an outcome.
const banner = (title: string, color: number, subtitle?: string, assetId?: string, ms?: number) =>
	eventEmitter.broadcastAsync({ type: 'featureBanner', title, color, subtitle, assetId, ms });
const highlight = (positions: Position[], color: number, ms?: number) =>
	eventEmitter.broadcastAsync({ type: 'cellHighlight', positions, color, ms });
const crewColor = (c: CrewKey) => CREW_INFO[c].color;
const crewTitle = (c: CrewKey, level: number) => `${CREW_INFO[c].name} · ${CREW_INFO[c].ability} · LV${level}`;
const RESPIN_REASON_TEXT: Record<string, string> = {
	crewChaos: 'Two or more crew members acted',
	perfectlyBadPlan: 'Perfectly Bad Plan',
	getawayMeterStage3: 'Getaway Meter stage 3',
	cleanGetaway: 'Clean Getaway (stage 5)',
};
let nextRevealIsRespin = false;

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		stateGame.hud.multiplier = stateGame.hud.meterStage >= 5 ? 5 : stateGame.hud.meterStage >= 4 ? 2 : 1;
		if (!nextRevealIsRespin) stateGame.hud.respinChain = 0;
		nextRevealIsRespin = false;
		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		await sequence(bookEvent.wins, async (win) => {
			await animateSymbols({ positions: win.positions });
		});
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateGame.hud = { ...stateGame.hud, bonus: null, lootPoints: 0, levels: { R: 1, B: 1, T: 1, F: 1 } };
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},

	// ============================================================ GETAWAY GANG
	bonusStart: async (bookEvent: BookEventOfType<'bonusStart'>) => {
		resetHud();
		stateGame.hud.bonus = bookEvent.bonus;
		const heist = bookEvent.bonus === 'heist';
		await banner(
			heist ? 'THE HEIST' : 'THE PERFECT ESCAPE',
			heist ? PALETTE.gold : PALETTE.fuse,
			heist
				? `${bookEvent.totalFs} free spins · Loot Meter active`
				: `${bookEvent.totalFs} free spins · Crew upgrades persist`,
			heist ? 'SCR-HEIST-INTRO' : 'SCR-ESCAPE-INTRO',
			2200,
		);
	},
	crewLanded: async (bookEvent: BookEventOfType<'crewLanded'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		const names = bookEvent.crew.map((c) => CREW_INFO[c.character].name).join(' + ');
		await Promise.all([
			...bookEvent.crew.map((c) => highlight(c.positions, crewColor(c.character), 900)),
			banner('CREW CHAOS!', PALETTE.gold, names, 'FX-CREW-CHAOS', 900),
		]);
	},
	laneSwitch: async (bookEvent: BookEventOfType<'laneSwitch'>) => {
		await banner(crewTitle('R', bookEvent.level), PALETTE.roxy, CREW_INFO.R.line, 'ANIM-ROXY-ABILITY');
		for (const swap of bookEvent.swaps) {
			await highlight(
				[1, 2, 3, 4].flatMap((row) => [
					{ reel: swap.from, row },
					{ reel: swap.to, row },
				]),
				PALETTE.roxy,
				450,
			);
			swapReels(swap.from, swap.to);
		}
		bookEvent.wilds.forEach((p) => setCell(p.reel, p.row, 'W'));
		await highlight(bookEvent.wilds, PALETTE.roxy, 500);
	},
	systemClone: async (bookEvent: BookEventOfType<'systemClone'>) => {
		const sym = bookEvent.symbol;
		await banner(crewTitle('B', bookEvent.level), PALETTE.byte, sym ? `Cloning ${sym} ×${bookEvent.positions.length}` : CREW_INFO.B.line, 'ANIM-BYTE-ABILITY');
		if (sym) bookEvent.positions.forEach((p) => setCell(p.reel, p.row, sym));
		await highlight(bookEvent.positions, PALETTE.byte, 600);
	},
	vaultBreaker: async (bookEvent: BookEventOfType<'vaultBreaker'>) => {
		await banner(crewTitle('T', bookEvent.level), PALETTE.tank, CREW_INFO.T.line, 'ANIM-TANK-ABILITY');
		await highlight(bookEvent.area, PALETTE.tank, 500);
		bookEvent.loot.forEach((c) => setCell(c.reel, c.row, c.symbol));
		await highlight(bookEvent.loot, PALETTE.gold, 500);
	},
	bigBangUpgrade: async (bookEvent: BookEventOfType<'bigBangUpgrade'>) => {
		await banner(crewTitle('F', bookEvent.level), PALETTE.fuse, CREW_INFO.F.line, 'ANIM-FUSE-ABILITY');
		await highlight(bookEvent.area, PALETTE.fuse, 500);
		bookEvent.upgrades.forEach((u) => setCell(u.reel, u.row, u.to));
		await highlight(bookEvent.upgrades, PALETTE.gold, 500);
	},
	crewCombo: async (bookEvent: BookEventOfType<'crewCombo'>) => {
		const info = COMBO_INFO[bookEvent.combo];
		const color = crewColor(bookEvent.characters[0]);
		await banner(
			info?.title ?? bookEvent.combo,
			color,
			`${bookEvent.characters.map((c) => CREW_INFO[c].name).join(' + ')} · ${info?.detail ?? ''}`,
			info?.assetId,
		);
		const sym = bookEvent.symbol;
		if (sym && bookEvent.positions?.length) {
			bookEvent.positions.forEach((p) => setCell(p.reel, p.row, sym));
			await highlight(bookEvent.positions, color, 500);
		}
		if (bookEvent.upgrades?.length) {
			bookEvent.upgrades.forEach((u) => setCell(u.reel, u.row, u.to));
			await highlight(bookEvent.upgrades, PALETTE.gold, 500);
		}
		if (bookEvent.swap && bookEvent.swap.from !== bookEvent.swap.to) {
			swapReels(bookEvent.swap.from, bookEvent.swap.to);
			await highlight(
				[1, 2, 3, 4].map((row) => ({ reel: bookEvent.swap!.to, row })),
				color,
				500,
			);
		}
	},
	perfectlyBadPlan: async (bookEvent: BookEventOfType<'perfectlyBadPlan'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await banner('PERFECTLY BAD PLAN!', PALETTE.gold, `All four crew · ×${bookEvent.multiplier} Crew Combo · Chaos Re-spin`, 'CIN-PERFECTLY-BAD-PLAN', 2200);
		bookEvent.wilds.forEach((p) => setCell(p.reel, p.row, 'W'));
		await highlight(bookEvent.wilds, PALETTE.gold, 600);
	},
	meterWilds: async (bookEvent: BookEventOfType<'meterWilds'>) => {
		bookEvent.positions.forEach((p) => setCell(p.reel, p.row, 'W'));
		await highlight(bookEvent.positions, PALETTE.gold, 500);
	},
	crewExit: async (bookEvent: BookEventOfType<'crewExit'>) => {
		bookEvent.positions.forEach((p) => setCell(p.reel, p.row, bookEvent.symbol));
		if (bookEvent.positions.length) await highlight(bookEvent.positions, 0xffffff, 400);
	},
	boardTransformed: async (bookEvent: BookEventOfType<'boardTransformed'>) => {
		// Authoritative board from the math: guarantees the evaluated board is exactly what is shown.
		eventEmitter.broadcast({ type: 'boardSettle', board: bookEvent.board });
	},
	winMultiplier: async (bookEvent: BookEventOfType<'winMultiplier'>) => {
		stateGame.hud.multiplier = bookEvent.multiplier;
		const parts = Object.entries(bookEvent.parts)
			.map(([k, v]) => `${{ crewCombo: 'Crew Combo', getawayMeter: 'Getaway Meter', lootMeter: 'Loot Meter' }[k] ?? k} ×${v}`)
			.join(' · ');
		await banner(`WIN MULTIPLIER ×${bookEvent.multiplier}`, PALETTE.gold, parts, 'UI-MULT', 800);
	},
	getawayMeter: async (bookEvent: BookEventOfType<'getawayMeter'>) => {
		stateGame.hud.meterPoints = bookEvent.points;
		stateGame.hud.meterStage = bookEvent.stage;
		for (const stage of bookEvent.newStages) {
			await banner(
				stage === 5 ? 'CLEAN GETAWAY!' : `GETAWAY METER · STAGE ${stage}`,
				PALETTE.gold,
				METER_STAGE_REWARDS[stage - 1],
				stage === 5 ? 'CIN-CLEAN-GETAWAY' : 'UI-METER-GETAWAY',
				stage === 5 ? 2000 : 1000,
			);
		}
	},
	lootMeter: async (bookEvent: BookEventOfType<'lootMeter'>) => {
		stateGame.hud.lootPoints = bookEvent.points;
		for (const reward of bookEvent.rewards) {
			const i = LOOT_THRESHOLDS.indexOf(reward.at);
			await banner(`LOOT METER · ${reward.at} POINTS`, PALETTE.vault, LOOT_REWARDS[i] ?? '', 'UI-METER-LOOT', 1100);
		}
	},
	crewLevels: async (bookEvent: BookEventOfType<'crewLevels'>) => {
		const ups = (Object.keys(bookEvent.levels) as CrewKey[]).filter((c) => bookEvent.levels[c] > stateGame.hud.levels[c]);
		stateGame.hud.levels = { ...bookEvent.levels };
		for (const c of ups) {
			await banner(`${CREW_INFO[c].name} LEVEL ${bookEvent.levels[c]}`, crewColor(c), 'Upgrade persists for the rest of the Escape', 'UI-CREW-LEVELS', 900);
		}
	},
	chaosRespinAward: async (bookEvent: BookEventOfType<'chaosRespinAward'>) => {
		stateGame.hud.respinRemaining = bookEvent.remaining;
		const granted = bookEvent.reasons.filter((r) => r.granted > 0);
		if (granted.length) {
			await banner('CHAOS RE-SPIN!', PALETTE.gold, granted.map((r) => RESPIN_REASON_TEXT[r.reason] ?? r.reason).join(' · '), 'FX-RESPIN', 1100);
		} else {
			await banner('RE-SPIN LIMIT REACHED', PALETTE.metal, `Max ${config.features.maxRespinsPerChain} Chaos Re-spins per spin`, 'FX-RESPIN', 900);
		}
	},
	chaosRespinStart: async (bookEvent: BookEventOfType<'chaosRespinStart'>) => {
		stateGame.hud.respinChain = bookEvent.chain;
		stateGame.hud.respinRemaining = Math.max(0, stateGame.hud.respinRemaining - 1);
		nextRevealIsRespin = true;
		await highlight(bookEvent.locked, PALETTE.gold, 600);
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		await banner('RETRIGGER!', PALETTE.gold, `+5 free spins · ${bookEvent.totalFs} total`, 'FX-RETRIGGER', 1200);
	},
	freeSpinsAdded: async (bookEvent: BookEventOfType<'freeSpinsAdded'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		await banner(`+${bookEvent.amount} FREE SPIN${bookEvent.amount > 1 ? 'S' : ''}`, PALETTE.vault, 'Loot Meter reward', 'UI-METER-LOOT', 900);
	},
	finalEscape: async (bookEvent: BookEventOfType<'finalEscape'>) => {
		const masters = bookEvent.masters.map((c) => CREW_INFO[c].name).join(', ') || 'none';
		await banner(
			'FINAL ESCAPE',
			PALETTE.fuse,
			bookEvent.award > 0 ? `Master crew: ${masters} · +${bookEvent.award / 100}× bet` : 'No crew reached Level 3',
			'CIN-FINAL-ESCAPE',
			2400,
		);
	},
	payoutCapped: async () => {},
	wincap: async () => {
		await banner('MAXIMUM WIN!', PALETTE.gold, `${config.wincap.toLocaleString()}× bet · round complete`, 'CIN-MAX-WIN', 2600);
	},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastBonusStart = findLastBookEvent('bonusStart' as const);
		const lastMeter = findLastBookEvent('getawayMeter' as const);
		const lastLoot = findLastBookEvent('lootMeter' as const);
		const lastLevels = findLastBookEvent('crewLevels' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastBonusStart) stateGame.hud.bonus = lastBonusStart.bonus;
		if (lastMeter) Object.assign(stateGame.hud, { meterPoints: lastMeter.points, meterStage: lastMeter.stage });
		if (lastLoot) stateGame.hud.lootPoints = lastLoot.points;
		if (lastLevels) stateGame.hud.levels = { ...lastLevels.levels };
	},
};
