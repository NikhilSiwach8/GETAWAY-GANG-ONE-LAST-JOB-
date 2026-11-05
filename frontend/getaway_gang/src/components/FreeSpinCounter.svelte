<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	/** UI-FS-COUNTER with live label, counter and bonus name drawn into its empty plates. */
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { PALETTE } from '../game/tempArt';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { frameRect } from '../game/frameLayout';

	const context = getContext();
	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const W = 230;
	const H = (W * GG_LAYOUT['UI-FS-COUNTER'].height) / GG_LAYOUT['UI-FS-COUNTER'].width;
	const bonusName = $derived(context.stateGame.hud.bonus === 'escape' ? 'THE PERFECT ESCAPE' : 'THE HEIST');
	const font = (size: number, fill: number) => ({ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '900' as const, fontSize: size, fill });

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
	<Container x={layout.x - frame.width / 2 - 6 - W} y={layout.y - frame.height / 2 + 150} zIndex={5}>
		<Sprite key="UI-FS-COUNTER" width={W} height={H} />
		<Text anchor={0.5} x={W / 2} y={H * 0.16} text="FREE SPINS" style={font(14, PALETTE.gold)} />
		<Text anchor={0.5} x={W / 2} y={H * 0.51} text={`${current} / ${total}`} style={{ ...font(34, 0xffffff), stroke: { color: 0x0a1633, width: 4 } }} />
		<Text anchor={0.5} x={W / 2} y={H * 0.8} text={bonusName} style={font(13, 0xffffff)} />
	</Container>
{/if}
