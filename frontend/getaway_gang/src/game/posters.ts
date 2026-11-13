/**
 * Poster stills of the bonus cards (each clip's final frame, art/sync_clips.py posters): shown until the clip's
 * first frame arrives, and kept if the clip cannot play at all, so a bonus screen is never black. Loaded on
 * demand (not with the main assets) and released when the screen closes.
 */
import * as PIXI from 'pixi.js';

const URLS: Record<string, string> = {
	'ENTRY-HEIST': new URL('../../assets/clips/posters/ENTRY-HEIST-POSTER.webp', import.meta.url).href,
	'ENTRY-HEIST-PORTRAIT': new URL('../../assets/clips/posters/ENTRY-HEIST-PORTRAIT-POSTER.webp', import.meta.url).href,
	'ENTRY-ESCAPE': new URL('../../assets/clips/posters/ENTRY-ESCAPE-POSTER.webp', import.meta.url).href,
	'ENTRY-ESCAPE-PORTRAIT': new URL('../../assets/clips/posters/ENTRY-ESCAPE-PORTRAIT-POSTER.webp', import.meta.url).href,
	'ENTRY-HIDDEN': new URL('../../assets/clips/posters/ENTRY-HIDDEN-POSTER.webp', import.meta.url).href,
	'ENTRY-HIDDEN-PORTRAIT': new URL('../../assets/clips/posters/ENTRY-HIDDEN-PORTRAIT-POSTER.webp', import.meta.url).href,
	'TOTAL-HEIST': new URL('../../assets/clips/posters/TOTAL-HEIST-POSTER.webp', import.meta.url).href,
	'TOTAL-HEIST-PORTRAIT': new URL('../../assets/clips/posters/TOTAL-HEIST-PORTRAIT-POSTER.webp', import.meta.url).href,
	'TOTAL-ESCAPE': new URL('../../assets/clips/posters/TOTAL-ESCAPE-POSTER.webp', import.meta.url).href,
	'TOTAL-ESCAPE-PORTRAIT': new URL('../../assets/clips/posters/TOTAL-ESCAPE-PORTRAIT-POSTER.webp', import.meta.url).href,
	'TOTAL-HIDDEN': new URL('../../assets/clips/posters/TOTAL-HIDDEN-POSTER.webp', import.meta.url).href,
	'TOTAL-HIDDEN-PORTRAIT': new URL('../../assets/clips/posters/TOTAL-HIDDEN-PORTRAIT-POSTER.webp', import.meta.url).href,
};

const cache = new Map<string, Promise<PIXI.Texture | null>>();

/** The poster of a clip id (e.g. ENTRY-HEIST-PORTRAIT), or null if none / it failed to load. */
export const loadPoster = (clipId: string): Promise<PIXI.Texture | null> => {
	const url = URLS[clipId];
	if (!url) return Promise.resolve(null);
	if (!cache.has(clipId))
		cache.set(
			clipId,
			PIXI.Assets.load<PIXI.Texture>({ src: url, loadParser: 'loadTextures' }).catch((e) => {
				console.warn(`[clips] ${clipId}: poster failed to load (${String(e)})`);
				cache.delete(clipId);
				return null;
			}),
		);
	return cache.get(clipId)!;
};
