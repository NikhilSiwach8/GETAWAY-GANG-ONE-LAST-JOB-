// Render every composition to out/<id>.webm (VP9). Transparent overlays get an alpha channel.
//   node render-all.mjs            all compositions
//   node render-all.mjs FX- WIN-   only ids starting with these prefixes
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
// Full-frame clips with their own background; everything else is an overlay with transparency.
const OPAQUE = new Set(['BG-MAIN-LOOP', 'BG-ESCAPE-LOOP', 'BG-HEIST-LOOP', 'BG-HIDDEN-LOOP', 'CIN-MAX-WIN', 'CIN-FINAL-ESCAPE', 'CIN-PERFECTLY-BAD-PLAN', 'SCR-HEIST-OUTRO', 'SCR-ESCAPE-OUTRO', 'SCR-HEIST-INTRO', 'SCR-HEIST-INTRO-LOOP', 'SCR-ESCAPE-INTRO', 'SCR-ESCAPE-INTRO-LOOP', 'SCR-HIDDEN-INTRO', 'SCR-HIDDEN-INTRO-LOOP', 'SCR-HIDDEN-OUTRO', 'FX-MYSTERY-HIDDEN', 'FX-MYSTERY-ESCAPE', 'FX-MYSTERY-NONE']);
const prefixes = process.argv.slice(2);
const out = path.resolve('out');
fs.mkdirSync(out, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comps = (await getCompositions(serveUrl, {browserExecutable: BROWSER})).filter(
	// FX-COINS-* are sprite sheets: rendered frame by frame by render-sprites.mjs
	(c) => !c.id.startsWith('FX-COINS-') && (!prefixes.length || prefixes.some((p) => c.id.startsWith(p))),
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
		// lossless frames into the encoder (PNG, or JPEG at 100 for opaque clips)
		imageFormat: transparent ? 'png' : 'jpeg',
		jpegQuality: 100,
		pixelFormat: transparent ? 'yuva420p' : 'yuv420p',
		// highest quality: every clip at its full authored size (HD 1920x1080, characters 1024, symbols 512)
		// and near-lossless VP9 (CRF 10, constant quality: bits go wherever the detail needs them)
		scale: 1,
		crf: Number(process.env.CRF ?? 10),
		concurrency: 4,
		logLevel: 'error',
	});
	console.log(`${comp.id}  ${((Date.now() - t0) / 1000).toFixed(0)}s  ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
console.log('done');
