/**
 * Bonus entry cards, built live from separate layers (replaces the flat SCR-*-INTRO poster):
 *   bonus background (camera push + drift), the four crew poses landing one by one (squash on landing,
 *   then idle bob), the bonus title slamming in, the free-spins plate counting up, the feature ribbon
 *   (and the Mystery Vault's guarantee stamp), light rays, coins / bills, sparkles, scene lights.
 *
 *   ENTRY-<BONUS>        4.0 s  build-up (plays once)
 *   ENTRY-<BONUS>-LOOP   3.0 s  living card, seamless (loops until the player taps)
 *   ...-PORTRAIT         the same at 1080 x 1920 (phones show a 9:16 crop of nothing otherwise)
 *
 * The intro's last frame is exactly the loop's first frame: every periodic layer runs on
 * tau = frame - INTRO_FRAMES during the intro and tau = frame in the loop, with period LOOP_FRAMES.
 * No "press anywhere" prompt is baked in: the game draws its own (TAP on touch, PRESS with a mouse).
 */
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { art, CREW, type CrewKey } from '../lib/assets';
import { TITLE_FONT } from '../lib/font';

export const INTRO_FRAMES = 120;
export const LOOP_FRAMES = 90;
const TAU = Math.PI * 2;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = {
	out: Easing.out(Easing.cubic),
	back: Easing.out(Easing.back(1.8)),
	in: Easing.in(Easing.quad),
	inOut: Easing.inOut(Easing.sin),
};

export type Bonus = 'heist' | 'escape' | 'hidden';
type Look = {
	bg: string;
	title: string[];
	titleFill: string[];
	titleShadow: string;
	fs: number;
	plate: [string, string];
	ribbon: string;
	ribbonColors: [string, string];
	stamp?: [string, string];
	particles: 'coin' | 'bill';
	rays: string;
	crew: CrewKey[]; // back to front
	lights: { x: number; y: number; r: number; color: string; period: number; phase?: number }[];
};

export const ENTRY: Record<Bonus, Look> = {
	heist: {
		bg: 'BG-HEIST',
		title: ['THE HEIST'],
		titleFill: ['linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)'],
		titleShadow: '#d4231a',
		fs: 10,
		plate: ['#5a1a66', '#2a0a3a'],
		ribbon: 'LOOT METER ACTIVE',
		ribbonColors: ['#d62828', '#8a1010'],
		particles: 'coin',
		rays: '255,196,80',
		crew: ['B', 'T', 'F', 'R'],
		lights: [
			{ x: 0.5, y: 0.06, r: 380, color: '255,231,168', period: 45 },
			{ x: 0.093, y: 0.065, r: 170, color: '255,70,50', period: 30 },
			{ x: 0.902, y: 0.105, r: 170, color: '255,70,50', period: 30, phase: 15 },
		],
	},
	escape: {
		bg: 'BG-ESCAPE',
		title: ['THE PERFECT', 'ESCAPE'],
		titleFill: [
			'linear-gradient(180deg,#e9fdff 0%,#7fe9ff 45%,#28b9ef 100%)',
			'linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)',
		],
		titleShadow: '#c0249b',
		fs: 12,
		plate: ['#4a0f1c', '#22050c'],
		ribbon: 'CREW UPGRADES PERSIST',
		ribbonColors: ['#1d6fe0', '#0b2e7a'],
		particles: 'bill',
		rays: '120,220,255',
		crew: ['T', 'B', 'F', 'R'],
		lights: [
			{ x: 0.69, y: 0.73, r: 130, color: '255,40,60', period: 18 },
			{ x: 0.74, y: 0.73, r: 130, color: '60,120,255', period: 18, phase: 9 },
			{ x: 0.06, y: 0.18, r: 300, color: '255,74,223', period: 45 },
			{ x: 0.935, y: 0.3, r: 250, color: '255,90,232', period: 30, phase: 10 },
		],
	},
	hidden: {
		bg: 'BG-HIDDEN',
		title: ['HIDDEN', 'BONUS'],
		titleFill: [
			'linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)',
			'linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)',
		],
		titleShadow: '#b5470f',
		fs: 15,
		plate: ['#7a0f12', '#3a0507'],
		ribbon: 'ALL CREW START AT LEVEL 2',
		ribbonColors: ['#1d4fa8', '#0b1f5a'],
		stamp: ['GUARANTEED', '500× WIN'],
		particles: 'coin',
		rays: '255,208,96',
		crew: ['T', 'B', 'F', 'R'],
		lights: [
			{ x: 0.875, y: 0.66, r: 420, color: '255,192,64', period: 45 },
			{ x: 0.1, y: 0.6, r: 380, color: '255,170,48', period: 90 },
		],
	},
};

/** -1 .. intro build progress helpers */
const at = (frame: number, start: number, len: number, e = ease.out) =>
	interpolate(frame, [start, start + len], [0, 1], { ...clamp, easing: e });

// ------------------------------------------------------------------ layout (landscape / portrait)
/** the bonus being drawn (the Mystery Vault card has one more line, so its text column sits higher) */
const BonusContext = React.createContext<Bonus>('heist');
const useLayout = () => {
	const { width: W, height: H } = useVideoConfig();
	const portrait = H > W;
	const tall = React.useContext(BonusContext) === 'hidden';
	const base = {
		W,
		H,
		portrait,
		// text column
		tx: portrait ? 0.5 : 0.72,
		titleY: portrait ? 0.14 : 0.27,
		plateY: portrait ? 0.285 : 0.52,
		ribbonY: portrait ? 0.365 : 0.695,
		stampY: portrait ? 0.45 : 0.82,
		textScale: portrait ? 0.92 : 1,
		// crew: centre x per slot (back to front), feet line, height
		crewX: portrait ? [0.17, 0.39, 0.62, 0.84] : [0.085, 0.3, 0.405, 0.195],
		crewH: portrait ? 0.46 : 0.7,
		crewFeet: portrait ? 1.03 : 1.04,
	};
	return tall && !portrait ? { ...base, titleY: 0.2, plateY: 0.44, ribbonY: 0.595, stampY: 0.79 } : base;
};

// ------------------------------------------------------------------ layers
const Background: React.FC<{ look: Look; frame: number; tau: number }> = ({ look, frame, tau }) => {
	const { W, H, portrait } = useLayout();
	const push = interpolate(at(frame, 0, 40), [0, 1], [1.22, 1.06]);
	const drift = Math.sin((tau / LOOP_FRAMES) * TAU) * 14;
	const fadeIn = at(frame, 0, 14);
	// cover-fit the 16:9 art
	const s = Math.max(W / 1920, H / 1080);
	const bw = 1920 * s;
	const bh = 1080 * s;
	return (
		<AbsoluteFill style={{ opacity: fadeIn }}>
			<Img
				src={art(look.bg)}
				style={{
					position: 'absolute',
					width: bw,
					height: bh,
					left: (W - bw) / 2,
					top: (H - bh) / 2,
					scale: push,
					translate: `${drift}px ${drift * 0.3}px`,
					filter: 'saturate(1.08) brightness(0.78)',
				}}
			/>
			{/* depth: darken towards the text column so the lettering reads, vignette at the edges */}
			<AbsoluteFill
				style={{
					background: portrait
						? 'linear-gradient(180deg, rgba(5,7,15,0.72) 0%, rgba(5,7,15,0.35) 42%, rgba(5,7,15,0) 60%, rgba(5,7,15,0.5) 100%)'
						: 'linear-gradient(90deg, rgba(5,7,15,0.1) 0%, rgba(5,7,15,0) 35%, rgba(5,7,15,0.55) 62%, rgba(5,7,15,0.62) 100%)',
				}}
			/>
			<AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />
		</AbsoluteFill>
	);
};

const Lights: React.FC<{ look: Look; tau: number; on: number }> = ({ look, tau, on }) => {
	const { W, H } = useLayout();
	const s = Math.max(W / 1920, H / 1080);
	const ox = (W - 1920 * s) / 2;
	const oy = (H - 1080 * s) / 2;
	return (
		<AbsoluteFill style={{ mixBlendMode: 'screen', opacity: on }}>
			{look.lights.map((l, i) => {
				const k = 0.55 + 0.45 * Math.sin(((tau + (l.phase ?? 0)) / l.period) * TAU);
				const r = l.r * s;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: ox + l.x * 1920 * s - r,
							top: oy + l.y * 1080 * s - r,
							width: r * 2,
							height: r * 2,
							borderRadius: '50%',
							background: `radial-gradient(circle, rgba(${l.color},${0.7 * k}) 0%, rgba(${l.color},${0.22 * k}) 38%, rgba(${l.color},0) 70%)`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

const Rays: React.FC<{ look: Look; frame: number; tau: number }> = ({ look, frame, tau }) => {
	const { W, H, tx, titleY } = useLayout();
	const bloom = at(frame, 48, 18, ease.back);
	const size = Math.max(W, H) * 1.15 * bloom;
	const rot = Math.sin((tau / LOOP_FRAMES) * TAU) * 4;
	const g = Math.max(W, H) * 0.55 * bloom;
	return (
		<>
			<div
				style={{
					position: 'absolute',
					left: tx * W - g,
					top: titleY * H - g * 0.7,
					width: g * 2,
					height: g * 1.4,
					borderRadius: '50%',
					background: `radial-gradient(ellipse, rgba(${look.rays},${0.5 * bloom}) 0%, rgba(${look.rays},${0.16 * bloom}) 40%, rgba(${look.rays},0) 70%)`,
					mixBlendMode: 'screen',
				}}
			/>
			<Img
				src={art('UI-RAYS')}
				style={{
					position: 'absolute',
					width: size,
					height: size,
					left: tx * W - size / 2,
					top: titleY * H - size / 2,
					rotate: `${rot}deg`,
					opacity: 0.3 * bloom,
					mixBlendMode: 'screen',
				}}
			/>
		</>
	);
};

/** One crew pose: drops in with a back-eased landing, squashes on impact, then breathes and bobs. */
const CrewMember: React.FC<{ id: CrewKey; slot: number; frame: number; tau: number; order: number }> = ({
	id,
	slot,
	frame,
	tau,
	order,
}) => {
	const { W, H, crewX, crewH, crewFeet } = useLayout();
	const start = 10 + order * 9;
	const drop = at(frame, start, 13, ease.back);
	const land = frame - (start + 13);
	// squash on landing: down to 0.9, back up with a small overshoot, settled by 14 frames after landing
	const squash =
		land < 0
			? 1
			: land < 4
				? interpolate(land, [0, 4], [1, 0.9], { easing: ease.out })
				: interpolate(land, [4, 14], [0.9, 1], { ...clamp, easing: Easing.out(Easing.back(3)) });
	const h = crewH * H * (slot === 1 ? 1.04 : 1);
	const w = h; // square pose canvases (Byte is narrower; contain keeps the aspect)
	const bob = Math.sin((tau / LOOP_FRAMES) * TAU + order * 1.3) * 7;
	const breathe = 1 + 0.012 * Math.sin((tau / LOOP_FRAMES) * TAU * 2 + order);
	const y = crewFeet * H - h + (1 - drop) * -H * 0.55 + bob * (land > 14 ? 1 : 0);
	return (
		<div
			style={{
				position: 'absolute',
				left: crewX[slot] * W - w / 2,
				top: y,
				width: w,
				height: h,
				transformOrigin: '50% 100%',
				scale: `${2 - squash * breathe} ${squash * breathe}`,
				opacity: interpolate(frame, [start, start + 3], [0, 1], clamp),
				filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.55))',
			}}
		>
			<Img src={art(CREW[id].pose)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
		</div>
	);
};

/** Dust ring at a crew member's feet on landing. */
const LandDust: React.FC<{ slot: number; frame: number; order: number }> = ({ slot, frame, order }) => {
	const { W, H, crewX, crewFeet } = useLayout();
	const t0 = 10 + order * 9 + 13;
	const k = at(frame, t0, 16);
	if (frame < t0 || k >= 1) return null;
	const w = 340 * (0.4 + k) * (W / 1920 + 0.2);
	return (
		<div
			style={{
				position: 'absolute',
				left: crewX[slot] * W - w / 2,
				top: Math.min(H - 40, crewFeet * H - H * 0.06) - w * 0.08,
				width: w,
				height: w * 0.16,
				borderRadius: '50%',
				background: 'radial-gradient(ellipse, rgba(255,236,190,0.55) 0%, rgba(255,236,190,0) 70%)',
				opacity: 1 - k,
			}}
		/>
	);
};

const Title: React.FC<{ look: Look; frame: number; tau: number }> = ({ look, frame, tau }) => {
	const { W, H, tx, titleY, textScale, portrait } = useLayout();
	const t0 = 48;
	// grows in from far, overshoots small on the hit, springs to rest
	const slam =
		frame < t0
			? 0
			: frame < t0 + 7
				? interpolate(frame, [t0, t0 + 7], [2.3, 0.92], { easing: ease.in })
				: interpolate(frame, [t0 + 7, t0 + 22], [0.92, 1], { ...clamp, easing: Easing.out(Easing.elastic(1.2)) });
	const shine = interpolate(((tau % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES, [10, 42], [-0.4, 1.4], clamp);
	const size = (look.title.length > 1 ? 150 : 190) * textScale * (portrait ? 1.05 : 1);
	if (frame < t0) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: tx * W,
				top: titleY * H,
				translate: '-50% -50%',
				scale: slam,
				rotate: '-4deg',
				textAlign: 'center',
				whiteSpace: 'nowrap',
			}}
		>
			{look.title.map((line, i) => (
				<div
					key={i}
					style={{
						position: 'relative',
						fontFamily: TITLE_FONT,
						fontSize: size * (look.title.length > 1 && i === 0 ? 0.78 : 1),
						lineHeight: 1.02,
						letterSpacing: 3,
						background: look.titleFill[i] ?? look.titleFill[0],
						WebkitBackgroundClip: 'text',
						backgroundClip: 'text',
						color: 'transparent',
						WebkitTextStroke: `${size / 18}px #2a1200`,
						paintOrder: 'stroke fill',
						filter: `drop-shadow(0 ${size / 16}px 0 ${look.titleShadow}) drop-shadow(0 ${size / 9}px ${size / 7}px rgba(0,0,0,0.65))`,
					}}
				>
					{line}
					{/* chrome shine sweeping across the lettering once per loop */}
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
						{line}
					</span>
				</div>
			))}
		</div>
	);
};

/** Free-spins plate: pops in, the number counts up with a tick on every spin, then a final hit. */
const Plate: React.FC<{ look: Look; frame: number; tau: number }> = ({ look, frame, tau }) => {
	const { W, H, tx, plateY, textScale } = useLayout();
	const t0 = 64;
	const pop = at(frame, t0, 12, ease.back);
	if (pop <= 0) return null;
	const countK = at(frame, t0 + 4, 22, Easing.out(Easing.quad));
	const n = Math.round(look.fs * countK);
	// a short tick each time the number changes, a bigger hit when it lands
	const tickAt = t0 + 4 + 22 * (1 - Math.sqrt(Math.max(0, 1 - n / look.fs))); // frame where n was reached
	const since = frame - tickAt;
	const tick = n > 0 && since >= 0 && since < 5 ? 1 + 0.12 * (1 - since / 5) : 1;
	const landHit = frame >= t0 + 26 ? 1 + 0.16 * Math.max(0, 1 - (frame - t0 - 26) / 10) : 1;
	const glow = 0.5 + 0.5 * Math.sin((tau / LOOP_FRAMES) * TAU * 2);
	const sc = textScale;
	return (
		<div style={{ position: 'absolute', left: tx * W, top: plateY * H, translate: '-50% -50%', scale: pop }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 22 * sc,
					padding: `${10 * sc}px ${46 * sc}px ${10 * sc}px ${34 * sc}px`,
					borderRadius: 999,
					background: `linear-gradient(180deg, ${look.plate[0]} 0%, ${look.plate[1]} 100%)`,
					border: `${8 * sc}px solid #f7c947`,
					boxShadow: `0 0 0 ${4 * sc}px #7a4a00, 0 10px 30px rgba(0,0,0,0.6), 0 0 ${40 + 30 * glow}px rgba(255,201,60,${0.35 + 0.25 * glow}), inset 0 6px 0 rgba(255,255,255,0.18)`,
				}}
			>
				<span
					style={{
						fontFamily: TITLE_FONT,
						fontSize: 150 * sc,
						lineHeight: 1,
						background: 'linear-gradient(180deg,#fffbe0 0%,#ffe066 35%,#f7a823 70%,#c46a00 100%)',
						WebkitBackgroundClip: 'text',
						backgroundClip: 'text',
						color: 'transparent',
						WebkitTextStroke: `${8 * sc}px #2a1200`,
						paintOrder: 'stroke fill',
						display: 'inline-block',
						minWidth: 170 * sc,
						textAlign: 'center',
						scale: tick * landHit,
						translate: `0 ${8 * sc}px`,
					}}
				>
					{n}
				</span>
				<span
					style={{
						whiteSpace: 'nowrap',
						fontFamily: TITLE_FONT,
						fontSize: 84 * sc,
						color: '#ffffff',
						WebkitTextStroke: `${6 * sc}px #1a0d00`,
						paintOrder: 'stroke fill',
						translate: `0 ${6 * sc}px`,
						letterSpacing: 2,
					}}
				>
					FREE SPINS
				</span>
			</div>
		</div>
	);
};

/** Feature ribbon with folded ends: slides in from the side. */
const Ribbon: React.FC<{ look: Look; frame: number }> = ({ look, frame }) => {
	const { W, H, tx, ribbonY, textScale, portrait } = useLayout();
	const k = at(frame, 86, 14, ease.back);
	if (k <= 0) return null;
	const sc = textScale;
	return (
		<div
			style={{
				position: 'absolute',
				left: tx * W + (1 - k) * W * (portrait ? 0.6 : 0.4),
				top: ribbonY * H,
				translate: '-50% -50%',
				opacity: at(frame, 86, 5),
			}}
		>
			<div
				style={{
					fontFamily: TITLE_FONT,
					fontSize: 58 * sc,
					color: '#ffe27a',
					WebkitTextStroke: `${5 * sc}px #2a1200`,
					paintOrder: 'stroke fill',
					letterSpacing: 2,
					whiteSpace: 'nowrap',
					padding: `${16 * sc}px ${90 * sc}px ${10 * sc}px`,
					background: `linear-gradient(180deg, ${look.ribbonColors[0]} 0%, ${look.ribbonColors[1]} 100%)`,
					clipPath: 'polygon(0 0, 100% 0, 94% 50%, 100% 100%, 0 100%, 6% 50%)',
					boxShadow: 'inset 0 5px 0 rgba(255,255,255,0.2)',
					filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.6))',
				}}
			>
				{look.ribbon}
			</div>
		</div>
	);
};

/** Mystery Vault guarantee: a gold stamp slammed in last. */
const StampPlate: React.FC<{ look: Look; frame: number; tau: number }> = ({ look, frame, tau }) => {
	const { W, H, tx, stampY, textScale } = useLayout();
	if (!look.stamp) return null;
	const t0 = 98;
	if (frame < t0) return null;
	const slam =
		frame < t0 + 6
			? interpolate(frame, [t0, t0 + 6], [1.9, 0.94], { easing: ease.in })
			: interpolate(frame, [t0 + 6, t0 + 18], [0.94, 1], { ...clamp, easing: Easing.out(Easing.back(2.5)) });
	const glow = 0.5 + 0.5 * Math.sin((tau / LOOP_FRAMES) * TAU + 2);
	const sc = textScale;
	return (
		<div style={{ position: 'absolute', left: tx * W, top: stampY * H, translate: '-50% -50%', scale: slam, rotate: '3deg' }}>
			<div
				style={{
					textAlign: 'center',
					padding: `${14 * sc}px ${60 * sc}px`,
					borderRadius: 18 * sc,
					background: 'linear-gradient(180deg,#fff3b0 0%,#f7c947 45%,#c98a12 100%)',
					border: `${6 * sc}px solid #7a4a00`,
					boxShadow: `0 0 ${30 + 30 * glow}px rgba(255,201,60,${0.45 + 0.3 * glow}), 0 10px 26px rgba(0,0,0,0.55)`,
				}}
			>
				<div style={{ whiteSpace: 'nowrap', fontFamily: TITLE_FONT, fontSize: 46 * sc, color: '#5a1a00', lineHeight: 1.05 }}>
					{look.stamp[0]}
				</div>
				<div
					style={{
						whiteSpace: 'nowrap',
						fontFamily: TITLE_FONT,
						fontSize: 96 * sc,
						color: '#b5160f',
						lineHeight: 1,
						WebkitTextStroke: `${4 * sc}px #ffe9a8`,
						paintOrder: 'stroke fill',
					}}
				>
					{look.stamp[1]}
				</div>
			</div>
		</div>
	);
};

/** Coins or bills drifting down, wrapped so the loop is seamless (each crosses an integer number of times). */
const Drift: React.FC<{ kind: 'coin' | 'bill'; tau: number; on: number; seed: string }> = ({ kind, tau, on, seed }) => {
	const { W, H } = useLayout();
	const n = kind === 'bill' ? 14 : 18;
	return (
		<AbsoluteFill style={{ opacity: on }}>
			{Array.from({ length: n }, (_, i) => {
				const r = (k: string) => random(`${seed}-${i}-${k}`);
				const passes = 1 + Math.floor(r('p') * 2);
				const p = ((((tau / LOOP_FRAMES) * passes + r('o')) % 1) + 1) % 1;
				const size = (kind === 'bill' ? 90 : 60) * (0.6 + r('s') * 0.8) * (Math.max(W, H) / 1920);
				const x = r('x') * W + Math.sin(p * TAU + i) * 30;
				const y = -size + p * (H + size * 2);
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
							opacity: 0.9,
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
							opacity: 0.85,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

const Twinkles: React.FC<{ tau: number; on: number }> = ({ tau, on }) => {
	const { W, H, tx, titleY, plateY, portrait } = useLayout();
	const spots: [number, number][] = portrait
		? [
				[tx - 0.36, titleY - 0.05],
				[tx + 0.35, titleY + 0.02],
				[tx - 0.3, plateY + 0.02],
				[tx + 0.33, plateY - 0.02],
				[0.5, titleY - 0.09],
			]
		: [
				[tx - 0.2, titleY - 0.1],
				[tx + 0.2, titleY + 0.06],
				[tx - 0.17, plateY],
				[tx + 0.19, plateY - 0.03],
				[tx + 0.02, titleY - 0.15],
			];
	return (
		<AbsoluteFill style={{ opacity: on, mixBlendMode: 'screen' }}>
			{spots.map(([x, y], i) => {
				const ph = (((tau + (i * LOOP_FRAMES) / spots.length) % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
				const k = ph < 18 ? Math.sin((ph / 18) * Math.PI) : 0;
				const s = 90 * k;
				return (
					<div
						key={i}
						style={{ position: 'absolute', left: x * W - s / 2, top: y * H - s / 2, width: s, height: s, rotate: `${ph * 3}deg` }}
					>
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

/** The title hit: white flash and a shockwave ring from the title. */
const Hit: React.FC<{ frame: number; at0: number; strength?: number }> = ({ frame, at0, strength = 0.7 }) => {
	const { W, H, tx, titleY } = useLayout();
	const k = at(frame, at0, 12);
	if (frame < at0 || k >= 1) return null;
	const r = Math.max(W, H) * 0.9 * k;
	return (
		<>
			<AbsoluteFill style={{ background: '#fff', opacity: strength * (1 - k) * (1 - k) }} />
			<div
				style={{
					position: 'absolute',
					left: tx * W - r,
					top: titleY * H - r,
					width: r * 2,
					height: r * 2,
					borderRadius: '50%',
					border: `${18 * (1 - k)}px solid rgba(255,236,170,${1 - k})`,
				}}
			/>
		</>
	);
};

// ------------------------------------------------------------------ compositions
export const EntryCard: React.FC<{ bonus: Bonus; mode: 'intro' | 'loop' }> = ({ bonus, mode }) => {
	const f = useCurrentFrame();
	const look = ENTRY[bonus];
	// build timeline frame (the loop is the settled card) and the periodic clock
	const frame = mode === 'intro' ? f : INTRO_FRAMES + 1000;
	const tau = mode === 'intro' ? f - INTRO_FRAMES : f;
	const ambient = mode === 'intro' ? at(f, 40, 60) : 1;
	const slots = [0, 1, 2, 3];
	return (
		<BonusContext.Provider value={bonus}>
			<AbsoluteFill style={{ background: '#05070f', overflow: 'hidden' }}>
				<Background look={look} frame={frame} tau={tau} />
				<Lights look={look} tau={tau} on={mode === 'intro' ? at(f, 8, 40) : 1} />
				<Rays look={look} frame={frame} tau={tau} />
				{look.crew.map((id, i) => (
					<LandDust key={`d${id}`} slot={slots[i]} frame={frame} order={i} />
				))}
				{look.crew.map((id, i) => (
					<CrewMember key={id} id={id} slot={slots[i]} frame={frame} tau={tau} order={i} />
				))}
				<Drift kind={look.particles} tau={tau} on={ambient} seed={`entry-${bonus}`} />
				<Title look={look} frame={frame} tau={tau} />
				<Plate look={look} frame={frame} tau={tau} />
				<Ribbon look={look} frame={frame} />
				<StampPlate look={look} frame={frame} tau={tau} />
				<Twinkles tau={tau} on={ambient} />
				{mode === 'intro' && <Hit frame={f} at0={55} />}
				{mode === 'intro' && <AbsoluteFill style={{ background: '#000', opacity: 1 - at(f, 0, 10) }} />}
			</AbsoluteFill>
		</BonusContext.Provider>
	);
};
