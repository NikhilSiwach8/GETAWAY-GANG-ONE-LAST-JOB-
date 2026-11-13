<!-- Override of components-ui-pixi LabelWin.svelte: same value logic, delivered UI-WIN art. -->
<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { stateBet } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import GGLabel from './GGLabel.svelte';
	import { i18nDerived } from 'components-ui-pixi/src/i18n/i18nDerived';

	type Props = {
		stacked?: boolean;
		width?: number;
		plain?: boolean;
	};

	const props: Props = $props();
	const winBookEventAmountTween = new Tween(stateBet.winBookEventAmount);
	const value = $derived(bookEventAmountToCurrencyString(winBookEventAmountTween.current));

	$effect(() => {
		winBookEventAmountTween.set(stateBet.winBookEventAmount);
	});
</script>

<GGLabel kind="WIN" {value} width={props.width} plain={props.plain} />
