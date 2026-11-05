<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventCellHighlight = {
		type: 'cellHighlight';
		positions: Position[];
		color: number;
		ms?: number;
	};
</script>

<script lang="ts">
	/** TEMPORARY FX: coloured cell outlines marking what a feature touched (FX-* in ASSET_PROMPTS.md). */
	import { Rectangle } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	let active = $state<{ id: number; positions: Position[]; color: number }[]>([]);
	let nextId = 0;

	context.eventEmitter.subscribeOnMount({
		cellHighlight: async (e) => {
			// Remove by id: $state wraps stored objects in proxies, so identity comparison never matches.
			const id = nextId++;
			active = [...active, { id, positions: e.positions, color: e.color }];
			await new Promise((r) => setTimeout(r, (e.ms ?? 700) * (stateBet.isTurbo ? 0.4 : 1)));
			active = active.filter((a) => a.id !== id);
		},
	});
</script>

<BoardContainer>
	{#each active as group (group.id)}
		{#each group.positions as p}
			<Rectangle
				anchor={0.5}
				x={getSymbolX(p.reel)}
				y={(p.row - 0.5) * SYMBOL_SIZE}
				width={SYMBOL_SIZE * 0.98}
				height={SYMBOL_SIZE * 0.98}
				borderRadius={18}
				backgroundColor={group.color}
				backgroundAlpha={0.18}
				borderColor={group.color}
				borderWidth={6}
				zIndex={10}
			/>
		{/each}
	{/each}
</BoardContainer>
