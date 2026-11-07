/**
 * Animation clips (VP9 WebM with alpha, rendered by video/ with Remotion) played as Pixi video textures.
 *
 * Clips are cosmetic: every outcome still comes from the book events. When a browser cannot play
 * transparent WebM (Safari/iOS), `clipsSupported` is false and callers fall back to the title cards.
 */
import * as PIXI from 'pixi.js';
import { stateBet } from 'state-shared';
import { CLIP_URLS } from './clipUrls';

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
const isSafari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
export const clipsSupported =
	typeof document !== 'undefined' &&
	!isSafari &&
	document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';

export type Clip = { video: HTMLVideoElement; texture: PIXI.Texture };
const cache = new Map<string, Clip>();

export const hasClip = (id: string) => clipsSupported && id in CLIP_URLS;

/** One video element + texture per (clip, channel). Sprites on the same channel share a timeline. */
export const getClip = (id: string, channel = 'main'): Clip | undefined => {
	if (!hasClip(id)) return undefined;
	const key = `${id}|${channel}`;
	let clip = cache.get(key);
	if (!clip) {
		const video = document.createElement('video');
		video.src = CLIP_URLS[id];
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		video.crossOrigin = 'anonymous';
		const source = new PIXI.VideoSource({ resource: video, autoPlay: false, autoLoad: true, updateFPS: 30 });
		clip = { video, texture: new PIXI.Texture({ source }) };
		cache.set(key, clip);
	}
	return clip;
};

/**
 * Wait until the video knows its size and has a frame. Pixi 8.8's VideoSource recurses forever
 * (_onPlayStart <-> _mediaReady) if play() starts while videoWidth is still 0, so never play before this.
 */
export const whenReady = (v: HTMLVideoElement, timeoutMs = 8000): Promise<boolean> =>
	new Promise((resolve) => {
		if (v.readyState >= 2 && v.videoWidth > 0) return resolve(true);
		const finish = (ok: boolean) => {
			clearTimeout(timer);
			v.removeEventListener('loadeddata', onReady);
			v.removeEventListener('error', onFail);
			resolve(ok);
		};
		const onReady = () => finish(v.videoWidth > 0);
		const onFail = () => finish(false);
		const timer = setTimeout(() => finish(false), timeoutMs);
		v.addEventListener('loadeddata', onReady);
		v.addEventListener('error', onFail);
	});

/** Start a clip from frame 0. Resolves true when a one-shot clip ends (or a loop starts), false on failure. */
export const playVideo = async (clip: Clip, loop = false): Promise<boolean> => {
	if (!(await whenReady(clip.video))) return false;
	return new Promise((resolve) => {
		const v = clip.video;
		v.loop = loop;
		v.playbackRate = stateBet.isTurbo ? 2 : 1;
		try {
			v.currentTime = 0;
		} catch {
			/* not seekable yet */
		}
		const done = (ok: boolean) => {
			v.removeEventListener('ended', onEnd);
			v.removeEventListener('error', onErr);
			resolve(ok);
		};
		const onEnd = () => done(true);
		const onErr = () => done(false);
		if (!loop) {
			v.addEventListener('ended', onEnd);
			v.addEventListener('error', onErr);
		}
		v.play()
			.then(() => loop && resolve(true))
			.catch(() => done(false));
	});
};

/** Clips whose own artwork fills the frame (shown over a dark backdrop). */
const FULL_FRAME = new Set(['CIN-PERFECTLY-BAD-PLAN', 'CIN-MAX-WIN', 'CIN-FINAL-ESCAPE']);

/** The single full-screen clip slot rendered by ClipLayer.svelte. */
export const clipLayer = $state({
	id: null as string | null,
	texture: null as PIXI.Texture | null,
	fullFrame: false,
	skip: () => {},
});

/**
 * Play a full-screen clip and wait for it (tap to skip). Returns false immediately if clips are not
 * supported or the clip fails, so the caller can show its fallback title card instead.
 */
export const playClip = async (id: string): Promise<boolean> => {
	const clip = getClip(id, 'layer');
	if (!clip) return false;
	// never show an empty/black layer while a clip is still downloading
	if (!(await whenReady(clip.video))) return false;
	clipLayer.id = id;
	clipLayer.texture = clip.texture;
	clipLayer.fullFrame = FULL_FRAME.has(id);
	const skipped = new Promise<boolean>((resolve) => {
		clipLayer.skip = () => {
			clip.video.pause();
			resolve(true);
		};
	});
	const ok = await Promise.race([playVideo(clip), skipped]);
	clipLayer.id = null;
	clipLayer.texture = null;
	clipLayer.skip = () => {};
	return ok;
};

/**
 * Warm up clips in the background after the game loads (most frequent first), on the same channels the
 * game plays them on, so the first showing does not wait for a download.
 */
export const prefetchClips = () => {
	if (!clipsSupported) return;
	const layer = [
		'FX-CREW-CHAOS', 'ANIM-ROXY-ABILITY-FX', 'ANIM-BYTE-ABILITY-FX', 'ANIM-TANK-ABILITY-FX', 'ANIM-FUSE-ABILITY-FX',
		'FX-RESPIN', 'FX-METER-STAGE', 'FX-COMBO-RB', 'FX-COMBO-BT', 'FX-COMBO-TF', 'FX-COMBO-FR', 'FX-COMBO-RT',
		'FX-LOOT-MILESTONE', 'FX-RETRIGGER', 'CIN-PERFECTLY-BAD-PLAN', 'CIN-CLEAN-GETAWAY', 'CIN-FINAL-ESCAPE', 'CIN-MAX-WIN',
	];
	const symbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'WILD', 'SCATTER', 'ROXY', 'BYTE', 'TANK', 'FUSE'];
	const jobs: [string, string][] = [
		['BG-MAIN-LOOP', 'bg'],
		...layer.slice(0, 6).map((id) => [id, 'layer'] as [string, string]),
		...symbols.map((s) => [`SYM-${s}-ANIM-WIN`, 'sym'] as [string, string]),
		...['CLONE-IN', 'UPGRADE-IN', 'VAULT-REVEAL', 'WILD-STAMP', 'CREW-EXIT'].map((k) => [`SYM-FX-${k}`, 'cell'] as [string, string]),
		...['WIN-BIG', 'WIN-SUPER', 'WIN-MEGA', 'WIN-EPIC'].map((id) => [id, 'win'] as [string, string]),
		...layer.slice(6).map((id) => [id, 'layer'] as [string, string]),
		['BG-ESCAPE-LOOP', 'bg'],
	];
	// a few at a time so the first ones are ready quickly
	let i = 0;
	const next = () => {
		if (i >= jobs.length) return;
		const [id, channel] = jobs[i++];
		const clip = getClip(id, channel);
		if (clip) whenReady(clip.video, 20000).then(next);
		else next();
	};
	for (let k = 0; k < 3; k++) next();
};

// ------------------------------------------------------------------ crew mascot beside the reels
export type MascotAction = 'IDLE' | 'ABILITY' | 'COMPLETE' | 'WIN' | 'LOSE' | 'BONUS-INTRO' | 'VICTORY' | 'COMBO';
export const mascot = $state({ crew: 'ROXY' as 'ROXY' | 'BYTE' | 'TANK' | 'FUSE', action: 'IDLE' as MascotAction, nonce: 0 });
export const mascotDo = (action: MascotAction, crew?: typeof mascot.crew) => {
	if (crew) mascot.crew = crew;
	mascot.action = action;
	mascot.nonce += 1;
};

// ------------------------------------------------------------------ cell-sized transformation effects
export type CellFx = { id: string; key: number; cells: { reel: number; row: number }[] };
export const cellFx = $state({ list: [] as CellFx[] });
let cellKey = 0;
/** Play SYM-FX-* over board cells (positions include the padding row). Resolves when it ends. */
export const playCellFx = (id: string, cells: { reel: number; row: number }[]): Promise<boolean> => {
	if (!hasClip(id) || !cells.length) return Promise.resolve(false);
	const clip = getClip(id, 'cell');
	if (!clip) return Promise.resolve(false);
	const entry = { id, key: cellKey++, cells };
	cellFx.list = [...cellFx.list, entry];
	return playVideo(clip).then((ok) => {
		cellFx.list = cellFx.list.filter((e) => e.key !== entry.key);
		return ok;
	});
};
