<script lang="ts">
	/**
	 * HUD on the delivered frames (UI-METER-GETAWAY, UI-METER-LOOT, UI-CREW-LEVELS, UI-RESPIN, UI-MULT).
	 * Live state (fill, lit locks/stars, numbers) is drawn in code inside the empty plates; positions
	 * are fractions of each image measured from the art. Display only: values come from book events.
	 */
	import { BitmapText, Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { METER_THRESHOLDS, LOOT_THRESHOLDS, PALETTE, CREW_INFO, type CrewKey } from '../game/tempArt';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { frameRect } from '../game/frameLayout';
	import { portraitRows } from '../game/hudLayout';

	const context = getContext();
	const hud = $derived(context.stateGame.hud);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const W = 230;
	const top = $derived(layout.y - frame.height / 2 + 150); // below the logo
	const rightX = $derived(layout.x + frame.width / 2 + 6);
	const leftX = $derived(layout.x - frame.width / 2 - 6 - W);
	const h = (id: keyof typeof GG_LAYOUT, w = W) => (w * GG_LAYOUT[id].height) / GG_LAYOUT[id].width;
	const maxMeter = METER_THRESHOLDS[METER_THRESHOLDS.length - 1];
	const maxLoot = LOOT_THRESHOLDS[LOOT_THRESHOLDS.length - 1];
	const crew: CrewKey[] = ['R', 'B', 'T', 'F'];
	const numStyle = (size: number) => ({
		fontFamily: 'proxima-nova, Arial, sans-serif',
		fontWeight: '900' as const,
		fontSize: size,
		fill: PALETTE.gold,
		stroke: { color: 0x2a1600, width: 4 },
	});
	// bar channels measured from the art (fractions of image width/height)
	const GBAR = { x0: 0.149, x1: 0.955, y0: 0.527, y1: 0.701 };
	const LBAR = { x0: 0.181, x1: 0.951, y0: 0.539, y1: 0.722 };
	const LOCKS = [0.35, 0.49, 0.683, 0.825];
	const STARS = [0.17, 0.39, 0.61, 0.83];
	const mH = $derived(h('UI-METER-GETAWAY'));
	const rH = $derived(h('UI-RESPIN'));
	const multW = 150;
	// portrait: the HUD moves into rows above the reels (see game/hudLayout.ts)
	const portrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const pr = $derived(portraitRows(layout, frame, hud.bonus));
</script>

<!-- right column: Getaway Meter, Chaos Re-spins, multiplier -->
<Container x={portrait ? pr.left : rightX} y={portrait ? pr.row1Y : top} scale={portrait ? pr.s1 : 1} zIndex={5}>
	<Rectangle
		x={W * GBAR.x0}
		y={mH * GBAR.y0}
		width={Math.max(0.01, (W * (GBAR.x1 - GBAR.x0) * hud.meterPoints) / maxMeter)}
		height={mH * (GBAR.y1 - GBAR.y0)}
		borderRadius={6}
		backgroundColor={PALETTE.gold}
	/>
	<Sprite key="UI-METER-GETAWAY" width={W} height={mH} />
	<Text anchor={0.5} x={W * (GBAR.x0 + GBAR.x1) / 2} y={mH * (GBAR.y0 + GBAR.y1) / 2} text={`${hud.meterPoints} / ${maxMeter}`} style={numStyle(13)} />

	<Container x={portrait ? pr.respinX : 0} y={portrait ? 0 : mH + 10}>
		<Sprite key="UI-RESPIN" width={W} height={rH} />
		{#each LOCKS as fx, i}
			{#if i < hud.respinChain}
				<Rectangle anchor={0.5} x={W * fx} y={rH * 0.525} width={W * 0.125} height={rH * 0.43} borderRadius={6} backgroundColor={PALETTE.gold} backgroundAlpha={0.45} />
			{:else}
				<Rectangle anchor={0.5} x={W * fx} y={rH * 0.525} width={W * 0.125} height={rH * 0.43} borderRadius={6} backgroundColor={0x000000} backgroundAlpha={0.55} />
			{/if}
		{/each}
	</Container>

	{#if hud.multiplier > 1}
		{@const mw = portrait ? pr.multW : multW}
		<Container x={portrait ? pr.multX : (W - multW) / 2} y={portrait ? 0 : mH + rH + 20}>
			<Sprite key="UI-MULT" width={mw} height={h('UI-MULT', mw)} />
			{#key hud.multiplier}<BitmapText anchor={0.5} x={mw * 0.495} y={h('UI-MULT', mw) * 0.455} text={`×${hud.multiplier}`} style={{ fontFamily: 'ggGold', fontSize: 40 * (mw / multW) }} />{/key}
			{#if !portrait}
				<Text anchor={0.5} x={mw * 0.5} y={h('UI-MULT', mw) * 0.75} text="WIN MULTIPLIER" style={{ ...numStyle(10), fill: 0xffffff, stroke: undefined }} />
			{/if}
		</Container>
	{/if}
</Container>

<!-- left column (bonus only): Loot Meter or Crew Upgrades, below the free-spin counter -->
<Container x={portrait ? pr.left : leftX} y={portrait ? pr.row2Y : top + h('UI-FS-COUNTER') + 14} scale={portrait ? pr.s2 : 1} zIndex={5}>
	{#if hud.bonus === 'heist'}
		<Rectangle
			x={W * LBAR.x0}
			y={h('UI-METER-LOOT') * LBAR.y0}
			width={Math.max(0.01, (W * (LBAR.x1 - LBAR.x0) * Math.min(hud.lootPoints, maxLoot)) / maxLoot)}
			height={h('UI-METER-LOOT') * (LBAR.y1 - LBAR.y0)}
			borderRadius={6}
			backgroundColor={PALETTE.gold}
		/>
		<Sprite key="UI-METER-LOOT" width={W} height={h('UI-METER-LOOT')} />
		<Text anchor={0.5} x={W * (LBAR.x0 + LBAR.x1) / 2} y={h('UI-METER-LOOT') * (LBAR.y0 + LBAR.y1) / 2} text={`${hud.lootPoints} / ${maxLoot}`} style={numStyle(13)} />
	{/if}
	{#if hud.bonus === 'escape'}
		<Sprite key="UI-CREW-LEVELS" width={W} height={h('UI-CREW-LEVELS')} />
		{#each crew as c, ci}
			{#each [0, 1, 2] as s}
				{#if hud.levels[c] > s}
					<Text anchor={0.5} x={W * (STARS[ci] + (s - 1) * 0.048)} y={h('UI-CREW-LEVELS') * 0.795} text="★" style={{ fontSize: 15, fill: CREW_INFO[c].color, stroke: { color: 0xfff1a8, width: 2 } }} />
				{/if}
			{/each}
		{/each}
	{/if}
</Container>
