<script lang="ts">
	/**
	 * Signature win effects, one per symbol, drawn on the symbol's own art (inside the art container, so they
	 * move, squash and pop with it). Driven by the win clock `t` (seconds, game/wins/sequences timing: pop at
	 * 0.11-0.34 s, impact 0.34 s, the sequence ends at 1.15 s). Points are fractions of the 512 px art,
	 * measured on the delivered symbols. Only shared textures, no masks: cheap enough for a full board of wins.
	 *   H1 diamond      facets flash one after another, a prism ring
	 *   H2 money bag    coins burst out of the bag's mouth
	 *   H3 gold bars    a glint runs along each bar
	 *   H4 watch        a gold second hand sweeps the dial, the crystal flashes
	 *   L1-L4 royals    a metallic glint runs down the letter
	 *   W  getaway van  headlights and roof lights flash, an exhaust puff
	 *   S  blueprint    the target pulses with two rings
	 *   crew            a shock ring in the crew colour
	 */
	import { BaseSprite, Circle, Container, Rectangle, Sprite } from 'pixi-svelte';
	import { glintTexture } from '../game/env/textures';

	type Props = { name: string; t: number; S: number; accent: number };
	const props: Props = $props();
	const S = $derived(props.S);
	const t = $derived(props.t);
	const P = (u: number, v: number) => ({ x: (u - 0.5) * S, y: (v - 0.5) * S });
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
	/** 0 -> 1 -> 0 bell over [a, a + len] */
	const bell = (a: number, len: number) => {
		const k = clamp01((t - a) / len);
		return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI);
	};
	const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
	const glint = glintTexture();
	const CREW = new Set(['R', 'B', 'T', 'F']);
	const ROYAL = new Set(['L1', 'L2', 'L3', 'L4']);

	const DIAMOND = [P(0.3, 0.35), P(0.56, 0.28), P(0.46, 0.56), P(0.72, 0.44), P(0.5, 0.76)];
	const BARS: [{ x: number; y: number }, { x: number; y: number }][] = [
		[P(0.4, 0.2), P(0.74, 0.19)],
		[P(0.12, 0.58), P(0.4, 0.54)],
		[P(0.48, 0.6), P(0.88, 0.5)],
	];
	const COINS = [-1.1, -0.55, 0, 0.55, 1.1, -0.25, 0.3];
	const WATCH = P(0.45, 0.44);
	const HEAD = [P(0.41, 0.55), P(0.88, 0.55)];
	const ROOF = [P(0.37, 0.17), P(0.48, 0.17), P(0.59, 0.17), P(0.68, 0.17)];
	const TARGET = P(0.62, 0.45);
</script>

{#if props.name === 'H1'}
	{#each DIAMOND as p, i (i)}
		{@const k = bell(0.3 + i * 0.1, 0.32)}
		{#if k > 0}
			<BaseSprite texture={glint} anchor={0.5} x={p.x} y={p.y} scale={(S * 0.42 * k) / 64} rotation={t * 2 + i} alpha={k} blendMode="add" />
		{/if}
	{/each}
	{@const r = bell(0.34, 0.6)}
	{#if r > 0}
		<Circle anchor={0.5} diameter={100} scale={(S * (0.5 + easeOut((t - 0.34) / 0.6) * 0.7)) / 100} borderColor={0xbfe9ff} borderWidth={5} borderAlpha={r * 0.8} backgroundAlpha={0} />
	{/if}
{:else if props.name === 'H2'}
	{#each COINS as dx, i (i)}
		{@const k = clamp01((t - 0.34 - (i % 3) * 0.03) / 0.7)}
		{#if k > 0 && k < 1}
			{@const vx = dx * S * 0.55}
			{@const vy = -S * (1.25 + (i % 2) * 0.25)}
			<Sprite key="FX-COIN" anchor={0.5} x={P(0.52, 0.2).x + vx * k} y={P(0.52, 0.2).y + vy * k + S * 1.9 * k * k} width={S * 0.2 * Math.max(0.2, Math.abs(Math.cos(k * 9 + i)))} height={S * 0.16} alpha={1 - k * k} />
		{/if}
	{/each}
{:else if props.name === 'H3'}
	{#each BARS as [a, b], i (i)}
		{@const k = clamp01((t - 0.3 - i * 0.12) / 0.38)}
		{#if k > 0 && k < 1}
			<BaseSprite texture={glint} anchor={0.5} x={a.x + (b.x - a.x) * k} y={a.y + (b.y - a.y) * k} scale={(S * 0.45 * Math.sin(k * Math.PI)) / 64} rotation={k * 3} alpha={Math.sin(k * Math.PI)} blendMode="add" />
		{/if}
	{/each}
{:else if props.name === 'H4'}
	{@const k = bell(0.12, 1.0)}
	{#if k > 0}
		<!-- second hand: two fast turns, easing to rest -->
		<Container x={WATCH.x} y={WATCH.y} rotation={easeOut((t - 0.12) / 1.0) * Math.PI * 4} alpha={Math.min(1, k * 2)}>
			<Rectangle anchor={{ x: 0.5, y: 0.9 }} width={S * 0.018} height={S * 0.2} backgroundColor={0xffd23a} />
			<Circle anchor={0.5} diameter={S * 0.045} backgroundColor={0xffd23a} />
		</Container>
	{/if}
	{@const g = bell(0.34, 0.45)}
	{#if g > 0}
		<BaseSprite texture={glint} anchor={0.5} x={WATCH.x - S * 0.1} y={WATCH.y - S * 0.12} scale={(S * 0.55 * g) / 64} rotation={t} alpha={g} blendMode="add" />
	{/if}
{:else if ROYAL.has(props.name)}
	{@const k = clamp01((t - 0.3) / 0.5)}
	{#if k > 0 && k < 1}
		<BaseSprite texture={glint} anchor={0.5} x={-S * 0.25 + S * 0.5 * k} y={-S * 0.3 + S * 0.6 * k} scale={(S * 0.5 * Math.sin(k * Math.PI)) / 64} rotation={k * 2} alpha={Math.sin(k * Math.PI)} blendMode="add" />
	{/if}
{:else if props.name === 'W'}
	<!-- headlights: three quick flashes -->
	{@const f = t > 0.3 && t < 1.0 ? Math.max(0, Math.sin((t - 0.3) * 27)) : 0}
	{#each HEAD as p, i (i)}
		{#if f > 0.05}
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={p.x} y={p.y} width={S * 0.45} height={S * 0.3} tint={0xfff2c0} alpha={f} blendMode="add" />
		{/if}
	{/each}
	{#each ROOF as p, i (i)}
		{@const k = bell(0.3 + i * 0.06, 0.25)}
		{#if k > 0}
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={p.x} y={p.y} width={S * 0.2} height={S * 0.2} tint={0xffd23a} alpha={k} blendMode="add" />
		{/if}
	{/each}
	{@const pf = clamp01((t - 0.34) / 0.6)}
	{#if pf > 0 && pf < 1}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={P(0.08, 0.88).x - S * 0.15 * pf} y={P(0.08, 0.88).y - S * 0.05 * pf} width={S * (0.25 + 0.35 * pf)} height={S * (0.18 + 0.2 * pf)} tint={0xd8dce6} alpha={0.7 * (1 - pf)} />
	{/if}
{:else if props.name === 'S'}
	{#each [0, 1] as i (i)}
		{@const k = clamp01((t - 0.34 - i * 0.22) / 0.55)}
		{#if k > 0 && k < 1}
			<Circle anchor={0.5} x={TARGET.x} y={TARGET.y} diameter={100} scale={(S * (0.08 + 0.45 * easeOut(k))) / 100} borderColor={0x8fd8ff} borderWidth={6} borderAlpha={1 - k} backgroundAlpha={0} />
		{/if}
	{/each}
	{@const g = bell(0.3, 0.5)}
	{#if g > 0}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={TARGET.x} y={TARGET.y} width={S * 0.4} height={S * 0.4} tint={0xff4040} alpha={g} blendMode="add" />
	{/if}
{:else if CREW.has(props.name)}
	{@const k = clamp01((t - 0.34) / 0.5)}
	{#if k > 0 && k < 1}
		<Circle anchor={0.5} diameter={100} scale={(S * (0.95 + 0.4 * easeOut(k))) / 100} borderColor={props.accent} borderWidth={7} borderAlpha={1 - k} backgroundAlpha={0} />
	{/if}
{/if}
