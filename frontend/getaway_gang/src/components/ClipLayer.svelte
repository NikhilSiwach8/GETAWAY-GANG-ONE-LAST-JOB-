<script lang="ts">
	/**
	 * Full-screen clips (feature effects, combos, cinematics) on top of the game; tap to skip.
	 * The current clip fades in, the finished one fades out holding its last frame, so back-to-back clips
	 * cross-fade instead of cutting through an empty frame.
	 */
	import { BaseSprite, Rectangle } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { clipLayer, LAYER_FADE_IN_MS, LAYER_FADE_OUT_MS, type LayerSlot } from '../game/clips.svelte';

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const fit = $derived.by(() => {
		const s = Math.min(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});

	// alpha per slot key, animated toward 1 (current) or 0 (outgoing)
	let alphas = $state<Record<number, number>>({});
	let raf = 0;
	let last = 0;
	const tick = (t: number) => {
		const dt = last ? t - last : 16;
		last = t;
		const next: Record<number, number> = {};
		let moving = false;
		const cur = clipLayer.current;
		const out = clipLayer.outgoing;
		if (cur) {
			next[cur.key] = Math.min(1, (alphas[cur.key] ?? 0) + dt / LAYER_FADE_IN_MS);
			moving ||= next[cur.key] < 1;
		}
		if (out) {
			next[out.key] = Math.max(0, (alphas[out.key] ?? 1) - dt / LAYER_FADE_OUT_MS);
			moving ||= next[out.key] > 0;
		}
		alphas = next;
		raf = moving ? requestAnimationFrame(tick) : 0;
		if (!moving) last = 0;
	};
	$effect(() => {
		void clipLayer.current?.key;
		void clipLayer.outgoing?.key;
		if (!raf) raf = requestAnimationFrame(tick);
		return () => {};
	});
	const backdrop = (slot: LayerSlot | null) => (slot?.fullFrame ? 0.85 * (alphas[slot.key] ?? 0) : 0);
	const dim = $derived(Math.max(backdrop(clipLayer.current), backdrop(clipLayer.outgoing)));
</script>

{#if clipLayer.current || clipLayer.outgoing}
	<Rectangle
		{...sizes}
		backgroundColor={0x000000}
		backgroundAlpha={Math.max(dim, 0.001)}
		eventMode={clipLayer.current ? 'static' : 'none'}
		cursor="pointer"
		onpointerup={() => clipLayer.skip()}
		zIndex={40}
	/>
	{#if clipLayer.outgoing}
		<BaseSprite texture={clipLayer.outgoing.texture} anchor={0.5} {...fit} alpha={alphas[clipLayer.outgoing.key] ?? 1} zIndex={41} />
	{/if}
	{#if clipLayer.current}
		<BaseSprite texture={clipLayer.current.texture} anchor={0.5} {...fit} alpha={alphas[clipLayer.current.key] ?? 0} zIndex={42} />
	{/if}
{/if}
