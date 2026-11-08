<script lang="ts">
	import { Container } from 'pixi-svelte';
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX } from '../game/utils';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();

	// ability transformations (setCell / swapReels) mark the new rawSymbol with `morph`: the symbol shrinks
	// away and pops back in as the new one (ease-out-back) instead of switching in a single frame
	const MORPH_MS = 340;
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
	<Container {scale} {alpha}>
	<Symbol
		state={props.reelSymbol.symbolState}
		rawSymbol={props.reelSymbol.rawSymbol}
		oncomplete={() => {
			if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
			if (props.reelSymbol.symbolState === 'land') props.reelSymbol.symbolState = 'static';
		}}
	/>
	</Container>
</SymbolWrap>
