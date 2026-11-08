/**
 * Registers the bundled font through the FontFace API from in-memory bytes (SIL Open Font License).
 * @font-face rules with data: URLs are blocked by some hosts' Content-Security-Policy (font-src) and
 * skipped by some browsers, which left every text in a system font. A FontFace made from an ArrayBuffer
 * is not fetched, so nothing can block it.
 */
import luckiest from './LuckiestGuy.woff2?inline';

const bytes = (dataUrl: string) => {
	const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out.buffer;
};

// One typeface for the whole slot: Luckiest Guy, the comic display face of the game art. It is also
// registered under 'proxima-nova', the family the shared web-sdk UI (bet bar, menus, modals) asks for,
// at every weight, so those texts match too instead of using a second font.
const FACES: [family: string, weight: string, data: string][] = [
	['Luckiest Guy', '400', luckiest],
	...['100', '200', '300', '400', '500', '600', '700', '800', '900'].map((w) => ['proxima-nova', w, luckiest] as [string, string, string]),
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
