<script lang="ts">
	/** SYM-FX-* transformation effects on board cells (clone, upgrade, vault reveal, Wild stamp, crew exit). */
	import ClipSprite from './ClipSprite.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import { cellFx } from '../game/clips.svelte';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	// clips are 512px cells with the symbol area at 460px
	const size = (SYMBOL_SIZE * 512) / 460;
</script>

<BoardContainer>
	{#each cellFx.list as fx (fx.key)}
		{#each fx.cells as cell}
			<ClipSprite id={fx.id} channel="cell" autoplay={false} x={getSymbolX(cell.reel)} y={(cell.row - 0.5) * SYMBOL_SIZE} width={size} height={size} zIndex={9} />
		{/each}
	{/each}
</BoardContainer>
