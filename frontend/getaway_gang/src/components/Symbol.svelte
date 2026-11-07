<script lang="ts">
	/**
	 * TEMPORARY ART symbol renderer (see game/tempArt.ts and docs/ASSET_PROMPTS.md).
	 * Final build: replace with Sprite (static) + Spine (land/win/transform) keyed by `art.assetId`.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { hasArt } from '../game/ggAssets';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';
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
	};

	const props: Props = $props();
	const info = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
	const art = $derived(info.art);
	const size = SYMBOL_SIZE * 0.92;
	const isWin = $derived(props.state === 'win');
	// clip animations: win for every symbol, land for the specials (Wild, Scatter, crew)
	const winClip = $derived(art && hasClip(`${art.assetId}-ANIM-WIN`) ? `${art.assetId}-ANIM-WIN` : null);
	const landClip = $derived(
		art && ['W', 'S', 'R', 'B', 'T', 'F'].includes(props.rawSymbol.name) && hasClip(`${art.assetId}-ANIM-LAND`)
			? `${art.assetId}-ANIM-LAND`
			: null,
	);
	const clipSize = (SYMBOL_SIZE * 512) / 460;

	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		// Win "animation": hold the highlight, then report completion (Spine `win` track in the final build).
		const state = props.state;
		clearTimeout(timer);
		if (state === 'win') {
			timer = setTimeout(() => props.oncomplete?.(), stateBet.isTurbo ? 500 : 1000);
		} else if (state === 'land' && landClip) {
			timer = setTimeout(() => props.oncomplete?.(), stateBet.isTurbo ? 200 : 400);
		} else {
			props.oncomplete?.();
		}
	});
	onDestroy(() => clearTimeout(timer));
</script>

{#if art && hasArt(art.assetId)}
	<!-- Production art (art/delivery), win = scale pulse + glow until Spine animations arrive -->
	{#snippet still()}
		<Container scale={isWin ? 1.12 : 1}>
			{#if isWin}
				<Rectangle anchor={0.5} width={size} height={size} borderRadius={18} backgroundColor={0xf7c947} backgroundAlpha={0.28} borderColor={0xfff1a8} borderWidth={5} />
			{/if}
			<Sprite key={art.assetId} anchor={0.5} width={SYMBOL_SIZE} height={SYMBOL_SIZE} />
		</Container>
	{/snippet}
	<Container x={props.x} y={props.y}>
		{#if isWin && winClip}
			<ClipSprite id={winClip} channel="sym" width={clipSize} height={clipSize} fallback={still} />
		{:else if props.state === 'land' && landClip}
			<ClipSprite id={landClip} channel="sym-land" width={clipSize} height={clipSize} fadeMs={0} fallback={still} />
		{:else}
			{@render still()}
		{/if}
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
				fontFamily: 'proxima-nova, Arial, sans-serif',
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
				fontFamily: 'proxima-nova, Arial, sans-serif',
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
