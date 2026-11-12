<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { boardFx } from '../game/stateGame.svelte';
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { cellKey, symbolFx } from '../game/symbols/symbolFx.svelte';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();

	// ability transformations (setCell / swapReels) mark the new rawSymbol with `morph`: the symbol shrinks
	// away and pops back in as the new one (ease-out-back) instead of switching in a single frame
	const MORPH_MS = 340;
	// speed stretch: symbols falling fast stretch along the fall and lose a little opacity (motion blur feel)
	let lastY = props.reelSymbol.symbolY.current;
	let lastT = performance.now();
	let blur = $state(0);
	$effect(() => {
		const y = props.reelSymbol.symbolY.current;
		const now = performance.now();
		const dt = Math.max(8, now - lastT);
		const v = Math.abs(y - lastY) / dt; // px per ms
		lastY = y;
		lastT = now;
		blur = Math.min(1, v / 2.2);
	});
	$effect(() => {
		// decays back to sharp once the symbol stops moving
		if (blur <= 0) return;
		const id = setTimeout(() => (blur = Math.max(0, blur - 0.35)), 32);
		return () => clearTimeout(id);
	});
	// board cell this symbol currently occupies (rows 1..4 as in book positions; matches CellHighlights)
	const cell = $derived(cellKey(props.reelIndex, Math.round(props.reelSymbol.symbolY.current / SYMBOL_SIZE + 0.5)));
	// visual state inputs for the shared renderer (dimming, highlight, idle glint are drawn by SymbolView)
	const dimmed = $derived(boardFx.dim && props.reelSymbol.symbolState !== 'win');
	const highlight = $derived(symbolFx.highlighted[cell]);
	const glintAt = $derived(symbolFx.glint.cell === cell && props.reelSymbol.symbolState === 'static' ? symbolFx.glint.at : 0);
	let scale = $state(1);
	let alpha = $state(1);
	let raf = 0;
	$effect(() => {
		const at = props.reelSymbol.rawSymbol.morph;
		if (!at) {
			scale = 1;
			alpha = 1;
			return;
		}
		cancelAnimationFrame(raf);
		const step = (now: number) => {
			const t = Math.min(1, Math.max(0, (now - at) / MORPH_MS));
			const c = 1.9;
			const back = 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
			scale = 0.35 + 0.65 * back;
			alpha = now < at ? 0 : Math.min(1, t * 2.5);
			if (t < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY.current}
	animating={props.reelSymbol.symbolState === 'land' || props.reelSymbol.symbolState === 'win'}
>
	<Container scale={{ x: scale * (1 - blur * 0.06), y: scale * (1 + blur * 0.22) }} alpha={alpha * (1 - blur * 0.18)}>
	<Symbol
		state={props.reelSymbol.symbolState}
		rawSymbol={props.reelSymbol.rawSymbol}
		{dimmed}
		{highlight}
		{glintAt}
		oncomplete={() => {
			if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
			if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
		}}
	/>
	</Container>
</SymbolWrap>
