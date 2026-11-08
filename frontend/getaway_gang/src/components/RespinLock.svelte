<script lang="ts">
	/** One lit Chaos Re-spin padlock (UI-RESPIN-LOCK-ON) over the grey one in UI-RESPIN-BASE: pops in and glows. */
	import { onDestroy } from 'svelte';
	import { Sprite } from 'pixi-svelte';

	type Props = { x: number; y: number; width: number; height: number };
	const props: Props = $props();
	let t = $state(0);
	let raf = 0;
	const t0 = performance.now();
	const tick = (now: number) => {
		t = Math.min(1, (now - t0) / 420);
		if (t < 1) raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(raf));
	// back-out pop: overshoots a little, then settles
	const pop = $derived(1 + 0.35 * (1 - t) * Math.cos(t * Math.PI * 1.5));
</script>

<Sprite key="UI-RESPIN-LOCK-ON" anchor={0.5} x={props.x} y={props.y} width={props.width * pop} height={props.height * pop} alpha={Math.min(1, t * 3)} />
