import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, GOLD} from './assets';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Rotating light rays behind a title or object. */
export const Rays: React.FC<{color?: string; from?: number; opacity?: number; size?: number}> = ({
	color = GOLD,
	from = 0,
	opacity = 0.55,
	size = 1600,
}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					width: size,
					height: size,
					borderRadius: '50%',
					background: `repeating-conic-gradient(${color}cc 0deg 7deg, transparent 7deg 18deg)`,
					maskImage: 'radial-gradient(circle, black 15%, transparent 65%)',
					WebkitMaskImage: 'radial-gradient(circle, black 15%, transparent 65%)',
					rotate: `${(frame - from) * 0.6}deg`,
					opacity: interpolate(frame, [from, from + 8], [0, opacity], clamp),
					scale: interpolate(frame, [from, from + 12], [0.4, 1], {...clamp, easing: Easing.out(Easing.cubic)}),
				}}
			/>
		</AbsoluteFill>
	);
};

/** Expanding ring shockwave. */
export const Shockwave: React.FC<{at: number; color?: string; x?: string; y?: string; max?: number; width?: number}> = ({
	at,
	color = GOLD,
	x = '50%',
	y = '50%',
	max = 1400,
	width = 28,
}) => {
	const frame = useCurrentFrame();
	const t = interpolate(frame, [at, at + 18], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
	if (frame < at) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: max * t,
				height: max * t,
				translate: '-50% -50%',
				borderRadius: '50%',
				border: `${width * (1 - t) + 2}px solid ${color}`,
				boxShadow: `0 0 60px ${color}`,
				opacity: 1 - t,
			}}
		/>
	);
};

/** Full-frame flash. */
export const Flash: React.FC<{at: number; color?: string; length?: number; strength?: number}> = ({
	at,
	color = '#fff6d6',
	length = 8,
	strength = 0.85,
}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill
			style={{background: color, opacity: interpolate(frame, [at, at + 1, at + length], [0, strength, 0], clamp), mixBlendMode: 'screen'}}
		/>
	);
};

type ParticleKind = 'coin' | 'spark' | 'confetti' | 'smoke' | 'bill' | 'star' | 'pixel' | 'debris';

/**
 * Deterministic particle burst (same output every render). Particles start at (x, y) in px, fly out with
 * gravity. Image particles use symbol art (coins = SYM-H2 bag is too big, so coins are drawn).
 */
export const Burst: React.FC<{
	at: number;
	count: number;
	kind: ParticleKind;
	x?: number;
	y?: number;
	seed?: string;
	speed?: number;
	gravity?: number;
	spread?: number;
	angle?: number;
	life?: number;
	colors?: string[];
	size?: number;
}> = ({at, count, kind, x = 960, y = 540, seed = 'b', speed = 26, gravity = 0.9, spread = 360, angle = -90, life = 45, colors, size = 1}) => {
	const frame = useCurrentFrame();
	const t = frame - at;
	if (t < 0 || t > life + 10) return null;
	const palette = colors ?? ['#F7C947', '#FF4C36', '#A34BFF', '#FFA12B', '#28B9EF', '#ffffff'];
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{new Array(count).fill(0).map((_, i) => {
				const r1 = random(`${seed}-a-${i}`);
				const r2 = random(`${seed}-s-${i}`);
				const r3 = random(`${seed}-r-${i}`);
				const r4 = random(`${seed}-z-${i}`);
				const a = ((angle + (r1 - 0.5) * spread) * Math.PI) / 180;
				const v = speed * (0.45 + r2 * 0.8);
				const drag = kind === 'smoke' ? 0.9 : 0.97;
				const k = (1 - Math.pow(drag, t)) / (1 - drag);
				const g = kind === 'smoke' ? -0.15 : gravity;
				const px = x + Math.cos(a) * v * k;
				const py = y + Math.sin(a) * v * k + 0.5 * g * t * t * (kind === 'bill' ? 0.25 : 1);
				const fade = interpolate(t, [0, 4, life * 0.7, life], [0, 1, 1, 0], clamp);
				const s = size * (0.6 + r4 * 0.8);
				const rot = (r3 - 0.5) * 30 * t;
				const color = palette[Math.floor(r3 * palette.length)];
				const common: React.CSSProperties = {position: 'absolute', left: px, top: py, translate: '-50% -50%', rotate: `${rot}deg`, opacity: fade};
				switch (kind) {
					case 'coin':
						// the gold coin cut from the delivered art (FX-COIN), tumbling
						return (
							<Img
								key={i}
								src={art('FX-COIN')}
								style={{...common, width: 56 * s, height: 45 * s, scale: `1 ${Math.max(0.2, Math.abs(Math.cos((t + r1 * 20) * 0.25)))}`}}
							/>
						);
					case 'bill':
						return (
							<div
								key={i}
								style={{...common, width: 70 * s, height: 34 * s, borderRadius: 4, background: 'linear-gradient(135deg,#b9e6a5,#5c9e4a)', border: '2px solid #2f5f24'}}
							/>
						);
					case 'spark':
						return <div key={i} style={{...common, width: 6 * s, height: 26 * s, borderRadius: 3, background: color === '#ffffff' ? '#fff6c2' : color, boxShadow: `0 0 12px ${color}`, rotate: `${(a * 180) / Math.PI + 90}deg`}} />;
					case 'confetti':
						return <div key={i} style={{...common, width: 18 * s, height: 10 * s, background: color}} />;
					case 'smoke':
						return (
							<div
								key={i}
								style={{
									...common,
									width: 140 * s * (1 + t / 30),
									height: 140 * s * (1 + t / 30),
									borderRadius: '50%',
									background: 'radial-gradient(circle, rgba(235,235,240,0.75), rgba(200,200,210,0) 70%)',
									opacity: fade * 0.8,
								}}
							/>
						);
					case 'star':
						return <Img key={i} src={art('UI-STAR-ON')} style={{...common, width: 40 * s, height: 40 * s, filter: `drop-shadow(0 0 10px ${color})`}} />;
					case 'pixel':
						return <div key={i} style={{...common, width: 14 * s, height: 14 * s, background: color, boxShadow: `0 0 10px ${color}`, rotate: '0deg'}} />;
					case 'debris':
						return <div key={i} style={{...common, width: 22 * s, height: 16 * s, background: '#9aa0aa', border: '2px solid #4a4f58', borderRadius: 3}} />;
					default:
						return null;
				}
			})}
		</AbsoluteFill>
	);
};

/** Raining items from the top (coins, gold bars, money bags...). */
export const Rain: React.FC<{from: number; count: number; image?: string; kind?: 'coin' | 'bill'; seed?: string; size?: number; duration?: number}> = ({
	from,
	count,
	image,
	kind = 'coin',
	seed = 'rain',
	size = 120,
	duration = 120,
}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const t = frame - from;
	if (t < 0) return null;
	return (
		<AbsoluteFill>
			{new Array(count).fill(0).map((_, i) => {
				const start = random(`${seed}-st-${i}`) * duration;
				const local = t - start;
				if (local < 0) return null;
				const x = random(`${seed}-x-${i}`) * width;
				const sp = 14 + random(`${seed}-v-${i}`) * 12;
				const y = -150 + local * sp;
				if (y > height + 200) return null;
				const rot = (random(`${seed}-r-${i}`) - 0.5) * 8 * local;
				const s = size * (0.6 + random(`${seed}-s-${i}`) * 0.7);
				const style: React.CSSProperties = {position: 'absolute', left: x, top: y, width: s, height: s, translate: '-50% -50%', rotate: `${rot}deg`};
				if (image) return <Img key={i} src={art(image)} style={style} />;
				return kind === 'bill' ? (
					<div key={i} style={{...style, height: s * 0.48, borderRadius: 4, background: 'linear-gradient(135deg,#b9e6a5,#5c9e4a)', border: '2px solid #2f5f24'}} />
				) : (
					<Img key={i} src={art('FX-COIN')} style={{...style, width: s * 0.5, height: s * 0.4, scale: `1 ${Math.max(0.2, Math.abs(Math.cos(local * 0.2 + i)))}`}} />
				);
			})}
		</AbsoluteFill>
	);
};

/** Horizontal speed lines. */
export const SpeedLines: React.FC<{from: number; to: number; color?: string; direction?: 1 | -1; count?: number; seed?: string}> = ({
	from,
	to,
	color = '#ffffff',
	direction = 1,
	count = 26,
	seed = 'sl',
}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	if (frame < from || frame > to) return null;
	const op = interpolate(frame, [from, from + 5, to - 5, to], [0, 0.8, 0.8, 0], clamp);
	return (
		<AbsoluteFill style={{opacity: op}}>
			{new Array(count).fill(0).map((_, i) => {
				const y = random(`${seed}-y-${i}`) * height;
				const len = 200 + random(`${seed}-l-${i}`) * 500;
				const sp = 60 + random(`${seed}-v-${i}`) * 50;
				const x0 = random(`${seed}-x-${i}`) * width;
				const x = ((x0 + (frame - from) * sp * direction) % (width + len) + width + len) % (width + len) - len;
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: len, height: 4 + random(`${seed}-h-${i}`) * 6, borderRadius: 4, background: `linear-gradient(90deg, transparent, ${color})`, rotate: direction === 1 ? '0deg' : '180deg'}} />;
			})}
		</AbsoluteFill>
	);
};

/** Wrap children in a decaying camera shake. */
export const Shake: React.FC<{at: number; strength?: number; length?: number; children: React.ReactNode}> = ({at, strength = 24, length = 18, children}) => {
	const frame = useCurrentFrame();
	const t = frame - at;
	const k = t >= 0 && t < length ? (1 - t / length) * strength : 0;
	return <AbsoluteFill style={{translate: `${Math.sin(t * 2.7) * k}px ${Math.cos(t * 3.3) * k}px`}}>{children}</AbsoluteFill>;
};

/** Comic halftone dot field. */
export const Halftone: React.FC<{color: string; opacity?: number}> = ({color, opacity = 0.35}) => (
	<AbsoluteFill
		style={{
			backgroundImage: `radial-gradient(${color} 22%, transparent 24%)`,
			backgroundSize: '26px 26px',
			opacity,
			maskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
			WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
		}}
	/>
);
