<!-- Balance / Win / Bet value panel on the delivered capsule art (label baked into the art; value live). -->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { GG_LAYOUT } from '../game/ggAssets';

	type Props = { kind: 'BALANCE' | 'WIN' | 'BET'; value: string };
	const props: Props = $props();
	const key = $derived(`UI-${props.kind}-PANEL` as 'UI-BALANCE-PANEL' | 'UI-WIN-PANEL' | 'UI-BET-PANEL');
	const W = $derived(props.kind === 'BET' ? 250 : 360);
	const H = $derived((W * GG_LAYOUT[key].height) / GG_LAYOUT[key].width);
	// value window centre (fraction of height), measured from the art
	const valueY = $derived(props.kind === 'BET' ? 0.6 : 0.6);
</script>

<Container y={-14}>
	<Sprite {key} anchor={{ x: 0.5, y: 0 }} width={W} height={H} />
	<Text
		anchor={0.5}
		y={H * valueY}
		text={props.value}
		style={{
			fontFamily: 'proxima-nova, Arial, sans-serif',
			fontWeight: '900',
			fontSize: 38,
			fill: props.kind === 'WIN' ? 0xf7c947 : 0xffffff,
			stroke: { color: 0x0a1633, width: 5 },
		}}
	/>
</Container>
