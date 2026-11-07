<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		debug?: boolean;
		x: number;
		y: number;
		animating: boolean;
		children: Snippet;
	};

	const props: Props = $props();
	const boardContext = getContextBoard();
	const show = $derived(
		(boardContext.animate && props.animating) || (!boardContext.animate && !props.animating),
	);
	// only symbols that overlap the visible rows are drawn (centre within half a symbol of the window)
	const top = -SYMBOL_SIZE * 0.5;
	const bottom = SYMBOL_SIZE * BOARD_DIMENSIONS.y + SYMBOL_SIZE * 0.5;
	const inFrame = $derived(props.y > top && props.y < bottom);
</script>

{#if props.debug || (show && inFrame)}
	<Container x={props.x} y={props.y}>
		{@render props.children()}
	</Container>
{/if}
