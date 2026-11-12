/**
 * Easing curves for the win presentation. Every movement uses one of these; there is deliberately no
 * linear curve. Names follow the usual conventions (in = accelerates, out = decelerates).
 */
export type Ease = (t: number) => number;

const c = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const EASE = {
	/** gentle start and stop: fades, breathing, drifting */
	sineInOut: (t: number) => -(Math.cos(Math.PI * c(t)) - 1) / 2,
	sineOut: (t: number) => Math.sin((c(t) * Math.PI) / 2),
	/** soft deceleration: settling, fading out */
	quadOut: (t: number) => 1 - (1 - c(t)) * (1 - c(t)),
	/** anticipation: slow start, the wind-up before a pop */
	quadIn: (t: number) => c(t) * c(t),
	cubicOut: (t: number) => 1 - Math.pow(1 - c(t), 3),
	cubicInOut: (t: number) => (c(t) < 0.5 ? 4 * c(t) ** 3 : 1 - Math.pow(-2 * c(t) + 2, 3) / 2),
	/** fast arrival with a long settle: counters, light trails */
	expoOut: (t: number) => (c(t) === 1 ? 1 : 1 - Math.pow(2, -10 * c(t))),
	/** overshoot then settle: pops, badges, titles */
	backOut: (t: number) => {
		const s = 1.70158 * 1.3;
		const p = c(t) - 1;
		return 1 + (s + 1) * p * p * p + s * p * p;
	},
	/** pull back before moving: anticipation into an impact */
	backIn: (t: number) => {
		const s = 1.70158;
		return (s + 1) * c(t) ** 3 - s * c(t) ** 2;
	},
	/** springy landing: title slams, impacts */
	elasticOut: (t: number) => {
		const p = c(t);
		return p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
	},
} satisfies Record<string, Ease>;

export type EaseName = keyof typeof EASE;

/**
 * Keyframe track: [time, value, ease][]; the ease of a key shapes the segment that ENDS at that key.
 * Times are seconds from the start of the sequence. Before the first key the first value holds; after the
 * last key the last value holds.
 */
export type Track = readonly (readonly [number, number, EaseName?])[];

export const sample = (track: Track, t: number): number => {
	if (!track.length) return 0;
	if (t <= track[0][0]) return track[0][1];
	for (let i = 1; i < track.length; i++) {
		const [t1, v1, e] = track[i];
		if (t <= t1) {
			const [t0, v0] = track[i - 1];
			const k = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
			return v0 + (v1 - v0) * EASE[e ?? 'sineInOut'](k);
		}
	}
	return track[track.length - 1][1];
};

/** Scale a track's times (fast play). */
export const scaleTrack = (track: Track, k: number): Track => track.map(([t, v, e]) => [t * k, v, e] as const);
