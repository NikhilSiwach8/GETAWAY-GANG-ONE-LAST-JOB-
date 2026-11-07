<script lang="ts">
	/**
	 * FX-TRANSITION: the getaway van drives across trailing a smoke wall. `oncovered` fires when the screen
	 * is fully covered (frame 16 of 36), which is when the caller swaps scenes; `onfinished` once it has
	 * cleared. Without clip support: a quick navy fade with the same two moments.
	 */
	import { onDestroy, onMount } from 'svelte';
	import { BaseSprite, Rectangle } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	import { getClip, hasClip, playVideo, retain, unretain, videoScale, whenReady } from '../game/clips.svelte';

	type Props = { oncovered?: () => void; onfinished: () => void };
	const props: Props = $props();
	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});

	const COVER_AT = 16 / 30; // seconds into the clip at which the frame is fully covered
	const clip = hasClip('FX-TRANSITION') ? getClip('FX-TRANSITION', 'transition') : undefined;
	if (clip) retain(clip);
	let showClip = $state(false);
	let fade = $state(0);
	let raf = 0;
	let covered = false;
	const cover_ = () => {
		if (covered) return;
		covered = true;
		props.oncovered?.();
	};

	const fallback = () => {
		const speed = stateBet.isTurbo ? 2 : 1;
		const t0 = performance.now();
		const step = (now: number) => {
			const t = ((now - t0) / 1000) * speed;
			fade = t < 0.25 ? t / 0.25 : t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.35);
			if (t >= 0.25) cover_();
			if (t >= 0.8) return props.onfinished();
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
	};

	onMount(async () => {
		if (!clip || !(await whenReady(clip.video, 1500))) return fallback();
		showClip = true;
		const watch = () => {
			if (clip.video.currentTime >= COVER_AT) cover_();
			if (!covered) raf = requestAnimationFrame(watch);
		};
		raf = requestAnimationFrame(watch);
		const ok = await playVideo(clip);
		cover_();
		if (!ok) return fallback();
		props.onfinished();
	});
	onDestroy(() => {
		cancelAnimationFrame(raf);
		if (clip) unretain(clip);
	});
</script>

{#if showClip && clip}
	<BaseSprite texture={clip.texture} anchor={0.5} x={cover.x} y={cover.y} scale={videoScale(clip.texture, cover.width, cover.height)} zIndex={60} />
{:else if fade > 0}
	<Rectangle {...sizes} backgroundColor={0x0b1026} backgroundAlpha={fade} zIndex={60} />
{/if}
