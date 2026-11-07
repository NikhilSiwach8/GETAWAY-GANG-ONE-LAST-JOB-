/**
 * Bet modes shown by the shared Stake UI (Buy Bonus button + modals). Prices come from the math
 * (config.ts is generated from game_config.py), so the UI can never show a price the RGS does not charge.
 * Mode keys are upper-case like the web-sdk's 'BASE'; the RGS mode names are the math's lower-case names.
 */
import { stateMeta, type BetModeMeta } from 'state-shared';
import config from './config';

const empty = { icon: '', volatility: '', button: '', dialogImage: '', dialogVolatility: '' };
const fs = config.features;

export const BUY_MODES = [
	{
		key: 'HEIST',
		mode: 'heist',
		title: 'THE HEIST',
		art: 'SCR-HEIST-INTRO',
		volatility: 4,
		tagline: `${fs.heistFs} free spins in the vault`,
		points: [
			`Starts with ${fs.heistFs} free spins (3 Scatters)`,
			'Loot Meter: extra spins, ×2 then ×3 loot multiplier',
			'Crew Chaos, re-spins and Getaway Meter active',
			`Retrigger +${fs.retriggerFs} spins, up to ${fs.heistMaxFs}`,
		],
	},
	{
		key: 'ESCAPE',
		mode: 'escape',
		title: 'THE PERFECT ESCAPE',
		art: 'SCR-ESCAPE-INTRO',
		volatility: 5,
		tagline: `${fs.escapeFs} free spins with persistent crew upgrades`,
		points: [
			`Starts with ${fs.escapeFs} free spins (4+ Scatters)`,
			'Crew level up and stay upgraded for the whole bonus',
			`Final Escape: ${fs.finalEscapePerMaster}× per Level 3 crew, ${fs.finalEscapeAllMasters}× for all four`,
			`Retrigger +${fs.retriggerFs} spins, up to ${fs.escapeMaxFs}`,
		],
	},
] as const;

export const costOf = (mode: string) => config.betModes[mode as keyof typeof config.betModes].cost;

const meta: BetModeMeta = {
	BASE: {
		mode: 'BASE',
		costMultiplier: 1,
		type: 'default',
		parent: '',
		children: '',
		assets: empty,
		text: { title: '', dialog: '', button: '', tickerIdle: '', tickerSpin: '' },
		maxWin: config.wincap,
	},
};
for (const b of BUY_MODES) {
	meta[b.key] = {
		mode: b.key,
		costMultiplier: costOf(b.mode),
		type: 'buy',
		parent: '',
		children: '',
		assets: empty,
		text: {
			title: b.title,
			description: b.tagline,
			dialog: `Buy ${b.title} for ${costOf(b.mode)}× the current bet? The bonus starts immediately.`,
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: `${b.title} BOUGHT`,
		},
		maxWin: config.wincap,
	};
}

export const installMeta = () => {
	stateMeta.betModeMeta = meta;
};
