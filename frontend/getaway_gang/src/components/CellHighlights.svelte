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
	import { presentTurbo } from '../game/turbo';
	/** Glowing frames (UI-CELL-GLOW, tinted in the crew's colour) on the cells a feature touched. */
	import { Sprite } from 'pixi-svelte';
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
			await new Promise((r) => setTimeout(r, (e.ms ?? 700) * (presentTurbo() ? 0.4 : 1)));
			active = active.filter((a) => a.id !== id);
		},
	});
</script>

<BoardContainer>
	{#each active as group (group.id)}
		{#each group.positions as p}
			<Sprite
				key="UI-CELL-GLOW"
				anchor={0.5}
				x={getSymbolX(p.reel)}
				y={(p.row - 0.5) * SYMBOL_SIZE}
				width={SYMBOL_SIZE * 1.16}
				height={SYMBOL_SIZE * 1.16}
				tint={group.color}
				blendMode="add"
				zIndex={10}
			/>
		{/each}
	{/each}
</BoardContainer>
