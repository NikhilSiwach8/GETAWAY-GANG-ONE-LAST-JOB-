<script lang="ts">
	/**
	 * Live symbol animation on the delivered art, drawn every frame at full texture resolution (replaces the
	 * pre-rendered SYM-*-ANIM-LAND / -WIN videos, which were the static picture moved around and soft at 512 px).
	 *  land: squash & stretch on impact, planted on the cell floor (specials also flash a gold halo)
	 *  win : wind-up, back-eased pop, damped wobble, pulsing gold halo, a shine sweep across the symbol
	 *        (masked by the symbol's own alpha) and a burst of gold stars; then a gentle held pulse
	 */
	import { onDestroy } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = { assetId: string; mode: 'static' | 'land' | 'win'; special: boolean; durationMs: number };
	const props: Props = $props();

	let t = $state(0); // ms since the current mode started
	let raf = 0;
	let t0 = 0;
	$effect(() => {
		const mode = props.mode;
		cancelAnimationFrame(raf);
		t = 0;
		if (mode === 'static') return;
		t0 = performance.now();
		const step = (now: number) => {
			t = now - t0;
			// land settles in ~320 ms; win keeps its held pulse running until the state changes
			if (mode === 'win' || t < 360) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const turbo = $derived(stateBet.isTurbo ? 1.8 : 1);
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
	const backOut = (x: number, c = 2.2) => {
		const p = clamp01(x) - 1;
		return 1 + (c + 1) * p * p * p + c * p * p;
	};

	// ---- land: damped squash/stretch, bottom planted
	const land = $derived.by(() => {
		if (props.mode !== 'land') return { sx: 1, sy: 1, flash: 0 };
		const tt = t * turbo;
		const s = 0.16 * Math.exp(-tt / 85) * Math.cos(tt / 38);
		return { sx: 1 + s * 0.65, sy: 1 - s, flash: props.special ? Math.max(0, 1 - tt / 300) : 0 };
	});

	// ---- win
	const win = $derived.by(() => {
		if (props.mode !== 'win') return null;
		const tt = t * turbo;
		const wind = tt < 110 ? 1 - 0.08 * Math.sin((tt / 110) * Math.PI) : 1; // anticipation dip
		const pop = tt < 110 ? 1 : 1 + 0.2 * backOut((tt - 110) / 230) - 0.08 * clamp01((tt - 340) / 260);
		const hold = tt > 600 ? 0.025 * Math.sin((tt - 600) / 140) : 0;
		const rot = 0.1 * Math.exp(-Math.max(0, tt - 110) / 260) * Math.sin(Math.max(0, tt - 110) / 55);
		const halo = clamp01((tt - 80) / 160) * (0.75 + 0.25 * Math.sin(tt / 120));
		const sweep = clamp01((tt - 220) / 420); // shine travels left -> right once
		const burst = clamp01((tt - 140) / 650);
		return { scale: wind * (pop + hold), rot, halo, sweep, burst };
	});

	const S = SYMBOL_SIZE;
	const SPARKS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ a: (i / 7) * Math.PI * 2 + 0.4, d: 0.62 + (i % 3) * 0.12, s: 0.16 + (i % 2) * 0.06 }));
</script>

{#if props.mode === 'win' && win}
	<!-- gold halo behind -->
	<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={S * 1.7} height={S * 1.7} tint={0xffc93c} alpha={0.85 * win.halo} blendMode="add" />
	<Container scale={win.scale} rotation={win.rot}>
		<Sprite key={props.assetId} anchor={0.5} width={S} height={S} />
		<!-- shine sweep, clipped to the symbol's own shape -->
		{#if win.sweep > 0 && win.sweep < 1}
			<Container>
				<Sprite key={props.assetId} anchor={0.5} width={S} height={S} isMask />
				<Sprite key="UI-SHINE" anchor={0.5} x={-S * 0.9 + win.sweep * S * 1.8} width={S * 0.42} height={S * 1.6} rotation={0.38} alpha={0.85} blendMode="add" />
			</Container>
		{/if}
	</Container>
	<!-- star burst -->
	{#if win.burst > 0 && win.burst < 1}
		{#each SPARKS as p, i (i)}
			{@const e = 1 - Math.pow(1 - win.burst, 3)}
			<Sprite
				key="UI-STAR-ON"
				anchor={0.5}
				x={Math.cos(p.a) * S * p.d * (0.35 + e)}
				y={Math.sin(p.a) * S * p.d * (0.35 + e)}
				width={S * p.s * (1 - win.burst * 0.5)}
				height={S * p.s * (1 - win.burst * 0.5)}
				rotation={win.burst * 3 + i}
				alpha={1 - win.burst}
			/>
		{/each}
	{/if}
{:else}
	{#if land.flash > 0}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={S * 1.6} height={S * 1.6} tint={0xffd45a} alpha={land.flash * 0.9} blendMode="add" />
	{/if}
	<Container y={(S / 2) * (1 - land.sy)} scale={{ x: land.sx, y: land.sy }}>
		<Sprite key={props.assetId} anchor={0.5} width={S} height={S} />
	</Container>
{/if}
