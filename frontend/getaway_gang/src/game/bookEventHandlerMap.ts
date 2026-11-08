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
import { playClip, playCellFx, mascotDo, ensureClip } from './clips.svelte';
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
const banner = (title: string, color: number, subtitle?: string, assetId?: string, ms?: number, crew?: CrewKey[], level?: number) =>
	eventEmitter.broadcastAsync({ type: 'featureBanner', title, color, subtitle, assetId, ms, crew, level });
/** Ability card (fallback when the ANIM-*-ABILITY-FX clip cannot play): character, ability name, level. */
const abilityBanner = (c: CrewKey, level: number, subtitle: string) =>
	banner(CREW_INFO[c].ability, CREW_INFO[c].color, subtitle, `ANIM-${CREW_ID[c]}-ABILITY`, 1700, [c], level);
const highlight = (positions: Position[], color: number, ms?: number) =>
	eventEmitter.broadcastAsync({ type: 'cellHighlight', positions, color, ms });
const crewColor = (c: CrewKey) => CREW_INFO[c].color;
const RESPIN_REASON_TEXT: Record<string, string> = {
	crewChaos: 'Two or more crew members acted',
	perfectlyBadPlan: 'Perfectly Bad Plan',
	getawayMeterStage3: 'Getaway Meter stage 3',
	cleanGetaway: 'Clean Getaway (stage 5)',
};
let nextRevealIsRespin = false;
let lastFsTotal = 0;
let crewThisRound = false;
const CREW_ID = { R: 'ROXY', B: 'BYTE', T: 'TANK', F: 'FUSE' } as const;
const SYMBOL_NAME: Record<string, string> = {
	H1: 'Diamond', H2: 'Money Bag', H3: 'Gold Bars', H4: 'Watch', L1: 'Ace', L2: 'King', L3: 'Queen', L4: 'Jack', W: 'Wild',
};
const COMBO_CLIP: Record<string, string> = {
	hotwiredClone: 'FX-COMBO-RB',
	vaultClone: 'FX-COMBO-BT',
	goldenVault: 'FX-COMBO-TF',
	blastDrift: 'FX-COMBO-FR',
	armoredGetaway: 'FX-COMBO-RT',
};
/** Play the animation clip; if it cannot play (e.g. Safari), show the title card instead. */
const clipOr = async (id: string, fallback: () => Promise<unknown>) => {
	if (!(await playClip(id))) await fallback();
};
/** Cell transformation clip; falls back to the coloured outline. */
const cellFxOr = async (id: string, cells: Position[], color: number, ms = 500) => {
	if (!cells.length) return;
	if (!(await playCellFx(id, cells))) await highlight(cells, color, ms);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/**
 * Smooth symbol transformation: the SYM-FX clip (or the coloured outline) starts first and the cells
 * change underneath it a third of the way in, popping into the new symbol (ReelSymbol `morph`), so the
 * effect hides the change instead of the symbol switching before or after it.
 */
const transform = async (id: string, cells: Position[], apply: () => void, color: number, ms = 500) => {
	if (!cells.length) return apply();
	const fx = cellFxOr(id, cells, color, ms);
	await wait(stateBet.isTurbo ? 90 : 180);
	apply();
	await fx;
};

// Mystery Vault outcome held back until the bought round's first board has landed
let pendingMystery: 'hidden' | 'escape' | 'none' | null = null;
const playPendingMystery = async () => {
	const result = pendingMystery!;
	pendingMystery = null;
	stateGame.hud.mystery = result;
	const clip = { hidden: 'FX-MYSTERY-HIDDEN', escape: 'FX-MYSTERY-ESCAPE', none: 'FX-MYSTERY-NONE' }[result];
	// the reveal is the clip: wait for it (download + first frame) rather than show the title card
	await ensureClip(clip, 8000);
	if (await playClip(clip, 6000)) return;
	await banner('MYSTERY VAULT', PALETTE.gold, 'Cracking the safe…', 'FX-MYSTERY', 1000);
	if (result === 'hidden') {
		await banner('HIDDEN BONUS!', PALETTE.gold, `${config.features.hiddenFs} free spins · crew start at Level ${config.features.hiddenStartLevel} · guaranteed ${config.features.hiddenFloor}× bet`, 'FX-MYSTERY-HIDDEN', 2200, ['R', 'B', 'T', 'F']);
	} else if (result === 'escape') {
		await banner('THE PERFECT ESCAPE!', PALETTE.fuse, `${config.features.escapeFs} free spins`, 'FX-MYSTERY-ESCAPE', 1800);
	} else {
		await banner('EMPTY VAULT', PALETTE.metal, 'No bonus this time · the spin plays on', 'FX-MYSTERY-NONE', 1600);
	}
};

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
		if (pendingMystery) await playPendingMystery();
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
		lastFsTotal = bookEvent.totalFs;
		mascotDo('BONUS-INTRO');
		// the intro is an animated clip: fetch it (and its loop) now, so it is ready when the screen opens
		const introId = stateGame.hud.mystery === 'hidden' ? 'SCR-HIDDEN-INTRO' : bookEvent.totalFs >= 12 ? 'SCR-ESCAPE-INTRO' : 'SCR-HEIST-INTRO';
		const introReady = Promise.all([ensureClip(introId, 6000), ensureClip(`${introId}-LOOP`, 6000)]);
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await introReady;
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
		const outroId = { escape: 'SCR-ESCAPE-OUTRO', heist: 'SCR-HEIST-OUTRO', hidden: 'SCR-HIDDEN-OUTRO' }[stateGame.hud.bonus ?? 'heist'];
		const outroReady = ensureClip(outroId, 6000);

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await outroReady;
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
		resetHud(); // bonus progression ends with the bonus; the round is about to settle
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
		mascotDo('VICTORY');
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		if (winLevelData?.type !== 'big' && bookEvent.amount > 0) mascotDo('WIN');

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
		// comedic shrug only when the crew tried and the round still paid nothing
		if (bookEvent.amount === 0 && crewThisRound) mascotDo('LOSE');
		crewThisRound = false;
	},

	// ============================================================ GETAWAY GANG
	mysteryReveal: async (bookEvent: BookEventOfType<'mysteryReveal'>) => {
		// MYSTERY VAULT: keep the outcome secret until the first board has dropped and the scatters have
		// landed; the vault reveal then plays right after that reveal (see playPendingMystery)
		pendingMystery = bookEvent.result;
	},
	vaultGuarantee: async (bookEvent: BookEventOfType<'vaultGuarantee'>) => {
		// Hidden Bonus floor: top-up so the round pays the guaranteed minimum
		await ensureClip('FX-VAULT-GUARANTEE', 6000);
		if (await playClip('FX-VAULT-GUARANTEE', 4000)) return;
		await banner('VAULT GUARANTEE', PALETTE.gold, `+${bookEvent.award / 100}× bet · Hidden Bonus pays at least ${bookEvent.floor / 100}×`, 'FX-VAULT-GUARANTEE', 2000);
	},
	bonusStart: async (bookEvent: BookEventOfType<'bonusStart'>) => {
		const mystery = stateGame.hud.mystery;
		resetHud();
		stateGame.hud.mystery = mystery;
		stateGame.hud.bonus = bookEvent.bonus;
		if (bookEvent.bonus === 'hidden') {
			const l = config.features.hiddenStartLevel;
			stateGame.hud.levels = { R: l, B: l, T: l, F: l }; // the Hidden Bonus starts every crew member at Level 2
		}
		// The bonus intro screen (SCR-HEIST-INTRO / SCR-ESCAPE-INTRO) already played on freeSpinTrigger.
	},
	crewLanded: async (bookEvent: BookEventOfType<'crewLanded'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		const names = bookEvent.crew.map((c) => CREW_INFO[c.character].name).join(' + ');
		crewThisRound = true;
		mascotDo('ABILITY', CREW_ID[bookEvent.crew[0].character]);
		await Promise.all([
			...bookEvent.crew.map((c) => highlight(c.positions, crewColor(c.character), 900)),
			clipOr('FX-CREW-CHAOS', () => banner('CREW CHAOS!', PALETTE.gold, names, 'FX-CREW-CHAOS', 1100, bookEvent.crew.map((c) => c.character))),
		]);
	},
	laneSwitch: async (bookEvent: BookEventOfType<'laneSwitch'>) => {
		await clipOr('ANIM-ROXY-ABILITY-FX', () => abilityBanner('R', bookEvent.level, CREW_INFO.R.line));
		for (const swap of bookEvent.swaps) {
			const lanes = [1, 2, 3, 4].flatMap((row) => [
				{ reel: swap.from, row },
				{ reel: swap.to, row },
			]);
			// outline both lanes, and trade them while the outline is up
			const glow = highlight(lanes, PALETTE.roxy, 520);
			await wait(160);
			swapReels(swap.from, swap.to);
			await glow;
		}
		await transform('SYM-FX-WILD-STAMP', bookEvent.wilds, () => bookEvent.wilds.forEach((p) => setCell(p.reel, p.row, 'W')), PALETTE.roxy);
	},
	systemClone: async (bookEvent: BookEventOfType<'systemClone'>) => {
		const sym = bookEvent.symbol;
		await clipOr('ANIM-BYTE-ABILITY-FX', () =>
			abilityBanner('B', bookEvent.level, sym ? `Cloning ${SYMBOL_NAME[sym] ?? sym} ×${bookEvent.positions.length}` : CREW_INFO.B.line),
		);
		await transform('SYM-FX-CLONE-IN', bookEvent.positions, () => sym && bookEvent.positions.forEach((p) => setCell(p.reel, p.row, sym)), PALETTE.byte, 600);
	},
	vaultBreaker: async (bookEvent: BookEventOfType<'vaultBreaker'>) => {
		await clipOr('ANIM-TANK-ABILITY-FX', () => abilityBanner('T', bookEvent.level, CREW_INFO.T.line));
		// the blast area lights up and the loot is revealed while it is still glowing
		const area = highlight(bookEvent.area, PALETTE.tank, 520);
		await wait(220);
		await transform('SYM-FX-VAULT-REVEAL', bookEvent.loot, () => bookEvent.loot.forEach((c) => setCell(c.reel, c.row, c.symbol)), PALETTE.gold);
		await area;
	},
	bigBangUpgrade: async (bookEvent: BookEventOfType<'bigBangUpgrade'>) => {
		await clipOr('ANIM-FUSE-ABILITY-FX', () => abilityBanner('F', bookEvent.level, CREW_INFO.F.line));
		const area = highlight(bookEvent.area, PALETTE.fuse, 520);
		await wait(220);
		await transform('SYM-FX-UPGRADE-IN', bookEvent.upgrades, () => bookEvent.upgrades.forEach((u) => setCell(u.reel, u.row, u.to)), PALETTE.gold);
		await area;
	},
	crewCombo: async (bookEvent: BookEventOfType<'crewCombo'>) => {
		const info = COMBO_INFO[bookEvent.combo];
		const color = crewColor(bookEvent.characters[0]);
		mascotDo('COMBO', CREW_ID[bookEvent.characters[0]]);
		await clipOr(COMBO_CLIP[bookEvent.combo] ?? '', () =>
			banner(
				info?.title ?? bookEvent.combo,
				color,
				`${bookEvent.characters.map((c) => CREW_INFO[c].name).join(' + ')} · ${info?.detail ?? ''}`,
				info?.assetId,
				1500,
				bookEvent.characters,
			),
		);
		const sym = bookEvent.symbol;
		if (sym && bookEvent.positions?.length) {
			await transform('SYM-FX-CLONE-IN', bookEvent.positions, () => bookEvent.positions!.forEach((p) => setCell(p.reel, p.row, sym)), color);
		}
		if (bookEvent.upgrades?.length) {
			await transform('SYM-FX-UPGRADE-IN', bookEvent.upgrades, () => bookEvent.upgrades!.forEach((u) => setCell(u.reel, u.row, u.to)), PALETTE.gold);
		}
		if (bookEvent.swap && bookEvent.swap.from !== bookEvent.swap.to) {
			const swap = bookEvent.swap;
			const glow = highlight([1, 2, 3, 4].flatMap((row) => [{ reel: swap.from, row }, { reel: swap.to, row }]), color, 520);
			await wait(160);
			swapReels(swap.from, swap.to);
			await glow;
		}
	},
	perfectlyBadPlan: async (bookEvent: BookEventOfType<'perfectlyBadPlan'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await clipOr('CIN-PERFECTLY-BAD-PLAN', () =>
			banner('PERFECTLY BAD PLAN!', PALETTE.gold, `All four crew · ×${bookEvent.multiplier} Crew Combo · Chaos Re-spin`, 'CIN-PERFECTLY-BAD-PLAN', 2200),
		);
		await transform('SYM-FX-WILD-STAMP', bookEvent.wilds, () => bookEvent.wilds.forEach((p) => setCell(p.reel, p.row, 'W')), PALETTE.gold, 600);
	},
	meterWilds: async (bookEvent: BookEventOfType<'meterWilds'>) => {
		await transform('SYM-FX-WILD-STAMP', bookEvent.positions, () => bookEvent.positions.forEach((p) => setCell(p.reel, p.row, 'W')), PALETTE.gold);
	},
	crewExit: async (bookEvent: BookEventOfType<'crewExit'>) => {
		await transform('SYM-FX-CREW-EXIT', bookEvent.positions, () => bookEvent.positions.forEach((p) => setCell(p.reel, p.row, bookEvent.symbol)), 0xffffff, 400);
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
			// the clip celebrates; the card names the exact reward so the player knows what changed
			const played = await playClip(stage === 5 ? 'CIN-CLEAN-GETAWAY' : 'FX-METER-STAGE');
			await banner(
				stage === 5 ? 'CLEAN GETAWAY!' : `GETAWAY METER · STAGE ${stage}`,
				PALETTE.gold,
				METER_STAGE_REWARDS[stage - 1],
				stage === 5 ? 'CIN-CLEAN-GETAWAY' : 'UI-METER-GETAWAY',
				played ? 800 : stage === 5 ? 2000 : 1000,
			);
		}
	},
	lootMeter: async (bookEvent: BookEventOfType<'lootMeter'>) => {
		stateGame.hud.lootPoints = bookEvent.points;
		for (const reward of bookEvent.rewards) {
			const i = LOOT_THRESHOLDS.indexOf(reward.at);
			const played = await playClip('FX-LOOT-MILESTONE');
			await banner(`LOOT METER · ${reward.at} POINTS`, PALETTE.vault, LOOT_REWARDS[i] ?? '', 'UI-METER-LOOT', played ? 800 : 1100);
		}
	},
	crewLevels: async (bookEvent: BookEventOfType<'crewLevels'>) => {
		const ups = (Object.keys(bookEvent.levels) as CrewKey[]).filter((c) => bookEvent.levels[c] > stateGame.hud.levels[c]);
		stateGame.hud.levels = { ...bookEvent.levels };
		for (const c of ups) {
			await banner(`${CREW_INFO[c].name} LEVEL UP!`, crewColor(c), 'Upgrade persists for the rest of the Escape', 'UI-CREW-LEVELS', 1100, [c], bookEvent.levels[c]);
		}
	},
	chaosRespinAward: async (bookEvent: BookEventOfType<'chaosRespinAward'>) => {
		stateGame.hud.respinRemaining = bookEvent.remaining;
		const granted = bookEvent.reasons.filter((r) => r.granted > 0);
		if (granted.length) {
			const played = await playClip('FX-RESPIN');
			await banner(
				played ? 'WHY THE RE-SPIN' : 'CHAOS RE-SPIN!',
				PALETTE.gold,
				granted.map((r) => RESPIN_REASON_TEXT[r.reason] ?? r.reason).join(' · '),
				'FX-RESPIN',
				played ? 700 : 1100,
			);
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
		const added = bookEvent.totalFs - lastFsTotal;
		lastFsTotal = bookEvent.totalFs;
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		// the clip shows "+5 FREE SPINS": only use it when exactly 5 were added (the cap can award fewer)
		if (added === 5 && (await playClip('FX-RETRIGGER'))) return;
		await banner('RETRIGGER!', PALETTE.gold, `+${added} free spins · ${bookEvent.totalFs} total`, 'FX-RETRIGGER', 1200);
	},
	freeSpinsAdded: async (bookEvent: BookEventOfType<'freeSpinsAdded'>) => {
		lastFsTotal = bookEvent.totalFs;
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		await banner(`+${bookEvent.amount} FREE SPIN${bookEvent.amount > 1 ? 'S' : ''}`, PALETTE.vault, 'Loot Meter reward', 'UI-METER-LOOT', 900);
	},
	finalEscape: async (bookEvent: BookEventOfType<'finalEscape'>) => {
		const masters = bookEvent.masters.map((c) => CREW_INFO[c].name).join(', ') || 'none';
		const played = await playClip('CIN-FINAL-ESCAPE');
		await banner(
			'FINAL ESCAPE',
			PALETTE.fuse,
			bookEvent.award > 0 ? `Master crew: ${masters} · +${bookEvent.award / 100}× bet` : 'No crew reached Level 3',
			'CIN-FINAL-ESCAPE',
			played ? 1800 : 2400,
		);
	},
	payoutCapped: async () => {},
	wincap: async () => {
		if (await playClip('CIN-MAX-WIN')) return;
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
		else if (lastBonusStart?.bonus === 'hidden') {
			const l = config.features.hiddenStartLevel;
			stateGame.hud.levels = { R: l, B: l, T: l, F: l };
		}
	},
};
