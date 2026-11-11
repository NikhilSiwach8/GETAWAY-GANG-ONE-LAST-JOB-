<script lang="ts">
	import type { Snippet } from 'svelte';

	import { onDestroy } from 'svelte';
	import { Container } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { boardFx } from '../game/stateGame.svelte';

	import { getContext } from '../game/context';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
	// impact jolt when a reel stops (boardFx.jolt): a short damped vertical bounce of the whole board
	let jy = $state(0);
	let raf = 0;
	$effect(() => {
		const at = boardFx.jolt;
		if (!at) return;
		cancelAnimationFrame(raf);
		const amp = stateBet.isTurbo ? 2 : 4.5;
		const step = (now: number) => {
			const t = now - at;
			jy = amp * Math.exp(-t / 70) * Math.sin(t / 22);
			if (t < 260) raf = requestAnimationFrame(step);
			else jy = 0;
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
	onDestroy(() => cancelAnimationFrame(raf));
</script>

<Container
	x={context.stateGameDerived.boardLayout().x}
	y={context.stateGameDerived.boardLayout().y + jy}
	pivot={context.stateGameDerived.boardLayout().pivot}
>
	{@render props.children()}
</Container>
