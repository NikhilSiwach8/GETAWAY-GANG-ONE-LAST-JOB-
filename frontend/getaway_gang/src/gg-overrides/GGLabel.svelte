<!--
  Balance / Win / Bet value: a small gold label over the amount, centred on (0, 0), `width` wide.
  (The bet −/+ buttons are placed beside it by the layout.)
-->
<script lang="ts">
	import { Container, Text } from 'pixi-svelte';

	type Props = { kind: 'BALANCE' | 'WIN' | 'BET'; value: string; width?: number; plain?: boolean };
	const props: Props = $props();
	const W = $derived(props.width ?? 300);
	// Luckiest Guy digits are ~0.62 em wide: shrink long amounts so they stay within the width
	const vs = $derived(Math.min(W * 0.17, (W * 0.95) / Math.max(1, props.value.length * 0.62)));
</script>

<Container>
	<Text anchor={0.5} y={-W * 0.085} text={props.kind} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: W * 0.085, fill: 0xffc93c, stroke: { color: 0x1a0d00, width: 4 }, letterSpacing: 3 }} />
	<Text
		anchor={0.5}
		y={W * 0.06}
		text={props.value}
		style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: vs, fill: props.kind === 'WIN' ? 0xf7c947 : 0xffffff, stroke: { color: 0x0a0f22, width: Math.max(4, vs * 0.14) }, dropShadow: { color: 0x000000, alpha: 0.6, distance: 3, angle: Math.PI / 2, blur: 2 }, letterSpacing: 1 }}
	/>
</Container>
