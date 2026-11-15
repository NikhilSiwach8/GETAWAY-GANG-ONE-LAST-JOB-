<!--
  Balance / Win / Bet value: a small painted gold label over the amount, centred on (0, 0), `width` wide.
  The amount is painted silver (gold for WIN); currencies outside the painted set fall back to the plain face.
  (The bet −/+ buttons are placed beside it by the layout.)
-->
<script lang="ts">
	import { Container } from 'pixi-svelte';
	import Title from '../components/Title.svelte';

	type Props = { kind: 'BALANCE' | 'WIN' | 'BET'; value: string; width?: number; plain?: boolean };
	const props: Props = $props();
	const W = $derived(props.width ?? 300);
</script>

<Container>
	<Title y={-W * 0.085} text={props.kind} size={W * 0.095} letterSpacing={3} />
	<Title y={W * 0.06} text={props.value} size={W * 0.19} maxWidth={W * 0.95} silver={props.kind !== 'WIN'} />
</Container>
