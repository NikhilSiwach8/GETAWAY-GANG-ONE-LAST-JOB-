<script lang="ts">
	/** TEMPORARY ART background: flat colour bands + scene label (BG-MAIN / BG-HEIST / BG-ESCAPE). */
	import { Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { BACKGROUND_ART } from '../game/tempArt';

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const scene = $derived(BACKGROUND_ART[context.stateGame.hud.bonus ?? 'basegame']);
</script>

<Rectangle {...sizes} backgroundColor={scene.top} zIndex={-3} />
<Rectangle
	width={sizes.width}
	height={sizes.height * 0.45}
	y={sizes.height * 0.55}
	backgroundColor={scene.bottom}
	zIndex={-2}
/>
<Text
	zIndex={-1}
	x={16}
	y={sizes.height - 30}
	text={`TEMP BACKGROUND · ${scene.assetId} · ${scene.label}`}
	style={{ fontFamily: 'monospace', fontSize: 14, fill: 0xffffff }}
	alpha={0.5}
/>
