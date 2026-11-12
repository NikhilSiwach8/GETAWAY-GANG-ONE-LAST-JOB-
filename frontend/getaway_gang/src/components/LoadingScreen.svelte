<script lang="ts">
	/**
	 * Loading screen: SCR-LOADING shown down to just above its painted UI (the art has a "LOADING..." line, a
	 * road-shaped bar and a "press anywhere" line painted in, which must not show through), fading into a solid
	 * panel that carries the delivered loading bar (UI-LOADING-BAR frame + gold fill) and, once loaded, the
	 * animated "press/tap anywhere" prompt. Continuing plays the van transition into the game.
	 */
	import * as PIXI from 'pixi.js';
	import { BaseSprite, Container, Rectangle, Sprite, getContextApp } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import PressToContinue from './PressToContinue.svelte';

	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';

	type Props = { onloaded: () => void };
	const props: Props = $props();
	const context = getContext();
	const app = getContextApp();
	let leaving = $state(false);

	// the art above its painted UI (the "LOADING..." line starts at 74 % of the height)
	const ART_CUT = 0.735;
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	// bottom panel: room for the bar and the prompt
	const panelH = $derived(Math.max(150, Math.min(sizes.height * 0.24, 260)));
	const artArea = $derived({ w: sizes.width, h: sizes.height - panelH + panelH * 0.35 });
	// cover-fit the cut art into the area above the panel (it may run under the panel's fade)
	const art = $derived.by(() => {
		const aw = 1920;
		const ah = 1080 * ART_CUT;
		const s = Math.max(artArea.w / aw, artArea.h / ah);
		return { width: aw * s, height: ah * s, x: (sizes.width - aw * s) / 2, y: artArea.h - ah * s };
	});
	const artTex = $derived.by(() => {
		const t = app.stateApp.loadedAssets?.['SCR-LOADING'] as PIXI.Texture | undefined;
		if (!t) return PIXI.Texture.EMPTY;
		return new PIXI.Texture({ source: t.source, frame: new PIXI.Rectangle(0, 0, t.source.width, Math.round(t.source.height * ART_CUT)) });
	});
	const panelY = $derived(sizes.height - panelH);
	// soft fade from the art into the panel (stepped bands: cheap and smooth at this size)
	const FADE_STEPS = 14;
	const fadeH = $derived(panelH * 0.55);
	const FRAME = GG_LAYOUT['UI-LOADING-BAR-FRAME'];
	const bar = $derived.by(() => {
		const w = Math.min(sizes.width * 0.6, panelH * 4.6, 1100);
		const h = (w * FRAME.height) / FRAME.width;
		return { x: sizes.width / 2, y: panelY + panelH * 0.28, w, h };
	});
	// the fill runs inside the frame's dark slot (fractions of the frame art: after the dial, before the hinge)
	const slot = $derived({ x0: bar.x - bar.w * 0.33, w: bar.w * 0.725, h: bar.h * 0.42 });
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
	<BaseSprite texture={artTex} x={art.x} y={art.y} width={art.width} height={art.height} />
	<!-- fade into the panel, then the solid panel (nothing of the art shows behind the bar and prompt) -->
	{#each Array.from({ length: FADE_STEPS }, (_, i) => i) as i (i)}
		<Rectangle x={0} y={panelY - fadeH + (fadeH * i) / FADE_STEPS} width={sizes.width} height={fadeH / FADE_STEPS + 1} backgroundColor={0x05070f} backgroundAlpha={((i + 1) / FADE_STEPS) ** 1.6} />
	{/each}
	<Rectangle x={0} y={panelY} width={sizes.width} height={panelH} backgroundColor={0x05070f} />
	<Rectangle x={0} y={panelY} width={sizes.width} height={2} backgroundColor={0xf7c947} backgroundAlpha={0.35} />
	<Sprite key="UI-LOADING-BAR-FRAME" anchor={0.5} x={bar.x} y={bar.y} width={bar.w} height={bar.h} />
	<Container x={slot.x0} y={bar.y}>
		<Sprite key="UI-LOADING-BAR-FILL" anchor={{ x: 0, y: 0.5 }} width={Math.max(slot.h, fillW)} height={slot.h} />
	</Container>
</FadeContainer>

{#if context.stateApp.loaded && !leaving}
	<PressToContinue onpress={proceed} />
{/if}
