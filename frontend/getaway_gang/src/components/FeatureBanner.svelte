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
	 * TEMPORARY ART feature title card. Stands in for every character / combo / bonus cinematic
	 * (assetId points at the real animation in docs/ASSET_PROMPTS.md). Awaitable: the book player
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
			style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '900', fontSize: 34, fill: banner.color }}
		/>
		{#if banner.subtitle}
			<Text
				anchor={0.5}
				y={24}
				text={banner.subtitle}
				style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '600', fontSize: 18, fill: 0xffffff }}
			/>
		{/if}
		{#if banner.assetId}
			<Text
				anchor={{ x: 1, y: 1 }}
				x={layout.width * 0.43 - 10}
				y={(banner.subtitle ? 52 : 38) - 6}
				text={`TEMP · ${banner.assetId}`}
				style={{ fontFamily: 'monospace', fontSize: 10, fill: 0xffffff }}
				alpha={0.55}
			/>
		{/if}
	</Container>
{/if}
