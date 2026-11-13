/**
 * Environment set-ups per scene, placed on the approved background art (positions measured on the
 * 2560 x 1440 art; `P(u, v)` converts 0..1 art coordinates to art pixels). Everything here sits behind the
 * reel window and HUD, so the gameplay area stays clean; effects are kept to the visible margins (desktop:
 * the sides; portrait: the top and the area below the board) and to low alpha.
 */
import type * as PIXI from 'pixi.js';
import type { EnvController, EnvQuality } from './director';
import {
	AmbientLights,
	Beams,
	EventScheduler,
	Flash,
	Glints,
	Particles,
	Pulse,
	Rotor,
	Sheen,
	type LightSpec,
	type SheenSpec,
} from './controllers';

export type SceneId = 'basegame' | 'heist' | 'escape' | 'hidden';

export const ART_W = 2560;
export const ART_H = 1440;
const P = (u: number, v: number) => ({ x: u * ART_W, y: v * ART_H });
const pts = (list: [number, number][]) => list.map(([u, v]) => [u * ART_W, v * ART_H] as [number, number]);
const rect = (u0: number, v0: number, u1: number, v1: number) => ({
	x: u0 * ART_W,
	y: v0 * ART_H,
	w: (u1 - u0) * ART_W,
	h: (v1 - v0) * ART_H,
});
const light = (u: number, v: number, w: number, tint: number, alpha: number, o: Partial<LightSpec> = {}): LightSpec => ({
	...P(u, v),
	w,
	tint,
	alpha,
	...o,
});
const sheen = (r: ReturnType<typeof rect>, alpha: number, o: Partial<SheenSpec> = {}): SheenSpec => ({ ...r, alpha, ...o });
const UP = 0;
const DOWN = Math.PI;

/** Lightning over the sky: a double flicker. */
const LIGHTNING: [number, number][] = [
	[0, 0],
	[0.04, 1],
	[0.1, 0.15],
	[0.17, 0.85],
	[0.45, 0],
	[1, 0],
];
const SIREN: [number, number][] = [
	[0, 0],
	[0.08, 1],
	[0.2, 0.1],
	[0.3, 1],
	[0.42, 0.1],
	[0.52, 1],
	[0.64, 0.1],
	[0.74, 0.8],
	[1, 0],
];
/** the same rhythm, half a beat later (the other colour of a light bar) */
const SIREN_B: [number, number][] = [
	[0, 0],
	[0.14, 1],
	[0.25, 0.1],
	[0.36, 1],
	[0.47, 0.1],
	[0.58, 1],
	[0.69, 0.1],
	[0.8, 0.8],
	[1, 0],
];
const FLARE: [number, number][] = [
	[0, 0],
	[0.15, 1],
	[1, 0],
];

export type SceneTextures = { art: PIXI.Texture; glow: PIXI.Texture };

/** Builds the controllers for one scene inside `root` (art pixel space). */
export const buildScene = (id: SceneId, root: PIXI.Container, tex: SceneTextures, q: EnvQuality): EnvController[] => {
	const { art, glow } = tex;
	const out: EnvController[] = [];
	const add = <T extends EnvController>(c: T) => (out.push(c), c);

	if (id === 'basegame') {
		// night street in front of the bank: rain, searchlights, lamps, the helicopter's spotlight
		const lights = add(
			new AmbientLights(root, glow, [
				light(0.5, 0.55, 3200, 0x3a5cff, 0.06, {
					h: 1700,
					period: 12,
					depth: 0.5,
				}), // cool night wash
				light(0.159, 0.465, 300, 0xffc46b, 0.55, {
					period: 3.4,
					depth: 0.25,
					flicker: 0.05,
				}),
				light(0.84, 0.465, 300, 0xffc46b, 0.55, {
					period: 3.9,
					depth: 0.25,
					flicker: 0.05,
				}),
				light(0.954, 0.65, 140, 0xffc46b, 0.35, { period: 2.8 }),
				light(0.07, 0.45, 420, 0xffb347, 0.13, {
					h: 560,
					period: 7,
					flicker: 0.02,
				}),
				light(0.93, 0.45, 420, 0xffb347, 0.13, {
					h: 560,
					period: 8,
					flicker: 0.02,
				}),
				light(0.235, 0.5, 180, 0xffc060, 0.14, { h: 640, period: 6 }),
				light(0.765, 0.5, 180, 0xffc060, 0.14, { h: 640, period: 6.5 }),
				light(0.5, 0.085, 460, 0xffe2a0, 0.24, { period: 6, depth: 0.3 }), // clock
				light(0.33, 0.72, 170, 0xffb85c, 0.28, { period: 4.2 }),
				light(0.67, 0.72, 170, 0xffb85c, 0.28, { period: 4.6 }),
				light(0.5, 0.8, 1300, 0xffb85c, 0.12, { h: 240, period: 7 }), // steps
				light(0.962, 0.09, 230, 0xcfe0ff, 0.25, { period: 9 }), // moon
			]),
		);
		const beams = add(
			new Beams(root, [
				{
					...P(0.02, 0.33),
					length: 950,
					width: 280,
					tint: 0xbcd4ff,
					alpha: 0.28,
					angle: 0.25,
					sweep: 0.35,
					period: 11,
				},
				{
					...P(0.88, 0.24),
					length: 900,
					width: 260,
					tint: 0xbcd4ff,
					alpha: 0.26,
					angle: -0.3,
					sweep: 0.3,
					period: 13,
					phase: 2,
				},
				{
					...P(0.925, 0.075),
					length: 1450,
					width: 440,
					tint: 0xe4ecff,
					alpha: 0.14,
					angle: DOWN + 0.78,
					sweep: 0.22,
					period: 9,
				}, // helicopter
				{
					...P(0.6, -0.06),
					length: 1500,
					width: 560,
					tint: 0xd8e6ff,
					alpha: 0.07,
					angle: DOWN,
					sweep: 0.32,
					period: 15,
					phase: 1,
				}, // security sweep on the door
			]),
		);
		const glints = add(
			new Glints(root, {
				points: pts([
					[0.17, 0.58],
					[0.185, 0.64],
					[0.83, 0.58],
					[0.815, 0.64],
					[0.268, 0.765],
					[0.31, 0.77],
					[0.69, 0.77],
					[0.73, 0.765],
					[0.863, 0.75],
					[0.975, 0.745],
					[0.055, 0.215],
					[0.95, 0.21],
					[0.45, 0.06],
					[0.55, 0.06],
				]),
				size: 72,
				perSecond: 1.2,
			}),
		);
		add(new Sheen(root, art, sheen(rect(0.13, 0.53, 0.21, 0.7), 0.5, { every: [5, 9] })));
		add(new Sheen(root, art, sheen(rect(0.79, 0.53, 0.87, 0.7), 0.5, { every: [5, 9] })));
		add(
			new Sheen(
				root,
				art,
				sheen(rect(0.44, 0.0, 0.56, 0.17), 0.35, {
					every: [7, 12],
					angle: 0.6,
				}),
			),
		);
		add(new Sheen(root, art, sheen(rect(0.85, 0.72, 1, 0.9), 0.4, { every: [6, 10] })));
		add(
			new Sheen(
				root,
				art,
				sheen(rect(0, 0.85, 1, 1), 0.22, {
					mode: 'drift',
					angle: 0,
					band: 0.22,
					duration: 16,
				}),
			),
		); // wet street
		add(
			new Particles(
				root,
				{
					kind: 'rain',
					count: 90,
					area: rect(-0.05, -0.05, 1, 1),
					tint: 0xbfd6ff,
					alpha: 0.34,
					size: 50,
					speed: 1300,
					slant: 0.15,
				},
				q.density,
			),
		);
		add(
			new Particles(
				root,
				{
					kind: 'dust',
					count: 30,
					area: rect(0, 0.3, 1, 0.95),
					tint: 0xffd9a0,
					alpha: 0.5,
					size: 7,
					speed: 14,
				},
				q.density,
			),
		);
		const lightning = add(
			new Flash(root, glow, {
				...P(0.5, 0.08),
				w: 3800,
				h: 1000,
				tint: 0xcfe0ff,
				alpha: 0.32,
				curve: LIGHTNING,
				duration: 0.9,
			}),
		);
		const sirenR = add(
			new Flash(root, glow, {
				...P(0.02, 0.96),
				w: 1500,
				h: 760,
				tint: 0xff2a3a,
				alpha: 0.22,
				curve: SIREN,
				duration: 2.6,
			}),
		);
		const sirenB = add(
			new Flash(root, glow, {
				...P(0.1, 0.96),
				w: 1500,
				h: 760,
				tint: 0x2a6bff,
				alpha: 0.22,
				curve: SIREN_B,
				duration: 2.6,
			}),
		);
		const beamPulse = add(new Pulse((v) => (beams.boost = v)));
		const lampPulse = add(new Pulse((v) => (lights.boost = v)));
		add(
			new EventScheduler([
				{
					weight: 2,
					run: () => (lightning.trigger(), lampPulse.fire(0.7, 0.6)),
				},
				{ weight: 2, run: () => beamPulse.fire(1.9, 3.5) }, // the searchlights sweep in on something
				{ weight: 1.5, run: () => (sirenR.trigger(), sirenB.trigger()) }, // a patrol car passes
				{ weight: 1, run: () => glints.burst(4) },
			]),
		);
	} else if (id === 'heist') {
		// inside the vault: pulsing alarm beacons, the chandelier, gold everywhere
		const alarms: [number, number][] = [
			[0.093, 0.065],
			[0.255, 0.335],
			[0.745, 0.335],
			[0.902, 0.105],
		];
		const lights = add(
			new AmbientLights(root, glow, [
				...alarms.map(([u, v], i) =>
					light(u, v, 300, 0xff3a2a, 0.42, {
						period: 1.6 + i * 0.13,
						depth: 0.5,
					}),
				),
				light(0.5, 0.06, 720, 0xffe7a8, 0.3, { period: 5, depth: 0.2 }), // chandelier
				light(0.1, 0.8, 760, 0xffb030, 0.16, { h: 420, period: 6 }),
				light(0.95, 0.72, 700, 0xffb030, 0.16, { h: 420, period: 7 }),
				light(0.5, 0.86, 950, 0xffcf70, 0.1, { h: 280, period: 8 }),
			]),
		);
		const beams = add(
			new Beams(root, [
				...alarms.map(([u, v], i) => ({
					...P(u, v),
					length: 720,
					width: 260,
					tint: 0xff3020,
					alpha: 0.13,
					angle: i,
					mode: 'spin' as const,
					period: 3 + i * 0.3,
				})),
				{
					...P(0.5, 0.1),
					length: 1250,
					width: 950,
					tint: 0xffe2a0,
					alpha: 0.07,
					angle: DOWN,
					sweep: 0.05,
					period: 10,
				},
			]),
		);
		const glints = add(
			new Glints(root, {
				points: pts([
					[0.45, 0.04],
					[0.5, 0.1],
					[0.55, 0.05],
					[0.47, 0.12],
					[0.53, 0.13],
					[0.05, 0.78],
					[0.12, 0.86],
					[0.2, 0.8],
					[0.27, 0.78],
					[0.18, 0.92],
					[0.88, 0.86],
					[0.96, 0.63],
					[0.95, 0.75],
					[0.182, 0.818],
					[0.232, 0.837],
					[0.982, 0.797],
					[0.985, 0.58],
					[0.31, 0.55],
					[0.695, 0.585],
					[0.778, 0.555],
					[0.806, 0.57],
				]),
				size: 80,
				perSecond: 1.6,
			}),
		);
		add(new Sheen(root, art, sheen(rect(0, 0.68, 0.28, 0.97), 0.45, { every: [4, 7] })));
		add(new Sheen(root, art, sheen(rect(0.83, 0.55, 1, 0.82), 0.45, { every: [5, 8] })));
		add(new Sheen(root, art, sheen(rect(0.4, 0, 0.6, 0.17), 0.4, { every: [6, 10], angle: 0.8 })));
		add(
			new Sheen(
				root,
				art,
				sheen(rect(0.15, 0.72, 0.85, 1), 0.18, {
					mode: 'drift',
					angle: 0,
					band: 0.25,
					duration: 18,
				}),
			),
		); // polished floor
		add(
			new Particles(
				root,
				{
					kind: 'dust',
					count: 45,
					area: rect(0.25, 0.05, 0.75, 0.95),
					tint: 0xffe0a0,
					alpha: 0.55,
					size: 8,
					speed: 12,
				},
				q.density,
			),
		);
		add(
			new Particles(
				root,
				{
					kind: 'dust',
					count: 20,
					area: rect(0, 0.3, 1, 0.9),
					tint: 0xffc070,
					alpha: 0.4,
					size: 6,
					speed: 10,
				},
				q.density,
			),
		);
		const wash = add(
			new Flash(root, glow, {
				...P(0.5, 0.45),
				w: 3200,
				h: 1800,
				tint: 0xff2a1a,
				alpha: 0.1,
				curve: SIREN,
				duration: 2.4,
			}),
		);
		const beamPulse = add(new Pulse((v) => (beams.boost = v)));
		const lampPulse = add(new Pulse((v) => (lights.boost = v)));
		add(
			new EventScheduler([
				{
					weight: 2,
					run: () => (beamPulse.fire(2.2, 2.8), lampPulse.fire(1.5, 2.8), wash.trigger()),
				}, // alarm burst
				{ weight: 2, run: () => glints.burst(4) }, // chandelier sparkle
				{ weight: 1, run: () => lampPulse.fire(0.6, 0.5) }, // the lights dip
			]),
		);
	} else if (id === 'escape') {
		// the getaway: neon, police lights, rain on the road
		const lights = add(
			new AmbientLights(root, glow, [
				light(0.06, 0.18, 520, 0xff4adf, 0.24, {
					h: 540,
					period: 2.5,
					flicker: 0.08,
				}),
				light(0.935, 0.3, 400, 0xff5ae8, 0.22, {
					h: 520,
					period: 3,
					flicker: 0.06,
				}),
				light(0.35, 0.457, 170, 0x9fd4ff, 0.35, { period: 3 }),
				light(0.445, 0.597, 130, 0x9fd4ff, 0.3, { period: 3.4 }),
				light(0.56, 0.672, 110, 0x9fd4ff, 0.3, { period: 3.8 }),
				light(0.208, 0.645, 130, 0xff3020, 0.4, { period: 1.2, depth: 0.4 }),
				light(0.208, 0.705, 130, 0xff3020, 0.4, { period: 1.2, depth: 0.4 }),
				light(0.86, 0.71, 220, 0xffb020, 0.2, { period: 0.9, depth: 0.7 }),
				light(0.95, 0.67, 260, 0xffb020, 0.2, { period: 0.9, depth: 0.7 }),
				light(0.862, 0.08, 270, 0xcfe0ff, 0.2, { period: 9 }),
			]),
		);
		const police: [number, number][] = [
			[0.683, 0.73],
			[0.725, 0.725],
			[0.757, 0.74],
		];
		const beams = add(
			new Beams(root, [
				...police.flatMap(([u, v], i) => [
					{
						...P(u - 0.006, v),
						length: 280,
						width: 320,
						tint: 0xff2030,
						alpha: 0.32,
						angle: UP - 0.2,
						mode: 'strobe' as const,
						period: 0.9,
						phase: i * 0.13,
					},
					{
						...P(u + 0.006, v),
						length: 280,
						width: 320,
						tint: 0x2a6bff,
						alpha: 0.36,
						angle: UP + 0.2,
						mode: 'strobe' as const,
						period: 0.9,
						phase: i * 0.13 + 0.45,
					},
				]),
				{
					...P(0.3, 0.42),
					length: 950,
					width: 270,
					tint: 0xb0d0ff,
					alpha: 0.15,
					angle: -0.45,
					sweep: 0.25,
					period: 12,
				},
				{
					...P(0.8, 0.3),
					length: 750,
					width: 240,
					tint: 0xb0d0ff,
					alpha: 0.12,
					angle: 0.3,
					sweep: 0.3,
					period: 14,
					phase: 2,
				},
			]),
		);
		const glints = add(
			new Glints(root, {
				points: pts([
					[0.14, 0.53],
					[0.17, 0.56],
					[0.16, 0.6],
					[0.13, 0.57],
				]),
				size: 70,
				perSecond: 0.6,
			}),
		);
		add(
			new Sheen(
				root,
				art,
				sheen(rect(0.3, 0.78, 1, 1), 0.3, {
					mode: 'drift',
					angle: 0,
					band: 0.22,
					duration: 9,
				}),
			),
		); // wet road
		add(new Sheen(root, art, sheen(rect(0, 0.43, 0.35, 0.8), 0.3, { every: [5, 9] })));
		add(
			new Particles(
				root,
				{
					kind: 'rain',
					count: 110,
					area: rect(-0.08, -0.05, 1, 1),
					tint: 0xc0d8ff,
					alpha: 0.36,
					size: 56,
					speed: 1600,
					slant: 0.22,
				},
				q.density,
			),
		);
		const lightning = add(
			new Flash(root, glow, {
				...P(0.55, 0.1),
				w: 3800,
				h: 1000,
				tint: 0xd8c8ff,
				alpha: 0.3,
				curve: LIGHTNING,
				duration: 0.9,
			}),
		);
		const headlights = add(
			new Flash(root, glow, {
				...P(0.85, 0.9),
				w: 1500,
				h: 520,
				tint: 0xfff2d0,
				alpha: 0.25,
				curve: FLARE,
				duration: 1.4,
			}),
		);
		const beamPulse = add(new Pulse((v) => (beams.boost = v)));
		const lampPulse = add(new Pulse((v) => (lights.boost = v)));
		add(
			new EventScheduler([
				{
					weight: 2,
					run: () => (lightning.trigger(), lampPulse.fire(0.7, 0.6)),
				},
				{ weight: 2, run: () => beamPulse.fire(1.8, 3) }, // sirens closing in
				{ weight: 1, run: () => headlights.trigger() },
				{ weight: 1, run: () => glints.burst(3) },
			]),
		);
	} else {
		// Mystery Vault: the vault's light, gold dust rising, coins catching the light
		const VAULT = P(0.875, 0.66);
		const lights = add(
			new AmbientLights(root, glow, [
				{
					...VAULT,
					w: 720,
					h: 620,
					tint: 0xffc040,
					alpha: 0.45,
					period: 3,
					depth: 0.35,
				},
				...([0.075, 0.27, 0.41, 0.49, 0.55] as const).map((u, i) =>
					light(u, 0.78 - i * 0.004, 160, 0xffcc55, 0.25, {
						period: 2 + i * 0.2,
					}),
				),
				light(0.1, 0.6, 950, 0xffaa30, 0.1, { h: 520, period: 8 }),
				light(0.9, 0.3, 600, 0xffaa30, 0.08, { h: 700, period: 9 }),
			]),
		);
		const beams = add(
			new Beams(root, [
				{
					...VAULT,
					length: 1350,
					width: 520,
					tint: 0xffcf60,
					alpha: 0.1,
					angle: -1.25,
					sweep: 0.1,
					period: 9,
				},
				{
					...VAULT,
					length: 1200,
					width: 460,
					tint: 0xffcf60,
					alpha: 0.08,
					angle: -0.6,
					sweep: 0.12,
					period: 11,
					phase: 1.5,
				},
				{
					...VAULT,
					length: 900,
					width: 380,
					tint: 0xffe08a,
					alpha: 0.05,
					angle: 0,
					mode: 'spin',
					period: 22,
				},
			]),
		);
		const glints = add(
			new Glints(root, {
				points: pts([
					[0.02, 0.02],
					[0.157, 0.093],
					[0.233, 0.023],
					[0.27, 0.67],
					[0.07, 0.48],
					[0.89, 0.02],
					[0.925, 0.11],
					[0.97, 0.21],
					[0.81, 0.41],
					[0.06, 0.91],
					[0.92, 0.92],
					[0.93, 0.53],
					[0.96, 0.6],
				]),
				size: 110,
				perSecond: 1.4,
			}),
		);
		add(new Sheen(root, art, sheen(rect(0.81, 0.49, 1, 0.73), 0.4, { every: [4, 7] })));
		add(new Sheen(root, art, sheen(rect(0, 0.8, 0.15, 1), 0.4, { every: [5, 8] })));
		add(new Sheen(root, art, sheen(rect(0.86, 0.83, 0.99, 1), 0.4, { every: [5, 8] })));
		add(
			new Sheen(
				root,
				art,
				sheen(rect(0.1, 0.76, 1, 1), 0.22, {
					mode: 'drift',
					angle: 0,
					band: 0.22,
					duration: 12,
				}),
			),
		);
		add(
			new Particles(
				root,
				{
					kind: 'embers',
					count: 50,
					area: rect(0, 0, 1, 1),
					tint: 0xffcc55,
					alpha: 0.7,
					size: 9,
					speed: 30,
				},
				q.density,
			),
		);
		const flare = add(
			new Flash(root, glow, {
				...VAULT,
				w: 1700,
				h: 1300,
				tint: 0xffd060,
				alpha: 0.35,
				curve: FLARE,
				duration: 1.8,
			}),
		);
		const beamPulse = add(new Pulse((v) => (beams.boost = v)));
		const lampPulse = add(new Pulse((v) => (lights.boost = v)));
		add(
			new EventScheduler([
				{
					weight: 2,
					run: () => (flare.trigger(), beamPulse.fire(1.8, 2), lampPulse.fire(1.4, 2)),
				}, // the vault breathes out
				{ weight: 2, run: () => glints.burst(5) },
			]),
		);
	}
	return out;
};

/** Reel-frame machinery: the vault wheel on top of UI-REEL-FRAME. Its spokes turn in 60 deg steps (6 spokes, so
 * it always comes to rest exactly on the art); the ring and hub stay still so their painted highlights do not
 * orbit. Coordinates are UI-REEL-FRAME pixels around the wheel centre; the container is drawn at an even scale
 * (EnvironmentFrame.svelte), so the wheel is round even though the frame itself is scaled unevenly. */
export const FRAME_WHEEL = { cx: 1298, cy: 137, outer: 136 };
export const buildFrameMachinery = (root: PIXI.Container, frameTex: PIXI.Texture): EnvController[] => [
	new Rotor(root, frameTex, { cx: FRAME_WHEEL.cx, cy: FRAME_WHEEL.cy, x: 0, y: 0, r: 99, outer: FRAME_WHEEL.outer, hub: 42, step: Math.PI / 3, every: [7, 13], duration: 1.4, steps: [1, 1, -1, 2] }),
];
