<script lang="ts">
	/**
	 * Board layer of the win presentation (state from game/wins/winDirector):
	 *  - detect: every winning cell flashes together
	 *  - per win: accent cell frames, a light trail through the winning reels, the win's amount badge
	 *  - sparks at each impact (WinSparks)
	 * Board space (BoardContainer), drawn above the symbols.
	 */
	import { onDestroy } from 'svelte';
	import { BitmapText, Container, Sprite, getContextApp } from 'pixi-svelte';
	import { runner } from '../game/wins/timeline';
	import BoardContainer from './BoardContainer.svelte';
	import WinSparks from './WinSparks.svelte';
	import { liveTimelines, skipWin, winFx } from '../game/wins/winDirector.svelte';
	import { stateBet } from 'state-shared';
	import { boardFx } from '../game/stateGame.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { Position } from '../game/types';

	const S = SYMBOL_SIZE;
	const context = getContext();
	runner.setTicker(getContextApp().stateApp.pixiApplication?.ticker ?? null);
	onDestroy(() => runner.setTicker(null));
	// dev builds only: frontend/tests/win_check.cjs inspects the presentation state
	if (import.meta.env.DEV)
		(window as unknown as { __win: unknown }).__win = { winFx, runner, liveTimelines, skipWin, stateBet, boardFx, board: () => context.stateGame.board };
	const cx = (p: Position) => getSymbolX(p.reel);
	const cy = (p: Position) => (p.row - 0.5) * S;

	/** one point per reel (centre of that reel's winning cells), left to right */
	const path = (ps: Position[]) => {
		const by = new Map<number, number[]>();
		for (const p of ps) by.set(p.reel, [...(by.get(p.reel) ?? []), cy(p)]);
		return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([reel, ys]) => ({ x: getSymbolX(reel), y: ys.reduce((s, v) => s + v, 0) / ys.length }));
	};
	const cur = $derived(winFx.current);
	const pts = $derived(cur ? path(cur.positions) : []);
	const segs = $derived(
		pts.slice(1).map((b, i) => {
			const a = pts[i];
			return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, len: Math.hypot(b.x - a.x, b.y - a.y), rot: Math.atan2(b.y - a.y, b.x - a.x), i };
		}),
	);
	const centre = $derived(cur ? { x: cur.positions.reduce((s, p) => s + cx(p), 0) / cur.positions.length, y: cur.positions.reduce((s, p) => s + cy(p), 0) / cur.positions.length } : { x: 0, y: 0 });
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
</script>

<BoardContainer>
	<!-- detect: all winning cells at once -->
	{#if winFx.detect.k > 0}
		{#each winFx.detect.cells as p (`${p.reel}:${p.row}`)}
			<Sprite key="UI-CELL-GLOW" anchor={0.5} x={cx(p)} y={cy(p)} width={S * 1.16 * (1 + 0.08 * winFx.detect.k)} height={S * 1.16 * (1 + 0.08 * winFx.detect.k)} tint={0xffe27a} alpha={winFx.detect.k} blendMode="add" zIndex={20} />
		{/each}
	{/if}

	{#if cur}
		<Container zIndex={21} alpha={cur.fade}>
			<!-- cell frames in the symbol's accent -->
			{#each cur.positions as p (`${p.reel}:${p.row}`)}
				<Sprite key="UI-CELL-GLOW" anchor={0.5} x={cx(p)} y={cy(p)} width={S * 1.14} height={S * 1.14} tint={cur.accent} alpha={0.9 * cur.frame} blendMode="add" />
			{/each}
			<!-- light trail drawn on from the left -->
			{#each segs as s (s.i)}
				{@const k = clamp01(cur.trail * segs.length - s.i)}
				{#if k > 0}
					<Container x={s.x - (Math.cos(s.rot) * s.len * (1 - k)) / 2} y={s.y - (Math.sin(s.rot) * s.len * (1 - k)) / 2} rotation={s.rot}>
						<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={s.len * k + S * 0.3} height={S * 0.34} tint={cur.accent} alpha={0.65} blendMode="add" />
						<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={s.len * k + S * 0.1} height={S * 0.1} tint={0xffffff} alpha={0.85} blendMode="add" />
					</Container>
				{/if}
			{/each}
		</Container>
		<!-- this win's amount (from the winInfo event) pops at the impact and floats up -->
		{#if cur.badge > 0 && !cur.solo}
			<Container zIndex={40} x={centre.x} y={centre.y + cur.badgeY * S} scale={Math.max(0.01, cur.badge)} alpha={cur.fade}>
				<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={S * 1.9} height={S * 0.8} tint={0x05070f} alpha={0.55} />
				<BitmapText anchor={0.5} text={cur.text} style={{ fontFamily: 'ggGold', fontSize: S * 0.42, align: 'center' }} />
			</Container>
		{/if}
	{/if}

	<WinSparks />
</BoardContainer>
