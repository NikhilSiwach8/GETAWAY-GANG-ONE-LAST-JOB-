<script lang="ts">
	/**
	 * Symbol entry point used by the reels and stories: keeps the game-facing API (state + oncomplete timing)
	 * and draws the art through the shared renderer (SymbolView + game/symbols). The labelled placeholder
	 * below only appears if a symbol's art is missing from the build.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { hasArt } from '../game/ggAssets';
	import SymbolView from './SymbolView.svelte';
	import { getSymbolLook } from '../game/symbols/catalog';
	import { stateBet } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState, RawSymbol } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
		/** a win is shown elsewhere on the board */
		dimmed?: boolean;
		/** highlight colour when a feature points at this cell (0 = own accent) */
		highlight?: number;
		/** idle glint start time aimed at this cell */
		glintAt?: number;
	};

	const props: Props = $props();
	const info = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const art = $derived(info.art);
	const look = $derived(getSymbolLook(props.rawSymbol.name));
	const size = SYMBOL_SIZE * 0.92;
	const isWin = $derived(props.state === 'win');

	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		// Win "animation": hold the highlight, then report completion (Spine `win` track in the final build).
		const state = props.state;
		clearTimeout(timer);
		if (state === 'win') {
			timer = setTimeout(() => props.oncomplete?.(), stateBet.isTurbo ? 600 : 1150);
		} else if (state === 'land') {
			timer = setTimeout(() => props.oncomplete?.(), stateBet.isTurbo ? 180 : 340);
		} else {
			props.oncomplete?.();
		}
	});
	onDestroy(() => clearTimeout(timer));
</script>

{#if art && look && hasArt(art.assetId)}
	<Container x={props.x} y={props.y}>
		<SymbolView {look} state={props.state} dimmed={props.dimmed} highlight={props.highlight} glintAt={props.glintAt} />
	</Container>
{:else if art}
	<Container x={props.x} y={props.y} scale={isWin ? 1.08 : 1}>
		<Rectangle
			anchor={0.5}
			width={size}
			height={size}
			borderRadius={art.shape === 'card' ? 14 : art.shape === 'crew' ? size / 2 : 20}
			backgroundColor={art.fill}
			borderColor={isWin ? 0xfff1a8 : art.border}
			borderWidth={isWin ? 8 : art.shape === 'card' ? 3 : 5}
		/>
		<Text
			anchor={0.5}
			y={art.shape === 'card' ? -8 : -12}
			text={art.label}
			style={{
				fontFamily: 'Luckiest Guy, sans-serif',
				fontWeight: '800',
				fontSize: art.label.length > 2 ? 24 : 46,
				fill: art.text,
			}}
		/>
		<Text
			anchor={0.5}
			y={size / 2 - 22}
			text={art.sub}
			style={{
				fontFamily: 'Luckiest Guy, sans-serif',
				fontWeight: '700',
				fontSize: 11,
				fill: art.text,
				letterSpacing: 1,
			}}
		/>
		<Text
			anchor={0.5}
			y={-size / 2 + 10}
			text={`TEMP · ${art.assetId}`}
			style={{ fontFamily: 'monospace', fontSize: 8, fill: 0xffffff }}
			alpha={0.6}
		/>
	</Container>
{/if}
