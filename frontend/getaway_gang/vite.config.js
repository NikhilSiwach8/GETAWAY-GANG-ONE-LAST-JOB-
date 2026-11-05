// @ts-ignore
import config from 'config-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const overridesDir = path.join(here, 'src', 'gg-overrides');

// Game-specific visual overrides for shared web-sdk UI components (logic stays in the shared code).
// Any import of these files inside components-ui-pixi resolves to src/gg-overrides/<same name>.
const OVERRIDES = ['UiButton.svelte', 'ButtonBet.svelte', 'LabelBalance.svelte', 'LabelWin.svelte', 'LabelBet.svelte'];

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

const base = config();
export default { ...base, plugins: [ggUiOverrides, ...base.plugins] };
