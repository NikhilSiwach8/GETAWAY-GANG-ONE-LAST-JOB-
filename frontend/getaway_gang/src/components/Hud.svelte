<script lang="ts">
	/**
	 * TEMPORARY ART HUD (UI-METER-GETAWAY, UI-METER-LOOT, UI-CREW-LEVELS, UI-MULT, UI-RESPIN).
	 * Pure display of math state carried by book events -- it never computes an outcome.
	 */
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import {
		CREW_INFO,
		METER_THRESHOLDS,
		METER_STAGE_REWARDS,
		LOOT_THRESHOLDS,
		LOOT_REWARDS,
		PALETTE,
		type CrewKey,
	} from '../game/tempArt';
	import config from '../game/config';

	const context = getContext();
	const hud = $derived(context.stateGame.hud);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const W = 230;
	const x = $derived(layout.x + layout.width / 2 + 40);
	const top = $derived(layout.y - layout.height / 2 - 18);
	const maxMeter = METER_THRESHOLDS[METER_THRESHOLDS.length - 1];
	const maxLoot = LOOT_THRESHOLDS[LOOT_THRESHOLDS.length - 1];
	const crewKeys: CrewKey[] = ['R', 'B', 'T', 'F'];
	const small = { fontFamily: 'proxima-nova, Arial, sans-serif', fontSize: 13, fill: 0xffffff };
	const head = { fontFamily: 'proxima-nova, Arial, sans-serif', fontSize: 16, fontWeight: '800' as const, fill: PALETTE.gold };
</script>

<Container {x} y={top} zIndex={5}>
	<!-- Getaway Meter -->
	<Rectangle width={W} height={196} borderRadius={14} backgroundColor={0x0b0f1c} backgroundAlpha={0.85} borderColor={PALETTE.gold} borderWidth={2} />
	<Text x={12} y={8} text="GETAWAY METER" style={head} />
	<Text x={W - 12} y={10} anchor={{ x: 1, y: 0 }} text={`${hud.meterPoints}/${maxMeter}`} style={small} />
	<Rectangle x={12} y={34} width={W - 24} height={12} borderRadius={6} backgroundColor={0x2a2f3d} />
	<Rectangle x={12} y={34} width={Math.max(1, ((W - 24) * hud.meterPoints) / maxMeter)} height={12} borderRadius={6} backgroundColor={PALETTE.gold} />
	{#each METER_STAGE_REWARDS as reward, i}
		<Text
			x={12}
			y={56 + i * 26}
			text={`${hud.meterStage > i ? '●' : '○'} ${i + 1} · ${METER_THRESHOLDS[i]}pt  ${reward}`}
			style={{ ...small, fill: hud.meterStage > i ? PALETTE.gold : 0x9aa3b5 }}
		/>
	{/each}

	<!-- Multiplier + re-spin chain -->
	<Container y={206}>
		<Rectangle width={W} height={58} borderRadius={14} backgroundColor={0x0b0f1c} backgroundAlpha={0.85} borderColor={PALETTE.metal} borderWidth={2} />
		<Text x={12} y={8} text={`WIN MULTIPLIER  ×${hud.multiplier}`} style={{ ...head, fill: hud.multiplier > 1 ? PALETTE.gold : 0x9aa3b5 }} />
		<Text
			x={12}
			y={32}
			text={`CHAOS RE-SPIN ${hud.respinChain}/${config.features.maxRespinsPerChain}${hud.respinRemaining ? ` (+${hud.respinRemaining} queued)` : ''}`}
			style={small}
		/>
	</Container>

	{#if hud.bonus === 'heist'}
		<Container y={274}>
			<Rectangle width={W} height={150} borderRadius={14} backgroundColor={0x1c1405} backgroundAlpha={0.9} borderColor={PALETTE.vault} borderWidth={2} />
			<Text x={12} y={8} text="LOOT METER" style={head} />
			<Text x={W - 12} y={10} anchor={{ x: 1, y: 0 }} text={`${hud.lootPoints}/${maxLoot}`} style={small} />
			<Rectangle x={12} y={34} width={W - 24} height={12} borderRadius={6} backgroundColor={0x2a2f3d} />
			<Rectangle x={12} y={34} width={Math.max(1, ((W - 24) * Math.min(hud.lootPoints, maxLoot)) / maxLoot)} height={12} borderRadius={6} backgroundColor={PALETTE.vault} />
			{#each LOOT_REWARDS as reward, i}
				<Text
					x={12}
					y={56 + i * 22}
					text={`${hud.lootPoints >= LOOT_THRESHOLDS[i] ? '●' : '○'} ${LOOT_THRESHOLDS[i]}pt  ${reward}`}
					style={{ ...small, fill: hud.lootPoints >= LOOT_THRESHOLDS[i] ? PALETTE.gold : 0x9aa3b5 }}
				/>
			{/each}
		</Container>
	{/if}

	{#if hud.bonus === 'escape'}
		<Container y={274}>
			<Rectangle width={W} height={150} borderRadius={14} backgroundColor={0x120424} backgroundAlpha={0.9} borderColor={PALETTE.fuse} borderWidth={2} />
			<Text x={12} y={8} text="CREW UPGRADES" style={head} />
			{#each crewKeys as c, i}
				<Text
					x={12}
					y={36 + i * 26}
					text={`${CREW_INFO[c].name.padEnd(5)}  LEVEL ${hud.levels[c]}/3  ${'★'.repeat(hud.levels[c])}${'☆'.repeat(3 - hud.levels[c])}`}
					style={{ ...small, fontSize: 14, fill: CREW_INFO[c].color }}
				/>
			{/each}
		</Container>
	{/if}
</Container>
