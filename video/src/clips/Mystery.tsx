/**
 * Mystery Vault clips, built from the delivered art (art/prep_mystery.py cuts the dial and wheel out of the door):
 *   FX-MYSTERY-HIDDEN / -ESCAPE / -NONE  the closed vault pops in, the dial spins a combination, the wheel turns,
 *                                        gold light leaks from the seam, the door swings open on its left hinge and
 *                                        reveals the outcome scene with its own celebration (full frame)
 *   FX-VAULT-GUARANTEE                   the Vault Guarantee stamp slams down (transparent overlay)
 *   SCR-HIDDEN-OUTRO                     Hidden Bonus end screen; the game counts the total into the van's panel
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, GOLD} from '../lib/assets';
import {Burst, Flash, Rain, Rays, Shake, Shockwave} from '../lib/fx';
import {Title} from '../lib/ui';
import {TITLE_FONT} from '../lib/font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Result = 'hidden' | 'escape' | 'none';

// door art geometry (1254 px source, measured by art/prep_mystery.py)
const SRC = 1254;
const DIAL = {x: 648, y: 294, r: 140};
const WHEEL = {x: 640, y: 664, r: 245};
// the reveal scenes have the open door painted on the left: their ring centre sits right of the closed door's
const REVEAL_SHIFT = 0.07; // fraction of the door size
const SIZE = 780; // on-screen size of the door

const RESULT_STYLE: Record<Result, {title: string; sub: string; color: string; image: string}> = {
	hidden: {title: 'HIDDEN BONUS!', sub: '15 FREE SPINS · GUARANTEED 500× WIN', color: GOLD, image: 'MYSTERY-REVEAL-HIDDEN'},
	escape: {title: 'THE PERFECT ESCAPE!', sub: '12 FREE SPINS', color: '#28B9EF', image: 'MYSTERY-REVEAL-ESCAPE'},
	none: {title: 'EMPTY VAULT', sub: 'No bonus this time', color: '#9aa3b5', image: 'MYSTERY-REVEAL-EMPTY'},
};

/** A cut-out part of the door placed at its source position (scaled to SIZE). */
const Part: React.FC<{id: string; at: {x: number; y: number; r: number}; rotate: number; blur?: number}> = ({id, at, rotate, blur = 0}) => {
	const k = SIZE / SRC;
	return (
		<Img
			src={art(id)}
			style={{
				position: 'absolute',
				left: (at.x - at.r) * k,
				top: (at.y - at.r) * k,
				width: at.r * 2 * k,
				height: at.r * 2 * k,
				rotate: `${rotate}deg`,
				filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
			}}
		/>
	);
};

export const MysteryReveal: React.FC<{result: Result}> = ({result}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const st = RESULT_STYLE[result];
	const pop = interpolate(frame, [0, 10], [0.4, 1], {...clamp, easing: Easing.out(Easing.back(1.7))});
	const popIn = interpolate(frame, [0, 4], [0, 1], clamp);
	// combination: left, right, left — with a little overshoot each time
	const dial = interpolate(frame, [8, 16, 24, 32, 36], [0, -250, 130, -300, -290], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const dialSpeed = Math.abs(interpolate(frame + 1, [8, 16, 24, 32, 36], [0, -250, 130, -300, -290], clamp) - dial);
	const wheel = interpolate(frame, [36, 52], [0, 420], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const wheelSpeed = Math.abs(interpolate(frame + 1, [36, 52], [0, 420], {...clamp, easing: Easing.inOut(Easing.cubic)}) - wheel);
	const leak = interpolate(frame, [44, 62], [0, 1], clamp);
	const swing = interpolate(frame, [60, 78], [0, -112], {...clamp, easing: Easing.in(Easing.quad)});
	const doorAlpha = interpolate(frame, [60, 72, 78], [1, 1, 0], clamp);
	const reveal = interpolate(frame, [62, 76], [0, 1], clamp);
	const push = interpolate(frame, [76, D], [1, result === 'none' ? 1.03 : 1.08], clamp);
	const celebrate = 76;
	const cx = 960;
	const cy = 465;
	return (
		<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 48%, #1d2a5c 0%, #0b1230 45%, #04060d 100%)', overflow: 'hidden'}}>
			{/* light leaking from the seam, growing before the door opens */}
			<div
				style={{
					position: 'absolute',
					left: cx - SIZE * 0.62,
					top: cy - SIZE * 0.62,
					width: SIZE * 1.24,
					height: SIZE * 1.24,
					borderRadius: '50%',
					background: `radial-gradient(circle, rgba(255,214,110,${0.75 * leak}) 35%, rgba(247,169,40,${0.35 * leak}) 55%, rgba(247,169,40,0) 72%)`,
				}}
			/>
			{frame >= celebrate && result !== 'none' && <Rays from={celebrate} color={st.color} opacity={0.55} size={2400} />}

			<Shake at={52} strength={14} length={10}>
				<AbsoluteFill>
					{/* outcome scene behind the door */}
					<div style={{position: 'absolute', left: cx - SIZE / 2 + SIZE * REVEAL_SHIFT * (1 - 0.5), top: cy - SIZE / 2, width: SIZE, height: SIZE, opacity: reveal, scale: push}}>
						<Img src={art(st.image)} style={{width: '100%', height: '100%'}} />
					</div>
					{/* the closed door, swinging open on its left hinge */}
					{doorAlpha > 0 && (
						<div style={{position: 'absolute', left: cx - SIZE / 2, top: cy - SIZE / 2, width: SIZE, height: SIZE, scale: pop, opacity: popIn * doorAlpha, perspective: 2200}}>
							<div style={{position: 'absolute', inset: 0, transformOrigin: '12% 50%', transform: `rotateY(${swing}deg)`, filter: `brightness(${1 - Math.min(0.5, -swing / 220)})`}}>
								<Img src={art('MYSTERY-VAULT-DOOR-SLAB')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
								<Part id="MYSTERY-VAULT-DOOR-DIAL" at={DIAL} rotate={dial} blur={Math.min(6, dialSpeed / 6)} />
								<Part id="MYSTERY-VAULT-DOOR-WHEEL" at={WHEEL} rotate={wheel} blur={Math.min(8, wheelSpeed / 5)} />
							</div>
						</div>
					)}
				</AbsoluteFill>
			</Shake>

			{/* the outcome */}
			{result === 'hidden' && (
				<>
					<Flash at={celebrate} />
					<Shockwave at={celebrate} color={GOLD} />
					<Burst at={celebrate} count={90} kind="coin" x={cx} y={cy} speed={46} seed="mh-c" life={60} />
					<Burst at={celebrate + 2} count={40} kind="star" x={cx} y={cy} speed={36} seed="mh-s" colors={[GOLD, '#ffffff']} />
					<Rain from={celebrate + 6} count={50} kind="coin" seed="mh-r" duration={D - celebrate - 6} size={60} />
				</>
			)}
			{result === 'escape' && (
				<>
					<Flash at={celebrate} color="#cdefff" strength={0.7} />
					<Shockwave at={celebrate} color="#28B9EF" />
					<Burst at={celebrate} count={80} kind="confetti" x={cx} y={cy} speed={42} seed="me-c" colors={['#28B9EF', '#FF4C36', GOLD, '#ffffff']} />
				</>
			)}
			{result === 'none' && (
				<>
					<Burst at={celebrate - 2} count={10} kind="smoke" x={cx} y={cy + 330} speed={10} life={50} seed="mn-s" size={0.45} />
				</>
			)}
			<Title text={st.title} at={celebrate + 4} size={result === 'none' ? 110 : 136} y={418} accent={result === 'none' ? '#4b5563' : st.color} fill={result === 'none' ? 'linear-gradient(180deg,#ffffff,#c9ced8 55%,#7a8292)' : undefined} />
			{frame >= celebrate + 12 && (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 1018,
						textAlign: 'center',
						fontFamily: TITLE_FONT,
						fontSize: 46,
						color: result === 'none' ? '#d1d5db' : '#ffffff',
						WebkitTextStroke: '3px #0b1230',
						paintOrder: 'stroke fill',
						opacity: interpolate(frame, [celebrate + 12, celebrate + 20], [0, 1], clamp),
						translate: `0 ${interpolate(frame, [celebrate + 12, celebrate + 20], [30, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px`,
					}}
				>
					{st.sub}
				</div>
			)}
		</AbsoluteFill>
	);
};

/** FX-VAULT-GUARANTEE: the stamp slams down with a shockwave and coins, holds, then fades (transparent). */
export const VaultGuarantee: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const slam = interpolate(frame, [0, 8], [2.6, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const settle = interpolate(frame, [8, 12, 16], [1, 0.94, 1], clamp);
	const alpha = interpolate(frame, [0, 3, D - 8, D - 1], [0, 1, 1, 0], clamp);
	return (
		<Shake at={8} strength={26} length={12}>
			<AbsoluteFill style={{opacity: alpha}}>
				<AbsoluteFill style={{background: 'radial-gradient(circle, rgba(0,0,0,0.55) 20%, rgba(0,0,0,0) 70%)', opacity: interpolate(frame, [4, 10], [0, 1], clamp)}} />
				<Rays from={8} color={GOLD} opacity={0.45} size={1900} />
				<Shockwave at={8} color="#FF4C36" />
				<Burst at={8} count={70} kind="coin" x={960} y={560} speed={44} seed="vg-c" life={50} />
				<Burst at={8} count={20} kind="debris" x={960} y={640} angle={-90} spread={160} speed={22} seed="vg-d" />
				<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
					<Img src={art('UI-VAULT-GUARANTEE')} style={{width: 1100, scale: slam * settle, rotate: `${interpolate(frame, [0, 8], [-14, -4], clamp)}deg`, filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.6))'}} />
				</AbsoluteFill>
			</AbsoluteFill>
		</Shake>
	);
};

/** Twinkle that loops cleanly is not needed here: the end screen holds its last frame. */
const Sparkle: React.FC<{x: number; y: number; at: number; size?: number}> = ({x, y, at, size = 60}) => {
	const frame = useCurrentFrame();
	const t = frame - at;
	if (t < 0 || t > 24) return null;
	const s = Math.sin((t / 24) * Math.PI);
	return (
		<svg width={size * 2} height={size * 2} viewBox="-50 -50 100 100" style={{position: 'absolute', left: x - size, top: y - size, scale: s, filter: 'drop-shadow(0 0 10px #fff6c2)'}}>
			<path d="M0,-48 C5,-8 8,-5 48,0 C8,5 5,8 0,48 C-5,8 -8,5 -48,0 C-8,-5 -5,-8 0,-48Z" fill="#fff6c2" />
		</svg>
	);
};

/** SCR-HIDDEN-OUTRO: the delivered end screen settles in, coins rain, "TOTAL WIN" appears in the van's panel. */
export const HiddenOutro: React.FC = () => {
	const frame = useCurrentFrame();
	const push = interpolate(frame, [0, 40], [1.1, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const label = interpolate(frame, [26, 36], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.8))});
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<Img src={art('SCR-HIDDEN-OUTRO')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', scale: push}} />
			<Rain from={14} count={45} kind="coin" seed="ho-r" duration={130} size={64} />
			{new Array(10).fill(0).map((_, i) => (
				<Sparkle key={i} x={120 + random(`ho-x${i}`) * 1680} y={60 + random(`ho-y${i}`) * 420} at={20 + i * 11} size={40 + (i % 3) * 16} />
			))}
			<div style={{position: 'absolute', left: 960, top: 612, translate: '-50% -50%', scale: label, fontFamily: TITLE_FONT, fontSize: 64, letterSpacing: 4, color: '#ffe27a', WebkitTextStroke: '4px #2a1200', paintOrder: 'stroke fill', textShadow: '0 5px 0 #b5470f'}}>
				TOTAL WIN
			</div>
		</AbsoluteFill>
	);
};
