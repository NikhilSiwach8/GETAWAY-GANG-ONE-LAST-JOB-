<script lang="ts">
	/** − BET + inside the info modals: same bet levels and rules as the main +/− buttons (idle only). */
	import { stateBet, stateBetDerived, stateConfig } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';

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
	<button aria-label="Decrease bet" disabled={!idle || stateBet.betAmount <= options[0]} onclick={() => step(-1)}>−</button>
	<div class="bet"><span>BET</span><b>{numberToCurrencyString(stateBet.betAmount)}</b></div>
	<button aria-label="Increase bet" disabled={!idle || stateBet.betAmount >= options[options.length - 1]} onclick={() => step(1)}>+</button>
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
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 3px solid #b8bec8;
		background: radial-gradient(circle at 40% 35%, #ffe27a, #f7a928 70%);
		color: #2a1600;
		font-size: 1.5rem;
		font-weight: 900;
		line-height: 1;
		cursor: pointer;
		box-shadow: 0 3px 0 #7a4a00;
	}
	button:disabled {
		filter: grayscale(1);
		opacity: 0.45;
		cursor: not-allowed;
	}
	.bet {
		min-width: 8rem;
		padding: 0.35rem 1rem;
		border-radius: 999px;
		background: #0b1230;
		border: 2px solid #f7c947;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.1;
	}
	.bet span {
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		color: #c9d3ff;
		font-weight: 800;
	}
	.bet b {
		font-size: 1.15rem;
		color: #ffe27a;
	}
</style>
