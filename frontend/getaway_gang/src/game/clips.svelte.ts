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

export type Clip = { video: HTMLVideoElement; texture: PIXI.Texture; lastUsed: number; refs: number };
const cache = new Map<string, Clip>();

export const hasClip = (id: string) => clipsSupported && id in CLIP_URLS;

// ---------------------------------------------------------------- downloads
// Clips are downloaded once into memory (Blob URLs). A <video> made from a Blob URL is ready within a
// frame or two, so the game never stalls on the network mid-round, and no <video> element has to sit
// around "preloading" (Chrome suspends idle players and re-creates their decoder on play, which stutters).
const blobs = new Map<string, string>();
const downloads = new Map<string, Promise<string | null>>();
const download = (id: string): Promise<string | null> => {
	if (blobs.has(id)) return Promise.resolve(blobs.get(id)!);
	if (!downloads.has(id)) {
		downloads.set(
			id,
			fetch(CLIP_URLS[id])
				.then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
				.then((b) => {
					const url = URL.createObjectURL(b);
					blobs.set(id, url);
					return url;
				})
				.catch(() => null),
		);
	}
	return downloads.get(id)!;
};
/** True once the clip is in memory, i.e. it can start without waiting for the network. */
export const isDownloaded = (id: string) => blobs.has(id);

// ---------------------------------------------------------------- players
// At most MAX_PLAYERS <video> elements exist; the least recently used idle one is released first.
// phones have far fewer hardware video decoders: keep fewer players alive there
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
const MAX_PLAYERS = isMobile ? 8 : 20;
const release = (key: string, clip: Clip) => {
	clip.video.pause();
	clip.video.removeAttribute('src');
	clip.video.load();
	clip.texture.destroy(true);
	cache.delete(key);
};
const evict = () => {
	if (cache.size < MAX_PLAYERS) return;
	const idle = [...cache.entries()].filter(([, c]) => c.refs === 0 && c.video.paused).sort((x, y) => x[1].lastUsed - y[1].lastUsed);
	for (const [key, clip] of idle.slice(0, cache.size - MAX_PLAYERS + 1)) release(key, clip);
};

/** One video element + texture per (clip, channel). Sprites on the same channel share a timeline. */
export const getClip = (id: string, channel = 'main'): Clip | undefined => {
	if (!hasClip(id)) return undefined;
	const key = `${id}|${channel}`;
	let clip = cache.get(key);
	if (!clip) {
		evict();
		const video = document.createElement('video');
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		video.crossOrigin = 'anonymous';
		const local = blobs.get(id);
		if (local) video.src = local;
		else download(id).then((url) => (video.src = url ?? CLIP_URLS[id]));
		// the background loops are slow parallax: half the texture uploads of the effect clips
		const updateFPS = channel === 'bg' ? 15 : 30;
		const source = new PIXI.VideoSource({ resource: video, autoPlay: false, autoLoad: true, updateFPS });
		clip = { video, texture: new PIXI.Texture({ source }), lastUsed: 0, refs: 0 };
		cache.set(key, clip);
	}
	clip.lastUsed = performance.now();
	return clip;
};

/** Mark a clip as on screen (its texture is never released while retained). */
export const retain = (clip: Clip) => void (clip.refs += 1);
export const unretain = (clip: Clip) => {
	clip.refs = Math.max(0, clip.refs - 1);
	clip.lastUsed = performance.now();
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

/**
 * Start a clip from frame 0. Resolves true when a one-shot clip ends (or a loop starts), false on failure.
 * Never hangs: the round waits on this, so it also resolves if the video is paused/emptied by anything
 * else, and after a safety timeout (clip length + 1.5 s). The clip is retained while it plays so the
 * player pool cannot release it mid-playback.
 */
export const playVideo = async (clip: Clip, loop = false): Promise<boolean> => {
	retain(clip); // held from here so the pool cannot release it while it loads or plays
	// the round waits on one-shot clips: give up quickly (the caller shows its fallback) rather than stall
	if (!(await whenReady(clip.video, loop ? 8000 : 2500))) {
		unretain(clip);
		return false;
	}
	clip.lastUsed = performance.now();
	return new Promise((resolve) => {
		const v = clip.video;
		v.loop = loop;
		const rate = stateBet.isTurbo ? 2 : 1;
		v.playbackRate = rate;
		try {
			v.currentTime = 0;
		} catch {
			/* not seekable yet */
		}
		let settled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const done = (ok: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			v.removeEventListener('ended', onEnd);
			v.removeEventListener('error', onErr);
			v.removeEventListener('emptied', onErr);
			v.removeEventListener('pause', onPause);
			unretain(clip);
			resolve(ok);
		};
		const onEnd = () => done(true);
		const onErr = () => done(false);
		// a pause before the end (skip, eviction, tab hidden) must not leave the round waiting
		const onPause = () => {
			if (!v.ended) done(true);
		};
		if (!loop) {
			v.addEventListener('ended', onEnd);
			v.addEventListener('error', onErr);
			v.addEventListener('emptied', onErr);
			const ms = (Number.isFinite(v.duration) && v.duration > 0 ? v.duration / rate : 10) * 1000 + 1500;
			timer = setTimeout(() => done(true), ms);
		}
		v.play()
			.then(() => {
				if (loop) return done(true);
				v.addEventListener('pause', onPause);
			})
			.catch(() => done(false));
	});
};

/** Clips whose own artwork fills the frame (shown over a dark backdrop). */
const FULL_FRAME = new Set(['CIN-PERFECTLY-BAD-PLAN', 'CIN-MAX-WIN', 'CIN-FINAL-ESCAPE']);

/**
 * The full-screen clip slots rendered by ClipLayer.svelte. `current` fades in; when it ends it moves to
 * `outgoing` and fades out while the next clip (if any) fades in on top, so consecutive clips cross-fade
 * instead of cutting through an empty frame.
 */
export type LayerSlot = { key: number; id: string; texture: PIXI.Texture; fullFrame: boolean };
export const clipLayer = $state({
	current: null as LayerSlot | null,
	outgoing: null as LayerSlot | null,
	skip: () => {},
});
let layerKey = 0;
export const LAYER_FADE_IN_MS = 140;
export const LAYER_FADE_OUT_MS = 260;

/**
 * Play a full-screen clip and wait for it (tap to skip). Returns false quickly if clips are not supported,
 * the clip is not downloaded yet or it fails, so the caller shows its title card instead of freezing.
 */
export const playClip = async (id: string): Promise<boolean> => {
	if (!hasClip(id)) return false;
	// not in memory yet: the title card is better than a pause while it downloads
	if (!isDownloaded(id)) {
		download(id);
		return false;
	}
	const clip = getClip(id, 'layer');
	if (!clip || !(await whenReady(clip.video, 1500))) return false;
	retain(clip);
	// only one HD video at a time: hold the background loop while a full-screen clip plays
	const heldBg = [...cache.entries()].filter(([k, c]) => k.endsWith('|bg') && !c.video.paused).map(([, c]) => c);
	heldBg.forEach((c) => c.video.pause());
	const slot: LayerSlot = { key: layerKey++, id, texture: clip.texture, fullFrame: FULL_FRAME.has(id) };
	clipLayer.current = slot;
	const skipped = new Promise<boolean>((resolve) => {
		clipLayer.skip = () => {
			clip.video.pause();
			resolve(true);
		};
	});
	const ok = await Promise.race([playVideo(clip), skipped]);
	clipLayer.skip = () => {};
	if (clipLayer.current?.key === slot.key) {
		clipLayer.current = null;
		clipLayer.outgoing = slot; // holds the last frame while it fades
	}
	setTimeout(() => {
		if (clipLayer.outgoing?.key === slot.key) clipLayer.outgoing = null;
		unretain(clip);
	}, LAYER_FADE_OUT_MS + 60);
	// resume the background unless another full-screen clip has started meanwhile
	setTimeout(() => {
		if (!clipLayer.current) heldBg.forEach((c) => c.refs > 0 && c.video.play().catch(() => {}));
	}, 120);
	return ok;
};

/**
 * Download clips in the background after the game loads, most frequent first, a few at a time.
 */
export const prefetchClips = () => {
	if (!clipsSupported) return;
	const symbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'WILD', 'SCATTER', 'ROXY', 'BYTE', 'TANK', 'FUSE'];
	const first = [
		'FX-TRANSITION',
		'BG-MAIN-LOOP',
		'FX-ANTICIPATION',
		...symbols.map((s) => `SYM-${s}-ANIM-WIN`),
		...['WILD', 'SCATTER', 'ROXY', 'BYTE', 'TANK', 'FUSE'].map((s) => `SYM-${s}-ANIM-LAND`),
		'FX-CREW-CHAOS', 'ANIM-ROXY-ABILITY-FX', 'ANIM-BYTE-ABILITY-FX', 'ANIM-TANK-ABILITY-FX', 'ANIM-FUSE-ABILITY-FX',
		...['CLONE-IN', 'UPGRADE-IN', 'VAULT-REVEAL', 'WILD-STAMP', 'CREW-EXIT'].map((k) => `SYM-FX-${k}`),
		...['ROXY', 'BYTE', 'TANK', 'FUSE'].flatMap((c) => ['IDLE', 'ABILITY', 'COMPLETE', 'WIN', 'LOSE'].map((a) => `ANIM-${c}-${a}`)),
		'FX-RESPIN', 'FX-METER-STAGE', 'FX-COMBO-RB', 'FX-COMBO-BT', 'FX-COMBO-TF', 'FX-COMBO-FR', 'FX-COMBO-RT',
		'WIN-BIG', 'WIN-SUPER', 'WIN-MEGA', 'WIN-EPIC',
		'SCR-HEIST-INTRO', 'SCR-HEIST-INTRO-LOOP', 'SCR-ESCAPE-INTRO', 'SCR-ESCAPE-INTRO-LOOP',
		'SCR-HEIST-OUTRO', 'SCR-ESCAPE-OUTRO',
	];
	const rest = Object.keys(CLIP_URLS).filter((id) => !first.includes(id));
	const queue = [...first, ...rest].filter((id) => id in CLIP_URLS);
	let i = 0;
	const next = (): unknown => i < queue.length && download(queue[i++]).then(next);
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
	if (!isDownloaded(id)) {
		download(id);
		return Promise.resolve(false);
	}
	const clip = getClip(id, 'cell');
	if (!clip) return Promise.resolve(false);
	const entry = { id, key: cellKey++, cells };
	cellFx.list = [...cellFx.list, entry];
	return playVideo(clip).then((ok) => {
		cellFx.list = cellFx.list.filter((e) => e.key !== entry.key);
		return ok;
	});
};

/** Sprite scale that draws a video texture at w×h, from the video's real pixel size (see ClipSprite). */
export const videoScale = (texture: PIXI.Texture, w: number, h: number) => {
	const v = texture.source?.resource as HTMLVideoElement | undefined;
	return { x: w / (v?.videoWidth || w), y: h / (v?.videoHeight || h) };
};
