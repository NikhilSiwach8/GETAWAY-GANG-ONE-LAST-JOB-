<script lang="ts">
	/**
	 * BUY BONUS: UI-BUY-PANEL frame with the title on its gold plate, one BUY-*-CARD per bonus (priced from
	 * the math), UI-VOL bolts for volatility, then a confirm step. Portrait phones get a CSS frame instead of
	 * the panel art (the 4:3 art would leave too little room for the cards).
	 */
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateConfig, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';
	import { ggUrl, GG_HTML } from '../game/ggAssets';
	import { BUY_MODES, costOf } from '../game/meta';
	import config from '../game/config';

	const context = getContext();
	// MYSTERY uses its own card once BUY-MYSTERY-CARD is delivered; until then the Escape card, darkened, with a '?'
	const ownMystery = !!GG_HTML['BUY-MYSTERY-CARD'];
	const CARD = { HEIST: 'BUY-HEIST-CARD', ESCAPE: 'BUY-ESCAPE-CARD', MYSTERY: ownMystery ? 'BUY-MYSTERY-CARD' : 'BUY-ESCAPE-CARD' } as const;
	let selected = $state<(typeof BUY_MODES)[number] | null>(null);
	const price = (mode: string) => stateBet.betAmount * costOf(mode);
	// RGS bet limit per mode (per-mode maxBet if sent, else the global maxBet spread over the price)
	const maxBetFor = (key: string, mode: string) => {
		const c = stateConfig as unknown as { modeLimits?: Record<string, number>; maxBetAmount?: number };
		return c.modeLimits?.[key] ?? (c.maxBetAmount ? c.maxBetAmount / costOf(mode) : Infinity);
	};
	const overLimit = (key: string, mode: string) => stateBet.betAmount > maxBetFor(key, mode) + 1e-9;
	const affordable = (mode: string, key?: string) =>
		stateBet.betAmount > 0 && stateBet.balanceAmount >= price(mode) && !(key && overLimit(key, mode));

	const close = () => {
		selected = null;
		stateModal.modal = null;
	};
	const confirm = () => {
		if (!selected || !affordable(selected.mode, selected.key)) return;
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
								<div class="art" class:mystery={b.key === 'MYSTERY' && !ownMystery} style="background-image:url({ggUrl(CARD[b.key])})">
									<span class="cardtitle">{b.title}</span>
									<span class="cardcost">{costOf(b.mode)}× BET</span>
								</div>
								<div class="body">
									<!-- price + BUY first, so it is always on screen; details underneath -->
									<button
										class="buy"
										disabled={!affordable(b.mode, b.key)}
										onclick={() => {
											selected = b;
											context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
										}}
									>
										BUY {numberToCurrencyString(price(b.mode))}
									</button>
									{#if overLimit(b.key, b.mode)}
										<div class="limit">Max bet for this buy: {numberToCurrencyString(maxBetFor(b.key, b.mode))}</div>
									{/if}
									<div class="vol" title="Volatility {b.volatility} of 5">
										<span>VOLATILITY</span>
										{#each [1, 2, 3, 4, 5] as v}<img src={ggUrl(v <= b.volatility ? 'UI-VOL-ON' : 'UI-VOL-OFF')} alt="" />{/each}
									</div>
									{#if b.key === 'MYSTERY' && GG_HTML['UI-MYSTERY-BADGE']}
										<img class="odds" src={GG_HTML['UI-MYSTERY-BADGE']} alt="20% Hidden Bonus, 30% Perfect Escape, 50% empty" />
									{/if}
									<ul>
										{#each b.points as p}<li>{p}</li>{/each}
									</ul>
								</div>
							</div>
						{/each}
					</div>
					<p class="small">RTP {(config.rtp * 100).toFixed(2)}% for every bonus buy · Max win {config.wincap.toLocaleString()}× bet</p>
				{:else}
					<div class="confirm">
						<div class="art big" class:mystery={selected.key === 'MYSTERY' && !ownMystery} style="background-image:url({ggUrl(CARD[selected.key])})"></div>
						<p>
							Buy <b>{selected.title}</b> for <b>{numberToCurrencyString(price(selected.mode))}</b>
							({costOf(selected.mode)}× your bet of {numberToCurrencyString(stateBet.betAmount)})?
						</p>
						<p class="small">The bonus starts immediately on a trigger board. Wins are paid in multiples of your bet.</p>
						<div class="row">
							<button class="ghost" onclick={() => (selected = null)}>BACK</button>
							<button class="buy" data-test="confirm-button" disabled={!affordable(selected.mode, selected.key)} onclick={confirm}>CONFIRM</button>
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
		/* as large as the screen allows: the frame art stretches to fill (it is a plain bevelled frame) */
		width: min(97vw, 1600px);
		height: min(96vh, 1100px);
		background: var(--panel) center / 100% 100% no-repeat;
		filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.6));
		color: #fff;
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 600;
		text-align: center;
		container-type: inline-size;
		animation: gg-window-in 280ms cubic-bezier(0.2, 1.4, 0.4, 1) both; /* springs open (keyframes in lib/gg-ui.css) */
	}
	.plate {
		position: absolute;
		left: 50%;
		top: 19.4%;
		translate: -50% -50%;
		font-family: 'Luckiest Guy', sans-serif;
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
		grid-template-columns: repeat(3, 1fr);
		height: calc(100% - 3.2rem);
		gap: clamp(8px, 2cqw, 22px);
	}
	.card {
		border-radius: 14px;
		overflow: hidden;
		background: #0c1535;
		border: 3px solid #d9a93a;
		box-shadow:
			0 0 0 2px #3b2400,
			0 8px 22px rgba(0, 0, 0, 0.45);
		transition: transform 180ms cubic-bezier(0.2, 1.3, 0.4, 1), box-shadow 180ms ease-out;
	}
	.card:hover {
		transform: translateY(-6px) scale(1.02);
		box-shadow:
			0 0 0 2px #3b2400,
			0 0 28px rgba(255, 200, 80, 0.5),
			0 14px 28px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.art {
		position: relative;
		/* wider crop than the 16:9 card art so the whole card (and its BUY button) fits without scrolling */
		aspect-ratio: 16 / 7.4;
		background-size: cover;
		background-position: center;
	}
	/* the card art leaves calm navy bands at the top and bottom for text */
	.cardtitle,
	.cardcost {
		position: absolute;
		left: 0;
		right: 0;
		font-family: 'Luckiest Guy', sans-serif;
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
	/* placeholder Mystery card: darkened art with a big gold question mark */
	.art.mystery {
		box-shadow: inset 0 0 0 2000px rgba(8, 10, 24, 0.62);
	}
	.art.mystery::after {
		content: '?';
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Luckiest Guy', sans-serif;
		font-size: clamp(40px, 9cqw, 110px);
		color: #ffe27a;
		-webkit-text-stroke: 3px #2a1200;
		text-shadow: 0 6px 0 #b5470f;
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
		min-height: 0;
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
		font-size: clamp(13px, 1.6cqw, 18px);
		line-height: 1.3;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
	}
	/* buttons are the painted plates cut from the UI art (art/make_ui_plates.py) */
	button {
		cursor: pointer;
		font-family: 'Luckiest Guy', sans-serif;
		font-size: clamp(14px, 1.8cqw, 22px);
		letter-spacing: 0.04em;
		background: none;
		border-style: solid;
		border-width: 10px 22px;
		border-image: var(--gg-plate-navy) 34 62 fill / 10px 22px stretch;
		padding: 0.25rem 0.6rem 0.1rem;
		color: #fff;
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
		transition: transform 120ms ease-out, filter 120ms ease-out;
	}
	button:active:not(:disabled) {
		transform: scale(0.96);
	}
	.buy {
		color: #ffe27a;
		border-image: var(--gg-plate-red) 30 62 fill / 10px 22px stretch;
		text-shadow: 0 2px 0 #3a0a00;
		filter: drop-shadow(0 0 6px rgba(255, 200, 80, 0.35));
	}
	.buy:hover:not(:disabled) {
		filter: brightness(1.12) drop-shadow(0 0 10px rgba(255, 200, 80, 0.55));
	}
	.buy:disabled {
		filter: grayscale(1);
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ghost {
		color: #dfe6ff;
	}
	.row {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-top: 0.4rem;
	}
	.odds {
		width: 82%;
		margin: 0 auto;
		display: block;
	}
	.limit {
		font-size: clamp(10px, 1.2cqw, 13px);
		font-weight: 800;
		color: #ffb4a8;
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
		/* portrait: the same panel art as a 9-slice frame (keeps its corners and top plate in proportion) */
		.panel {
			--k: 0.19;
			width: 94vw;
			height: auto;
			aspect-ratio: auto;
			max-height: 90vh;
			background: none;
			border-style: solid;
			border-width: calc(var(--k) * 460px) calc(var(--k) * 260px) calc(var(--k) * 310px);
			border-image: var(--panel) 460 260 310 fill / calc(var(--k) * 460px) calc(var(--k) * 260px) calc(var(--k) * 310px) stretch;
		}
		.plate {
			top: calc(var(--k) * -200px);
			font-size: 24px;
		}
		.glass {
			position: relative;
			inset: auto;
			max-height: calc(90vh - 4.5rem);
			padding: 0.4rem 0.8rem 1rem;
		}
		.cards {
			grid-template-columns: 1fr;
			height: auto;
		}
		ul {
			overflow: visible;
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
