<script lang="ts">
	/** Full-screen clips (feature effects, combos, cinematics) on top of the game; tap to skip. */
	import { BaseSprite, Rectangle } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { clipLayer } from '../game/clips.svelte';

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	// 16:9 clips: fit inside the canvas (overlays are transparent outside their artwork)
	const fit = $derived.by(() => {
		const s = Math.min(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});
</script>

{#if clipLayer.texture}
	<Rectangle
		{...sizes}
		backgroundColor={0x000000}
		backgroundAlpha={clipLayer.fullFrame ? 0.85 : 0.001}
		eventMode="static"
		cursor="pointer"
		onpointerup={() => clipLayer.skip()}
		zIndex={40}
	/>
	<BaseSprite texture={clipLayer.texture} anchor={0.5} {...fit} zIndex={41} />
{/if}
