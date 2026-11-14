<script lang="ts">
	/** SYM-FX-* transformation effects on board cells (clone, upgrade, vault reveal, Wild stamp, crew exit). */
	import CellFxSprite from './CellFxSprite.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import { cellFx } from '../game/clips.svelte';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	// effect frames are cells with the symbol area at 460/512 of the frame
	const size = (SYMBOL_SIZE * 512) / 460;
</script>

<BoardContainer>
	{#each cellFx.list as fx (fx.key)}
		{#each fx.cells as cell}
			<CellFxSprite id={fx.id} start={fx.start} rate={fx.rate} x={getSymbolX(cell.reel)} y={(cell.row - 0.5) * SYMBOL_SIZE} {size} />
		{/each}
	{/each}
</BoardContainer>
