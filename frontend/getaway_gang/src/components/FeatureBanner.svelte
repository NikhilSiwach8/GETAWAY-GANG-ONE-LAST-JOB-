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
	 * Feature card in the slot's style: gold-bevelled navy plate, crew-coloured ribbon, title in the game's
	 * comic font, crew characters popping in beside it, level stars. Names the exact reward after a feature
	 * clip and stands in for the clip when clips cannot play. Awaitable: the book player waits for it.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	import { CREW_INFO } from '../game/tempArt';
	import { GG_LAYOUT } from '../game/ggAssets';

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
	const H = $derived(banner?.subtitle ? 118 : 88);
	const x = $derived(layout.x + (hasCrew ? layout.width * 0.07 : 0));
	const y = $derived(layout.y - layout.height * 0.5 + 78);
	const hex = (c: number) => c;
	const poseH = 300;
	const poseW = (k: CrewKey) => (poseH * GG_LAYOUT[CREW_INFO[k].assetId + '-POSE' as keyof typeof GG_LAYOUT].width) / GG_LAYOUT[CREW_INFO[k].assetId + '-POSE' as keyof typeof GG_LAYOUT].height;
	const pulse = $derived(1 + Math.sin(t * 9) * 0.015 * (t > 0.22 ? 1 : 0));
</script>

{#if banner}
	<Container {x} {y} zIndex={20} alpha={out}>
		<!-- characters: slide up from behind the plate's left edge, staggered -->
		{#each crew as k, i (k)}
			{@const enter = ease((t - 0.06 * i) / 0.28)}
			<Container x={-W / 2 + 20 - i * 58} y={H / 2 - (1 - enter) * 60} alpha={enter}>
				<Sprite key={`${CREW_INFO[k].assetId}-POSE`} anchor={{ x: 0.5, y: 1 }} width={poseW(k)} height={poseH} />
			</Container>
		{/each}

		<Container scale={pop * pulse}>
			<!-- gold bevel -->
			<Rectangle anchor={0.5} width={W + 14} height={H + 14} borderRadius={22} backgroundColor={0x7a4a00} />
			<Rectangle anchor={0.5} width={W + 8} height={H + 8} borderRadius={19} backgroundColor={0xf7c947} />
			<Rectangle anchor={0.5} y={-(H + 8) / 4} width={W + 8} height={(H + 8) / 2} borderRadius={19} backgroundColor={0xffe27a} backgroundAlpha={0.55} />
			<!-- navy glass -->
			<Rectangle anchor={0.5} width={W} height={H} borderRadius={16} backgroundColor={0x0b1230} />
			<Rectangle anchor={0.5} y={-H / 4} width={W - 6} height={H / 2 - 4} borderRadius={14} backgroundColor={0x1d2a5c} backgroundAlpha={0.6} />
			<!-- crew-coloured ribbon behind the title -->
			<Rectangle anchor={0.5} y={banner.subtitle ? -H * 0.16 : 0} width={W * 0.92} height={54} borderRadius={10} backgroundColor={hex(banner.color)} backgroundAlpha={0.9} />
			<Rectangle anchor={0.5} y={(banner.subtitle ? -H * 0.16 : 0) - 14} width={W * 0.92} height={18} borderRadius={8} backgroundColor={0xffffff} backgroundAlpha={0.18} />
			<Text
				anchor={0.5}
				y={banner.subtitle ? -H * 0.16 : 0}
				text={banner.title}
				style={{
					fontFamily: 'Luckiest Guy, sans-serif',
					fontSize: Math.min(40, (W * 0.88) / Math.max(8, banner.title.length * 0.62)),
					fill: 0xffffff,
					stroke: { color: 0x1a0d00, width: 7 },
					dropShadow: { color: 0x000000, alpha: 0.6, distance: 4, angle: Math.PI / 2, blur: 0 },
					letterSpacing: 1,
				}}
			/>
			{#if banner.subtitle}
				<Text
					anchor={0.5}
					y={H * 0.27}
					text={banner.subtitle}
					style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: 18, fill: 0xffe9a8, stroke: { color: 0x0b1230, width: 3 } }}
				/>
			{/if}
			{#if banner.level}
				<!-- level stars on the right of the plate -->
				{#each [1, 2, 3] as s (s)}
					{@const on = s <= (banner.level ?? 0)}
					<Text
						anchor={0.5}
						x={W / 2 - 92 + s * 24}
						y={-H / 2 + 2}
						text="★"
						style={{ fontSize: 30, fill: on ? 0xffe27a : 0x2b3561, stroke: { color: on ? 0x7a4a00 : 0x111832, width: 4 } }}
						scale={on ? 1 + Math.max(0, 0.4 - (t - 0.15 - s * 0.08) * 2) : 1}
					/>
				{/each}
			{/if}
		</Container>
	</Container>
{/if}
