<script lang="ts">
	/**
	 * BUY BONUS: UI-BUY-PANEL frame with the title on its gold plate, one BUY-*-CARD per bonus (priced from
	 * the math), UI-VOL bolts for volatility, then a confirm step. Portrait phones get a CSS frame instead of
	 * the panel art (the 4:3 art would leave too little room for the cards).
	 */
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';
	import { ggUrl } from '../game/ggAssets';
	import { BUY_MODES, costOf } from '../game/meta';
	import config from '../game/config';

	const context = getContext();
	const CARD = { HEIST: 'BUY-HEIST-CARD', ESCAPE: 'BUY-ESCAPE-CARD' } as const;
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
		<div class="panel" style="--panel:url({ggUrl('UI-BUY-PANEL')})">
			<div class="plate">{selected ? selected.title : 'BUY BONUS'}</div>
			<div class="glass">
				{#if !selected}
					<p class="bet">Current bet <b>{numberToCurrencyString(stateBet.betAmount)}</b></p>
					<div class="cards">
						{#each BUY_MODES as b (b.key)}
							<div class="card">
								<div class="art" style="background-image:url({ggUrl(CARD[b.key])})">
									<span class="cardtitle">{b.title}</span>
									<span class="cardcost">{costOf(b.mode)}× BET</span>
								</div>
								<div class="body">
									<div class="vol" title="Volatility {b.volatility} of 5">
										<span>VOLATILITY</span>
										{#each [1, 2, 3, 4, 5] as v}<img src={ggUrl(v <= b.volatility ? 'UI-VOL-ON' : 'UI-VOL-OFF')} alt="" />{/each}
									</div>
									<ul>
										{#each b.points as p}<li>{p}</li>{/each}
									</ul>
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
					<p class="small">RTP {(config.rtp * 100).toFixed(2)}% for every bonus buy · Max win {config.wincap.toLocaleString()}× bet</p>
				{:else}
					<div class="confirm">
						<div class="art big" style="background-image:url({ggUrl(CARD[selected.key])})"></div>
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
		</div>
	</Popup>
{/if}

<style>
	/* UI-BUY-PANEL is 4:3: glass area spans x 7–93%, y 28.7–86.8% (measured); gold plate centred at 19.4% */
	.panel {
		position: relative;
		z-index: 100;
		width: min(94vw, calc(92vh * 4 / 3), 1180px);
		aspect-ratio: 4 / 3;
		background: var(--panel) center / 100% 100% no-repeat;
		filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.6));
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
		text-align: center;
		container-type: inline-size;
	}
	.plate {
		position: absolute;
		left: 50%;
		top: 19.4%;
		translate: -50% -50%;
		font-family: 'Luckiest Guy', 'proxima-nova', sans-serif;
		font-size: clamp(18px, 4.2cqw, 46px);
		color: #3b2400;
		letter-spacing: 0.04em;
		text-shadow: 0 2px 0 rgba(255, 240, 180, 0.7);
		white-space: nowrap;
	}
	.glass {
		position: absolute;
		left: 7.5%;
		right: 7.5%;
		top: 29.5%;
		bottom: 14%;
		overflow-y: auto;
		padding: 0.4rem 0.6rem;
		scrollbar-width: thin;
	}
	.bet {
		margin: 0 0 0.5rem;
		opacity: 0.85;
		font-size: clamp(12px, 1.5cqw, 17px);
	}
	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(8px, 2cqw, 22px);
	}
	.card {
		border-radius: 14px;
		overflow: hidden;
		background: linear-gradient(180deg, #16204a, #0b1230);
		border: 3px solid #f7c947;
		box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-direction: column;
	}
	.art {
		position: relative;
		aspect-ratio: 16 / 9;
		background-size: cover;
		background-position: center;
	}
	/* the card art leaves calm navy bands at the top and bottom for text */
	.cardtitle,
	.cardcost {
		position: absolute;
		left: 0;
		right: 0;
		font-family: 'Luckiest Guy', 'proxima-nova', sans-serif;
		color: #ffe27a;
		-webkit-text-stroke: 1px #2a1200;
		text-shadow: 0 3px 0 #b5470f, 0 4px 10px rgba(0, 0, 0, 0.8);
		letter-spacing: 0.03em;
	}
	.cardtitle {
		top: 3%;
		font-size: clamp(14px, 2.6cqw, 30px);
	}
	.cardcost {
		bottom: 3%;
		font-size: clamp(12px, 2cqw, 24px);
		color: #fff;
		text-shadow: 0 2px 0 #0b1230, 0 4px 10px rgba(0, 0, 0, 0.8);
	}
	.art.big {
		width: min(100%, 520px);
		margin: 0 auto 0.6rem;
		border-radius: 12px;
		border: 3px solid #f7c947;
	}
	.body {
		padding: 0.5rem 0.7rem 0.7rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex: 1;
	}
	.vol {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #c9d3ff;
	}
	.vol span {
		margin-right: 6px;
	}
	.vol img {
		height: clamp(14px, 2cqw, 22px);
	}
	ul {
		margin: 0;
		padding-left: 1.1rem;
		text-align: left;
		font-size: clamp(11px, 1.35cqw, 15px);
		line-height: 1.35;
		flex: 1;
	}
	button {
		cursor: pointer;
		font-family: 'Luckiest Guy', 'proxima-nova', sans-serif;
		font-size: clamp(14px, 1.8cqw, 22px);
		letter-spacing: 0.04em;
		border-radius: 999px;
		padding: 0.55rem 1.2rem 0.4rem;
		border: none;
	}
	.buy {
		color: #2a1600;
		background: linear-gradient(180deg, #ffe27a, #f7a928);
		box-shadow: 0 4px 0 #a05a00;
	}
	.buy:hover:not(:disabled) {
		filter: brightness(1.08);
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
		margin-top: 0.4rem;
	}
	.small {
		font-size: clamp(10px, 1.2cqw, 13px);
		opacity: 0.75;
		margin: 0.6rem 0 0;
	}
	.confirm p {
		max-width: 560px;
		margin: 0.3rem auto;
		font-size: clamp(12px, 1.6cqw, 18px);
	}

	/* portrait phones: CSS frame in the same palette, cards stacked */
	@media (max-aspect-ratio: 1/1) {
		.panel {
			width: 94vw;
			aspect-ratio: auto;
			max-height: 90vh;
			background: linear-gradient(180deg, #1b2547, #0d1530);
			border: 4px solid #f7c947;
			border-radius: 20px;
			padding-top: 3.6rem;
		}
		.plate {
			top: 1.8rem;
			color: #ffe27a;
			text-shadow: 0 3px 0 #b5470f;
			font-size: 26px;
		}
		.glass {
			position: relative;
			inset: auto;
			max-height: calc(90vh - 4.5rem);
			padding: 0.4rem 0.8rem 1rem;
		}
		.cards {
			grid-template-columns: 1fr;
		}
		.cardtitle {
			font-size: 22px;
		}
		.cardcost {
			font-size: 18px;
		}
		ul {
			font-size: 13px;
		}
		button {
			font-size: 18px;
		}
	}
</style>
