// Render every composition to out/<id>.webm (VP9). Transparent overlays get an alpha channel.
//   node render-all.mjs            all compositions
//   node render-all.mjs FX- WIN-   only ids starting with these prefixes
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
// Full-frame clips with their own background; everything else is an overlay with transparency.
const OPAQUE = new Set(['BG-MAIN-LOOP', 'BG-ESCAPE-LOOP', 'CIN-MAX-WIN', 'CIN-FINAL-ESCAPE', 'CIN-PERFECTLY-BAD-PLAN']);
const prefixes = process.argv.slice(2);
const out = path.resolve('out');
fs.mkdirSync(out, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comps = (await getCompositions(serveUrl, {browserExecutable: BROWSER})).filter(
	(c) => !prefixes.length || prefixes.some((p) => c.id.startsWith(p)),
);
console.log(`rendering ${comps.length} compositions`);
for (const comp of comps) {
	const file = path.join(out, `${comp.id}.webm`);
	const t0 = Date.now();
	const transparent = !OPAQUE.has(comp.id);
	await renderMedia({
		composition: comp,
		serveUrl,
		codec: 'vp9',
		outputLocation: file,
		browserExecutable: BROWSER,
		imageFormat: transparent ? 'png' : 'jpeg',
		pixelFormat: transparent ? 'yuva420p' : 'yuv420p',
		// render at the size the game displays: HD clips at 720p, character clips 512px, symbol clips 256px
		scale: comp.width === 1920 ? 2 / 3 : 0.5,
		crf: comp.width === 1920 ? Number(process.env.HD_CRF ?? 42) : 32,
		concurrency: 4,
		logLevel: 'error',
	});
	console.log(`${comp.id}  ${((Date.now() - t0) / 1000).toFixed(0)}s  ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
console.log('done');
