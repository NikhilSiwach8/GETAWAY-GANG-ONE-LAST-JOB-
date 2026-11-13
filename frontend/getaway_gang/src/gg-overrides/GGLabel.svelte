<!--
  Balance / Win / Bet value plate on the delivered art, centred on (0, 0) and `width` wide.
  BALANCE / WIN: capsule with the label tab baked in. BET: the whole UI-BET plate (minus + value + plus);
  the layout puts the -/+ touch zones on it (see GGLayout*.svelte, BET_ZONES).
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { GG_LAYOUT } from '../game/ggAssets';

	/** plain: no plate, a small gold label over the value (corner-cluster layout) */
	type Props = { kind: 'BALANCE' | 'WIN' | 'BET'; value: string; width?: number; plain?: boolean };
	const props: Props = $props();
	const key = $derived((props.kind === 'BET' ? 'UI-BET-UNIT' : `UI-${props.kind}-PANEL`) as 'UI-BET-UNIT' | 'UI-BALANCE-PANEL' | 'UI-WIN-PANEL');
	const W = $derived(props.width ?? (props.kind === 'BET' ? 400 : 330));
	const H = $derived((W * GG_LAYOUT[key].height) / GG_LAYOUT[key].width);
	// value window, measured from the art (fractions of the plate): centre height and usable width
	const valueY = $derived(props.kind === 'BET' ? 0.6 : 0.61);
	const valueW = $derived(props.kind === 'BET' ? 0.46 : 0.8);
	// Luckiest Guy digits are ~0.62 em wide: shrink long amounts so they stay inside the window
	const baseSize = $derived(props.kind === 'BET' ? W * 0.085 : W * 0.115);
	const fontSize = $derived(Math.min(baseSize, (W * valueW) / Math.max(1, props.value.length * 0.62)));
</script>

{#if props.plain}
	{@const vs = Math.min(W * 0.17, (W * 0.95) / Math.max(1, props.value.length * 0.62))}
	<Container>
		<Text anchor={0.5} y={-W * 0.085} text={props.kind} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: W * 0.085, fill: 0xffc93c, stroke: { color: 0x1a0d00, width: 4 }, letterSpacing: 3 }} />
		<Text anchor={0.5} y={W * 0.06} text={props.value} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: vs, fill: props.kind === 'WIN' ? 0xf7c947 : 0xffffff, stroke: { color: 0x0a0f22, width: Math.max(4, vs * 0.14) }, dropShadow: { color: 0x000000, alpha: 0.6, distance: 3, angle: Math.PI / 2, blur: 2 }, letterSpacing: 1 }} />
	</Container>
{:else}
<Container>
	<Sprite {key} anchor={0.5} width={W} height={H} />
	<Container y={H * (valueY - 0.5)}>
		<Text
			anchor={0.5}
			text={props.value}
			style={{
				fontFamily: 'Luckiest Guy, sans-serif',
				fontSize,
				fill: props.kind === 'WIN' ? 0xf7c947 : 0xffffff,
				stroke: { color: 0x0a1633, width: Math.max(3, fontSize * 0.12) },
				letterSpacing: 1,
			}}
		/>
	</Container>
</Container>
{/if}
