/**
 * Reusable environment controllers. Each one owns a few Pixi display objects inside the container it is
 * given (in that container's own pixel space, normally the background art's pixels) and animates them from
 * EnvFrame.dt / EnvFrame.t. None of them knows about the game state, the reels or the RGS.
 *
 *   AmbientLights   breathing / flickering glows (lamps, chandeliers, vault light, a slow light wash)
 *   Beams           light cones that sweep (searchlights) or spin (alarm beacons), or strobe (police bars)
 *   Glints          brief four-point sparkles on metal and gems
 *   Particles       dust motes, rain or embers in one ParticleContainer
 *   Flash           a timed full-area light change (lightning, siren wash, vault flare)
 *   EventScheduler  fires occasional one-off environment events at random intervals
 */
import * as PIXI from 'pixi.js';
import type { EnvController, EnvFrame } from './director';
import { beamTexture, dotTexture, glintTexture, streakTexture } from './textures';

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** back ease-out: a small overshoot, like a heavy wheel settling */
const backOut = (x: number, s = 1.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);

type Range = [number, number];

// ------------------------------------------------------------------------------------------------ lights
export type LightSpec = {
	x: number;
	y: number;
	/** glow size (art px) */
	w: number;
	h?: number;
	tint: number;
	alpha: number;
	/** breathing: period (s) and depth (0..1 of alpha) */
	period?: number;
	depth?: number;
	/** chance per second of a short electrical flicker (0 = never) */
	flicker?: number;
};

export class AmbientLights implements EnvController {
	private items: {
		s: PIXI.Sprite;
		spec: LightSpec;
		phase: number;
		flickerT: number;
	}[] = [];
	/** multiplies every light's alpha (events can raise it briefly) */
	boost = 1;

	constructor(parent: PIXI.Container, glow: PIXI.Texture, lights: LightSpec[]) {
		for (const spec of lights) {
			const s = new PIXI.Sprite({
				texture: glow,
				anchor: 0.5,
				blendMode: 'add',
				tint: spec.tint,
			});
			s.position.set(spec.x, spec.y);
			s.width = spec.w;
			s.height = spec.h ?? spec.w;
			parent.addChild(s);
			this.items.push({ s, spec, phase: Math.random() * TAU, flickerT: 0 });
		}
	}

	update({ dt, t, quality }: EnvFrame) {
		for (const it of this.items) {
			const { spec } = it;
			const depth = (spec.depth ?? 0.25) * quality.motion;
			let a = spec.alpha * (1 - depth / 2 + (depth / 2) * Math.sin((t * TAU) / (spec.period ?? 4) + it.phase));
			if (spec.flicker && it.flickerT <= 0 && Math.random() < spec.flicker * dt) it.flickerT = rnd(0.15, 0.45);
			if (it.flickerT > 0) {
				it.flickerT -= dt;
				a *= 0.35 + 0.65 * (Math.sin(t * 90 + it.phase) > 0 ? 1 : 0.25);
			}
			it.s.alpha = a * this.boost;
		}
	}
}

// ------------------------------------------------------------------------------------------------ beams
export type BeamSpec = {
	x: number;
	y: number;
	length: number;
	/** cone width at the far end (art px) */
	width: number;
	tint: number;
	alpha: number;
	/** aim, radians, 0 = straight up, positive = clockwise */
	angle: number;
	/** 'sweep': swings angle +- sweep with the period. 'spin': turns continuously (alarm beacon, two
	 * opposite cones). 'strobe': fixed aim, alternating on/off flashes (police light bar). */
	mode?: 'sweep' | 'spin' | 'strobe';
	sweep?: number;
	period?: number;
	phase?: number;
};

export class Beams implements EnvController {
	private items: { s: PIXI.Sprite[]; spec: BeamSpec; angle: number }[] = [];
	/** speed / brightness multiplier (events raise it briefly) */
	boost = 1;

	constructor(parent: PIXI.Container, beams: BeamSpec[]) {
		const tex = beamTexture();
		for (const spec of beams) {
			const n = spec.mode === 'spin' ? 2 : 1;
			const s = Array.from({ length: n }, () => {
				const sp = new PIXI.Sprite({
					texture: tex,
					anchor: { x: 0.5, y: 1 },
					blendMode: 'add',
					tint: spec.tint,
				});
				sp.position.set(spec.x, spec.y);
				// 80 % size: the cones are large additive sprites, and their fill cost grows with area
				sp.width = spec.width * 0.8;
				sp.height = spec.length * 0.8;
				parent.addChild(sp);
				return sp;
			});
			this.items.push({ s, spec, angle: spec.angle });
		}
	}

	update({ dt, t, quality }: EnvFrame) {
		for (const it of this.items) {
			const { spec } = it;
			const period = spec.period ?? 8;
			const ph = spec.phase ?? 0;
			if (spec.mode === 'spin') {
				it.angle += (TAU / period) * dt * quality.motion * (0.6 + 0.4 * this.boost);
				it.s.forEach((s, i) => {
					s.rotation = it.angle + i * Math.PI;
					s.alpha = spec.alpha * Math.min(1.6, this.boost);
				});
			} else if (spec.mode === 'strobe') {
				// two quick flashes, then a gap (classic light-bar rhythm)
				const p = ((t + ph) % period) / period;
				const on = p < 0.12 || (p > 0.2 && p < 0.32) ? 1 : 0.08;
				it.s[0].rotation = spec.angle;
				it.s[0].alpha = spec.alpha * on * Math.min(1.6, this.boost);
			} else {
				const sweep = (spec.sweep ?? 0.3) * quality.motion;
				it.s[0].rotation = spec.angle + sweep * Math.sin((t * TAU) / period + ph);
				it.s[0].alpha = spec.alpha * (0.85 + 0.15 * Math.sin((t * TAU) / (period * 0.37) + ph)) * Math.min(1.6, this.boost);
			}
		}
	}
}

// ------------------------------------------------------------------------------------------------ rotor

/**
 * A round part of an existing texture turned in eased steps (a vault wheel). Draw it in a container with an
 * even scale: under an uneven scale a turning part shears. Layers (all sub-textures of the same art):
 *   base   the whole wheel, static (optional, `outer`)
 *   spokes the part between hub and ring, turning
 *   hub    the centre, static on top (optional, `hub`)
 * so the painted highlights on the ring and hub stay put while the spokes turn.
 */

// ------------------------------------------------------------------------------------------------ glints
export type GlintSpec = {
	points: [number, number][];
	size: number;
	tint?: number;
	perSecond: number;
	alpha?: number;
};

export class Glints implements EnvController {
	private pool: { s: PIXI.Sprite; life: number; dur: number }[] = [];
	private acc = 0;

	constructor(
		parent: PIXI.Container,
		private spec: GlintSpec,
	) {
		const tex = glintTexture();
		for (let i = 0; i < 4; i++) {
			const s = new PIXI.Sprite({
				texture: tex,
				anchor: 0.5,
				blendMode: 'add',
				tint: spec.tint ?? 0xfff3c4,
				visible: false,
			});
			parent.addChild(s);
			this.pool.push({ s, life: 0, dur: 1 });
		}
	}

	/** n sparkles at once (events) */
	burst(n: number) {
		for (let i = 0; i < n; i++) this.spawn(rnd(0, 0.25));
	}

	private spawn(delay = 0) {
		const g = this.pool.find((p) => p.life <= 0);
		if (!g) return;
		const [x, y] = this.spec.points[Math.floor(Math.random() * this.spec.points.length)];
		g.s.position.set(x + rnd(-6, 6), y + rnd(-6, 6));
		g.dur = rnd(0.5, 0.9);
		g.life = g.dur + delay;
		g.s.rotation = rnd(-0.3, 0.3);
	}

	update({ dt, quality }: EnvFrame) {
		this.acc += dt * this.spec.perSecond * (0.5 + 0.5 * quality.density);
		while (this.acc >= 1) {
			this.acc -= 1;
			if (Math.random() < 0.8) this.spawn();
		}
		for (const g of this.pool) {
			if (g.life <= 0) continue;
			g.life -= dt;
			const p = 1 - g.life / g.dur;
			if (p < 0) {
				g.s.visible = false;
				continue;
			}
			const k = Math.sin(clamp01(p) * Math.PI);
			g.s.visible = g.life > 0;
			g.s.alpha = (this.spec.alpha ?? 0.9) * k;
			g.s.scale.set((this.spec.size / 64) * (0.4 + 0.6 * k));
			g.s.rotation += dt * 0.8;
		}
	}
}

// ------------------------------------------------------------------------------------------------ sheen

/**
 * The region of the art itself, drawn again additively and revealed only under a soft moving band: bright
 * materials (gold, chrome, wet stone) light up, dark areas stay dark, so the reflection follows the art.
 */

// ------------------------------------------------------------------------------------------------ particles
export type ParticleSpec = {
	kind: 'dust' | 'rain' | 'embers';
	/** particle count on desktop (phones get quality.density of it) */
	count: number;
	area: { x: number; y: number; w: number; h: number };
	tint: number;
	alpha: number;
	/** sprite size (art px) */
	size: number;
	/** px / s */
	speed: number;
	/** rain slant (radians) */
	slant?: number;
};

export class Particles implements EnvController {
	private pc: PIXI.ParticleContainer;
	private ps: PIXI.Particle[] = [];
	private vx: Float32Array;
	private vy: Float32Array;
	private life: Float32Array;
	private dur: Float32Array;
	private seed: Float32Array;

	constructor(
		parent: PIXI.Container,
		private spec: ParticleSpec,
		density: number,
	) {
		const rain = spec.kind === 'rain';
		const tex = rain ? streakTexture() : dotTexture();
		this.pc = new PIXI.ParticleContainer({
			dynamicProperties: {
				position: true,
				color: true,
				rotation: false,
				vertex: false,
				uvs: false,
			},
			blendMode: 'add',
		});
		this.pc.boundsArea = new PIXI.Rectangle(spec.area.x, spec.area.y, spec.area.w, spec.area.h);
		// 60 % of the authored count keeps the feel at a fraction of the fill cost
		const n = Math.max(4, Math.round(spec.count * density * 0.6));
		this.vx = new Float32Array(n);
		this.vy = new Float32Array(n);
		this.life = new Float32Array(n);
		this.dur = new Float32Array(n);
		this.seed = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const size = spec.size * rnd(0.55, 1.2);
			const p = new PIXI.Particle({
				texture: tex,
				anchorX: 0.5,
				anchorY: 0.5,
				scaleX: rain ? 0.75 : size / 32, // rain: ~3 art px wide
				scaleY: rain ? size / 64 : size / 32,
				rotation: rain ? -(spec.slant ?? 0.18) : 0,
				tint: spec.tint,
				alpha: 0,
			});
			this.ps.push(p);
			this.pc.addParticle(p);
			this.reset(i, true);
		}
		parent.addChild(this.pc);
	}

	private reset(i: number, initial = false) {
		const { area, speed, kind } = this.spec;
		const p = this.ps[i];
		p.x = area.x + Math.random() * area.w;
		p.y = initial || kind === 'dust' ? area.y + Math.random() * area.h : kind === 'rain' ? area.y - 40 : area.y + area.h;
		this.seed[i] = Math.random() * 100;
		if (kind === 'rain') {
			const v = speed * rnd(0.8, 1.2);
			this.vx[i] = Math.sin(this.spec.slant ?? 0.18) * v;
			this.vy[i] = Math.cos(this.spec.slant ?? 0.18) * v;
			this.dur[i] = 1e9;
		} else {
			this.vx[i] = rnd(-0.3, 0.3) * speed;
			this.vy[i] = -speed * rnd(0.4, 1); // drift upward
			this.dur[i] = rnd(5, 11);
		}
		this.life[i] = initial ? Math.random() * this.dur[i] : 0;
	}

	update({ dt, t, quality }: EnvFrame) {
		const { area, kind, alpha } = this.spec;
		const m = quality.motion;
		for (let i = 0; i < this.ps.length; i++) {
			const p = this.ps[i];
			this.life[i] += dt;
			if (kind === 'rain') {
				p.x += this.vx[i] * dt * m;
				p.y += this.vy[i] * dt * m;
				p.alpha = alpha;
				if (p.y > area.y + area.h || p.x > area.x + area.w + 40) this.reset(i);
				continue;
			}
			const s = this.seed[i];
			p.x += (this.vx[i] + Math.sin(t * 0.7 + s) * 9) * dt * m;
			p.y += this.vy[i] * dt * m;
			const k = this.life[i] / this.dur[i];
			// fade in, live, fade out; dust twinkles a little as it turns in the light
			const fade = Math.min(1, k * 5, (1 - k) * 4);
			p.alpha = alpha * Math.max(0, fade) * (kind === 'dust' ? 0.65 + 0.35 * Math.sin(t * 2.3 + s) : 1);
			if (k >= 1 || p.y < area.y - 20) this.reset(i);
		}
	}
}

// ------------------------------------------------------------------------------------------------ flash
export type FlashSpec = {
	x: number;
	y: number;
	w: number;
	h: number;
	tint: number;
	alpha: number;
	/** alpha keyframes over the duration: [time 0..1, level 0..1][] */
	curve: [number, number][];
	duration: number;
};

/** A one-off light change over an area (soft glow sprite), e.g. lightning or a siren wash. */
export class Flash implements EnvController {
	private s: PIXI.Sprite;
	private k = 1;

	constructor(
		parent: PIXI.Container,
		glow: PIXI.Texture,
		private spec: FlashSpec,
	) {
		this.s = new PIXI.Sprite({
			texture: glow,
			anchor: 0.5,
			blendMode: 'add',
			tint: spec.tint,
			visible: false,
		});
		this.s.position.set(spec.x, spec.y);
		this.s.width = spec.w;
		this.s.height = spec.h;
		parent.addChild(this.s);
	}

	trigger() {
		this.k = 0;
		this.s.visible = true;
	}

	update({ dt }: EnvFrame) {
		if (this.k >= 1) return;
		this.k = Math.min(1, this.k + dt / this.spec.duration);
		const c = this.spec.curve;
		let level = 0;
		for (let i = 0; i < c.length - 1; i++) {
			const [t0, v0] = c[i];
			const [t1, v1] = c[i + 1];
			if (this.k >= t0 && this.k <= t1) {
				level = v0 + (v1 - v0) * ((this.k - t0) / Math.max(1e-6, t1 - t0));
				break;
			}
		}
		this.s.alpha = this.spec.alpha * level;
		if (this.k >= 1) this.s.visible = false;
	}
}

// ------------------------------------------------------------------------------------------------ events
export type EnvEvent = { weight: number; run: () => void };

/** Fires one of the scene's occasional events (weighted) every `every` seconds (randomised). */
export class EventScheduler implements EnvController {
	private wait: number;

	constructor(
		private events: EnvEvent[],
		private every: Range = [9, 18],
	) {
		this.wait = rnd(every[0] * 0.5, every[1] * 0.6);
	}

	update({ dt }: EnvFrame) {
		if (!this.events.length) return;
		this.wait -= dt;
		if (this.wait > 0) return;
		this.wait = rnd(...this.every);
		const total = this.events.reduce((s, e) => s + e.weight, 0);
		let r = Math.random() * total;
		for (const e of this.events) {
			if ((r -= e.weight) <= 0) {
				e.run();
				break;
			}
		}
	}
}

/** A value that is raised to `peak` and eases back to 1 over `duration` seconds (event boosts). */
export class Pulse implements EnvController {
	private k = 1;
	private peak = 1;
	private duration = 1;
	constructor(private apply: (v: number) => void) {}
	fire(peak: number, duration: number) {
		this.peak = peak;
		this.duration = duration;
		this.k = 0;
	}
	update({ dt }: EnvFrame) {
		if (this.k >= 1) return;
		this.k = Math.min(1, this.k + dt / this.duration);
		const up = Math.min(1, this.k * 6); // quick rise, slow decay
		this.apply(1 + (this.peak - 1) * up * (1 - easeInOut(this.k)));
	}
}
