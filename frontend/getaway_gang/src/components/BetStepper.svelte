<script lang="ts">
	/**
	 * − BET + inside the info modals: same bet levels and rules as the main −/+ buttons (idle only), drawn with
	 * the same painted −/+ buttons (UI-BET-MINUS / UI-BET-PLUS) and the amount on the painted navy plate.
	 */
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';
	import { ggUrl } from '../game/ggAssets';

	const context = getContext();
	const options = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const idle = $derived(context.stateXstateDerived.isIdle());
	const step = (dir: 1 | -1) => {
		const next = dir > 0 ? options.find((o) => o > stateBet.betAmount) : [...options].reverse().find((o) => o < stateBet.betAmount);
		if (next === undefined) return;
		stateBetDerived.setBetAmount(next);
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

<div class="stepper">
	<button aria-label="Decrease bet" disabled={!idle || stateBet.betAmount <= options[0]} onclick={() => step(-1)} style="background-image:url({ggUrl('UI-BET-MINUS')})"></button>
	<div class="bet"><span>BET</span><b>{numberToCurrencyString(stateBet.betAmount)}</b></div>
	<button aria-label="Increase bet" disabled={!idle || stateBet.betAmount >= options[options.length - 1]} onclick={() => step(1)} style="background-image:url({ggUrl('UI-BET-PLUS')})"></button>
</div>

<style>
	.stepper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		margin: 0.2rem auto 0.8rem;
	}
	button {
		width: 2.6rem;
		height: 2.6rem;
		border: none;
		background: center / contain no-repeat;
		cursor: pointer;
		filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.55));
		transition: transform 120ms ease-out;
	}
	button:hover:not(:disabled) {
		transform: scale(1.08);
	}
	button:active:not(:disabled) {
		transform: scale(0.94);
	}
	button:disabled {
		filter: grayscale(1);
		opacity: 0.45;
		cursor: not-allowed;
	}
	.bet {
		min-width: 8.5rem;
		padding: 0.15rem 0.8rem;
		border-style: solid;
		border-width: 9px 20px;
		border-image: var(--gg-plate-navy) 34 62 fill / 9px 20px stretch;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.05;
		font-family: 'Barlow Condensed', sans-serif;
	}
	.bet span {
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		color: #c9d3ff;
		font-weight: 700;
	}
	.bet b {
		font-size: 1.2rem;
		color: #ffe27a;
		font-weight: 700;
	}
</style>
