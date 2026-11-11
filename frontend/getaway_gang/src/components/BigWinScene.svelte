<script lang="ts">
	/**
	 * Live big-win celebration (replaces the WIN-* videos): two counter-rotating layers of gold light rays,
	 * the tier title slamming in with an elastic pop and breathing glow, and crew members sliding in from
	 * both sides with a bounce (more crew for higher tiers). Canvas coordinates; the amount is drawn by Win.svelte.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import LivePose from './LivePose.svelte';
	import { getContext } from '../game/context';

	type Props = { alias: string };
	const props: Props = $props();
	const context = getContext();

	const TITLES: Record<string, { text: string; fill: number; shadow: number }> = {
		big: { text: 'BIG WIN', fill: 0xffe27a, shadow: 0xff4c36 },
		superwin: { text: 'SUPER WIN', fill: 0xbfeaff, shadow: 0x28b9ef },
		mega: { text: 'MEGA WIN', fill: 0xf3d2ff, shadow: 0xa34bff },
		epic: { text: 'EPIC WIN', fill: 0xffd59a, shadow: 0xffa12b },
		max: { text: 'MAXIMUM WIN', fill: 0xffffff, shadow: 0xff4c36 },
	};
	// [left, right] crew per tier (CHR-*-POSE art)
	const CREW: Record<string, string[][]> = {
		big: [['ROXY'], ['TANK']],
		superwin: [['BYTE'], ['FUSE']],
		mega: [['ROXY', 'BYTE'], ['TANK', 'FUSE']],
		epic: [['ROXY', 'BYTE'], ['TANK', 'FUSE']],
		max: [['ROXY', 'BYTE'], ['TANK', 'FUSE']],
	};
	const title = $derived(TITLES[props.alias] ?? TITLES.big);
	const crew = $derived(CREW[props.alias] ?? CREW.big);

	let t = $state(0);
	let raf = 0;
	const t0 = performance.now();
	const tick = (now: number) => {
		t = (now - t0) / 1000;
		raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(raf));

	const cs = $derived(context.stateLayoutDerived.canvasSizes());
	const k = $derived(Math.min(cs.width / 1920, cs.height / 1080));
	const cx = $derived(cs.width / 2);
	const cy = $derived(cs.height / 2);
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
	const elastic = (x: number) => {
		const p = clamp01(x);
		return p === 0 || p === 1 ? p : Math.pow(2, -9 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
	};
	const backOut = (x: number, c = 1.8) => {
		const p = clamp01(x) - 1;
		return 1 + (c + 1) * p * p * p + c * p * p;
	};
	// title: slams in from 2.4x, elastic settle, then breathes; a short screen shake as it lands
	const titleScale = $derived((t < 0.12 ? 2.4 - 1.4 * (t / 0.12) : elastic((t - 0.12) / 0.9)) * (1 + 0.035 * Math.sin(t * 4)));
	const shake = $derived(t > 0.1 && t < 0.45 ? Math.sin(t * 90) * 14 * k * (1 - (t - 0.1) / 0.35) : 0);
	const raysIn = $derived(clamp01(t / 0.5));
	const poseH = $derived(620 * k);
</script>

<Container x={shake} y={shake * 0.4}>
	<!-- light rays -->
	<Sprite key="UI-RAYS" anchor={0.5} x={cx} y={cy - 60 * k} width={2200 * k * raysIn} height={2200 * k * raysIn} rotation={t * 0.18} tint={title.shadow} alpha={0.55 * raysIn} blendMode="add" />
	<Sprite key="UI-RAYS" anchor={0.5} x={cx} y={cy - 60 * k} width={1600 * k * raysIn} height={1600 * k * raysIn} rotation={-t * 0.27} tint={0xffe27a} alpha={0.6 * raysIn} blendMode="add" />
	<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={cx} y={cy - 60 * k} width={1100 * k} height={900 * k} tint={0xfff1c0} alpha={0.45 * raysIn * (0.85 + 0.15 * Math.sin(t * 3))} blendMode="add" />

	<!-- crew slide in from both sides, staggered, then bob -->
	{#each crew[0] as id, i (id)}
		{@const e = backOut((t - 0.25 - i * 0.12) / 0.55)}
		<LivePose id={id as never} x={cx - (560 + i * 250) * k - (1 - e) * 900 * k} y={cs.height + 20 * k} height={poseH * (1 - i * 0.12)} action="cheer" nonce={Math.floor(t / 1.8)} seed={i} />
	{/each}
	{#each crew[1] as id, i (id)}
		{@const e = backOut((t - 0.3 - i * 0.12) / 0.55)}
		<LivePose id={id as never} x={cx + (560 + i * 250) * k + (1 - e) * 900 * k} y={cs.height + 20 * k} height={poseH * (1 - i * 0.12)} action="cheer" nonce={Math.floor((t + 0.9) / 1.8)} seed={i + 2} flip />
	{/each}

	<!-- title -->
	<Container x={cx} y={cy - 210 * k} scale={titleScale * k}>
		<Text
			anchor={0.5}
			text={title.text}
			style={{
				fontFamily: 'Luckiest Guy, sans-serif',
				fontSize: 170,
				fill: title.fill,
				stroke: { color: 0x2a1200, width: 22 },
				dropShadow: { color: title.shadow, distance: 12, angle: Math.PI / 2, blur: 0, alpha: 1 },
				letterSpacing: 6,
			}}
		/>
	</Container>
</Container>
