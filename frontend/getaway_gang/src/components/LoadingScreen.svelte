<script lang="ts">
	/**
	 * SCR-LOADING with the delivered loading bar (UI-LOADING-BAR frame + gold fill) over the art's own road
	 * bar. When loaded, "press/tap anywhere" appears; continuing plays the van transition into the game.
	 */
	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import PressToContinue from './PressToContinue.svelte';

	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';

	type Props = { onloaded: () => void };
	const props: Props = $props();
	const context = getContext();
	let leaving = $state(false);

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: (sizes.width - 1920 * s) / 2, y: (sizes.height - 1080 * s) / 2 };
	});
	// the delivered bar replaces the road-shaped bar painted into SCR-LOADING (centre 0.5 / 0.879 of the art)
	const FRAME = GG_LAYOUT['UI-LOADING-BAR-FRAME'];
	const bar = $derived.by(() => {
		const w = Math.min(cover.width * 0.56, sizes.width * 0.9);
		const h = (w * FRAME.height) / FRAME.width;
		return { x: sizes.width / 2, y: Math.min(cover.y + cover.height * 0.879, sizes.height - h * 1.3), w, h };
	});
	// the fill runs inside the frame's dark slot (fractions of the frame art: after the dial, before the hinge)
	const slot = $derived({ x0: bar.x - bar.w * 0.33, w: bar.w * 0.725, h: bar.h * 0.42 });
	// the painted "press anywhere" line sits below the bar: hidden; the animated prompt appears once loaded
	const strip = $derived({ y: bar.y + bar.h * 0.5, h: sizes.height - (bar.y + bar.h * 0.5) });
	const progress = $derived(context.stateApp.loaded ? 1 : Math.max(0.02, context.stateApp.loadingProgress / 100));
	const fillW = $derived(slot.w * progress);

	const proceed = async () => {
		if (!context.stateApp.loaded || leaving) return;
		leaving = true;
		// the transition covers the screen, the game appears underneath, then the smoke clears
		await context.eventEmitter.broadcastAsync({ type: 'transition' });
		props.onloaded();
	};
</script>

<FadeContainer show={true}>
	<Rectangle {...sizes} backgroundColor={0x05070f} />
	<Sprite key="SCR-LOADING" {...cover} />
	<Rectangle x={0} y={strip.y} width={sizes.width} height={strip.h} backgroundColor={0x05070f} backgroundAlpha={0.88} />
	<Sprite key="UI-LOADING-BAR-FRAME" anchor={0.5} x={bar.x} y={bar.y} width={bar.w} height={bar.h} />
	<Container x={slot.x0} y={bar.y}>
		<Sprite key="UI-LOADING-BAR-FILL" anchor={{ x: 0, y: 0.5 }} width={Math.max(slot.h, fillW)} height={slot.h} />
	</Container>
</FadeContainer>

{#if context.stateApp.loaded && !leaving}
	<PressToContinue onpress={proceed} />
{/if}
