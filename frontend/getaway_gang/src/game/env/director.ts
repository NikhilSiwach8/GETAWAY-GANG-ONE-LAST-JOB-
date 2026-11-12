/**
 * Environment director: one PixiJS ticker callback drives every environmental controller (backgrounds and
 * the reel-frame machinery), apart from the reels and win presentation, which keep their own timing.
 *
 * - Animation is advanced by delta time (seconds, clamped to 1/20 s so a long frame or a return from a hidden
 *   tab never makes anything jump).
 * - Pausing is by reason (tab hidden, an opaque full-screen clip covering the scene, ...). While any reason is
 *   active the clock stops and resumes exactly where it was.
 * - Quality tier: phones and prefers-reduced-motion get fewer particles and calmer motion.
 */
import type * as PIXI from 'pixi.js';

export type EnvQuality = {
	/** multiplier for particle counts and optional decorations (1 desktop, ~0.5 phones) */
	density: number;
	/** multiplier for movement amplitude/speed (1 normal, 0.4 reduced motion) */
	motion: number;
	mobile: boolean;
};

export type EnvFrame = {
	/** seconds since the last frame (clamped) */
	dt: number;
	/** environment clock in seconds (stops while paused) */
	t: number;
	quality: EnvQuality;
};

export interface EnvController {
	update(f: EnvFrame): void;
	destroy?(): void;
}

const detectQuality = (): EnvQuality => {
	const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
	const mobile =
		/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
	const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	return { density: mobile ? 0.5 : 1, motion: reduced ? 0.4 : 1, mobile };
};

export class EnvDirector {
	readonly quality = detectQuality();
	private controllers = new Set<EnvController>();
	private pauses = new Set<string>();
	private t = 0;
	private ticker: PIXI.Ticker;
	private onVisibility = () => this.setPaused('hidden', document.hidden);

	constructor(ticker: PIXI.Ticker) {
		this.ticker = ticker;
		ticker.add(this.tick);
		document.addEventListener('visibilitychange', this.onVisibility);
	}

	private tick = (ticker: PIXI.Ticker) => {
		if (this.pauses.size || !this.controllers.size) return;
		const dt = Math.min(ticker.deltaMS / 1000, 0.05);
		this.t += dt;
		const f: EnvFrame = { dt, t: this.t, quality: this.quality };
		for (const c of this.controllers) c.update(f);
	};

	/** Advance by a fixed dt regardless of pauses (deterministic captures in tests). */
	step(dt: number) {
		this.t += dt;
		const f: EnvFrame = { dt, t: this.t, quality: this.quality };
		for (const c of this.controllers) c.update(f);
	}

	add(c: EnvController) {
		this.controllers.add(c);
		return () => this.remove(c);
	}

	remove(c: EnvController) {
		if (this.controllers.delete(c)) c.destroy?.();
	}

	setPaused(reason: string, paused: boolean) {
		if (paused) this.pauses.add(reason);
		else this.pauses.delete(reason);
	}

	get paused() {
		return this.pauses.size > 0;
	}

	destroy() {
		this.ticker.remove(this.tick);
		document.removeEventListener('visibilitychange', this.onVisibility);
		for (const c of [...this.controllers]) this.remove(c);
	}
}

let director: EnvDirector | null = null;
let users = 0;

/** Shared director for the app's ticker (created by the first user, destroyed with the last). */
export const acquireEnvDirector = (ticker: PIXI.Ticker) => {
	if (!director) director = new EnvDirector(ticker);
	users++;
	const d = director;
	return {
		director: d,
		release: () => {
			if (--users === 0 && director === d) {
				d.destroy();
				director = null;
			}
		},
	};
};
