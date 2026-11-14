/**
 * Win director: the single owner of the win presentation.
 *
 * Inputs are the book events only. `winInfo` supplies the wins (symbol, positions, amount of each win) and
 * `setWin` the amount and win level to count up; nothing here adds up or derives a win.
 *
 *   winInfo  ->  presentWins():  1 detect   all winning cells flash together, the board takes a hit
 *                                2 cycle    each win in book order: light trail across its cells, cell frames,
 *                                           the symbols' win animation (Board -> SymbolView), and at the
 *                                           impact a badge with that win's amount, sparks and a counter beat
 *                                The handler returns at the first impact, so the counter starts with it.
 *   setWin   ->  presentAmount(): 3 counter  small wins count up alongside the rest of the cycle and land
 *                                           with the last win; big wins wait for the cycle, then
 *                                4 tier     BIG -> SUPER -> MEGA -> EPIC (up to the event's level), one stage
 *                                           per equal share of the count-up
 *                                5 reset    badges, trails, frames and the counter fade out; state returns to idle
 *
 * Only one presentation runs at a time: every other book event first awaits `settle()` (see
 * bookEventHandlerMap), and a new presentation finishes any previous one before it starts.
 */
import { presentTurbo } from '../turbo';
import { stateBet } from 'state-shared';
import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
import { Timeline, play } from './timeline';
import { SYMBOL_WIN, timing, TIER_COUNT, TIER_LADDER, TURBO_TIER, type Speed, type TierAlias } from './sequences';
import { getSymbolLook } from '../symbols/catalog';
import { boardFx } from '../stateGame.svelte';
import type { Position } from '../types';

export type WinItem = { symbol: string; win: number; positions: Position[] };

export const winFx = $state({
	phase: 'idle' as 'idle' | 'detect' | 'cycle' | 'counter' | 'tier' | 'reset',
	/** detect flash over every winning cell */
	detect: { cells: [] as Position[], k: 0 },
	/** the win currently shown */
	current: null as null | {
		key: number;
		positions: Position[];
		text: string;
		accent: number;
		trail: number;
		frame: number;
		badge: number;
		badgeY: number;
		fade: number;
		/** only one win: the counter already shows its amount, so no badge */
		solo: boolean;
	},
	counter: {
		show: false,
		big: false,
		value: 0,
		scale: 1,
		alpha: 0,
		/** increments on every win impact (the counter beats) */
		beat: 0,
		counting: false,
	},
	tier: null as null | { final: TierAlias; stage: number; stageAlias: TierAlias; impact: number; stages: TierAlias[] },
});

type Hooks = {
	/** sparks at cells (board space) */
	burst?: (cells: Position[], tint: number, count: number) => void;
	/** board hit on detect */
	jolt?: () => void;
};
export const winHooks: Hooks = {};

const speed = (): Speed => (presentTurbo() ? 'turbo' : 'normal');

let busy: Promise<void> | null = null;
let cycle: Promise<void> | null = null;
let cycleEndsAt = 0; // performance.now() estimate of the cycle's end, for count-up sync
const live = new Set<Timeline>();
const run = (tl: Timeline) => {
	live.add(tl);
	tl.done.then(() => live.delete(tl));
	return play(tl);
};
let skipCount: (() => void) | null = null;
let keySeq = 0;

/** Wait until the current presentation (if any) has completely finished. */
export const settle = async () => {
	while (busy || cycle) await Promise.all([busy, cycle]);
};

/** Player skip (press / fast-forward): first finishes the count-up, then the rest. */
export const skipWin = () => {
	if (skipCount) {
		skipCount();
		skipCount = null;
		return;
	}
	for (const tl of [...live]) tl.finish();
};

const uniq = (ps: Position[]) => [...new Map(ps.map((p) => [`${p.reel}:${p.row}`, p])).values()];

/**
 * winInfo. `animate` plays one win's symbol animation on the board and resolves when every symbol of it has
 * completed (Board.svelte, boardWithAnimateSymbols). Resolves at the first impact; the cycle continues.
 */
export const presentWins = async (wins: WinItem[], animate: (positions: Position[]) => Promise<void>) => {
	await settle();
	if (!wins.length) return;
	const T = timing(speed());
	let firstImpact!: () => void;
	const impacted = new Promise<void>((r) => (firstImpact = r));

	cycle = (async () => {
		// 1 detect
		winFx.phase = 'detect';
		winFx.detect.cells = uniq(wins.flatMap((w) => w.positions));
		boardFx.dim = true;
		winHooks.jolt?.();
		await run(
			new Timeline('detect')
				.tween(0, T.detect * 0.4, 0, 1, 'cubicOut', (v) => (winFx.detect.k = v))
				.tween(T.detect * 0.4, T.detect * 0.6, 1, 0, 'sineInOut', (v) => (winFx.detect.k = v)),
		).done;
		winFx.detect.cells = [];

		// 2 cycle
		winFx.phase = 'cycle';
		cycleEndsAt = performance.now() + wins.length * T.perWin * 1000;
		for (const [i, w] of wins.entries()) {
			const look = getSymbolLook(w.symbol);
			const cur = {
				key: keySeq++,
				positions: w.positions,
				text: bookEventAmountToCurrencyString(w.win),
				accent: look?.accent ?? 0xffc93c,
				trail: 0,
				frame: 0,
				badge: 0,
				badgeY: 0,
				fade: 1,
				solo: wins.length === 1,
			};
			winFx.current = cur;
			const c = () => winFx.current;
			const tl = new Timeline(`win-${i}`)
				.tween(0, 0.35, 0, 1, 'expoOut', (v) => c() && (c()!.trail = v))
				.tween(0, 0.22, 0, 1, 'cubicOut', (v) => c() && (c()!.frame = v))
				.cue(T.impact, () => {
					winHooks.burst?.(w.positions, cur.accent, look ? sparksFor(look.family) : 8);
					winFx.counter.beat++;
					firstImpact();
				})
				.tween(T.impact, 0.32, 0, 1, 'backOut', (v) => c() && (c()!.badge = v))
				.tween(T.impact, T.perWin - T.impact, 0, -0.18, 'sineOut', (v) => c() && (c()!.badgeY = v))
				.tween(T.perWin - 0.22 * (T.perWin / 1.15), 0.22 * (T.perWin / 1.15), 1, 0, 'quadOut', (v) => c() && (c()!.fade = v));
			await Promise.all([run(tl).done, animate(w.positions)]);
		}
		// 5 reset (board side)
		winFx.phase = 'reset';
		winFx.current = null;
		boardFx.dim = false;
		cycle = null;
	})();
	// never block on a win that produced no impact (e.g. a skipped timeline)
	await Promise.race([impacted, cycle]);
};

const sparksFor = (family: keyof typeof SYMBOL_WIN) => SYMBOL_WIN[family].sparks;

/**
 * setWin: count the event's amount up and present its tier. `onStart` runs as the counter starts (sounds).
 */
export const presentAmount = async (amount: number, level: { alias: string; type: string }, onStart?: () => void) => {
	const sp = speed();
	const T = timing(sp);
	const big = level.type === 'big' && (TIER_LADDER as string[]).includes(level.alias);
	let release!: () => void;
	busy = new Promise<void>((r) => (release = r));
	try {
		if (big) await cycle; // big wins: let the player see what won first
		onStart?.();
		const counter = winFx.counter;
		counter.show = true;
		counter.big = big;
		counter.value = 0;
		counter.counting = true;

		if (!big) {
			winFx.phase = winFx.phase === 'cycle' ? 'cycle' : 'counter';
			// land with the last win of the cycle (or the shortest count-up)
			const remaining = Math.max(T.countMin, (cycleEndsAt - performance.now()) / 1000);
			const tl = new Timeline('count')
				.tween(0, 0.32, 0, 1, 'cubicOut', (v) => (counter.alpha = v))
				.tween(0, 0.5, 0.3, 1, 'backOut', (v) => (counter.scale = v))
				.tween(0, remaining, 0, amount, 'expoOut', (v) => (counter.value = v));
			skipCount = () => tl.finish();
			await run(tl).done;
			skipCount = null;
			counter.value = amount;
			counter.counting = false;
			await cycle;
			await run(
				new Timeline('land')
					.tween(0, 0.12, 1, 1.18, 'quadOut', (v) => (counter.scale = v))
					.tween(0.12, 0.42, 1.18, 1, 'elasticOut', (v) => (counter.scale = v))
					.cue(0.55, () => {}),
			).done;
		} else {
			winFx.phase = 'tier';
			const final = level.alias as TierAlias;
			const stages = TIER_LADDER.slice(0, TIER_LADDER.indexOf(final) + 1).filter((a) => a !== 'max' || final === 'max');
			const k = sp === 'turbo' ? TURBO_TIER : 1;
			const { count, hold } = TIER_COUNT[final];
			const dur = count * k;
			winFx.tier = { final, stage: 0, stageAlias: stages[0], impact: 0, stages };
			const tl = new Timeline('tier')
				.tween(0, 0.4, 0, 1, 'cubicOut', (v) => (counter.alpha = v))
				.tween(0, 0.6, 0.2, 1, 'backOut', (v) => (counter.scale = v))
				.tween(0, dur, 0, amount, 'cubicOut', (v) => (counter.value = v));
			stages.forEach((a, i) =>
				tl.cue((i * dur) / stages.length, () => {
					if (!winFx.tier) return;
					winFx.tier.stage = i;
					winFx.tier.stageAlias = a;
					winFx.tier.impact++;
				}),
			);
			skipCount = () => tl.finish();
			await run(tl).done;
			skipCount = null;
			counter.value = amount;
			counter.counting = false;
			await run(
				new Timeline('tier-land')
					.tween(0, 0.14, 1, 1.22, 'quadOut', (v) => (counter.scale = v))
					.tween(0.14, 0.5, 1.22, 1, 'elasticOut', (v) => (counter.scale = v))
					.cue(hold * k, () => {}),
			).done;
		}
		// 5 reset (counter side)
		winFx.phase = 'reset';
		await run(new Timeline('counter-out').tween(0, T.reset, counter.alpha, 0, 'quadOut', (v) => (counter.alpha = v))).done;
	} finally {
		resetAll();
		release();
		busy = null;
	}
};

/** Clean end state: nothing visible, nothing ticking. */
export const resetAll = () => {
	for (const tl of [...live]) tl.kill();
	skipCount = null;
	winFx.detect = { cells: [], k: 0 };
	winFx.current = null;
	winFx.tier = null;
	Object.assign(winFx.counter, { show: false, big: false, value: 0, scale: 1, alpha: 0, counting: false });
	winFx.phase = cycle ? 'cycle' : 'idle';
};

/** test helper (dev): running timelines */
export const liveTimelines = () => live.size;
