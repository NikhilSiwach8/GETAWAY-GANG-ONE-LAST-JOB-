<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	/** UI-REEL-BG behind the 6x4 board and UI-REEL-FRAME around it (window measured in layout.json). */
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { frameRect } from '../game/frameLayout';

	const context = getContext();
	let glow = $state(false);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const win = GG_LAYOUT['UI-REEL-FRAME'].window;

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glow = true),
		boardFrameGlowHide: () => (glow = false),
	});
</script>

<!-- navy fill for the part of the frame window wider than the board -->
<Rectangle
	anchor={0.5}
	x={layout.x}
	y={layout.y}
	width={frame.width * win.w}
	height={frame.height * win.h}
	backgroundColor={0x0a1633}
	zIndex={-1}
/>
<Sprite key="UI-REEL-BG" anchor={0.5} x={layout.x} y={layout.y} width={layout.width} height={layout.height} zIndex={-1} />
<Sprite key="UI-REEL-FRAME" anchor={0.5} x={layout.x} y={layout.y} width={frame.width} height={frame.height} zIndex={-1} />
{#if glow}
	<Rectangle
		anchor={0.5}
		x={layout.x}
		y={layout.y}
		width={frame.width * win.w + 10}
		height={frame.height * win.h + 10}
		borderRadius={22}
		backgroundAlpha={0}
		borderColor={0xf7c947}
		borderWidth={6}
		zIndex={-1}
	/>
{/if}
