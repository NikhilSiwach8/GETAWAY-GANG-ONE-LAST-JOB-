<script lang="ts">
	/**
	 * A clip as a Pixi sprite. Restarts from frame 0 when mounted; calls onended when a one-shot finishes.
	 * Until the video has a frame, `fallback` (e.g. the still symbol) is drawn, so nothing blinks empty.
	 * Fades in over `fadeMs` (default 120 ms) instead of popping.
	 */
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { BaseSprite, Container } from 'pixi-svelte';
	import { describeVideo, getClip, playVideo, retain, unretain, whenReady } from '../game/clips.svelte';

	type Props = {
		id: string;
		channel?: string;
		loop?: boolean;
		autoplay?: boolean;
		x?: number;
		y?: number;
		width: number;
		height: number;
		anchor?: number | { x: number; y: number };
		zIndex?: number;
		alpha?: number;
		fadeMs?: number;
		fallback?: Snippet;
		onended?: (ok: boolean) => void;
		onready?: () => void;
		/** how long to wait for the first frame before giving up (default 8 s); one reload is tried half-way */
		readyMs?: number;
	};
	const props: Props = $props();
	const clip = getClip(props.id, props.channel ?? props.id);
	if (clip) retain(clip);

	let ready = $state(false);
	let fade = $state(0);
	let raf = 0;
	const fadeIn = () => {
		const ms = props.fadeMs ?? 120;
		if (ms <= 0) return void (fade = 1);
		const t0 = performance.now();
		const step = (t: number) => {
			fade = Math.min(1, (t - t0) / ms);
			if (fade < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
	};

	onMount(async () => {
		if (!clip) return props.onended?.(false);
		const wait = props.readyMs ?? 8000;
		let ok = await whenReady(clip.video, wait / 2);
		if (!ok && !clip.video.error) {
			// stalled: reload the source once and give it the rest of the time
			console.warn(`[clips] ${props.id}: slow to start, reloading (${describeVideo(clip.video)})`);
			clip.video.load();
			ok = await whenReady(clip.video, wait / 2);
		} else if (!ok) ok = await whenReady(clip.video, wait / 2); // an error may be the direct-stream retry
		if (!ok) {
			console.warn(`[clips] ${props.id}: not ready in time, showing the fallback (${describeVideo(clip.video)})`);
			return props.onended?.(false);
		}
		ready = true;
		props.onready?.();
		fadeIn();
		if (props.autoplay === false) return;
		playVideo(clip, props.loop).then((ok) => {
			// (a clip stopped on purpose also resolves false: only real errors are logged)
			if (!ok && clip.video.error) console.warn(`[clips] ${props.id}: playback failed (${describeVideo(clip.video)})`);
			if (!props.loop) props.onended?.(ok);
		});
	});
	onDestroy(() => {
		cancelAnimationFrame(raf);
		if (!clip) return;
		if (props.loop) clip.video.pause();
		unretain(clip);
	});
</script>

<!-- scale (not width/height): Pixi resolves width against the texture size at assignment time, and a
     video texture can still be resizing then, leaving the clip drawn at its native pixel size. -->
<!-- always-mounted wrapper: keeps this clip's place in the draw order even though the video appears later -->
<Container zIndex={props.zIndex}>
	{#if clip && ready}
		{#if fade < 1}{@render props.fallback?.()}{/if}
		<BaseSprite
			texture={clip.texture}
			x={props.x}
			y={props.y}
			scale={{ x: props.width / (clip.video.videoWidth || props.width), y: props.height / (clip.video.videoHeight || props.height) }}
			anchor={props.anchor ?? 0.5}
			alpha={(props.alpha ?? 1) * fade}
		/>
	{:else}
		{@render props.fallback?.()}
	{/if}
</Container>
