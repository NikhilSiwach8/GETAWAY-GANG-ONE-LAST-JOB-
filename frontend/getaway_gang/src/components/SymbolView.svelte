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
	import { SYMBOL_WIN, TURBO_TIME, WIN_TIMING } from '../game/wins/sequences';
	import { sample } from '../game/wins/easing';

	type Props = {
		look: SymbolLook;
		state: SymbolState;
		dimmed?: boolean;
		/** accent colour of an active highlight (0 = the symbol's own accent), undefined = not highlighted */
		highlight?: number;
		/** performance.now() of an idle glint aimed at this cell (0 = none) */
		glintAt?: number;
		/** called once when the win sequence has played (the board then moves the symbol on) */
		oncomplete?: () => void;
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

	// fast play compresses the authored timing (game/wins/sequences)
	const turbo = $derived(stateBet.isTurbo ? 1 / TURBO_TIME : 1);
	let completed = false;
	$effect(() => {
		tWin = visual === 'winning' ? 0 : -1;
		completed = false;
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
		if (tWin >= 0) {
			tWin += dt * turbo;
			if (!completed && tWin >= WIN_TIMING.normal.perWin) {
				completed = true;
				props.oncomplete?.();
			}
		}
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
	// land: damped squash & stretch, planted on the body's floor
	const land = $derived.by(() => {
		if (tLand < 0) return { sx: 1, sy: 1, flash: 0 };
		const ms = tLand * 1000;
		const s = 0.16 * Math.exp(-ms / 85) * Math.cos(ms / 38);
		return { sx: 1 + s * 0.65, sy: 1 - s, flash: props.look.special ? Math.max(0, 1 - ms / 300) : 0 };
	});
	// win: the symbol family's keyframe tracks (anticipation, pop, impact squash & stretch, settle, held pulse)
	const tracks = $derived(SYMBOL_WIN[props.look.family]);
	const win = $derived.by(() => {
		if (tWin < 0) return null;
		const tr = tracks;
		return {
			scale: sample(tr.scale, tWin),
			sx: sample(tr.sx, tWin),
			sy: sample(tr.sy, tWin),
			y: sample(tr.y, tWin),
			rot: sample(tr.rot, tWin),
			halo: sample(tr.halo, tWin),
			sweep: sample(tr.shine, tWin),
		};
	});

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

<Container
	x={fit.dx * S}
	y={fit.dy * S + (floorY - fit.dy * S) * (1 - land.sy * (win?.sy ?? 1)) + (win?.y ?? 0) * S}
	scale={{ x: artScale * land.sx * (win?.sx ?? 1), y: artScale * land.sy * (win?.sy ?? 1) }}
	rotation={win?.rot ?? 0}
>
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

