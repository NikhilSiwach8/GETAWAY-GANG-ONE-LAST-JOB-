<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { boardFx } from '../game/stateGame.svelte';
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
	// non-winning symbols fade darker while a win is shown, and back afterwards
	const dimTarget = $derived(boardFx.dim && props.reelSymbol.symbolState !== 'win' ? 1 : 0);
	const dim = new Tween(0, { duration: 220, easing: cubicOut });
	$effect(() => {
		dim.set(dimTarget);
	});
	const tint = $derived.by(() => {
		const v = Math.round(255 - 125 * dim.current);
		return (v << 16) | (v << 8) | Math.min(255, v + 18);
	});
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
	<Container scale={{ x: scale * (1 - blur * 0.06), y: scale * (1 + blur * 0.22) }} alpha={alpha * (1 - blur * 0.18)} {tint}>
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
