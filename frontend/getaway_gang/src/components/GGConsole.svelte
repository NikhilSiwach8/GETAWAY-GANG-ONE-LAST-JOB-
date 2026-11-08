<!--
  The bet console rail at any width: end caps, stretched steel rail, centre plate and evenly spaced rivets,
  all cut from the reel frame's bottom edge (art/process_assets.py: console_parts). 1 layout px = 1 px of
  the 1536-wide frame art, so the rail is always 134 px tall and matches the frame's proportions.
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';

	type Props = { x: number; y: number; width: number };
	const props: Props = $props();
	const H = 134;
	const CAP = 215;
	const PLATE = 272;
	const RIVET = 44;
	const left = $derived(props.x - props.width / 2);
	const rivets = $derived.by(() => {
		const out: number[] = [];
		for (let x = 300; x < props.width - 300; x += 230) if (Math.abs(x - props.width / 2) >= 230) out.push(x);
		return out;
	});
</script>

<Container x={left} y={props.y - H / 2}>
	<Sprite key="UI-CONSOLE-RAIL" x={CAP - 15} width={props.width - 2 * CAP + 30} height={H} />
	<Sprite key="UI-CONSOLE-PLATE" x={props.width / 2 - PLATE / 2} width={PLATE} height={H} />
	{#each rivets as rx (rx)}
		<Sprite key="UI-CONSOLE-RIVET" anchor={0.5} x={rx} y={73} width={RIVET} height={RIVET} />
	{/each}
	<Sprite key="UI-CONSOLE-CAP-L" width={CAP} height={H} />
	<Sprite key="UI-CONSOLE-CAP-R" x={props.width - CAP} width={CAP} height={H} />
</Container>
