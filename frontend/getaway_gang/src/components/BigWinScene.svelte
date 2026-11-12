<script lang="ts">
	/**
	 * Big win presentation, live (no video). Driven by the win director's tier state (game/wins): the scene
	 * escalates BIG -> SUPER -> MEGA -> EPIC (-> MAX) up to the outcome's level, one stage per share of the
	 * count-up. Every stage impact slams its title in (anticipation scale-down, elastic settle), flashes the
	 * screen, shakes the camera, swaps in the stage's light rays and palette and sprays coins (Win.svelte).
	 * Crew members slide in and cheer; EPIC and MAX add a burning edge glow. All motion is eased; the scene
	 * clock is the PixiJS ticker, attached while the scene exists. Canvas coordinates; the amount is drawn by
	 * Win.svelte.
	 */
	import { onDestroy } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { Container, Rectangle, Sprite, Text, getContextApp } from 'pixi-svelte';
	import LivePose from './LivePose.svelte';
	import { getContext } from '../game/context';
	import { winFx } from '../game/wins/winDirector.svelte';
	import { TIER_LOOK, type TierAlias } from '../game/wins/sequences';
	import { EASE, sample, type Track } from '../game/wins/easing';

	const context = getContext();
	const ticker = getContextApp().stateApp.pixiApplication!.ticker as PIXI.Ticker;

	let t = $state(0); // scene clock (s)
	let impactAt = $state(0); // scene time of the latest stage impact
	let shown = $state<TierAlias>('big'); // stage on screen
	let prevAlias = $state<TierAlias>('big'); // stage fading out
	let lastImpact = -1;
	const tick = (tk: PIXI.Ticker) => (t += Math.min(tk.deltaMS / 1000, 0.05));
	ticker.add(tick);
	onDestroy(() => ticker.remove(tick));

	const tier = $derived(winFx.tier);
	$effect(() => {
		const n = tier?.impact ?? 0;
		const next = tier?.stageAlias ?? 'big';
		if (n === lastImpact) return;
		lastImpact = n;
		prevAlias = shown;
		shown = next;
		impactAt = t;
	});
	const alias = $derived(shown);
	const look = $derived(TIER_LOOK[alias]);
	const prevLook = $derived(TIER_LOOK[prevAlias]);

	const cs = $derived(context.stateLayoutDerived.canvasSizes());
	const k = $derived(Math.min(cs.width / 1920, cs.height / 1080));
	const cx = $derived(cs.width / 2);
	const cy = $derived(cs.height / 2);
	const since = $derived(t - impactAt);

	// title slam: grows in from far, overshoots small on the hit, springs to rest, then breathes
	const TITLE: Track = [
		[0, 2.4],
		[0.13, 0.9, 'quadIn'],
		[0.75, 1, 'elasticOut'],
	];
	const titleScale = $derived(sample(TITLE, since) * (1 + 0.03 * Math.sin(t * 4)));
	const titleAlpha = $derived(EASE.cubicOut(since / 0.1));
	// camera shake: strong on the hit, decaying (quad ease-out envelope)
	const shakeEnv = $derived(1 - EASE.quadOut(since / 0.45));
	const shake = $derived(since < 0.45 ? Math.sin(since * 75) * look.shake * k * shakeEnv : 0);
	const flash = $derived(since < 0.35 ? 0.42 * (1 - EASE.quadOut(since / 0.35)) : 0);
	// rays: the new stage's rays bloom in, the old stage's fade out
	const raysIn = $derived(EASE.backOut(since / 0.5));
	const raysOut = $derived(1 - EASE.quadOut(since / 0.4));
	const crewIn = $derived(t); // crew enter once, with the scene
	const poseH = $derived(620 * k);
	const backOut = (x: number) => EASE.backOut(x);
	const edgePulse = $derived(look.edge * (0.7 + 0.3 * Math.sin(t * 3.2)));
</script>

<Container x={shake} y={shake * 0.45}>
	<!-- outgoing rays -->
	{#if prevAlias !== alias && raysOut > 0}
		{#each prevLook.rays as r, i (i)}
			<Sprite key="UI-RAYS" anchor={0.5} x={cx} y={cy - 60 * k} width={r[1] * k} height={r[1] * k} rotation={t * r[2]} tint={r[0]} alpha={0.55 * raysOut} blendMode="add" />
		{/each}
	{/if}
	<!-- current rays -->
	{#each look.rays as r, i (`${alias}-${i}`)}
		<Sprite key="UI-RAYS" anchor={0.5} x={cx} y={cy - 60 * k} width={r[1] * k * raysIn} height={r[1] * k * raysIn} rotation={t * r[2]} tint={r[0]} alpha={0.55} blendMode="add" />
	{/each}
	<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={cx} y={cy - 60 * k} width={1100 * k} height={900 * k} tint={0xfff1c0} alpha={0.42 * (0.85 + 0.15 * Math.sin(t * 3))} blendMode="add" />

	<!-- epic / max: burning screen edges -->
	{#if look.edge > 0}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={0} y={cy} width={700 * k} height={cs.height * 1.6} tint={look.shadow} alpha={edgePulse} blendMode="add" />
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={cs.width} y={cy} width={700 * k} height={cs.height * 1.6} tint={look.shadow} alpha={edgePulse} blendMode="add" />
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={cx} y={cs.height} width={cs.width * 1.4} height={520 * k} tint={look.shadow} alpha={edgePulse * 0.8} blendMode="add" />
	{/if}

	<!-- crew slide in from both sides (staggered, back-eased), then cheer -->
	{#each look.crew[0] as id, i (id)}
		{@const e = backOut((crewIn - 0.25 - i * 0.12) / 0.55)}
		<LivePose id={id as never} x={cx - (560 + i * 250) * k - (1 - e) * 900 * k} y={cs.height + 20 * k} height={poseH * (1 - i * 0.12)} action="cheer" nonce={tier?.impact ?? 0} seed={i} />
	{/each}
	{#each look.crew[1] as id, i (id)}
		{@const e = backOut((crewIn - 0.3 - i * 0.12) / 0.55)}
		<LivePose id={id as never} x={cx + (560 + i * 250) * k + (1 - e) * 900 * k} y={cs.height + 20 * k} height={poseH * (1 - i * 0.12)} action="cheer" nonce={tier?.impact ?? 0} seed={i + 2} flip />
	{/each}

	<!-- stage title -->
	<Container x={cx} y={cy - 210 * k} scale={titleScale * k} alpha={titleAlpha}>
		<Text
			anchor={0.5}
			text={look.title}
			style={{
				fontFamily: 'Luckiest Guy, sans-serif',
				fontSize: 170,
				fill: look.fill,
				stroke: { color: 0x2a1200, width: 22 },
				dropShadow: { color: look.shadow, distance: 12, angle: Math.PI / 2, blur: 0, alpha: 1 },
				letterSpacing: 6,
			}}
		/>
	</Container>
</Container>

<!-- impact flash -->
{#if flash > 0}
	<Rectangle width={cs.width} height={cs.height} backgroundColor={0xffffff} backgroundAlpha={flash} />
{/if}
