<!-- Override of components-ui-pixi LabelBalance.svelte: same value logic, delivered UI-BALANCE art. -->
<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import GGLabel from './GGLabel.svelte';
	import { i18nDerived } from 'components-ui-pixi/src/i18n/i18nDerived';

	type Props = {
		stacked?: boolean;
		width?: number;
	};

	const props: Props = $props();
	const balanceTween = new Tween(stateBet.balanceAmount);
	const value = $derived(numberToCurrencyString(balanceTween.current));

	$effect(() => {
		balanceTween.set(stateBet.balanceAmount);
	});
</script>

<GGLabel kind="BALANCE" {value} width={props.width} />
