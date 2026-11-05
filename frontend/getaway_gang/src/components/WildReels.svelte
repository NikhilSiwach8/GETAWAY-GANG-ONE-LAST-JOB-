<script lang="ts">
	/** SYM-WILD-REEL over any reel whose four visible cells are all Wilds (e.g. locked re-spin Wilds). */
	import { Sprite } from 'pixi-svelte';
	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const fullReels = $derived(
		context.stateGame.board
			.map((reel, i) => ({ i, syms: reel.reelState.symbols.slice(1, 5) }))
			.filter(({ syms }) => syms.length === 4 && syms.every((s) => s.rawSymbol.name === 'W' && s.symbolState !== 'spin'))
			.map(({ i }) => i),
	);
</script>

<BoardContainer>
	{#each fullReels as i (i)}
		<Sprite key="SYM-WILD-REEL" anchor={0.5} x={getSymbolX(i)} y={SYMBOL_SIZE * 2} width={SYMBOL_SIZE} height={SYMBOL_SIZE * 4} zIndex={5} />
	{/each}
</BoardContainer>
