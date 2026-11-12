<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';
	import { boardFx } from '../game/stateGame.svelte';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { stateBet } from 'state-shared';
	import { BOARD_DIMENSIONS } from '../game/constants';
	import { highlightCells, startIdleGlints, stopIdleGlints, symbolFx } from '../game/symbols/symbolFx.svelte';
	import { SYMBOL_LOOKS } from '../game/symbols/catalog';
	import { winFx, winHooks } from '../game/wins/winDirector.svelte';
	import { getContextApp } from 'pixi-svelte';

	const context = getContext();

	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		// highlighted symbol state follows the same cell highlights the features already broadcast
		cellHighlight: ({ positions, color, ms }) => highlightCells(positions, color, (ms ?? 700) * (stateBet.isTurbo ? 0.4 : 1)),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			const getPromises = () =>
				symbolPositions.map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
					reelSymbol.symbolState = 'win';
					await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
					reelSymbol.symbolState = 'postWinStatic';
				});

			// inside a win presentation the win director owns the dimming (no flicker between wins)
			const owned = winFx.phase !== 'idle';
			if (!owned) boardFx.dim = true;
			await Promise.all(getPromises());
			if (!owned) boardFx.dim = false;
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
	onMount(() => startIdleGlints(BOARD_DIMENSIONS.x, BOARD_DIMENSIONS.y));
	winHooks.jolt = () => (boardFx.jolt = performance.now());
	// dev builds only: lets frontend/tests/symbol_check.cjs drive symbol states and check asset references
	if (import.meta.env.DEV) {
		const app = getContextApp();
		(window as unknown as { __sym: unknown }).__sym = {
			stateGame: context.stateGame,
			boardFx,
			symbolFx,
			highlightCells,
			stopIdleGlints,
			looks: SYMBOL_LOOKS,
			hasTexture: (key: string) => !!app.stateApp.loadedAssets?.[key],
		};
	}
	onDestroy(stopIdleGlints);
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
