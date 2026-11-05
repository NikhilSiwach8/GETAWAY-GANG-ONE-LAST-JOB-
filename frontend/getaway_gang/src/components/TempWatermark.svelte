<script lang="ts">
	/** Always-on marker so no one mistakes this build for a release candidate. */
	import { Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { TEMP_ART_BANNER } from '../game/tempArt';

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
</script>

<Text
	anchor={{ x: 0.5, y: 0 }}
	x={sizes.width / 2}
	y={6}
	text={TEMP_ART_BANNER}
	style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: '700', fill: 0xff3b3b }}
	alpha={0.85}
/>
