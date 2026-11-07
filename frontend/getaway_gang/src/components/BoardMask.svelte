<script lang="ts">
	/**
	 * Clips board symbols to the 6×4 grid window. `pad` (fraction of a symbol) lets the animation layer's
	 * win/land effects glow slightly past the cells, under the reel-frame bezel, without symbols ever
	 * showing outside the grid.
	 */
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = { debug?: boolean; pad?: number };

	const props: Props = $props();
	const context = getContext();
	const p = $derived((props.pad ?? 0) * SYMBOL_SIZE);
</script>

{#if props.debug}
	<Rectangle
		alpha={0.5}
		backgroundColor={0xffffff}
		width={context.stateGameDerived.boardLayout().width}
		height={context.stateGameDerived.boardLayout().height}
	/>
{/if}

<Rectangle
	isMask
	x={-p}
	y={-p}
	width={context.stateGameDerived.boardLayout().width + p * 2}
	height={context.stateGameDerived.boardLayout().height + p * 2}
/>
