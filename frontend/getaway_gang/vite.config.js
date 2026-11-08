// @ts-ignore
import config from 'config-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const overridesDir = path.join(here, 'src', 'gg-overrides');

// Game-specific visual overrides for shared web-sdk UI components (logic stays in the shared code).
// Any import of these files inside components-ui-pixi resolves to src/gg-overrides/<same name>.
const OVERRIDES = ['UiButton.svelte', 'ButtonBet.svelte', 'ButtonBuyBonus.svelte', 'LabelBalance.svelte', 'LabelWin.svelte', 'LabelBet.svelte'];

const ggUiOverrides = {
	name: 'gg-ui-overrides',
	enforce: 'pre',
	async resolveId(source, importer, options) {
		if (!importer || importer.startsWith(overridesDir)) return null;
		const name = path.basename(source.split('?')[0]);
		if (!OVERRIDES.includes(name)) return null;
		const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
		if (resolved && resolved.id.split('?')[0].includes(`components-ui-pixi${path.sep}src${path.sep}components${path.sep}`)) {
			return path.join(overridesDir, name);
		}
		return null;
	},
};

// pixi-svelte's preloadFont() loads 'proxima-nova' from Adobe Typekit (an external request, not allowed on
// Stake Engine). Replace it with a wait for the bundled fonts declared in src/lib/fonts/fonts.css.
const localFonts = {
	name: 'gg-local-fonts',
	enforce: 'pre',
	transform(code, id) {
		const file = id.split('?')[0].replace(/\\/g, '/');
		if (!file.endsWith('pixi-svelte/src/lib/utils.svelte.ts') && !file.endsWith('pixi-svelte/dist/utils.svelte.js')) return null;
		const start = code.indexOf('export const preloadFont');
		const end = code.indexOf('export function propsSyncEffect');
		if (start < 0 || end < 0) throw new Error('gg-local-fonts: preloadFont not found in pixi-svelte utils');
		const local = `export const preloadFont = () =>
	Promise.race([
		Promise.all(['400 24px proxima-nova', '700 24px proxima-nova', '900 24px proxima-nova', '24px "Luckiest Guy"'].map((f) => document.fonts.load(f))),
		new Promise((resolve) => setTimeout(resolve, 3000)),
	]).then(() => undefined, () => undefined);

`;
		const out = (code.slice(0, start) + local + code.slice(end)).replace(/import WebFont from ['"]webfontloader['"];?\n?/, '');
		return { code: out, map: null };
	},
};

// state-shared's default bet-mode / game-rule meta (sample data, replaced at startup by src/game/meta.ts)
// carries image URLs on third-party hosts. Blank them so the build contains no external references.
const noSampleUrls = {
	name: 'gg-no-sample-urls',
	enforce: 'pre',
	transform(code, id) {
		const file = id.split('?')[0].replace(/\\/g, '/');
		if (!file.endsWith('state-shared/src/constants.ts')) return null;
		return { code: code.replace(/(['"`])https?:\/\/[^'"`]*\1/g, "''"), map: null };
	},
};

// The shared Authenticate.svelte drops the RGS bet limits. Keep them so the Buy Bonus screen can disable
// purchases above a mode's maximum (the RGS would reject them): stateConfig.maxBetAmount (global, currency
// units) and stateConfig.modeLimits ({ MODE: maxBet in currency units } when the RGS sends per-mode limits).
const keepBetLimits = {
	name: 'gg-keep-bet-limits',
	enforce: 'pre',
	transform(code, id) {
		const file = id.split('?')[0].replace(/\\/g, '/');
		if (!file.endsWith('components-shared/src/components/Authenticate.svelte')) return null;
		const anchor = 'stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter(';
		if (!code.includes(anchor)) throw new Error('gg-keep-bet-limits: anchor not found in Authenticate.svelte');
		const inject = `(stateConfig as any).maxBetAmount = (authenticateData.config?.maxBet ?? 0) / API_AMOUNT_MULTIPLIER;
				{
					const modes: any = (authenticateData.config as any)?.gameModes ?? (authenticateData.config as any)?.betModes ?? [];
					const list: any[] = Array.isArray(modes) ? modes : Object.entries(modes).map(([mode, v]: any) => ({ mode, ...(v ?? {}) }));
					(stateConfig as any).modeLimits = Object.fromEntries(
						list.filter((m) => m && m.mode && m.maxBet).map((m) => [String(m.mode).toUpperCase(), m.maxBet / API_AMOUNT_MULTIPLIER]),
					);
				}
				`;
		return { code: code.replace(anchor, inject + anchor), map: null };
	},
};

const base = config();
export default { ...base, plugins: [ggUiOverrides, localFonts, noSampleUrls, keepBetLimits, ...base.plugins] };
