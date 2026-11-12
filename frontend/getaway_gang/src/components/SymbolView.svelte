<script lang="ts">
	/**
	 * Shared symbol renderer: draws any symbol of the catalogue in any visual state (game/symbols):
	 * idle, highlighted, winning, dimmed, animated (land) and the eased reset back to idle.
	 *
	 * Layers, bottom to top: contact shadow, accent light, the art (optically fitted, graded, dimmed),
	 * the win shine (clipped to the art's own alpha), the idle glint, the win star burst.
	 *
	 * Timing runs on the PixiJS ticker with delta time, and the ticker callback is attached only while
	 * something moves, so a board of idle symbols costs nothing per frame.
	 */
	import { onDestroy } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { BaseSprite, Container, Sprite, getContextApp } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';
	import type { SymbolLook } from '../game/symbols/catalog';
	import { CHANNELS, RESET_TAU, resolveVisualState } from '../game/symbols/symbolStates';
	import { glintTexture } from '../game/env/textures';

	type Props = {
		look: SymbolLook;
		state: SymbolState;
		dimmed?: boolean;
		/** accent colour of an active highlight (0 = the symbol's own accent), undefined = not highlighted */
		highlight?: number;
		/** performance.now() of an idle glint aimed at this cell (0 = none) */
		glintAt?: number;
	};
	const props: Props = $props();

	const S = SYMBOL_SIZE;
	const app = getContextApp();
	const ticker = app.stateApp.pixiApplication?.ticker as PIXI.Ticker | undefined;

	const visual = $derived(resolveVisualState({ state: props.state, dimmed: props.dimmed, highlighted: props.highlight !== undefined }));
	const target = $derived(CHANNELS[visual]);
	const fit = $derived(props.look.metrics?.fit ?? { scale: 1, dx: 0, dy: 0 });
	const body = $derived(props.look.metrics?.body ?? [0.05, 0.05, 0.95, 0.95]);
	const glintAllowed = $derived(props.look.glints && visual === 'idle');

	// blended channels (eased toward `target`: this is the reset path for every state)
	let lift = $state(1);
	let light = $state(0);
	let dim = $state(0);
	let shadow = $state(1);
	// clocks (seconds) of the timed sequences; -1 = not running
	let tWin = $state(-1);
	let tLand = $state(-1);
	let tGlint = $state(-1);
	let tPulse = $state(0);

	const turbo = $derived(stateBet.isTurbo ? 1.8 : 1);
	$effect(() => {
		tWin = visual === 'winning' ? 0 : -1;
	});
	$effect(() => {
		tLand = visual === 'animated' ? 0 : -1;
	});
	$effect(() => {
		const at = props.glintAt ?? 0;
		const age = (performance.now() - at) / 1000;
		if (at && glintAllowed && age < 0.7) tGlint = Math.max(0, age);
	});

	const settled = () =>
		tWin < 0 &&
		tLand < 0 &&
		tGlint < 0 &&
		visual !== 'highlighted' &&
		Math.abs(lift - target.lift) < 1e-3 &&
		Math.abs(light - target.light) < 1e-3 &&
		Math.abs(dim - target.dim) < 1e-3 &&
		Math.abs(shadow - target.shadow) < 1e-3;

	let running = false;
	const tick = (tk: PIXI.Ticker) => {
		const dt = Math.min(tk.deltaMS / 1000, 0.05);
		const k = 1 - Math.exp(-dt / RESET_TAU);
		lift += (target.lift - lift) * k;
		light += (target.light - light) * k;
		dim += (target.dim - dim) * k;
		shadow += (target.shadow - shadow) * k;
		tPulse += dt;
		if (tWin >= 0) tWin += dt * turbo;
		if (tLand >= 0) tLand = tLand + dt * turbo > 0.36 ? -1 : tLand + dt * turbo;
		if (tGlint >= 0) tGlint = tGlint + dt > 0.7 ? -1 : tGlint + dt;
		if (settled()) {
			lift = target.lift;
			light = target.light;
			dim = target.dim;
			shadow = target.shadow;
			stop();
		}
	};
	const start = () => {
		if (running || !ticker) return;
		running = true;
		ticker.add(tick);
	};
	const stop = () => {
		if (!running || !ticker) return;
		running = false;
		ticker.remove(tick);
	};
	$effect(() => {
		// anything that leaves the resting pose wakes the ticker
		void target;
		void tWin;
		void tLand;
		void tGlint;
		if (!settled()) start();
	});
	onDestroy(stop);

	// ---------------------------------------------------------------- sequences
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
	const backOut = (x: number, c = 2.2) => {
		const p = clamp01(x) - 1;
		return 1 + (c + 1) * p * p * p + c * p * p;
	};
	// land: damped squash & stretch, planted on the body's floor
	const land = $derived.by(() => {
		if (tLand < 0) return { sx: 1, sy: 1, flash: 0 };
		const ms = tLand * 1000;
		const s = 0.16 * Math.exp(-ms / 85) * Math.cos(ms / 38);
		return { sx: 1 + s * 0.65, sy: 1 - s, flash: props.look.special ? Math.max(0, 1 - ms / 300) : 0 };
	});
	// win: anticipation dip, back-eased pop, damped wobble, halo, one shine sweep, star burst, held pulse
	const win = $derived.by(() => {
		if (tWin < 0) return null;
		const ms = tWin * 1000;
		const wind = ms < 110 ? 1 - 0.08 * Math.sin((ms / 110) * Math.PI) : 1;
		const pop = ms < 110 ? 1 : 1 + 0.2 * backOut((ms - 110) / 230) - 0.08 * clamp01((ms - 340) / 260);
		const hold = ms > 600 ? 0.025 * Math.sin((ms - 600) / 140) : 0;
		const rot = 0.1 * Math.exp(-Math.max(0, ms - 110) / 260) * Math.sin(Math.max(0, ms - 110) / 55);
		return {
			scale: wind * (pop + hold),
			rot,
			halo: clamp01((ms - 80) / 160) * (0.75 + 0.25 * Math.sin(ms / 120)),
			sweep: clamp01((ms - 220) / 420),
			burst: clamp01((ms - 140) / 650),
		};
	});
	const SPARKS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ a: (i / 7) * Math.PI * 2 + 0.4, d: 0.62 + (i % 3) * 0.12, s: 0.16 + (i % 2) * 0.06 }));

	// ---------------------------------------------------------------- derived drawing values
	const accent = $derived(props.highlight ? props.highlight : props.look.accent);
	const mul = (c: number, f: number) => Math.round(c * f);
	/** grade x dim: dimmed symbols go to ~55 % with a slight cool cast (reads as "in shadow", not grey) */
	const tint = $derived.by(() => {
		const g = props.look.grade;
		const r = ((g >> 16) & 255) / 255;
		const gg = ((g >> 8) & 255) / 255;
		const b = (g & 255) / 255;
		const f = 1 - 0.45 * dim;
		const fb = 1 - 0.38 * dim;
		return (mul(255 * r, f) << 16) | (mul(255 * gg, f) << 8) | mul(255 * b, fb);
	});
	const pulse = $derived(0.82 + 0.18 * Math.sin(tPulse * 4.2));
	const artScale = $derived(fit.scale * lift * (win?.scale ?? 1));
	// body floor in cell coordinates (after the optical fit): the shadow and the landing pivot sit here
	const floorY = $derived(((body[3] - 0.5) * fit.scale + fit.dy) * S);
	const bodyW = $derived((body[2] - body[0]) * fit.scale * S);
	const glint = $derived.by(() => {
		if (tGlint < 0) return null;
		const p = tGlint / 0.7;
		const g = props.look.metrics?.glint ?? [0.4, 0.4];
		return {
			x: ((g[0] - 0.5) * fit.scale + fit.dx) * S,
			y: ((g[1] - 0.5) * fit.scale + fit.dy) * S,
			k: Math.sin(clamp01(p) * Math.PI),
			rot: p * 1.2,
		};
	});
</script>

<!-- contact shadow: one shared treatment grounds every symbol on the reel -->
<Sprite
	key="UI-SOFT-GLOW"
	anchor={0.5}
	y={floorY - S * 0.02}
	width={bodyW * 0.82}
	height={S * 0.16}
	tint={0x000000}
	alpha={0.42 * shadow}
/>

<!-- accent light: highlight rim light, win halo, landing flash of feature symbols -->
{#if light > 0.01 || win || land.flash > 0}
	<Sprite
		key="UI-SOFT-GLOW"
		anchor={0.5}
		y={fit.dy * S}
		width={S * 1.65}
		height={S * 1.65}
		tint={accent}
		alpha={Math.min(1, light * pulse * 0.9 + (win ? 0.8 * win.halo : 0) + land.flash * 0.85)}
		blendMode="add"
	/>
{/if}

<Container x={fit.dx * S} y={fit.dy * S + (floorY - fit.dy * S) * (1 - land.sy)} scale={{ x: artScale * land.sx, y: artScale * land.sy }} rotation={win?.rot ?? 0}>
	<Sprite key={props.look.assetId} anchor={0.5} width={S} height={S} {tint} />
	{#if win && win.sweep > 0 && win.sweep < 1}
		<Container>
			<Sprite key={props.look.assetId} anchor={0.5} width={S} height={S} isMask />
			<Sprite
				key="UI-SHINE"
				anchor={0.5}
				x={-S * 0.9 + win.sweep * S * 1.8}
				width={S * 0.42}
				height={S * 1.6}
				rotation={0.38}
				alpha={0.85}
				blendMode="add"
			/>
		</Container>
	{/if}
	{#if visual === 'highlighted'}
		<!-- highlighted symbols lift into the light: a soft accent wash over the art itself -->
		<Container>
			<Sprite key={props.look.assetId} anchor={0.5} width={S} height={S} isMask />
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} y={-S * 0.25} width={S * 1.3} height={S * 1.1} tint={accent} alpha={0.28 * light * pulse} blendMode="add" />
		</Container>
	{/if}
</Container>

{#if glint}
	<BaseSprite
		texture={glintTexture()}
		anchor={0.5}
		x={glint.x}
		y={glint.y}
		scale={(S * 0.5 * (0.35 + 0.65 * glint.k)) / 64}
		rotation={glint.rot}
		alpha={0.95 * glint.k}
		blendMode="add"
	/>
{/if}

{#if win && win.burst > 0 && win.burst < 1}
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
