<script lang="ts">
	/** The shared Stake modals, with GETAWAY GANG's own Buy Bonus, Paytable and Game Rules. */
	import type { Snippet } from 'svelte';
	import ModalError from 'components-ui-html/src/components/ModalError.svelte';
	import ModalBetMenu from 'components-ui-html/src/components/ModalBetMenu.svelte';
	import ModalAutoSpin from 'components-ui-html/src/components/ModalAutoSpin.svelte';
	import ModalAutoSpinMessage from 'components-ui-html/src/components/ModalAutoSpinMessage.svelte';
	import ModalSettings from 'components-ui-html/src/components/ModalSettings.svelte';
	import ModalGGBuyBonus from './ModalGGBuyBonus.svelte';
	import ModalGGPayTable from './ModalGGPayTable.svelte';
	import ModalGGRules from './ModalGGRules.svelte';

	const props: { version: Snippet } = $props();
</script>

<ModalError />
<ModalBetMenu />
<ModalGGBuyBonus />
<ModalAutoSpin />
<ModalAutoSpinMessage />
<ModalGGPayTable>
	{@render props.version()}
</ModalGGPayTable>
<ModalGGRules>
	{@render props.version()}
</ModalGGRules>
<ModalSettings />

<style lang="scss">
	:global(html) {
		font-size: 16px;
		@media screen and (max-width: 500px) {
			font-size: 50%;
		}
	}
</style>
