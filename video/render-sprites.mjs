// Render the FX-COINS-* compositions frame by frame to transparent PNGs (out/sprites/<id>/<n>.png).
// art/pack_sprites.py packs them into one atlas + Pixi spritesheet JSON.
import {bundle} from '@remotion/bundler';
import {getCompositions, renderFrames} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comps = (await getCompositions(serveUrl, {browserExecutable: BROWSER})).filter((c) => c.id.startsWith('FX-COINS-'));
for (const comp of comps) {
	const dir = path.resolve('out/sprites', comp.id);
	fs.rmSync(dir, {recursive: true, force: true});
	fs.mkdirSync(dir, {recursive: true});
	await renderFrames({
		composition: comp,
		serveUrl,
		browserExecutable: BROWSER,
		imageFormat: 'png',
		outputDir: dir,
		onStart: () => {},
		onFrameUpdate: () => {},
		logLevel: 'error',
	});
	console.log(comp.id, fs.readdirSync(dir).length, 'frames');
}
