<script lang="ts">
	/** One SYM-FX cell effect: steps through its sprite-sheet frames from `start` (performance.now() ms). */
	import { onMount } from 'svelte';
	import { BaseSprite } from 'pixi-svelte';
	import { cellFxFrames } from '../game/clips.svelte';
	import { CELL_FX_FPS } from '../game/cellFxSheets';

	type Props = { id: string; start: number; rate: number; x: number; y: number; size: number };
	const props: Props = $props();
	const frames = cellFxFrames(props.id) ?? [];
	let i = $state(0);
	onMount(() => {
		let raf = 0;
		const tick = () => {
			i = Math.min(frames.length - 1, Math.max(0, Math.floor(((performance.now() - props.start) / 1000) * CELL_FX_FPS * props.rate)));
			if (i < frames.length - 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

{#if frames.length}
	<BaseSprite texture={frames[i]} anchor={0.5} x={props.x} y={props.y} width={props.size} height={props.size} zIndex={9} />
{/if}
