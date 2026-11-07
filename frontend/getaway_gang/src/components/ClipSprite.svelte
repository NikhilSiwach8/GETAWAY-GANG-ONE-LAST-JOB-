<script lang="ts">
	/** A clip as a Pixi sprite. Restarts from frame 0 when mounted; calls onended when a one-shot finishes. */
	import { onDestroy, onMount } from 'svelte';
	import { BaseSprite } from 'pixi-svelte';
	import { getClip, playVideo, whenReady } from '../game/clips.svelte';

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
		onended?: (ok: boolean) => void;
	};
	const props: Props = $props();
	const clip = getClip(props.id, props.channel ?? props.id);

	// only shown once the video has a frame (no empty flash while downloading)
	let ready = $state(false);
	onMount(async () => {
		if (!clip) return;
		if (!(await whenReady(clip.video))) return props.onended?.(false);
		ready = true;
		if (props.autoplay === false) return;
		playVideo(clip, props.loop).then((ok) => !props.loop && props.onended?.(ok));
	});
	onDestroy(() => {
		if (clip && props.loop) clip.video.pause();
	});
</script>

{#if clip && ready}
	<BaseSprite
		texture={clip.texture}
		x={props.x}
		y={props.y}
		width={props.width}
		height={props.height}
		anchor={props.anchor ?? 0.5}
		zIndex={props.zIndex}
		alpha={props.alpha}
	/>
{/if}
