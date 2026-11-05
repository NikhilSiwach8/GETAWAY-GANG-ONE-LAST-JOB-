<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	/** TEMPORARY ART free-spin counter (UI-FS-COUNTER). */
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { PALETTE } from '../game/tempArt';

	const context = getContext();
	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const bonusName = $derived(context.stateGame.hud.bonus === 'escape' ? 'THE PERFECT ESCAPE' : 'THE HEIST');

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (e) => {
			if (e.current !== undefined) current = e.current;
			if (e.total !== undefined) total = e.total;
		},
	});
</script>

{#if show}
	<Container x={layout.x - layout.width / 2 - 250} y={layout.y - layout.height / 2 - 18}>
		<Rectangle width={210} height={96} borderRadius={14} backgroundColor={0x0b1a3a} backgroundAlpha={0.9} borderColor={0xffffff} borderWidth={2} />
		<Text x={105} y={12} anchor={{ x: 0.5, y: 0 }} text={bonusName} style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontSize: 14, fontWeight: '800', fill: PALETTE.gold }} />
		<Text x={105} y={36} anchor={{ x: 0.5, y: 0 }} text={`FREE SPIN ${current} / ${total}`} style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontSize: 24, fontWeight: '900', fill: 0xffffff }} />
		<Text x={105} y={74} anchor={{ x: 0.5, y: 0 }} text="TEMP · UI-FS-COUNTER" style={{ fontFamily: 'monospace', fontSize: 9, fill: 0xffffff }} alpha={0.5} />
	</Container>
{/if}
