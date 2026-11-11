<script lang="ts" module>
	import type { CrewKey } from '../game/tempArt';

	export type EmitterEventFeatureBanner = {
		type: 'featureBanner';
		title: string;
		subtitle?: string;
		color: number;
		assetId?: string;
		ms?: number;
		crew?: CrewKey[];
		level?: number;
	};
</script>

<script lang="ts">
	/**
	 * Feature card on the delivered blueprint scroll (UI-INFO-HEADER art): title in the scroll's window with
	 * the crew colour as its outline, the reward line under it, crew characters popping in beside it, level
	 * stars (UI-STAR-ON). Names the exact reward after a feature
	 * clip and stands in for the clip when clips cannot play. Awaitable: the book player waits for it.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	import { CREW_INFO } from '../game/tempArt';
	import LivePose from './LivePose.svelte';

	const context = getContext();
	let banner = $state<EmitterEventFeatureBanner | null>(null);
	let t = $state(0); // seconds since shown
	let dur = $state(1.1);
	let raf = 0;
	const layout = $derived(context.stateGameDerived.boardLayout());

	context.eventEmitter.subscribeOnMount({
		featureBanner: async (e) => {
			banner = e;
			dur = ((e.ms ?? 1100) * (stateBet.isTurbo ? 0.5 : 1)) / 1000;
			const t0 = performance.now();
			cancelAnimationFrame(raf);
			const step = (now: number) => {
				t = (now - t0) / 1000;
				if (t < dur) raf = requestAnimationFrame(step);
			};
			raf = requestAnimationFrame(step);
			await new Promise((r) => setTimeout(r, dur * 1000));
			banner = null;
		},
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
	const back = (x: number) => {
		const c = 1.9;
		const p = Math.min(1, Math.max(0, x)) - 1;
		return 1 + (c + 1) * p * p * p + c * p * p;
	};
	// pop in over 0.22 s, out over the last 0.18 s
	const pop = $derived(back(t / 0.22));
	const out = $derived(1 - ease((t - (dur - 0.18)) / 0.18));
	const crew = $derived(banner?.crew ?? []);
	const hasCrew = $derived(crew.length > 0);
	const W = $derived(layout.width * (hasCrew ? 0.74 : 0.86));
	// the scroll keeps its art proportions
	const SH = $derived(W * (416 / 1600));
	const H = $derived(SH + (banner?.subtitle ? 30 : 0));
	const x = $derived(layout.x + (hasCrew ? layout.width * 0.07 : 0));
	const y = $derived(layout.y - layout.height * 0.5 + 78);
	const hex = (c: number) => c;
	const poseH = 300;
	const pulse = $derived(1 + Math.sin(t * 9) * 0.015 * (t > 0.22 ? 1 : 0));
</script>

{#if banner}
	<Container {x} {y} zIndex={20} alpha={out}>
		<!-- characters: slide up from behind the plate's left edge, staggered -->
		{#each crew as k, i (k)}
			{@const enter = ease((t - 0.06 * i) / 0.28)}
			<Container x={-W / 2 + 20 - i * 58} y={H / 2 - (1 - enter) * 60} alpha={enter}>
				<LivePose id={CREW_INFO[k].assetId.replace('CHR-', '') as never} x={0} y={0} height={poseH} action="ability" seed={i} shine={false} />
			</Container>
		{/each}

		<Container scale={pop * pulse}>
			<!-- the blueprint scroll (UI-INFO-HEADER art); the title sits in its window -->
			<Sprite key="UI-BANNER" anchor={0.5} width={W} height={SH} />
			<Text
				anchor={0.5}
				y={SH * 0.1}
				text={banner.title}
				style={{
					fontFamily: 'Luckiest Guy, sans-serif',
					fontSize: Math.min(SH * 0.34, (W * 0.66) / Math.max(6, banner.title.length * 0.6)),
					fill: 0xffffff,
					stroke: { color: hex(banner.color), width: 7 },
					dropShadow: { color: 0x0b0618, alpha: 0.85, distance: 4, angle: Math.PI / 2, blur: 2 },
					letterSpacing: 1,
				}}
			/>
			{#if banner.subtitle}
				<Text
					anchor={{ x: 0.5, y: 0 }}
					y={SH * 0.5 + 2}
					text={banner.subtitle}
					style={{
						fontFamily: 'Luckiest Guy, sans-serif',
						fontSize: Math.min(22, (W * 0.9) / Math.max(10, banner.subtitle.length * 0.55)),
						fill: 0xffe9a8,
						stroke: { color: 0x120a24, width: 5 },
						dropShadow: { color: 0x000000, alpha: 0.7, distance: 3, angle: Math.PI / 2, blur: 2 },
					}}
				/>
			{/if}
			{#if banner.level}
				<!-- level stars beside the scroll's wheel -->
				{#each [1, 2, 3] as s (s)}
					{@const on = s <= (banner.level ?? 0)}
					{@const grow = on ? 1 + Math.max(0, 0.45 - (t - 0.15 - s * 0.08) * 2.2) : 1}
					<Sprite
						key="UI-STAR-ON"
						anchor={0.5}
						x={W * 0.17 + s * 30}
						y={-SH * 0.3}
						width={28 * grow}
						height={28 * grow}
						tint={on ? 0xffffff : 0x3a4266}
						alpha={on ? 1 : 0.85}
					/>
				{/each}
			{/if}
		</Container>
	</Container>
{/if}
