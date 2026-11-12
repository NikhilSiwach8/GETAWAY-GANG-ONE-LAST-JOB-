/**
 * Total Win cards for the end of each bonus, built live from separate layers (replaces the 8 s story outros):
 * bonus background, the crew jumping up to cheer, "TOTAL WIN" slamming in, an empty gold plaque for the
 * amount (drawn and counted up by the game), the bonus ribbon, an info panel (the game fills it with the Heist
 * loot milestones or the Escape crew levels), light rays, coin / bill rain and sparkles.
 *
 *   TOTAL-<BONUS>        3.5 s  build-up (plays once; the game shows the amount from TOTAL_HANDOVER_FRAME)
 *   TOTAL-<BONUS>-LOOP   3.0 s  seamless loop until the player taps
 *   ...-PORTRAIT         1080 x 1920
 *
 * As with the entry cards, the intro's last frame is the loop's first frame (tau = frame - INTRO in the intro).
 * Layout: totalLayout.ts (shared with the game).
 */
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { art, CREW, type CrewKey } from '../lib/assets';
import { TITLE_FONT } from '../lib/font';
import { TOTAL_INTRO_FRAMES as INTRO, TOTAL_LAYOUT, TOTAL_LOOP_FRAMES as P, type TotalLayout } from './totalLayout';

const TAU = Math.PI * 2;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const at = (frame: number, start: number, len: number, e = Easing.out(Easing.cubic)) =>
	interpolate(frame, [start, start + len], [0, 1], { ...clamp, easing: e });
const GOLD = 'linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)';

export type TotalBonus = 'heist' | 'escape' | 'hidden';
const LOOK: Record<
	TotalBonus,
	{ bg: string; ribbon: string; ribbonColors: [string, string]; rays: string; particles: 'coin' | 'bill'; info: boolean; crew: CrewKey[] }
> = {
	heist: {
		bg: 'BG-HEIST',
		ribbon: 'HEIST COMPLETE!',
		ribbonColors: ['#d62828', '#8a1010'],
		rays: '255,196,80',
		particles: 'coin',
		info: true,
		crew: ['B', 'R', 'T', 'F'],
	},
	escape: {
		bg: 'BG-ESCAPE',
		ribbon: 'PERFECT ESCAPE!',
		ribbonColors: ['#1d6fe0', '#0b2e7a'],
		rays: '120,220,255',
		particles: 'bill',
		info: true,
		crew: ['T', 'R', 'B', 'F'],
	},
	hidden: {
		bg: 'BG-HIDDEN',
		ribbon: 'HIDDEN BONUS!',
		ribbonColors: ['#b5160f', '#5a0a07'],
		rays: '255,208,96',
		particles: 'coin',
		info: false,
		crew: ['T', 'R', 'B', 'F'],
	},
};

const useL = (): TotalLayout => {
	const { width, height } = useVideoConfig();
	return height > width ? TOTAL_LAYOUT.portrait : TOTAL_LAYOUT.landscape;
};

const Background: React.FC<{ bonus: TotalBonus; frame: number; tau: number }> = ({ bonus, frame, tau }) => {
	const L = useL();
	const s = Math.max(L.width / 1920, L.height / 1080);
	const push = interpolate(at(frame, 0, 36), [0, 1], [1.18, 1.06]);
	const drift = Math.sin((tau / P) * TAU) * 12;
	return (
		<AbsoluteFill style={{ opacity: at(frame, 0, 12) }}>
			<Img
				src={art(LOOK[bonus].bg)}
				style={{
					position: 'absolute',
					width: 1920 * s,
					height: 1080 * s,
					left: (L.width - 1920 * s) / 2,
					top: (L.height - 1080 * s) / 2,
					scale: push,
					translate: `${drift}px 0px`,
					filter: 'saturate(1.05) brightness(0.62) blur(1.5px)',
				}}
			/>
			<AbsoluteFill
				style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(5,7,15,0.15) 0%, rgba(5,7,15,0.55) 60%, rgba(5,7,15,0.85) 100%)' }}
			/>
		</AbsoluteFill>
	);
};

const Rays: React.FC<{ bonus: TotalBonus; frame: number; tau: number }> = ({ bonus, frame, tau }) => {
	const L = useL();
	const bloom = at(frame, 26, 18, Easing.out(Easing.back(1.6)));
	const size = Math.max(L.width, L.height) * 1.25 * bloom;
	const g = size * 0.45;
	const c = LOOK[bonus].rays;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: L.plaque.x - g,
					top: L.plaque.y - g * 0.75,
					width: g * 2,
					height: g * 1.5,
					borderRadius: '50%',
					background: `radial-gradient(ellipse, rgba(${c},${0.55 * bloom}) 0%, rgba(${c},${0.18 * bloom}) 40%, rgba(${c},0) 70%)`,
					mixBlendMode: 'screen',
				}}
			/>
			<Img
				src={art('UI-RAYS')}
				style={{
					position: 'absolute',
					width: size,
					height: size,
					left: L.plaque.x - size / 2,
					top: L.title.y + (L.plaque.y - L.title.y) / 2 - size / 2,
					rotate: `${Math.sin((tau / P) * TAU) * 5}deg`,
					opacity: 0.34 * bloom,
					mixBlendMode: 'screen',
				}}
			/>
		</>
	);
};

/** Crew jump up from below, land with a squash, then cheer (periodic hop). */
const Crew: React.FC<{ id: CrewKey; slot: number; frame: number; tau: number }> = ({ id, slot, frame, tau }) => {
	const L = useL();
	const start = 6 + slot * 7;
	const rise = at(frame, start, 14, Easing.out(Easing.back(1.7)));
	const land = frame - (start + 14);
	const squash =
		land < 0
			? 1
			: land < 4
				? interpolate(land, [0, 4], [1, 0.9])
				: interpolate(land, [4, 14], [0.9, 1], { ...clamp, easing: Easing.out(Easing.back(3)) });
	const h = L.crewH * L.height;
	// cheer: each member hops twice per loop, offset from the others; zero at tau = 0 so the loop is seamless
	const ph = ((((tau / P) * 2 + slot * 0.25) % 1) + 1) % 1;
	const hop = land > 14 ? Math.sin(ph * Math.PI) ** 2 * h * 0.035 : 0;
	const lean = Math.sin((tau / P) * TAU + slot) * 1.2;
	const flip = slot >= 2 && L.width > L.height;
	return (
		<div
			style={{
				position: 'absolute',
				left: L.crewX[slot] * L.width - h / 2,
				top: L.crewFeet * L.height - h + (1 - rise) * L.height * 0.5 - hop,
				width: h,
				height: h,
				transformOrigin: '50% 100%',
				scale: `${(flip ? -1 : 1) * (2 - squash)} ${squash}`,
				rotate: `${lean}deg`,
				filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.6))',
			}}
		>
			<Img src={art(CREW[id].pose)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
		</div>
	);
};

const Title: React.FC<{ frame: number; tau: number }> = ({ frame, tau }) => {
	const L = useL();
	const t0 = 26;
	if (frame < t0) return null;
	const slam =
		frame < t0 + 7
			? interpolate(frame, [t0, t0 + 7], [2.4, 0.92], { easing: Easing.in(Easing.quad) })
			: interpolate(frame, [t0 + 7, t0 + 22], [0.92, 1], { ...clamp, easing: Easing.out(Easing.elastic(1.2)) });
	const shine = interpolate(((tau % P) + P) % P, [8, 40], [-0.4, 1.4], clamp);
	const size = L.title.size;
	const text = 'TOTAL WIN';
	const common: React.CSSProperties = { fontFamily: TITLE_FONT, fontSize: size, lineHeight: 1, letterSpacing: 4, whiteSpace: 'nowrap' };
	return (
		<div style={{ position: 'absolute', left: L.title.x, top: L.title.y, translate: '-50% -50%', scale: slam, rotate: '-3deg' }}>
			<div
				style={{
					...common,
					position: 'relative',
					background: GOLD,
					WebkitBackgroundClip: 'text',
					backgroundClip: 'text',
					color: 'transparent',
					WebkitTextStroke: `${size / 18}px #2a1200`,
					paintOrder: 'stroke fill',
					filter: `drop-shadow(0 ${size / 16}px 0 #d4231a) drop-shadow(0 ${size / 9}px ${size / 7}px rgba(0,0,0,0.65))`,
				}}
			>
				{text}
				<span
					style={{
						position: 'absolute',
						inset: 0,
						background: `linear-gradient(100deg, rgba(255,255,255,0) ${shine * 100 - 12}%, rgba(255,255,255,0.85) ${shine * 100}%, rgba(255,255,255,0) ${shine * 100 + 12}%)`,
						WebkitBackgroundClip: 'text',
						backgroundClip: 'text',
						color: 'transparent',
					}}
				>
					{text}
				</span>
			</div>
		</div>
	);
};

/** The empty plaque the game writes the amount into. */
const Plaque: React.FC<{ frame: number; tau: number }> = ({ frame, tau }) => {
	const L = useL();
	const pop = at(frame, 40, 12, Easing.out(Easing.back(1.8)));
	if (pop <= 0) return null;
	const glow = 0.5 + 0.5 * Math.sin((tau / P) * TAU * 2);
	const { w, h } = L.plaque;
	return (
		<div style={{ position: 'absolute', left: L.plaque.x - w / 2, top: L.plaque.y - h / 2, width: w, height: h, scale: pop }}>
			<div
				style={{
					width: '100%',
					height: '100%',
					borderRadius: h / 2,
					background: 'linear-gradient(180deg, #1b2450 0%, #0a1030 60%, #060a20 100%)',
					border: '10px solid #f7c947',
					boxShadow: `0 0 0 5px #7a4a00, 0 14px 34px rgba(0,0,0,0.65), 0 0 ${50 + 40 * glow}px rgba(255,201,60,${0.35 + 0.3 * glow}), inset 0 8px 0 rgba(255,255,255,0.12), inset 0 -14px 30px rgba(0,0,0,0.5)`,
				}}
			/>
			{/* rivets */}
			{[0.06, 0.94].map((fx) => (
				<div
					key={fx}
					style={{
						position: 'absolute',
						left: w * fx - 12,
						top: h / 2 - 12,
						width: 24,
						height: 24,
						borderRadius: '50%',
						background: 'radial-gradient(circle at 35% 35%, #fff3b0, #c98a12 60%, #6a3d00)',
					}}
				/>
			))}
		</div>
	);
};

const Ribbon: React.FC<{ bonus: TotalBonus; frame: number }> = ({ bonus, frame }) => {
	const L = useL();
	const k = at(frame, 52, 14, Easing.out(Easing.back(1.8)));
	if (k <= 0) return null;
	const c = LOOK[bonus].ribbonColors;
	return (
		<div
			style={{
				position: 'absolute',
				left: L.ribbon.x,
				top: L.ribbon.y,
				translate: '-50% -50%',
				scale: `${k} 1`,
				opacity: at(frame, 52, 5),
			}}
		>
			<div
				style={{
					fontFamily: TITLE_FONT,
					fontSize: 62,
					color: '#ffe27a',
					WebkitTextStroke: '5px #2a1200',
					paintOrder: 'stroke fill',
					letterSpacing: 3,
					whiteSpace: 'nowrap',
					padding: '18px 96px 10px',
					background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 100%)`,
					clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
					boxShadow: 'inset 0 5px 0 rgba(255,255,255,0.2)',
					filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.6))',
				}}
			>
				{LOOK[bonus].ribbon}
			</div>
		</div>
	);
};

/** Info panel (Heist loot milestones / Escape crew levels are drawn on it by the game). */
const Info: React.FC<{ bonus: TotalBonus; frame: number }> = ({ bonus, frame }) => {
	const L = useL();
	if (!LOOK[bonus].info) return null;
	const k = at(frame, 62, 14);
	const { x, y, w, h } = L.info;
	return (
		<div
			style={{
				position: 'absolute',
				left: x - w / 2,
				top: y - h / 2 + (1 - k) * 40,
				width: w,
				height: h,
				opacity: k,
				borderRadius: 28,
				background: 'linear-gradient(180deg, rgba(10,16,48,0.86) 0%, rgba(5,8,26,0.92) 100%)',
				border: '4px solid rgba(247,201,71,0.75)',
				boxShadow: '0 10px 28px rgba(0,0,0,0.55), inset 0 4px 0 rgba(255,255,255,0.08)',
			}}
		/>
	);
};

/** Coins or bills raining, wrapped so the loop is seamless. */
const Rain: React.FC<{ kind: 'coin' | 'bill'; tau: number; on: number; seed: string }> = ({ kind, tau, on, seed }) => {
	const L = useL();
	const n = kind === 'bill' ? 18 : 24;
	return (
		<AbsoluteFill style={{ opacity: on }}>
			{Array.from({ length: n }, (_, i) => {
				const r = (k: string) => random(`${seed}-${i}-${k}`);
				const passes = 1 + Math.floor(r('p') * 2);
				const p = ((((tau / P) * passes + r('o')) % 1) + 1) % 1;
				const size = (kind === 'bill' ? 92 : 62) * (0.6 + r('s') * 0.8) * (Math.max(L.width, L.height) / 1920);
				const x = r('x') * L.width + Math.sin(p * TAU + i) * 30;
				const y = -size + p * (L.height + size * 2);
				const spin = (p * 360 * (r('d') > 0.5 ? 1 : -1)) % 360;
				const flip = Math.abs(Math.cos(p * TAU * 2 + i));
				return kind === 'coin' ? (
					<Img
						key={i}
						src={art('FX-COIN')}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: size,
							height: size * 0.8,
							scale: `${Math.max(0.2, flip)} 1`,
							rotate: `${spin}deg`,
							opacity: 0.92,
						}}
					/>
				) : (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: size,
							height: size * 0.45,
							background: 'linear-gradient(180deg,#b8e6a0,#5f9e4a)',
							border: '2px solid #2e5a22',
							borderRadius: 4,
							rotate: `${spin}deg`,
							scale: `1 ${Math.max(0.25, flip)}`,
							opacity: 0.86,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

const Sparkles: React.FC<{ tau: number; on: number }> = ({ tau, on }) => {
	const L = useL();
	const { x, y, w, h } = L.plaque;
	const spots: [number, number][] = [
		[x - w * 0.52, y - h * 0.4],
		[x + w * 0.5, y - h * 0.5],
		[x - w * 0.45, y + h * 0.55],
		[x + w * 0.48, y + h * 0.45],
		[L.title.x + w * 0.35, L.title.y - 60],
	];
	return (
		<AbsoluteFill style={{ opacity: on, mixBlendMode: 'screen' }}>
			{spots.map(([sx, sy], i) => {
				const ph = (((tau + (i * P) / spots.length) % P) + P) % P;
				const k = ph < 18 ? Math.sin((ph / 18) * Math.PI) : 0;
				const s = 100 * k;
				return (
					<div key={i} style={{ position: 'absolute', left: sx - s / 2, top: sy - s / 2, width: s, height: s, rotate: `${ph * 3}deg` }}>
						<div
							style={{
								position: 'absolute',
								left: 0,
								top: '47%',
								width: '100%',
								height: '6%',
								background: 'linear-gradient(90deg, transparent, #fff6c2, transparent)',
							}}
						/>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: '47%',
								height: '100%',
								width: '6%',
								background: 'linear-gradient(180deg, transparent, #fff6c2, transparent)',
							}}
						/>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

const Hit: React.FC<{ frame: number; at0: number }> = ({ frame, at0 }) => {
	const L = useL();
	const k = at(frame, at0, 12);
	if (frame < at0 || k >= 1) return null;
	const r = Math.max(L.width, L.height) * 0.9 * k;
	return (
		<>
			<AbsoluteFill style={{ background: '#fff', opacity: 0.65 * (1 - k) * (1 - k) }} />
			<div
				style={{
					position: 'absolute',
					left: L.title.x - r,
					top: L.title.y - r,
					width: r * 2,
					height: r * 2,
					borderRadius: '50%',
					border: `${18 * (1 - k)}px solid rgba(255,236,170,${1 - k})`,
				}}
			/>
		</>
	);
};

export const TotalCard: React.FC<{ bonus: TotalBonus; mode: 'intro' | 'loop' }> = ({ bonus, mode }) => {
	const f = useCurrentFrame();
	const frame = mode === 'intro' ? f : INTRO + 1000;
	const tau = mode === 'intro' ? f - INTRO : f;
	const ambient = mode === 'intro' ? at(f, 28, 60) : 1;
	const look = LOOK[bonus];
	return (
		<AbsoluteFill style={{ background: '#05070f', overflow: 'hidden' }}>
			<Background bonus={bonus} frame={frame} tau={tau} />
			<Rays bonus={bonus} frame={frame} tau={tau} />
			{look.crew.map((id, i) => (
				<Crew key={id} id={id} slot={i} frame={frame} tau={tau} />
			))}
			<Rain kind={look.particles} tau={tau} on={ambient} seed={`total-${bonus}`} />
			<Info bonus={bonus} frame={frame} />
			<Plaque frame={frame} tau={tau} />
			<Ribbon bonus={bonus} frame={frame} />
			<Title frame={frame} tau={tau} />
			<Sparkles tau={tau} on={ambient} />
			{mode === 'intro' && <Hit frame={f} at0={33} />}
			{mode === 'intro' && <AbsoluteFill style={{ background: '#000', opacity: 1 - at(f, 0, 10) }} />}
		</AbsoluteFill>
	);
};
