/**
 * Registers the bundled fonts through the FontFace API from in-memory bytes (SIL Open Font License).
 * @font-face rules with data: URLs are blocked by some hosts' Content-Security-Policy (font-src) and
 * skipped by some browsers, which left every text in a system font. A FontFace made from an ArrayBuffer
 * is not fetched, so nothing can block it.
 */
import luckiest from './LuckiestGuy.woff2?inline';
import barlow600 from './BarlowCondensed-600.woff2?inline';
import barlow700 from './BarlowCondensed-700.woff2?inline';

const bytes = (dataUrl: string) => {
	const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out.buffer;
};

// Two faces: Luckiest Guy (the comic display face of the game art, OFL) for titles, and Barlow Condensed
// (OFL) for body copy, labels and numbers in the HTML screens, so small text stays readable instead of being
// set in a display face. Barlow is also registered under 'proxima-nova', the family the shared web-sdk UI asks
// for, so those texts match the game's body face. (In-canvas titles use the painted bitmap alphabets.)
const FACES: [family: string, weight: string, data: string][] = [
	['Luckiest Guy', '400', luckiest],
	['Barlow Condensed', '600', barlow600],
	['Barlow Condensed', '700', barlow700],
	...['100', '200', '300', '400', '500', '600'].map((w) => ['proxima-nova', w, barlow600] as [string, string, string]),
	...['700', '800', '900'].map((w) => ['proxima-nova', w, barlow700] as [string, string, string]),
];

export const fontsReady: Promise<unknown> =
	typeof document === 'undefined' || typeof FontFace === 'undefined'
		? Promise.resolve()
		: Promise.all(
				FACES.map(([family, weight, data]) => {
					const face = new FontFace(family, bytes(data), { weight, display: 'block' });
					document.fonts.add(face);
					return face.load().catch(() => undefined);
				}),
			);
