/**
 * Animated bonus intro screens built from the delivered SCR-HEIST-INTRO / SCR-ESCAPE-INTRO art.
 * The art is one flat image, so parts of it (title, free-spins badge, sub-banner, "press anywhere")
 * are re-cut from the same image as layers and animated on top of it.
 *   *-INTRO      1.6 s  flash, zoom-in, title slam, badges pop, burst          (plays once)
 *   *-INTRO-LOOP 3.0 s  breathing camera, title shine, sparkles, ambient FX   (seamless loop until tap)
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art} from '../lib/assets';
import {Burst, Flash, Shockwave} from '../lib/fx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const W = 1920;
const H = 1080;

type Rect = {x0: number; y0: number; x1: number; y1: number}; // fractions of the image
type Spec = {
	image: string;
	title: Rect;
	badge: Rect;
	banner: Rect;
	press: Rect;
	stamp?: Rect; // optional fourth part (Hidden Bonus 'GUARANTEED 500x WIN')
	sparkles: [number, number][]; // fractions
	burst: 'coin' | 'confetti';
};

export const INTRO_SPECS: Record<'heist' | 'escape' | 'hidden', Spec> = {
	heist: {
		image: 'SCR-HEIST-INTRO',
		title: {x0: 0.235, y0: 0.465, x1: 0.725, y1: 0.66},
		badge: {x0: 0.285, y0: 0.67, x1: 0.71, y1: 0.815},
		banner: {x0: 0.245, y0: 0.82, x1: 0.73, y1: 0.925},
		press: {x0: 0.31, y0: 0.925, x1: 0.69, y1: 0.985},
		sparkles: [[0.13, 0.28], [0.47, 0.06], [0.71, 0.05], [0.92, 0.22], [0.06, 0.78], [0.85, 0.83], [0.28, 0.42], [0.62, 0.4], [0.96, 0.6], [0.4, 0.97]],
		burst: 'coin',
	},
	escape: {
		image: 'SCR-ESCAPE-INTRO',
		title: {x0: 0.49, y0: 0.07, x1: 0.94, y1: 0.47},
		badge: {x0: 0.525, y0: 0.485, x1: 0.97, y1: 0.645},
		banner: {x0: 0.535, y0: 0.655, x1: 0.965, y1: 0.765},
		press: {x0: 0.29, y0: 0.925, x1: 0.66, y1: 0.985},
		sparkles: [[0.56, 0.1], [0.9, 0.12], [0.97, 0.38], [0.52, 0.42], [0.04, 0.2], [0.33, 0.06], [0.75, 0.83], [0.15, 0.86]],
		burst: 'confetti',
	},
	hidden: {
		image: 'SCR-HIDDEN-INTRO',
		title: {x0: 0.505, y0: 0.012, x1: 0.99, y1: 0.295},
		badge: {x0: 0.572, y0: 0.305, x1: 0.955, y1: 0.445},
		banner: {x0: 0.618, y0: 0.462, x1: 0.94, y1: 0.632},
		stamp: {x0: 0.635, y0: 0.628, x1: 0.965, y1: 0.855},
		press: {x0: 0.265, y0: 0.9, x1: 0.73, y1: 0.98},
		sparkles: [[0.55, 0.06], [0.97, 0.1], [0.53, 0.33], [0.96, 0.5], [0.1, 0.12], [0.36, 0.05], [0.06, 0.86], [0.48, 0.62], [0.99, 0.86], [0.2, 0.45]],
		burst: 'coin',
	},
};

/** A rectangle of the intro image, re-drawn on top of it so it can be animated on its own. */
const Cut: React.FC<{image: string; r: Rect; scale?: number; opacity?: number; rotate?: number; glow?: number; feather?: boolean; children?: React.ReactNode}> = ({
	image,
	r,
	scale = 1,
	opacity = 1,
	rotate = 0,
	glow = 0,
	feather = true,
	children,
}) => {
	const x = r.x0 * W;
	const y = r.y0 * H;
	const w = (r.x1 - r.x0) * W;
	const h = (r.y1 - r.y0) * H;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w,
				height: h,
				overflow: 'hidden',
				scale,
				opacity,
				rotate: `${rotate}deg`,
				transformOrigin: 'center',
				// soft elliptical edge: a scaled copy blends into the art instead of showing a rectangle
				...(feather ? {WebkitMaskImage: 'radial-gradient(ellipse 58% 62% at 50% 50%, #000 70%, transparent 100%)', maskImage: 'radial-gradient(ellipse 58% 62% at 50% 50%, #000 70%, transparent 100%)'} : {}),
				filter: glow > 0 ? `brightness(${1 + glow}) drop-shadow(0 0 ${20 * glow}px rgba(255,220,120,${glow}))` : undefined,
			}}
		>
			<Img src={art(image)} style={{position: 'absolute', left: -x, top: -y, width: W, height: H}} />
			{children}
		</div>
	);
};

/** Gold shine band sweeping across a cut (progress 0..1). */
const Shine: React.FC<{p: number; strength?: number}> = ({p, strength = 0.75}) => {
	if (p <= 0 || p >= 1) return null;
	const pos = interpolate(p, [0, 1], [-30, 130]);
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: `linear-gradient(105deg, rgba(255,255,255,0) ${pos - 14}%, rgba(255,246,200,${strength}) ${pos}%, rgba(255,255,255,0) ${pos + 14}%)`,
				mixBlendMode: 'screen',
			}}
		/>
	);
};

/** Four-point twinkle at a fixed spot; fully periodic in `period` frames. */
const Twinkle: React.FC<{x: number; y: number; phase: number; period: number; size?: number; color?: string}> = ({x, y, phase, period, size = 70, color = '#fff6c2'}) => {
	const frame = useCurrentFrame();
	const t = (((frame + phase) % period) + period) % period / period;
	const s = Math.max(0, Math.sin(t * Math.PI * 2)) ** 3;
	if (s < 0.02) return null;
	return (
		<svg width={size * 2} height={size * 2} viewBox="-50 -50 100 100" style={{position: 'absolute', left: x * W - size, top: y * H - size, scale: s, rotate: `${t * 90}deg`, filter: `drop-shadow(0 0 10px ${color})`}}>
			<path d="M0,-48 C5,-8 8,-5 48,0 C8,5 5,8 0,48 C-5,8 -8,5 -48,0 C-8,-5 -5,-8 0,-48Z" fill={color} />
			<circle r={7} fill="#ffffff" />
		</svg>
	);
};

// ------------------------------------------------------------------ intro (once)
export const BonusIntro: React.FC<{bonus: 'heist' | 'escape' | 'hidden'}> = ({bonus}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const s = INTRO_SPECS[bonus];
	const zoom = interpolate(frame, [0, 16], [1.22, 1.0], {...clamp, easing: Easing.out(Easing.cubic)});
	const settle = interpolate(frame, [0, 16], [-2.5, 0], {...clamp, easing: Easing.out(Easing.cubic)});
	const slam = interpolate(frame, [8, 14], [1.8, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const slamIn = interpolate(frame, [8, 11], [0, 1], clamp);
	const titleLand = interpolate(frame, [14, 16, 24], [0, 0.6, 0], clamp);
	// parts pop *down* onto their place (never smaller than 1) so the copy painted underneath stays covered
	const badge = interpolate(frame, [17, 22], [1.35, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const badgeIn = interpolate(frame, [17, 19], [0, 1], clamp);
	const banner = interpolate(frame, [23, 28], [1.35, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const bannerIn = interpolate(frame, [23, 25], [0, 1], clamp);
	const land = (at: number) => interpolate(frame, [at, at + 2, at + 8], [0, 0.55, 0], clamp);
	const shake = frame >= 17 && frame < 26 ? Math.sin(frame * 2.7) * (26 - frame) * 1.4 : 0;
	// end matches the loop's first frame (scale 1, no overlays) so intro -> loop is seamless
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<AbsoluteFill style={{scale: zoom, rotate: `${settle}deg`, translate: `${shake}px ${shake * 0.6}px`}}>
				<Img src={art(s.image)} style={{width: W, height: H}} />
				{frame >= 8 && <Cut image={s.image} r={s.title} scale={slam} opacity={slamIn} glow={titleLand}><Shine p={interpolate(frame, [18, D], [0, 1], clamp)} /></Cut>}
				{frame >= 17 && (
					<Cut image={s.image} r={s.badge} scale={badge} opacity={badgeIn} glow={land(22)} />
				)}
				{frame >= 23 && (
					<Cut image={s.image} r={s.banner} scale={banner} opacity={bannerIn} glow={land(28)} />
				)}
				{s.stamp && frame >= 29 && (
					<Cut
						image={s.image}
						r={s.stamp}
						scale={interpolate(frame, [29, 34], [1.6, 1], {...clamp, easing: Easing.in(Easing.quad)})}
						opacity={interpolate(frame, [29, 31], [0, 1], clamp)}
						rotate={interpolate(frame, [29, 34], [-10, 0], clamp)}
						glow={land(34)}
					/>
				)}
			</AbsoluteFill>
			<Flash at={0} length={10} />
			<Shockwave at={17} x={`${((s.title.x0 + s.title.x1) / 2) * 100}%`} y={`${((s.title.y0 + s.title.y1) / 2) * 100}%`} color="#F7C947" />
			<Burst at={17} count={s.burst === 'coin' ? 46 : 80} kind={s.burst} x={((s.title.x0 + s.title.x1) / 2) * W} y={((s.title.y0 + s.title.y1) / 2) * H} speed={40} seed={`bi-${bonus}`} life={34} />
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ loop (seamless)
/** Falling coins (Heist) or flying bills (Escape), wrapped so frame P == frame 0. */
const Drift: React.FC<{kind: 'coin' | 'bill'; count: number; period: number; seed: string}> = ({kind, count, period, seed}) => {
	const frame = useCurrentFrame();
	return (
		<>
			{new Array(count).fill(0).map((_, i) => {
				const r = (k: string) => random(`${seed}-${k}-${i}`);
				const t = ((frame / period + r('o')) % 1 + 1) % 1;
				if (kind === 'coin') {
					const x = r('x') * W;
					const y = -80 + t * (H + 160);
					const spin = Math.abs(Math.cos((t * 4 + r('s')) * Math.PI));
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: x,
								top: y,
								width: 50,
								height: 50 * Math.max(0.15, spin),
								translate: '-50% -50%',
								borderRadius: '50%',
								background: 'radial-gradient(circle at 35% 30%, #fff3b0, #f7c947 40%, #b8860b 80%)',
								border: '3px solid #8a5a00',
								opacity: 0.9,
							}}
						/>
					);
				}
				// bills blow from the van (left) toward the upper right
				const x = interpolate(t, [0, 1], [0.05 + r('x') * 0.25, 0.4 + r('x') * 0.5]) * W;
				const y = interpolate(t, [0, 1], [0.55 + r('y') * 0.3, -0.05 + r('y') * 0.3]) * H;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: 62,
							height: 30,
							translate: '-50% -50%',
							rotate: `${t * 720 * (r('d') > 0.5 ? 1 : -1)}deg`,
							borderRadius: 4,
							background: 'linear-gradient(135deg,#d5f2c4,#7cc35f 45%,#3f7f2c)',
							border: '2px solid #24521a',
							opacity: Math.sin(t * Math.PI),
						}}
					/>
				);
			})}
		</>
	);
};

/** Neon speed streaks across the road (Escape), periodic. */
const Streaks: React.FC<{period: number}> = ({period}) => {
	const frame = useCurrentFrame();
	return (
		<>
			{new Array(10).fill(0).map((_, i) => {
				const t = ((frame / period) * 2 + random(`st-o-${i}`)) % 1;
				const y = (0.72 + random(`st-y-${i}`) * 0.25) * H;
				const x = interpolate(t, [0, 1], [W * 1.1, -W * 0.3]);
				const c = ['#ff4fd8', '#28B9EF', '#ffffff', '#A34BFF'][i % 4];
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: 380, height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${c}, rgba(0,0,0,0))`, boxShadow: `0 0 14px ${c}`, opacity: 0.7}} />;
			})}
		</>
	);
};

/** Pulsing light glow at a spot (headlights, roof lights). */
const Glow: React.FC<{x: number; y: number; r: number; period: number; phase?: number; color?: string}> = ({x, y, r, period, phase = 0, color = '255,236,170'}) => {
	const frame = useCurrentFrame();
	const k = 0.55 + 0.45 * Math.sin(((frame + phase) / period) * Math.PI * 2);
	return <div style={{position: 'absolute', left: x * W - r, top: y * H - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, rgba(${color},${0.75 * k}) 0%, rgba(${color},${0.25 * k}) 35%, rgba(${color},0) 70%)`, mixBlendMode: 'screen'}} />;
};

export const BonusIntroLoop: React.FC<{bonus: 'heist' | 'escape' | 'hidden'}> = ({bonus}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: P} = useVideoConfig();
	const s = INTRO_SPECS[bonus];
	const t = frame / P;
	const breathe = 1 + 0.012 * (1 - Math.cos(t * Math.PI * 2)) / 2; // starts and ends at exactly 1
	const shineP = interpolate(t, [0.08, 0.5], [0, 1], clamp);
	const badgeShine = interpolate(t, [0.3, 0.68], [0, 1], clamp);
	const pressK = 0.5 + 0.5 * Math.cos(t * Math.PI * 4); // two pulses per loop, 1 at the ends
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<AbsoluteFill style={{scale: breathe}}>
				<Img src={art(s.image)} style={{width: W, height: H}} />
				{bonus === 'escape' && (
					<>
						<Glow x={0.62} y={0.68} r={150} period={P / 2} />
						<Glow x={0.875} y={0.68} r={150} period={P / 2} phase={6} />
						{[0.47, 0.515, 0.56, 0.6].map((x, i) => (
							<Glow key={x} x={x} y={0.27} r={70} period={P / 3} phase={i * 4} />
						))}
						<Glow x={0.82} y={0.85} r={110} period={P / 4} color="255,80,80" />
						<Glow x={0.86} y={0.85} r={110} period={P / 4} phase={P / 8} color="80,140,255" />
					</>
				)}
				<Cut image={s.image} r={s.title}>
					<Shine p={shineP} />
				</Cut>
				<Cut image={s.image} r={s.badge}>
					<Shine p={badgeShine} strength={0.55} />
				</Cut>
				{s.stamp && (
					<Cut image={s.image} r={s.stamp}>
						<Shine p={interpolate(t, [0.55, 0.9], [0, 1], clamp)} strength={0.6} />
					</Cut>
				)}
				<Cut image={s.image} r={s.press} glow={0.35 * (1 - pressK)} />
			</AbsoluteFill>
			{bonus === 'escape' && <Streaks period={P} />}
			<Drift kind={bonus === 'escape' ? 'bill' : 'coin'} count={bonus === 'escape' ? 12 : 16} period={P} seed={`d-${bonus}`} />
			{s.sparkles.map(([x, y], i) => (
				<Twinkle key={i} x={x} y={y} phase={Math.round((i * P) / s.sparkles.length)} period={P} size={50 + (i % 3) * 18} color={bonus === 'escape' && i % 2 ? '#bfefff' : '#fff6c2'} />
			))}
		</AbsoluteFill>
	);
};
