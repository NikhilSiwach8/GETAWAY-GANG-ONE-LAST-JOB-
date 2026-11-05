<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	/** TEMPORARY ART reel frame (UI-REEL-FRAME). Glows gold during bonuses. */
	import { Rectangle } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { PALETTE } from '../game/tempArt';

	const context = getContext();
	let glow = $state(false);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const pad = 18;

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glow = true),
		boardFrameGlowHide: () => (glow = false),
	});
</script>

<Rectangle
	anchor={0.5}
	x={layout.x}
	y={layout.y}
	width={layout.width + pad * 2}
	height={layout.height + pad * 2}
	borderRadius={24}
	backgroundColor={PALETTE.charcoal}
	backgroundAlpha={0.92}
	borderColor={glow ? PALETTE.gold : PALETTE.metal}
	borderWidth={glow ? 10 : 6}
	zIndex={-1}
/>
