<script lang="ts">
	/** GAME RULES / HOW TO PLAY. Every number is read from config.ts (generated from the math). */
	import type { Snippet } from 'svelte';
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';
	import { ggUrl } from '../game/ggAssets';
	import { BUY_MODES, costOf } from '../game/meta';
	import { COMBO_INFO, CREW_INFO, LOOT_REWARDS, METER_STAGE_REWARDS, TEMP_SYMBOL_ART, type CrewKey } from '../game/tempArt';
	import config from '../game/config';
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import BetStepper from './BetStepper.svelte';

	const props: { children?: Snippet } = $props();
	const art = ggUrl;
	const f = config.features;
	// money at the current bet, shown next to every multiple of the bet
	const money = (x: number) => numberToCurrencyString(x * stateBet.betAmount);
	const rtp = `${(config.rtp * 100).toFixed(2)}%`;
	const cap = config.wincap.toLocaleString();
	const CREW: CrewKey[] = ['R', 'B', 'T', 'F'];
	const LEVELS: Record<CrewKey, [string, string, string]> = {
		R: ['Swap 1 pair of reels, +1 Wild', 'Swap 1 pair, +2 Wilds', 'Swap 2 pairs, +3 Wilds'],
		B: ['3 copies', '5 copies', '7 copies'],
		T: ['2×2 vault', '3×3 vault', '3×3 vault, richer loot'],
		F: ['2×2 area, +2 steps', '3×3 area, +2 steps', '3×3 area, +3 steps'],
	};
	const SECTIONS = ['How to play', 'Crew Chaos', 'Re-spins & Meter', 'The Heist', 'Perfect Escape', 'Buy Bonus', 'Info'] as const;
	let tab = $state<(typeof SECTIONS)[number]>('How to play');
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<div class="wrap">
			<div class="banner" style="--banner:url({ggUrl('UI-INFO-HEADER')})"><h2>HOW TO PLAY</h2></div>
			<BetStepper />
			<nav>
				{#each SECTIONS as s (s)}
					<button class:on={tab === s} onclick={() => (tab = s)}>{s}</button>
				{/each}
			</nav>

			{#if tab === 'How to play'}
				<section>
					<img class="hero" src={art('UI-LOGO')} alt="Getaway Gang" />
					<ol>
						<li>Set your bet with <b>+</b> / <b>−</b> or the bet menu.</li>
						<li>Press <b>SPIN</b> or the <b>Space</b> bar to play one round.</li>
						<li><b>TURBO</b> speeds up animations. <b>AUTOPLAY</b> plays several rounds and stops on the limits you set.</li>
						<li>Tap the screen during a feature animation to skip it. Skipping never changes the result.</li>
					</ol>
					<p>
						The game has <b>6 reels × 4 rows</b> and <b>4,096 ways</b>. Wins pay left to right for matching symbols on
						adjacent reels, starting from the leftmost reel. Pays per way are multiplied by the number of ways. Only
						the highest win per symbol is paid; wins of different symbols are added together. The <b>Getaway Van</b>
						Wild substitutes for every paying symbol.
					</p>
					<p>All wins are multiplied by your bet. See the <b>Paytable</b> for symbol values.</p>
				</section>
			{:else if tab === 'Crew Chaos'}
				<section>
					<p>
						Every crew symbol on the board activates its ability <b>once per reveal</b>, in the order
						<b>Roxy → Byte → Tank → Fuse</b>. Abilities only change regular paying symbols; Wilds, Scatters and crew
						are never overwritten. After acting, crew symbols leave the reels: they leave an <b>Ace</b> in the base
						game and a <b>Wild</b> in the bonuses.
					</p>
					<img class="rule" src={art('RULE-CREW-CHAOS')} alt="Crew Chaos: each crew member changes the board" />
					<div class="crew">
						{#each CREW as c (c)}
							<div class="crewcard" style="--c:#{CREW_INFO[c].color.toString(16).padStart(6, '0')}">
								<img src={art(TEMP_SYMBOL_ART[c].assetId)} alt={CREW_INFO[c].name} />
								<div>
									<b>{CREW_INFO[c].name} — {CREW_INFO[c].ability}</b>
									<table>
										<tbody>
											{#each LEVELS[c] as l, i}<tr><td>Level {i + 1}</td><td>{l}</td></tr>{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/each}
					</div>
					<h3>Crew combos</h3>
					<p>When two crew members land together their combo runs after all abilities:</p>
					<table class="wide">
						<tbody>
							{#each Object.values(COMBO_INFO) as c (c.title)}
								<tr><td><b>{c.title}</b></td><td>{c.crew.map((k) => CREW_INFO[k].name).join(' + ')}</td><td>{c.detail}</td></tr>
							{/each}
						</tbody>
					</table>
					<h3>Perfectly Bad Plan</h3>
					<img class="rule small" src={art('RULE-PBP')} alt="Perfectly Bad Plan" />
					<p>
						All four crew on one reveal: every ability and combo runs, <b>+2 Wilds</b>, every crew symbol leaves a
						Wild, the reveal's win is multiplied <b>×{f.pbpMultiplier}</b>, and a Chaos Re-spin is awarded.
					</p>
				</section>
			{:else if tab === 'Re-spins & Meter'}
				<section>
					<h3>Chaos Re-spins</h3>
					<img class="rule small" src={art('RULE-RESPIN')} alt="Chaos Re-spin: Wilds stay locked" />
					<p>
						Two or more different crew members acting on one reveal award a <b>Chaos Re-spin</b>. All Wilds stay
						locked and every other position spins again. Re-spins pay like a normal spin and can activate the crew
						again. Maximum <b>{f.maxRespinsPerChain} re-spins</b> per spin. Scatters only count on a spin's first
						board, so re-spins cannot trigger a bonus.
					</p>
					<h3>Getaway Meter</h3>
					<img class="rule meter" src={art('RULE-METER')} alt="Getaway Meter stages 1 to 5" />
					<p>+1 point per crew activation, +1 per combo, +2 for a Perfectly Bad Plan.</p>
					<table class="wide">
						<tbody>
							{#each f.meterThresholds as t, i}
								<tr><td>Stage {i + 1}</td><td>{t} points</td><td>{METER_STAGE_REWARDS[i]}</td></tr>
							{/each}
						</tbody>
					</table>
					<p class="small">
						In the base game the meter lasts for one paid spin including its re-spins. In a bonus it starts at 0 and
						lasts for the whole bonus. Multipliers do not stack above ×5 from the meter.
					</p>
				</section>
			{:else if tab === 'The Heist'}
				<section>
					<img class="hero wide" src={art('BUY-HEIST-CARD')} alt="The Heist" />
					<p>
						<b>3 Scatters</b> on the initial board award <b>{f.heistFs} free spins</b> inside the vault. Crew Chaos,
						Chaos Re-spins and the Getaway Meter stay active. 3 or more Scatters during the bonus add
						<b>+{f.retriggerFs} free spins</b>, up to {f.heistMaxFs} in total.
					</p>
					<h3>Loot Meter</h3>
					<p>+1 per crew activation, +1 per vault opened, +1 per combo. It lasts for the whole Heist.</p>
					<div class="split">
						<img class="loot" src={art('RULE-LOOT-METER')} alt="Loot Meter milestones" />
						<table class="wide">
							<tbody>
								{#each f.lootThresholds as t, i}<tr><td>{t} points</td><td>{LOOT_REWARDS[i]}</td></tr>{/each}
							</tbody>
						</table>
					</div>
				</section>
			{:else if tab === 'Perfect Escape'}
				<section>
					<img class="hero wide" src={art('BUY-ESCAPE-CARD')} alt="The Perfect Escape" />
					<p>
						<b>4 or more Scatters</b> on the initial board award <b>{f.escapeFs} free spins</b> on the neon highway,
						with more crew and Wilds. Retriggers add <b>+{f.retriggerFs}</b>, up to {f.escapeMaxFs} in total.
					</p>
					<p>
						<b>Persistent upgrades:</b> each crew member starts at Level 1, reaches <b>Level 2</b> after
						{f.escapeLevelUpAt['2']} activations and <b>Level 3</b> after {f.escapeLevelUpAt['3']}, and keeps the level
						for the rest of the bonus.
					</p>
					<img class="rule small" src={art('RULE-FINAL-ESCAPE')} alt="Final Escape" />
					<p>
						<b>Final Escape:</b> when the last free spin ends, each crew member at Level 3 pays
						<b>{f.finalEscapePerMaster}× bet ({money(f.finalEscapePerMaster)})</b>, or <b>{f.finalEscapeAllMasters}× ({money(f.finalEscapeAllMasters)})</b> in total if all four reached
						Level 3.
					</p>
				</section>
			{:else if tab === 'Buy Bonus'}
				<section>
					<div class="cardsrow">
						<img src={art('BUY-HEIST-CARD')} alt="The Heist" />
						<img src={art('BUY-ESCAPE-CARD')} alt="The Perfect Escape" />
					</div>
					<p>Press <b>BUY BONUS</b> to start a bonus straight away. The price is a multiple of your current bet.</p>
					<table class="wide">
						<tbody>
							{#each BUY_MODES as b (b.key)}
								<tr><td><b>{b.title}</b></td><td>{costOf(b.mode)}× bet = {money(costOf(b.mode))}</td><td>RTP {rtp}</td></tr>
							{/each}
						</tbody>
					</table>
					<p>
						A bought bonus plays exactly like a naturally triggered one: it starts on a board showing the trigger
						Scatters. Wins are multiplied by your bet, not by the price paid.
					</p>
					<h3>Ante Spin</h3>
					<p>
						Switch <b>ANTE</b> on (on the console) to play every spin at <b>{f.anteCost}× bet ({money(f.anteCost)})</b>.
						Ante spins are normal base-game spins with <b>{f.anteBonusFactor}× the chance to trigger a bonus</b>: about
						1 in {Math.round(f.anteBonusOneIn)} spins instead of 1 in {Math.round(f.baseBonusOneIn)}. Wins are paid on your bet,
						not on the ante price. It stays on until you switch it off, and can only be changed between spins.
					</p>
					<h3>Mystery Vault</h3>
					<p>
						For <b>{costOf('mystery')}× bet ({money(costOf('mystery'))})</b> the vault is cracked and reveals one of three
						outcomes, with these fixed chances:
					</p>
					<table class="wide">
						<tbody>
							<tr><td><b>{Math.round(f.mysterySplit.hidden * 100)}%</b></td><td><b>HIDDEN BONUS</b> (5 Scatters): {f.hiddenFs} free spins of The Perfect Escape with every crew member starting at Level {f.hiddenStartLevel}. Always pays at least <b>{f.hiddenFloor}× bet ({money(f.hiddenFloor)})</b>, more than the price; if the bonus wins less, the Vault Guarantee tops it up when it ends.</td></tr>
							<tr><td><b>{Math.round(f.mysterySplit.escape * 100)}%</b></td><td><b>THE PERFECT ESCAPE</b> (4 Scatters): {f.escapeFs} free spins.</td></tr>
							<tr><td><b>{Math.round(f.mysterySplit.basegame * 100)}%</b></td><td><b>Empty vault</b>: one normal base-game spin, no bonus.</td></tr>
						</tbody>
					</table>
					<p class="small">The Hidden Bonus is only available through the Mystery Vault. RTP {rtp}. Max win {cap}× bet.</p>
				</section>
			{:else}
				<section>
					<ul>
						<li>Theoretical RTP: <b>{rtp}</b> for the base game, Ante Spin and each bonus buy.</li>
						<li>Maximum win: <b>{cap}× bet</b> ({money(config.wincap)} at the current bet) per round. When it is reached the round ends immediately and all remaining features are forfeited.</li>
						<li>Volatility: high.</li>
						<li>Every outcome is decided by the server before the round is shown; animations and skipping never change it.</li>
						<li>An interrupted round is resumed when the game is reopened.</li>
						<li>Malfunction voids all pays and plays.</li>
					</ul>
				</section>
			{/if}
			{@render props.children?.()}
		</div>
	</Popup>
{/if}

<style>
	.wrap {
		position: relative;
		z-index: 100;
		width: min(900px, 94vw);
		max-height: 92vh;
		overflow-y: auto;
		padding: 1.2rem;
		color: #fff;
		font-family: 'Luckiest Guy', sans-serif;
		line-height: 1.45;
	}
	h3 {
		text-align: center;
		font-family: 'Luckiest Guy', sans-serif;
		font-weight: 400;
		letter-spacing: 0.06em;
		color: #f7c947;
		text-shadow: 0 3px 0 #7a4a00;
		margin: 0.6rem 0 0.4rem;
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
		font-family: 'Luckiest Guy', sans-serif;
		font-weight: 400;
		font-size: clamp(22px, 5vw, 46px);
		letter-spacing: 0.05em;
		color: #fff3b0;
		-webkit-text-stroke: 2px #1c1f26;
		paint-order: stroke fill;
		text-shadow: 0 4px 0 #b5470f;
		white-space: nowrap;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		margin-bottom: 0.8rem;
	}
	nav button {
		cursor: pointer;
		font: inherit;
		font-weight: 800;
		font-size: 0.85rem;
		color: #fff;
		background: rgba(13, 21, 48, 0.85);
		border: 2px solid #46557a;
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
	}
	nav button.on {
		color: #2a1600;
		background: linear-gradient(180deg, #ffe27a, #f7a928);
		border-color: #f7c947;
	}
	section {
		background: rgba(13, 21, 48, 0.85);
		border: 2px solid #46557a;
		border-radius: 16px;
		padding: 0.8rem 1.1rem;
	}
	.hero {
		display: block;
		margin: 0 auto 0.6rem;
		max-width: 260px;
		width: 60%;
	}
	.hero.wide {
		max-width: 520px;
		width: 100%;
		border-radius: 12px;
		border: 2px solid #f7c947;
	}
	.rule {
		display: block;
		width: min(100%, 640px);
		margin: 0.4rem auto 0.6rem;
	}
	.rule.small {
		width: min(100%, 520px);
	}
	.rule.meter {
		width: min(100%, 560px);
	}
	.split {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.split .loot {
		width: min(38%, 220px);
		flex: none;
	}
	.cardsrow {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
		margin-bottom: 0.6rem;
	}
	.cardsrow img {
		width: 100%;
		border-radius: 10px;
		border: 2px solid #f7c947;
	}
	@media (max-width: 560px) {
		.split {
			flex-direction: column;
		}
		.split .loot {
			width: 60%;
		}
	}
	.crew {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0.6rem;
	}
	.crewcard {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		padding: 0.5rem;
		border-radius: 12px;
		border: 2px solid var(--c);
		background: rgba(0, 0, 0, 0.25);
	}
	.crewcard img {
		width: 80px;
		height: 80px;
		object-fit: contain;
		flex: none;
	}
	table {
		border-collapse: collapse;
		font-size: 0.88rem;
	}
	td {
		padding: 0.15rem 0.6rem 0.15rem 0;
		vertical-align: top;
	}
	td:first-child {
		white-space: nowrap;
	}
	table.wide {
		width: 100%;
	}
	table.wide td {
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		padding: 0.35rem 0.6rem;
	}
	.small {
		font-size: 0.8rem;
		opacity: 0.75;
	}
</style>
