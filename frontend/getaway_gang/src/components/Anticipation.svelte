<script lang="ts">
	/**
	 * Reel anticipation: the FX-ANTICIPATION loop framing the reel while a bonus is close. Fades in, and fades
	 * out once the reel stops. Without clip support it falls back to a pulsing gold frame.
	 */
	import { onDestroy } from 'svelte';
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_PADDING, SYMBOL_SIZE } from '../game/constants';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const x = $derived(layout.x - layout.width * 0.5 + (props.reel.reelIndex + REEL_PADDING) * SYMBOL_SIZE);
	const width = SYMBOL_SIZE * 1.12;
	const height = SYMBOL_SIZE * 4.25;

	let alpha = $state(0);
	let t = $state(0);
	let raf = 0;
	let stopping = false;
	const t0 = performance.now();
	const tick = (now: number) => {
		t = (now - t0) / 1000;
		if (!stopping) alpha = Math.min(1, alpha + 0.08);
		else {
			alpha = Math.max(0, alpha - 0.08);
			if (alpha === 0) return props.oncomplete();
		}
		raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(raf));

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped') stopping = true;
	});
</script>

{#if hasClip('FX-ANTICIPATION')}
	<ClipSprite id="FX-ANTICIPATION" channel="anticipation" loop {x} y={layout.y} {width} {height} {alpha} zIndex={3} />
{:else}
	{@const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 2)}
	<Rectangle
		anchor={0.5}
		{x}
		y={layout.y}
		width={width * 0.92}
		height={height * 0.95}
		borderRadius={18}
		backgroundAlpha={0}
		borderColor={0xffe27a}
		borderWidth={8}
		alpha={alpha * pulse}
		zIndex={3}
	/>
{/if}
