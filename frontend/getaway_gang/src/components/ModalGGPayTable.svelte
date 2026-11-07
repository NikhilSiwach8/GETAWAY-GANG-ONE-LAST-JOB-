<script lang="ts">
	/** PAYTABLE: symbol art + pays at the current bet (values from the math's paytable, via config.ts). */
	import type { Snippet } from 'svelte';
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { ggUrl } from '../game/ggAssets';
	import { CREW_INFO, TEMP_SYMBOL_ART, type CrewKey } from '../game/tempArt';
	import config from '../game/config';
	import BetStepper from './BetStepper.svelte';

	const props: { children?: Snippet } = $props();
	const art = ggUrl;
	const NAMES: Record<string, string> = {
		H1: 'Diamond', H2: 'Money Bag', H3: 'Gold Bars', H4: 'Luxury Watch',
		L1: 'Ace', L2: 'King', L3: 'Queen', L4: 'Jack',
	};
	const paying = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4'] as const;
	const pays = (s: (typeof paying)[number]) =>
		(config.symbols[s].paytable as readonly Record<string, number>[]).map((e) => {
			const [k, v] = Object.entries(e)[0];
			return { kind: Number(k), x: v };
		});
	const money = (x: number) => numberToCurrencyString(x * stateBet.betAmount);
	const CREW: CrewKey[] = ['R', 'B', 'T', 'F'];
	const CREW_EFFECT: Record<CrewKey, string> = {
		R: 'Swaps reels around, then drops Wilds (1 / 2 / 3 by level)',
		B: 'Copies the best symbol on reel 1 onto reels 2–6 (3 / 5 / 7 copies)',
		T: 'Drills open a 2×2 or 3×3 vault full of premiums and Wilds',
		F: 'Blasts an area and upgrades every symbol in it 2–3 steps',
	};
</script>

{#if stateModal.modal?.name === 'payTable'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<div class="wrap">
			<div class="banner" style="--banner:url({ggUrl('UI-INFO-HEADER')})"><h2>PAYTABLE</h2></div>
			<BetStepper />
			<p class="sub">Win values at this bet, paid per way. Change the bet here or with − / + to update them.</p>

			<div class="grid">
				{#each paying as s (s)}
					<div class="sym" class:high={s.startsWith('H')}>
						<img src={art(TEMP_SYMBOL_ART[s].assetId)} alt={NAMES[s]} />
						<div class="pays">
							<div class="name">{NAMES[s]}</div>
							{#each pays(s) as p (p.kind)}
								<div class="pay"><span>{p.kind}×</span><b>{money(p.x)}</b></div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<h3>SPECIAL SYMBOLS</h3>
			<div class="specials">
				<div class="special">
					<img src={art('SYM-WILD')} alt="Wild" />
					<div>
						<b>GETAWAY VAN — WILD</b>
						<p>Substitutes for every paying symbol. Lands on reels 2–6; crew abilities can put it anywhere.</p>
					</div>
				</div>
				<div class="special">
					<img src={art('SYM-SCATTER')} alt="Scatter" />
					<div>
						<b>BANK BLUEPRINT — SCATTER</b>
						<p>
							3 on the initial board start <b>THE HEIST</b> ({config.features.heistFs} free spins). 4 or more start
							<b>THE PERFECT ESCAPE</b> ({config.features.escapeFs} free spins).
						</p>
					</div>
				</div>
			</div>

			<h3>THE CREW</h3>
			<p class="sub">Crew symbols do not pay. Each one that lands activates its ability (CREW CHAOS).</p>
			<div class="specials crew">
				{#each CREW as c (c)}
					<div class="special" style="--c:#{CREW_INFO[c].color.toString(16).padStart(6, '0')}">
						<img src={art(TEMP_SYMBOL_ART[c].assetId)} alt={CREW_INFO[c].name} />
						<div>
							<b>{CREW_INFO[c].name} — {CREW_INFO[c].ability}</b>
							<p>{CREW_EFFECT[c]}</p>
						</div>
					</div>
				{/each}
			</div>
			<p class="small">
				4,096 ways: a win needs matching symbols on adjacent reels from the leftmost reel. Only the highest win per
				symbol is paid; wins of different symbols are added. Max win {config.wincap.toLocaleString()}× bet ({money(config.wincap)}).
			</p>
			{@render props.children?.()}
		</div>
	</Popup>
{/if}

<style>
	.wrap {
		position: relative;
		z-index: 100;
		width: min(980px, 94vw);
		max-height: 92vh;
		overflow-y: auto;
		padding: 1.2rem;
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
	}
	h3 {
		text-align: center;
		font-family: 'Luckiest Guy', 'proxima-nova', sans-serif;
		font-weight: 400;
		letter-spacing: 0.06em;
		color: #f7c947;
		text-shadow: 0 3px 0 #7a4a00;
		margin: 0.6rem 0 0.3rem;
	}
	.banner {
		position: relative;
		width: min(100%, 760px);
		margin: 0 auto 0.4rem;
		aspect-ratio: 1400 / 467;
		background: var(--banner) center / contain no-repeat;
	}
	.banner h2 {
		position: absolute;
		left: 50%;
		top: 56%;
		translate: -50% -50%;
		margin: 0;
		font-family: 'Luckiest Guy', 'proxima-nova', sans-serif;
		font-weight: 400;
		font-size: clamp(22px, 5vw, 46px);
		letter-spacing: 0.05em;
		color: #fff3b0;
		-webkit-text-stroke: 2px #1c1f26;
		paint-order: stroke fill;
		text-shadow: 0 4px 0 #b5470f;
		white-space: nowrap;
	}
	.sub {
		text-align: center;
		opacity: 0.85;
		margin: 0 0 0.8rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 0.7rem;
	}
	.sym {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem;
		border-radius: 14px;
		background: rgba(13, 21, 48, 0.85);
		border: 2px solid #46557a;
	}
	.sym.high {
		border-color: #f7c947;
	}
	.sym img {
		width: 88px;
		height: 88px;
		object-fit: contain;
		flex: none;
	}
	.name {
		font-weight: 800;
		margin-bottom: 0.2rem;
	}
	.pay {
		display: flex;
		gap: 0.6rem;
		font-size: 0.9rem;
	}
	.pay span {
		width: 2rem;
		opacity: 0.75;
	}
	.pay b {
		color: #f7c947;
	}
	.specials {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.7rem;
	}
	.special {
		display: flex;
		gap: 0.7rem;
		align-items: center;
		padding: 0.6rem;
		border-radius: 14px;
		background: rgba(13, 21, 48, 0.85);
		border: 2px solid var(--c, #f7c947);
	}
	.special img {
		width: 96px;
		height: 96px;
		object-fit: contain;
		flex: none;
	}
	.special p {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
		line-height: 1.35;
	}
	.small {
		font-size: 0.8rem;
		opacity: 0.75;
		text-align: center;
		margin-top: 1rem;
	}
</style>
