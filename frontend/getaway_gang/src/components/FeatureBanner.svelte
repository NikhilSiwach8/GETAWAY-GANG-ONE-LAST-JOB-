<script lang="ts" module>
	export type EmitterEventFeatureBanner = {
		type: 'featureBanner';
		title: string;
		subtitle?: string;
		color: number;
		assetId?: string;
		ms?: number;
	};
</script>

<script lang="ts">
	/**
	 * Feature explanation card: names the exact reward after a feature clip (meter stage, loot milestone,
	 * re-spin reason...) and stands in for the clip when clips cannot play. Awaitable: the book player
	 * waits until the card has been shown, so the player always sees *why* something happens.
	 */
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';

	const context = getContext();
	let banner = $state<EmitterEventFeatureBanner | null>(null);
	const layout = $derived(context.stateGameDerived.boardLayout());

	context.eventEmitter.subscribeOnMount({
		featureBanner: async (e) => {
			banner = e;
			const ms = (e.ms ?? 1100) * (stateBet.isTurbo ? 0.4 : 1);
			await new Promise((r) => setTimeout(r, ms));
			banner = null;
		},
	});
</script>

{#if banner}
	<Container x={layout.x} y={layout.y - layout.height * 0.5 + 60} zIndex={20}>
		<Rectangle
			anchor={0.5}
			width={layout.width * 0.86}
			height={banner.subtitle ? 104 : 76}
			borderRadius={18}
			backgroundColor={0x0b0f1c}
			backgroundAlpha={0.92}
			borderColor={banner.color}
			borderWidth={6}
		/>
		<Text
			anchor={0.5}
			y={banner.subtitle ? -16 : 0}
			text={banner.title}
			style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: 36, fill: banner.color, stroke: { color: 0x0b0f1c, width: 6 }, letterSpacing: 1 }}
		/>
		{#if banner.subtitle}
			<Text
				anchor={0.5}
				y={24}
				text={banner.subtitle}
				style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '600', fontSize: 18, fill: 0xffffff }}
			/>
		{/if}
	</Container>
{/if}
