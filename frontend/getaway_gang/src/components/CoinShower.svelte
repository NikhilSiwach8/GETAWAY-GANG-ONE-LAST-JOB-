<script lang="ts">
	/**
	 * Live coin shower with the gold coin cut from the delivered art (FX-COIN): coins burst up in a fountain
	 * from below the amount and (for the bigger tiers) rain down from the top, tumbling (flip + spin) under
	 * gravity. Replaces the SDK sample coin emitter. Canvas coordinates; one rAF loop for all coins.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';

	type Props = { emit: boolean; levelAlias?: string };
	const props: Props = $props();
	const context = getContext();

	// coins per second: fountain / rain, by win level
	const RATE: Record<string, [number, number]> = {
		nice: [10, 0],
		substantial: [18, 0],
		big: [34, 6],
		superwin: [44, 14],
		mega: [54, 24],
		epic: [64, 36],
		max: [70, 46],
	};
	type Coin = { x: number; y: number; vx: number; vy: number; ph: number; vph: number; rot: number; vr: number; s: number };
	let coins = $state.raw<Coin[]>([]);
	const cs = $derived(context.stateLayoutDerived.canvasSizes());
	const k = $derived(Math.min(cs.width / 1920, cs.height / 1080));

	let raf = 0;
	let last = 0;
	let acc = [0, 0];
	const MAX = 220;
	const step = (now: number) => {
		const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
		last = now;
		const [fr, rr] = RATE[props.levelAlias ?? ''] ?? [0, 0];
		const next: Coin[] = [];
		const g = 2400 * k;
		for (const c of coins) {
			const n = { ...c, vy: c.vy + g * dt, x: c.x + c.vx * dt, y: c.y + c.vy * dt, ph: c.ph + c.vph * dt, rot: c.rot + c.vr * dt };
			if (n.y < cs.height + 120 * k) next.push(n);
		}
		if (props.emit && next.length < MAX) {
			acc[0] += fr * dt;
			acc[1] += rr * dt;
			while (acc[0] >= 1) {
				acc[0] -= 1;
				const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
				const v = (1500 + Math.random() * 900) * k;
				next.push({ x: cs.width / 2 + (Math.random() - 0.5) * 160 * k, y: cs.height + 40 * k, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ph: Math.random() * 6, vph: 7 + Math.random() * 9, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, s: 0.7 + Math.random() * 0.6 });
			}
			while (acc[1] >= 1) {
				acc[1] -= 1;
				next.push({ x: Math.random() * cs.width, y: -60 * k, vx: (Math.random() - 0.5) * 120 * k, vy: (200 + Math.random() * 300) * k, ph: Math.random() * 6, vph: 6 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, s: 0.6 + Math.random() * 0.5 });
			}
		}
		coins = next;
		raf = props.emit || next.length ? requestAnimationFrame(step) : 0;
		if (!raf) last = 0;
	};
	$effect(() => {
		if (props.emit && !raf) raf = requestAnimationFrame(step);
	});
	onDestroy(() => cancelAnimationFrame(raf));
</script>

<Container zIndex={40}>
	{#each coins as c, i (i)}
		<Sprite
			key="FX-COIN"
			anchor={0.5}
			x={c.x}
			y={c.y}
			rotation={c.rot}
			width={58 * k * c.s * Math.max(0.15, Math.abs(Math.cos(c.ph)))}
			height={46 * k * c.s}
			tint={Math.cos(c.ph) > 0 ? 0xffffff : 0xd9a441}
		/>
	{/each}
</Container>
