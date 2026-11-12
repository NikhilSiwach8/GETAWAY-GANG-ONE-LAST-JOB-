/**
 * Small procedural textures shared by every environment controller. Each is drawn once on a canvas the
 * first time it is asked for and then reused by all scenes (no per-effect or per-scene copies). Together
 * they are about 0.4 MB of GPU memory.
 */
import * as PIXI from 'pixi.js';

const cache = new Map<string, PIXI.Texture>();

const make = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	draw(c.getContext('2d')!, w, h);
	const tex = PIXI.Texture.from(c);
	tex.source.scaleMode = 'linear';
	cache.set(key, tex);
	return tex;
};

/** Soft round dot (dust motes, embers). */
export const dotTexture = () =>
	make('dot', 32, 32, (g, w) => {
		const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.35, 'rgba(255,255,255,0.55)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, w, w);
	});

/** Thin vertical streak (rain). */
export const streakTexture = () =>
	make('streak', 4, 64, (g, w, h) => {
		const l = g.createLinearGradient(0, 0, 0, h);
		l.addColorStop(0, 'rgba(255,255,255,0)');
		l.addColorStop(0.7, 'rgba(255,255,255,0.8)');
		l.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = l;
		g.fillRect(1, 0, w - 2, h);
	});

/**
 * Light cone, origin at the bottom centre, opening upward and fading out with distance. Rotate it about
 * its origin (anchor 0.5, 1) to aim it.
 */
export const beamTexture = () =>
	make('beam', 128, 512, (g, w, h) => {
		const img = g.createImageData(w, h);
		for (let y = 0; y < h; y++) {
			const d = 1 - y / h; // 0 at the origin, 1 at the far end
			const half = 0.04 + 0.46 * d; // cone half-width (fraction of the texture width)
			const along = Math.min(1, d * 6) * Math.pow(1 - d, 0.9); // fades in from the lamp, out at the end
			for (let x = 0; x < w; x++) {
				const u = Math.abs(x / (w - 1) - 0.5) / half;
				const a = u >= 1 ? 0 : Math.pow(1 - u * u, 1.6) * along;
				const i = (y * w + x) * 4;
				img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
				img.data[i + 3] = Math.round(255 * a);
			}
		}
		g.putImageData(img, 0, 0);
	});

/** Four-point glint (metal and gem sparkle). */
export const glintTexture = () =>
	make('glint', 64, 64, (g, w) => {
		const c = w / 2;
		const core = g.createRadialGradient(c, c, 0, c, c, c * 0.45);
		core.addColorStop(0, 'rgba(255,255,255,1)');
		core.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = core;
		g.fillRect(0, 0, w, w);
		for (const [dx, dy] of [
			[1, 0],
			[0, 1],
		]) {
			const l = dx ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(0, 0, 0, w);
			l.addColorStop(0, 'rgba(255,255,255,0)');
			l.addColorStop(0.5, 'rgba(255,255,255,0.95)');
			l.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = l;
			if (dx) g.fillRect(0, c - 1.5, w, 3);
			else g.fillRect(c - 1.5, 0, 3, w);
		}
	});

/** Soft horizontal band, opaque in the middle (sheen / reflection reveal mask). */
export const bandTexture = () =>
	make('band', 128, 16, (g, w, h) => {
		const l = g.createLinearGradient(0, 0, w, 0);
		l.addColorStop(0, 'rgba(255,255,255,0)');
		l.addColorStop(0.5, 'rgba(255,255,255,1)');
		l.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = l;
		g.fillRect(0, 0, w, h);
	});

/** Round mask with a 2 px soft edge (machinery rotors). */
export const discTexture = () =>
	make('disc', 256, 256, (g, w) => {
		const r = g.createRadialGradient(w / 2, w / 2, w / 2 - 3, w / 2, w / 2, w / 2);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.beginPath();
		g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
		g.fill();
	});
