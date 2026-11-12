/**
 * Timeline engine for the win presentation.
 *
 * A Timeline holds tweens (eased value changes written through a setter) and cues (callbacks at a time),
 * all at fixed times: nothing is random, so the same book always presents the same way. Timelines are
 * advanced by one shared runner on the PixiJS ticker (delta time); `finish()` jumps to the end (applying
 * every final value and firing every remaining cue in order), `kill()` stops without applying anything.
 * Either way the timeline resolves `done` and leaves the runner, so nothing keeps ticking afterwards.
 */
import type * as PIXI from 'pixi.js';
import { EASE, type EaseName } from './easing';

type TweenItem = { at: number; dur: number; ease: EaseName; from: number; to: number; set: (v: number) => void; ended: boolean };
type CueItem = { at: number; fn: () => void; fired: boolean };

export class Timeline {
	private tweens: TweenItem[] = [];
	private cues: CueItem[] = [];
	private t = 0;
	private resolve!: () => void;
	readonly done: Promise<void>;
	finished = false;

	constructor(
		readonly name: string,
		public speed = 1,
	) {
		this.done = new Promise((r) => (this.resolve = r));
	}

	/** eased change of a value from `from` to `to`, starting at `at` seconds, lasting `dur` seconds */
	tween(at: number, dur: number, from: number, to: number, ease: EaseName, set: (v: number) => void) {
		this.tweens.push({ at, dur: Math.max(1e-4, dur), ease, from, to, set, ended: false });
		return this;
	}

	cue(at: number, fn: () => void) {
		this.cues.push({ at, fn, fired: false });
		this.cues.sort((a, b) => a.at - b.at);
		return this;
	}

	get duration() {
		return Math.max(0, ...this.tweens.map((w) => w.at + w.dur), ...this.cues.map((c) => c.at));
	}

	get time() {
		return this.t;
	}

	update(dt: number) {
		if (this.finished) return;
		this.t += dt * this.speed;
		this.apply();
		if (this.t >= this.duration) this.end();
	}

	private apply() {
		for (const w of this.tweens) {
			if (w.ended || this.t < w.at) continue;
			const k = (this.t - w.at) / w.dur;
			if (k >= 1) {
				w.set(w.to);
				w.ended = true;
			} else w.set(w.from + (w.to - w.from) * EASE[w.ease](k));
		}
		for (const c of this.cues) if (!c.fired && this.t >= c.at) ((c.fired = true), c.fn());
	}

	/** jump to the end: final values applied and remaining cues fired in time order */
	finish() {
		if (this.finished) return;
		this.t = this.duration;
		const pending = [...this.tweens.filter((w) => !w.ended), ...this.cues.filter((c) => !c.fired)].sort(
			(a, b) => ('dur' in a ? a.at + a.dur : a.at) - ('dur' in b ? b.at + b.dur : b.at),
		);
		for (const p of pending) {
			if ('fn' in p) ((p.fired = true), p.fn());
			else ((p.ended = true), p.set(p.to));
		}
		this.end();
	}

	/** stop immediately without applying anything further */
	kill() {
		this.end();
	}

	private end() {
		if (this.finished) return;
		this.finished = true;
		runner.remove(this);
		this.resolve();
	}
}

/** One ticker callback for every running timeline; attached only while something runs. */
class Runner {
	private active = new Set<Timeline>();
	private ticker: PIXI.Ticker | null = null;
	private attached = false;
	private raf = 0;
	private last = 0;

	setTicker(ticker: PIXI.Ticker | null) {
		this.detach();
		this.ticker = ticker;
		if (this.active.size) this.attach();
	}

	play(tl: Timeline) {
		this.active.add(tl);
		this.attach();
		return tl;
	}

	remove(tl: Timeline) {
		this.active.delete(tl);
		if (!this.active.size) this.detach();
	}

	get running() {
		return this.active.size;
	}

	private tick = (dtSeconds: number) => {
		const dt = Math.min(dtSeconds, 0.05);
		for (const tl of [...this.active]) tl.update(dt);
	};
	private onTicker = (tk: PIXI.Ticker) => this.tick(tk.deltaMS / 1000);
	private onRaf = (now: number) => {
		this.tick(this.last ? (now - this.last) / 1000 : 1 / 60);
		this.last = now;
		this.raf = requestAnimationFrame(this.onRaf);
	};

	private attach() {
		if (this.attached) return;
		this.attached = true;
		if (this.ticker) this.ticker.add(this.onTicker);
		else this.raf = requestAnimationFrame(this.onRaf);
	}

	private detach() {
		if (!this.attached) return;
		this.attached = false;
		this.ticker?.remove(this.onTicker);
		cancelAnimationFrame(this.raf);
		this.last = 0;
	}
}

export const runner = new Runner();

/** Create and start a timeline. */
export const play = (tl: Timeline) => runner.play(tl);
