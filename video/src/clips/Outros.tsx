/**
 * Bonus end screens from the delivered art (cleaned of example values by art/prep_outros.py) and the Chaos Re-spin.
 *   SCR-HEIST-OUTRO / SCR-ESCAPE-OUTRO  settle-in, title shine, coin / confetti rain, twinkles, glowing prompt.
 *     The camera settles to exactly 1:1 by frame 40 and stays, so the amount the game counts into the plaque
 *     (and the Loot milestones / crew levels it draws) line up with the art.
 *   FX-RESPIN                           Chaos Re-spin: Wilds lock (padlocks snap shut), the other reels whirl,
 *     a spinning re-spin ring and the title, then everything clears for the re-spin (transparent overlay).
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, GOLD} from '../lib/assets';
import {Burst, Flash, Rain} from '../lib/fx';
import {Title} from '../lib/ui';
import {TITLE_FONT} from '../lib/font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Box = {x0: number; y0: number; x1: number; y1: number}; // 1920x1080 px

/** A box of the background image redrawn on top with a moving shine band (title / prompt highlights). */
const ShineBox: React.FC<{image: string; b: Box; p: number; glow?: number}> = ({image, b, p, glow = 0}) => {
	const w = b.x1 - b.x0;
	const h = b.y1 - b.y0;
	const pos = interpolate(p, [0, 1], [-30, 130]);
	return (
		<div style={{position: 'absolute', left: b.x0, top: b.y0, width: w, height: h, overflow: 'hidden', filter: glow > 0 ? `brightness(${1 + glow}) drop-shadow(0 0 ${18 * glow}px rgba(255,220,120,${glow}))` : undefined, WebkitMaskImage: 'radial-gradient(ellipse 58% 62% at 50% 50%, #000 72%, transparent 100%)'}}>
			<Img src={art(image)} style={{position: 'absolute', left: -b.x0, top: -b.y0, width: 1920, height: 1080}} />
			{p > 0 && p < 1 && (
				<div style={{position: 'absolute', inset: 0, background: `linear-gradient(105deg, rgba(255,255,255,0) ${pos - 14}%, rgba(255,246,200,0.75) ${pos}%, rgba(255,255,255,0) ${pos + 14}%)`, mixBlendMode: 'screen'}} />
			)}
		</div>
	);
};

const Twinkle: React.FC<{x: number; y: number; at: number; size?: number; color?: string}> = ({x, y, at, size = 56, color = '#fff6c2'}) => {
	const frame = useCurrentFrame();
	const t = frame - at;
	if (t < 0 || t > 22) return null;
	const s = Math.sin((t / 22) * Math.PI);
	return (
		<svg width={size * 2} height={size * 2} viewBox="-50 -50 100 100" style={{position: 'absolute', left: x - size, top: y - size, scale: s, rotate: `${t * 4}deg`, filter: `drop-shadow(0 0 10px ${color})`}}>
			<path d="M0,-48 C5,-8 8,-5 48,0 C8,5 5,8 0,48 C-5,8 -8,5 -48,0 C-8,-5 -5,-8 0,-48Z" fill={color} />
		</svg>
	);
};

const OUTRO = {
	heist: {image: 'SCR-HEIST-OUTRO-CLEAN', title: {x0: 600, y0: 18, x1: 1335, y1: 232}, press: {x0: 560, y0: 962, x1: 1362, y1: 1052}, rain: 'coin' as const},
	escape: {image: 'SCR-ESCAPE-OUTRO-CLEAN', title: {x0: 1040, y0: 28, x1: 1862, y1: 352}, press: {x0: 538, y0: 972, x1: 1382, y1: 1058}, rain: 'bill' as const},
};

export const OutroScreen: React.FC<{bonus: 'heist' | 'escape'}> = ({bonus}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const o = OUTRO[bonus];
	const settle = interpolate(frame, [0, 40], [1.12, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const fadeIn = interpolate(frame, [0, 8], [0, 1], clamp);
	const titlePop = interpolate(frame, [18, 24, 34], [0, 0.55, 0], clamp);
	const shine = interpolate(frame, [30, 62], [0, 1], clamp);
	const press = interpolate(frame, [44, 52, 70, 78, 96, 104, 122, 130], [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4], clamp);
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden', opacity: fadeIn}}>
			<AbsoluteFill style={{scale: settle}}>
				<Img src={art(o.image)} style={{width: 1920, height: 1080}} />
				{frame >= 18 && <ShineBox image={o.image} b={o.title} p={shine} glow={titlePop} />}
				{frame >= 44 && <ShineBox image={o.image} b={o.press} p={0} glow={press} />}
			</AbsoluteFill>
			<Flash at={2} length={10} strength={0.6} />
			{bonus === 'heist' ? (
				<>
					<Burst at={18} count={60} kind="coin" x={960} y={140} speed={40} seed="ho-b" life={55} />
					<Rain from={24} count={40} kind="coin" seed="ho-r" duration={D - 30} size={58} />
				</>
			) : (
				<>
					<Burst at={18} count={70} kind="confetti" x={1450} y={180} speed={40} seed="eo-b" colors={['#28B9EF', '#FF4C36', GOLD, '#A34BFF', '#ffffff']} />
					<Rain from={24} count={28} kind="bill" seed="eo-r" duration={D - 30} size={70} />
				</>
			)}
			{new Array(10).fill(0).map((_, i) => (
				<Twinkle key={i} x={80 + random(`ot-x-${bonus}-${i}`) * 1760} y={40 + random(`ot-y-${bonus}-${i}`) * 520} at={28 + i * 10} size={36 + (i % 3) * 14} />
			))}
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ FX-RESPIN
const Padlock: React.FC<{x: number; y: number; at: number}> = ({x, y, at}) => {
	const frame = useCurrentFrame();
	const t = frame - at;
	if (t < 0) return null;
	const pop = interpolate(t, [0, 6], [0, 1], {...clamp, easing: Easing.out(Easing.back(2.4))});
	const shackle = interpolate(t, [4, 9], [-26, 0], {...clamp, easing: Easing.in(Easing.quad)}); // snaps shut
	const glow = interpolate(t, [9, 11, 22], [0, 1, 0.25], clamp);
	return (
		<div style={{position: 'absolute', left: x, top: y, translate: `-50% ${-50 + shackle * 0.6}%`, scale: pop * (1 + glow * 0.12), filter: `drop-shadow(0 0 ${10 + glow * 24}px rgba(255,214,110,${0.6 + glow * 0.4}))`}}>
			{/* the gold padlock from the Chaos Re-spins meter art; it drops in and clamps shut */}
			<Img src={art('UI-RESPIN-LOCK-ON')} style={{width: 150, height: 168}} />
		</div>
	);
};

/** Two-headed circular re-spin arrows. */
const RespinRing: React.FC<{size: number; rotate: number}> = ({size, rotate}) => (
	// the red gear badge with gold re-spin arrows from the Chaos Re-spins meter art
	<Img src={art('FX-RESPIN-BADGE')} style={{width: size, height: size, rotate: `${rotate}deg`, filter: 'drop-shadow(0 10px 0 rgba(42,18,0,0.6)) drop-shadow(0 0 34px rgba(247,201,71,0.75))'}} />
);

export const ChaosRespin: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const ringIn = interpolate(frame, [2, 12], [0.2, 1], {...clamp, easing: Easing.out(Easing.back(1.8))});
	const spin = interpolate(frame, [2, D], [0, 900], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const outT = interpolate(frame, [D - 9, D - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const reels = interpolate(frame, [6, 14, D - 10, D - 2], [0, 1, 1, 0], clamp);
	// six reel columns of the 6x4 board (the overlay is centred on the board area)
	const cols = [0, 1, 2, 3, 4, 5].map((i) => 960 + (i - 2.5) * 170);
	return (
		<AbsoluteFill style={{opacity: 1 - outT}}>
			{/* reels whirl: streaks running down every column except the locked cells */}
			<AbsoluteFill style={{opacity: reels * 0.85}}>
				{cols.map((x, i) =>
					new Array(5).fill(0).map((_, k) => {
						const y = ((frame * 58 + k * 260 + i * 90) % 1300) - 200;
						return <div key={`${i}-${k}`} style={{position: 'absolute', left: x - 6, top: y, width: 12, height: 240, borderRadius: 8, background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,236,170,0.75), rgba(255,255,255,0))'}} />;
					}),
				)}
			</AbsoluteFill>
			{/* the locks: Wilds stay, everything else re-spins */}
			<Padlock x={470} y={250} at={6} />
			<Padlock x={1450} y={250} at={9} />
			<Padlock x={420} y={800} at={12} />
			<Padlock x={1500} y={800} at={15} />
			{/* centre: ring + title */}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', scale: ringIn * (1 - outT * 0.4)}}>
				<div style={{opacity: 0.9}}>
					<RespinRing size={660} rotate={spin} />
				</div>
			</AbsoluteFill>
			<Title text="CHAOS RE-SPIN!" at={6} size={150} y={0} accent="#FF4C36" tilt={-3} />
			{frame >= 16 && (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 902,
						textAlign: 'center',
						opacity: interpolate(frame, [16, 22], [0, 1], clamp),
						translate: `0 ${interpolate(frame, [16, 22], [24, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px`,
					}}
				>
					<span style={{fontFamily: TITLE_FONT, fontSize: 52, color: '#2a1600', background: 'linear-gradient(180deg,#ffe27a,#f7a928)', border: '6px solid #2a1200', borderRadius: 18, padding: '10px 34px 4px', boxShadow: '0 10px 24px rgba(0,0,0,0.45)'}}>
						WILDS LOCKED · SPIN AGAIN
					</span>
				</div>
			)}
			<Burst at={8} count={34} kind="spark" x={960} y={540} speed={34} seed="crs" colors={[GOLD, '#ffffff', '#FF4C36']} life={30} />
		</AbsoluteFill>
	);
};
