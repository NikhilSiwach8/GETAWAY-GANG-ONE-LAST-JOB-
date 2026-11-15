<!--
  Pops its content when `trigger` changes: a damped back-out scale (overshoot, settle) with a brief gold glow, so a
  counter or multiplier visibly reacts instead of just swapping numbers. Display only.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';

	type Props = { trigger: unknown; x?: number; y?: number; strength?: number; glow?: number; ms?: number; children: Snippet };
	const p: Props = $props();
	let t = $state(1);
	let first = true;
	$effect(() => {
		void p.trigger;
		if (first) {
			first = false; // no pop for the initial value
			return;
		}
		let raf = 0;
		const t0 = performance.now();
		const dur = p.ms ?? 460;
		const tick = (now: number) => {
			t = Math.min(1, (now - t0) / dur);
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		t = 0;
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
	const s = $derived(1 + (p.strength ?? 0.32) * (1 - t) * Math.cos(t * Math.PI * 1.5));
</script>

<Container x={p.x ?? 0} y={p.y ?? 0} scale={s}>
	{#if (p.glow ?? 0) > 0 && t < 1}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={p.glow} height={(p.glow ?? 0) * 0.7} tint={0xffd23a} alpha={0.85 * (1 - t)} blendMode="add" />
	{/if}
	{@render p.children()}
</Container>
