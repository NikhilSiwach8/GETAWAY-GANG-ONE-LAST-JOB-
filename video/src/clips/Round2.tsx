/**
 * Round-2 clips (docs/ASSET_PROMPTS_ROUND2.txt): reel anticipation, scene transition, win-shower particle
 * sprites, the two bonus end screens and the Buy Bonus idle sheen. Built from the delivered art.
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, CREW, GOLD, type CrewKey} from '../lib/assets';
import {Burst, Rain, Rays} from '../lib/fx';
import {Prop} from '../lib/ui';
import {TITLE_FONT} from '../lib/font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const loopT = (frame: number, period: number, offset = 0) => (((frame + offset) % period) + period) % period;

// ------------------------------------------------------------------ FX-ANTICIPATION (300×1000, 30 f loop)
/**
 * Frames one reel while a bonus is close: gold sparks and blueprint-blue streaks race up both edges,
 * an electric shimmer, intensity pulsing once per second. Every element is periodic in 30 frames,
 * so the clip loops seamlessly.
 */
export const Anticipation: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames: P} = useVideoConfig();
	const pulse = 0.65 + 0.35 * Math.sin((frame / P) * Math.PI * 2);
	const edge = (side: 'left' | 'right') => ({
		position: 'absolute' as const,
		top: 0,
		bottom: 0,
		[side]: 0,
		width: 26,
		background: `linear-gradient(${side === 'left' ? 90 : 270}deg, rgba(247,201,71,${0.9 * pulse}), rgba(40,185,239,${0.35 * pulse}) 60%, rgba(40,185,239,0))`,
		boxShadow: `0 0 ${30 * pulse}px ${12 * pulse}px rgba(247,201,71,${0.55 * pulse})`,
	});
	const sparks = new Array(28).fill(0).map((_, i) => {
		const side = i % 2 ? 1 : 0;
		const t = loopT(frame, P, Math.floor(random(`as${i}`) * P)) / P; // 0..1 over one loop
		const x = side ? width - 14 - random(`ax${i}`) * 34 : 14 + random(`ax${i}`) * 34;
		const y = height * (1.05 - t * 1.1);
		const blue = i % 5 === 0;
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: x,
					top: y,
					width: blue ? 4 : 6,
					height: blue ? 90 : 34,
					borderRadius: 4,
					translate: '-50% -50%',
					background: blue ? 'linear-gradient(0deg, rgba(40,185,239,0), #8fe3ff)' : 'linear-gradient(0deg, rgba(247,201,71,0), #fff3b0)',
					boxShadow: blue ? '0 0 12px #28B9EF' : '0 0 12px #F7C947',
					opacity: Math.sin(t * Math.PI) * pulse,
				}}
			/>
		);
	});
	// electric zig-zag shimmer along each edge, redrawn every 3 frames (period divides 30)
	const bolt = (side: number) => {
		const seg = Math.floor(frame / 3);
		const pts = new Array(13).fill(0).map((_, k) => {
			const y = (k / 12) * height;
			const x = side ? width - 20 - random(`b${side}-${seg % 10}-${k}`) * 26 : 20 + random(`b${side}-${seg % 10}-${k}`) * 26;
			return `${x},${y}`;
		});
		return <polyline key={side} points={pts.join(' ')} fill="none" stroke="#cfefff" strokeWidth={3} opacity={0.55 * pulse} style={{filter: 'drop-shadow(0 0 6px #28B9EF)'}} />;
	};
	return (
		<AbsoluteFill>
			<div style={edge('left')} />
			<div style={edge('right')} />
			<div style={{position: 'absolute', inset: 0, border: `6px solid rgba(255,227,122,${0.85 * pulse})`, borderRadius: 18, boxShadow: `inset 0 0 ${40 * pulse}px rgba(247,201,71,${0.45 * pulse})`}} />
			<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
				{bolt(0)}
				{bolt(1)}
			</svg>
			{sparks}
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ FX-TRANSITION (1920×1080, 36 f)
/**
 * The getaway van screeches across left→right trailing a wall of cartoon smoke and confetti. The frame is
 * fully covered on frames 16–20 (the game swaps scenes under it) and clears to transparent by the end.
 */
export const Transition: React.FC = () => {
	const frame = useCurrentFrame();
	const vanX = interpolate(frame, [0, 15], [-500, 2700], {...clamp, easing: Easing.in(Easing.quad)});
	// opaque wall: grows behind the van, holds 16–20, then dissolves upward
	const wallRight = frame >= 15 ? 1920 : Math.min(vanX - 120, 1920);
	const clear = interpolate(frame, [20, 34], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const cover = interpolate(frame, [14, 16, 20, 24], [0, 1, 1, 0], clamp);
	const puffs = new Array(60).fill(0).map((_, i) => {
		const px = random(`tp${i}`) * 2300 - 200;
		const py = random(`tq${i}`) * 1180 - 50;
		const born = interpolate(px, [-200, 2100], [1, 14], clamp); // puffs appear as the van passes
		if (frame < born) return null;
		const age = frame - born;
		const size = 260 + random(`ts${i}`) * 260 + age * 10;
		const rise = clear * (300 + random(`tr${i}`) * 500);
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: px,
					top: py - rise,
					width: size,
					height: size,
					translate: '-50% -50%',
					borderRadius: '50%',
					background: 'radial-gradient(circle at 40% 35%, #ffffff, #e4e6ee 45%, rgba(190,194,210,0) 72%)',
					opacity: (1 - clear) * interpolate(age, [0, 3], [0, 1], clamp),
				}}
			/>
		);
	});
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					bottom: 0,
					width: Math.max(0, wallRight),
					background: 'linear-gradient(180deg, #f2f3f8, #d9dce8)',
					opacity: Math.max(cover, frame < 16 ? interpolate(frame, [4, 14], [0, 0.85], clamp) : 0) * (1 - clear),
				}}
			/>
			{puffs}
			<Burst at={8} count={70} kind="confetti" x={900} y={540} speed={34} spread={360} seed="trc" life={26} />
			<Burst at={12} count={30} kind="star" x={1300} y={500} speed={30} seed="trs" life={22} />
			<Img
				src={art('SYM-WILD')}
				style={{position: 'absolute', left: vanX, top: 600, height: 560, translate: '-50% -50%', rotate: `${Math.sin(frame / 2) * 2 - 4}deg`, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.5))'}}
			/>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ FX-COINS sprite frames (128×128 each)
/** Spinning gold coin with a vault-dial engraving; frame f of 8 = one half turn. */
export const CoinSprite: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames: P} = useVideoConfig();
	const a = (frame / P) * Math.PI;
	const sx = Math.max(0.08, Math.abs(Math.cos(a)));
	const back = Math.cos(a) < 0;
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					width: 108,
					height: 108,
					scale: `${sx} 1`,
					borderRadius: '50%',
					background: back ? 'radial-gradient(circle at 60% 30%, #ffe680, #d9a21a 55%, #8a5a00)' : 'radial-gradient(circle at 35% 30%, #fff6c2, #f7c947 42%, #b8860b 85%)',
					border: '6px solid #8a5a00',
					boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.25), inset 0 6px 0 rgba(255,255,255,0.45)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				{/* vault-dial engraving */}
				<svg width={70} height={70} viewBox="-35 -35 70 70" style={{opacity: sx > 0.3 ? 0.75 : 0}}>
					<circle r={26} fill="none" stroke="#9a6a00" strokeWidth={4} />
					<circle r={7} fill="#9a6a00" />
					{[0, 1, 2, 3, 4, 5].map((k) => (
						<line key={k} x1={0} y1={0} x2={22 * Math.cos((k * Math.PI) / 3)} y2={22 * Math.sin((k * Math.PI) / 3)} stroke="#9a6a00" strokeWidth={4} strokeLinecap="round" />
					))}
				</svg>
			</div>
		</AbsoluteFill>
	);
};

/** Green banknote fluttering (8-frame loop). */
export const BillSprite: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames: P} = useVideoConfig();
	const a = (frame / P) * Math.PI * 2;
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					width: 112,
					height: 56,
					borderRadius: 6,
					background: 'linear-gradient(135deg, #d5f2c4, #7cc35f 45%, #3f7f2c)',
					border: '3px solid #24521a',
					transform: `perspective(300px) rotateX(${Math.sin(a) * 55}deg) rotateZ(${Math.sin(a + 1) * 12}deg) skewX(${Math.cos(a) * 10}deg)`,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					fontFamily: TITLE_FONT,
					fontSize: 34,
					color: '#24521a',
				}}
			>
				<div style={{width: 40, height: 40, borderRadius: '50%', border: '3px solid #24521a', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.35)'}}>$</div>
			</div>
		</AbsoluteFill>
	);
};

/** Four-point diamond glint / gold star twinkle (4-frame loops). */
export const GlintSprite: React.FC<{kind: 'diamond' | 'star'}> = ({kind}) => {
	const frame = useCurrentFrame();
	const {durationInFrames: P} = useVideoConfig();
	const s = [0.35, 1, 0.7, 0.2][frame % P];
	const color = kind === 'diamond' ? '#bfefff' : GOLD;
	const core = kind === 'diamond' ? '#ffffff' : '#fff6c2';
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			{kind === 'diamond' ? (
				<svg width={128} height={128} viewBox="-64 -64 128 128" style={{scale: s, rotate: `${frame * 12}deg`, filter: `drop-shadow(0 0 10px ${color})`}}>
					<path d="M0,-58 C6,-10 10,-6 58,0 C10,6 6,10 0,58 C-6,10 -10,6 -58,0 C-10,-6 -6,-10 0,-58Z" fill={color} />
					<circle r={10} fill={core} />
				</svg>
			) : (
				<svg width={128} height={128} viewBox="-64 -64 128 128" style={{scale: 0.5 + s * 0.35, filter: `drop-shadow(0 0 ${4 + s * 6}px ${color})`}}>
					<path d="M0,-52 L14,-16 L52,-16 L21,7 L33,46 L0,22 L-33,46 L-21,7 L-52,-16 L-14,-16Z" fill={color} stroke="#8a5a00" strokeWidth={4} strokeLinejoin="round" />
					<circle r={8 * s} fill={core} />
				</svg>
			)}
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ bonus end screens (1920×1080, opaque)
/**
 * Shared end-screen layout. Intro plays ~2.5 s, then a calm 2 s tail that the game can hold or loop.
 * The game draws the total-win amount (gold FONT-WIN numerals) in the empty vault panel in the centre,
 * so the clip itself never shows a number.
 */
const EndScreen: React.FC<{bg: string; title: string; accent: string; panel?: {y: number; w: number}; children: React.ReactNode}> = ({bg, title, accent, panel = {y: 600, w: 760}, children}) => {
	const frame = useCurrentFrame();
	const panelIn = interpolate(frame, [26, 40], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
	const bannerIn = interpolate(frame, [6, 18], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.8))});
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<Img src={art(bg)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, 150], [1.12, 1.0], clamp), filter: 'brightness(0.62) saturate(1.1)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 55%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)'}} />
			<Rays from={4} opacity={0.35} size={2400} color={accent} />
			{children}
			{/* vault panel the game writes the total win into */}
			<Img
				src={art('UI-BUY-PANEL')}
				style={{position: 'absolute', left: 960, top: panel.y, width: panel.w, translate: '-50% -50%', scale: panelIn, filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.6))'}}
			/>
			<div style={{position: 'absolute', left: 960, top: panel.y - panel.w * 0.229, translate: '-50% -50%', scale: panelIn, fontFamily: TITLE_FONT, fontSize: panel.w * 0.062, color: '#3b2400', letterSpacing: 3, textShadow: '0 2px 0 rgba(255,240,180,0.7)'}}>TOTAL WIN</div>
			{/* blueprint banner title */}
			<Img src={art('UI-INFO-HEADER')} style={{position: 'absolute', left: 960, top: 150, width: 1300, translate: '-50% -50%', scale: bannerIn}} />
			<div
				style={{
					position: 'absolute',
					left: 960,
					top: 172,
					translate: '-50% -50%',
					scale: bannerIn,
					fontFamily: TITLE_FONT,
					fontSize: 92,
					whiteSpace: 'nowrap',
					color: '#fff3b0',
					WebkitTextStroke: '5px #1c1f26',
					paintOrder: 'stroke fill',
					textShadow: `0 6px 0 ${accent}`,
				}}
			>
				{title}
			</div>
		</AbsoluteFill>
	);
};

/** SCR-HEIST-OUTRO: the crew lounging on a growing mountain of vault loot. */
export const HeistOutro: React.FC = () => {
	const frame = useCurrentFrame();
	const pile = interpolate(frame, [10, 60], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const order: CrewKey[] = ['T', 'R', 'B', 'F'];
	const xs = [250, 530, 1390, 1670];
	return (
		<EndScreen bg="BG-HEIST" title="HEIST COMPLETE!" accent={GOLD}>
			{/* gold mountain */}
			{new Array(26).fill(0).map((_, i) => {
				const x = 120 + random(`hx${i}`) * 1680;
				const y = 1080 - pile * (60 + random(`hy${i}`) * 240) * (1 - Math.abs(x - 960) / 1400);
				const id = ['SYM-H3', 'SYM-H2', 'SYM-H1', 'SYM-H3', 'SYM-H4'][i % 5];
				return <Img key={i} src={art(id)} style={{position: 'absolute', left: x, top: y, height: 190, translate: '-50% -30%', rotate: `${(random(`hr${i}`) - 0.5) * 40}deg`}} />;
			})}
			{order.map((c, i) => (
				<Prop key={c} id={CREW[c].pose} at={30 + i * 6} x={xs[i]} y={700} h={i === 0 ? 640 : 560} from="bottom" bob={5} flip={i >= 2} />
			))}
			<Rain from={44} count={40} kind="coin" seed="hor" duration={110} size={60} />
			<Burst at={40} count={40} kind="star" x={960} y={600} seed="hos" speed={30} colors={[GOLD, '#ffffff']} />
		</EndScreen>
	);
};

/** SCR-ESCAPE-OUTRO: the van bursts through the city-limits banner at dawn, LV3 badges flying. */
export const EscapeOutro: React.FC = () => {
	const frame = useCurrentFrame();
	const vanIn = interpolate(frame, [8, 34], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.2))});
	return (
		<EndScreen bg="BG-ESCAPE" title="PERFECT ESCAPE!" accent="#28B9EF" panel={{y: 470, w: 600}}>
			<Img
				src={art('RULE-FINAL-ESCAPE')}
				style={{
					position: 'absolute',
					left: interpolate(vanIn, [0, 1], [-700, 960]),
					top: 800,
					width: 1250,
					translate: '-50% -50%',
					opacity: 0.95,
					rotate: `${Math.sin(frame / 7) * 0.8}deg`,
					filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.6))',
				}}
			/>
			<Burst at={30} count={60} kind="confetti" x={960} y={700} seed="eoc" speed={36} />
			<Burst at={34} count={30} kind="star" x={960} y={600} seed="eos" speed={30} colors={['#28B9EF', GOLD, '#ffffff']} />
			<Rain from={50} count={30} kind="bill" seed="eob" duration={100} size={70} />
		</EndScreen>
	);
};

// ------------------------------------------------------------------ UI-BUY-BONUS idle sheen (2 s loop)
/** The delivered Buy Bonus button with a slow gold sheen sweeping across it and a soft breathing glow. */
export const BuyBonusSheen: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames: P} = useVideoConfig();
	const t = frame / P;
	const sweep = interpolate(t, [0.1, 0.55], [-0.4, 1.4], clamp);
	const glow = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div style={{position: 'relative', width: width * 0.92, height: height * 0.92, filter: `drop-shadow(0 0 ${8 + glow * 14}px rgba(247,201,71,${0.35 + glow * 0.35}))`}}>
				<Img src={art('UI-BUY-BONUS-IDLE')} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
				<div
					style={{
						position: 'absolute',
						inset: 0,
						WebkitMaskImage: `url(${art('UI-BUY-BONUS-IDLE')})`,
						WebkitMaskSize: 'contain',
						WebkitMaskRepeat: 'no-repeat',
						WebkitMaskPosition: 'center',
						background: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep * 100 - 12}%, rgba(255,250,220,0.85) ${sweep * 100}%, rgba(255,255,255,0) ${sweep * 100 + 12}%)`,
						mixBlendMode: 'screen',
					}}
				/>
			</div>
		</AbsoluteFill>
	);
};
