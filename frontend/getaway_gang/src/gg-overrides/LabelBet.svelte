<!-- Override of components-ui-pixi LabelBet.svelte: same value logic, delivered UI-BET art. -->
<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { Rectangle } from 'pixi.js';
	import { stateBetDerived, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import GGLabel from './GGLabel.svelte';
	import { getContext } from 'components-ui-pixi/src/context';
	import { i18nDerived } from 'components-ui-pixi/src/i18n/i18nDerived';

	type Props = {
		stacked?: boolean;
		width?: number;
		plain?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const value = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const disabled = $derived(!context.stateXstateDerived.isIdle());

	const onpress = () => {
		if (disabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'betAmountMenu' };
	};
</script>

<!-- the value window opens the bet menu; the -/+ ends of the plate are separate buttons placed by the layout -->
<Container
	eventMode="static"
	cursor={disabled ? 'not-allowed' : 'pointer'}
	onpointerup={onpress}
	hitArea={new Rectangle(-(props.width ?? 400) * 0.23, -(props.width ?? 400) * 0.1, (props.width ?? 400) * 0.46, (props.width ?? 400) * 0.25)}
>
	<GGLabel kind="BET" {value} width={props.width} plain={props.plain} />
</Container>
