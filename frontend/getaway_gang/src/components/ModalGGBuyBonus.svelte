<script lang="ts">
	/** BUY BONUS: one card per bonus, priced from the math, then a confirm step. Opened by the shared Buy Bonus button. */
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';
	import { GG_ASSETS } from '../game/ggAssets';
	import { BUY_MODES, costOf } from '../game/meta';
	import config from '../game/config';

	const context = getContext();
	const art = (id: string) => (GG_ASSETS as Record<string, { src: string }>)[id]?.src ?? '';
	let selected = $state<(typeof BUY_MODES)[number] | null>(null);
	const price = (mode: string) => stateBet.betAmount * costOf(mode);
	const affordable = (mode: string) => stateBet.betAmount > 0 && stateBet.balanceAmount >= price(mode);

	const close = () => {
		selected = null;
		stateModal.modal = null;
	};
	const confirm = () => {
		if (!selected || !affordable(selected.mode)) return;
		stateBet.activeBetModeKey = selected.key; // reset to BASE by the bet machine after the round
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		close();
		context.eventEmitter.broadcast({ type: 'bet' });
	};
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<Popup zIndex={zIndex.modal} onclose={close}>
		<div class="wrap">
			{#if !selected}
				<h2>BUY BONUS</h2>
				<p class="bet">Current bet <b>{numberToCurrencyString(stateBet.betAmount)}</b></p>
				<div class="cards">
					{#each BUY_MODES as b (b.key)}
						<div class="card">
							<div class="art" style="background-image:url({art(b.art)})"></div>
							<div class="body">
								<h3>{b.title}</h3>
								<div class="vol" title="Volatility">
									{#each [1, 2, 3, 4, 5] as v}<span class:on={v <= b.volatility}>⚡</span>{/each}
								</div>
								<ul>
									{#each b.points as p}<li>{p}</li>{/each}
								</ul>
								<div class="cost">{costOf(b.mode)}× bet</div>
								<button
									class="buy"
									disabled={!affordable(b.mode)}
									onclick={() => {
										selected = b;
										context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
									}}
								>
									BUY {numberToCurrencyString(price(b.mode))}
								</button>
							</div>
						</div>
					{/each}
				</div>
				<p class="small">RTP {(config.rtp * 100).toFixed(2)}% for every bonus buy. Max win {config.wincap.toLocaleString()}× bet.</p>
			{:else}
				<div class="confirm">
					<div class="art big" style="background-image:url({art(selected.art)})"></div>
					<h2>{selected.title}</h2>
					<p>
						Buy <b>{selected.title}</b> for <b>{numberToCurrencyString(price(selected.mode))}</b>
						({costOf(selected.mode)}× your bet of {numberToCurrencyString(stateBet.betAmount)})?
					</p>
					<p class="small">The bonus starts immediately on a trigger board. Wins are paid in multiples of your bet.</p>
					<div class="row">
						<button class="ghost" onclick={() => (selected = null)}>BACK</button>
						<button class="buy" data-test="confirm-button" disabled={!affordable(selected.mode)} onclick={confirm}>CONFIRM</button>
					</div>
				</div>
			{/if}
		</div>
	</Popup>
{/if}

<style>
	.wrap {
		position: relative;
		z-index: 100;
		max-width: min(960px, 94vw);
		max-height: 92vh;
		overflow-y: auto;
		padding: 1.2rem;
		color: #fff;
		font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
		text-align: center;
	}
	h2 {
		margin: 0 0 0.3rem;
		font-size: 2rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: #f7c947;
		text-shadow: 0 3px 0 #7a4a00;
	}
	h3 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 900;
		color: #fff;
	}
	.bet {
		margin: 0 0 1rem;
		opacity: 0.85;
	}
	.cards {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.card {
		width: min(400px, 90vw);
		border-radius: 18px;
		overflow: hidden;
		background: linear-gradient(180deg, #1b2547, #0d1530);
		border: 3px solid #f7c947;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
	}
	.art {
		aspect-ratio: 16 / 9;
		background-size: cover;
		background-position: center;
	}
	.art.big {
		width: min(420px, 80vw);
		margin: 0 auto 0.8rem;
		border-radius: 14px;
		border: 3px solid #f7c947;
	}
	.body {
		padding: 0.8rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}
	.vol span {
		opacity: 0.25;
		filter: grayscale(1);
	}
	.vol span.on {
		opacity: 1;
		filter: none;
	}
	ul {
		margin: 0;
		padding-left: 1.1rem;
		text-align: left;
		font-size: 0.9rem;
		line-height: 1.35;
		flex: 1;
	}
	.cost {
		font-size: 1.1rem;
		font-weight: 800;
		color: #f7c947;
	}
	button {
		cursor: pointer;
		font: inherit;
		font-weight: 900;
		font-size: 1.1rem;
		border-radius: 999px;
		padding: 0.7rem 1.4rem;
		border: none;
	}
	.buy {
		color: #2a1600;
		background: linear-gradient(180deg, #ffe27a, #f7a928);
		box-shadow: 0 4px 0 #a05a00;
	}
	.buy:disabled {
		filter: grayscale(1);
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ghost {
		color: #fff;
		background: transparent;
		border: 2px solid #fff;
	}
	.row {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 0.6rem;
	}
	.small {
		font-size: 0.8rem;
		opacity: 0.75;
		margin-top: 0.8rem;
	}
	.confirm p {
		max-width: 520px;
		margin: 0.4rem auto;
	}
</style>
