import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame} from 'remotion';
import {art} from './assets';
import {TITLE_FONT} from './font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Chunky comic-heist title in the style of the delivered logo: gold-chrome fill, thick dark
 * outline, coloured drop shadow. Pops in with an overshoot and optionally pops out.
 */
export const Title: React.FC<{
	text: string;
	at: number;
	out?: number;
	size?: number;
	y?: number;
	accent?: string;
	accent2?: string;
	tilt?: number;
	fill?: string;
}> = ({text, at, out, size = 150, y = 0, accent = '#FF4C36', accent2, tilt = -4, fill}) => {
	const frame = useCurrentFrame();
	if (frame < at || (out !== undefined && frame > out + 8)) return null;
	const pop = interpolate(frame, [at, at + 10], [0, 1], {...clamp, easing: Easing.out(Easing.back(2.2))});
	const leave = out === undefined ? 1 : interpolate(frame, [out, out + 8], [1, 0], clamp);
	const gradient =
		fill ??
		(accent2
			? `linear-gradient(90deg, ${accent} 0%, #fff3b0 50%, ${accent2} 100%)`
			: 'linear-gradient(180deg, #fffbe0 0%, #ffe066 35%, #f7a823 70%, #c46a00 100%)');
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', translate: `0px ${y}px`}}>
			<div
				style={{
					fontFamily: TITLE_FONT,
					fontSize: size,
					lineHeight: 1,
					textAlign: 'center',
					letterSpacing: 2,
					background: gradient,
					WebkitBackgroundClip: 'text',
					backgroundClip: 'text',
					color: 'transparent',
					WebkitTextStroke: `${Math.max(4, size / 22)}px #2a1200`,
					paintOrder: 'stroke fill',
					filter: `drop-shadow(0 ${size / 18}px 0 ${accent}) drop-shadow(0 ${size / 10}px ${size / 8}px rgba(0,0,0,0.6))`,
					scale: pop * leave,
					rotate: `${tilt}deg`,
					opacity: leave,
					padding: '0 40px',
				}}
			>
				{text}
			</div>
		</AbsoluteFill>
	);
};

/** Rubber-stamp slam (e.g. "×3", "+5 FREE SPINS"). */
export const Stamp: React.FC<{text: string; at: number; color?: string; size?: number; x?: number; y?: number; rotate?: number}> = ({
	text,
	at,
	color = '#FF4C36',
	size = 120,
	x = 0,
	y = 0,
	rotate = -12,
}) => {
	const frame = useCurrentFrame();
	if (frame < at) return null;
	const s = interpolate(frame, [at, at + 6, at + 10], [3, 0.9, 1], clamp);
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', translate: `${x}px ${y}px`}}>
			<div
				style={{
					fontFamily: TITLE_FONT,
					fontSize: size,
					color,
					border: `${size / 12}px solid ${color}`,
					borderRadius: size / 5,
					padding: `${size / 10}px ${size / 3}px`,
					background: 'rgba(255,248,225,0.92)',
					scale: s,
					rotate: `${rotate}deg`,
					opacity: interpolate(frame, [at, at + 3], [0, 1], clamp),
					boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
				}}
			>
				{text}
			</div>
		</AbsoluteFill>
	);
};

/** One of the delivered images (character pose, symbol, logo) with a slide/pop entrance and idle bob. */
export const Prop: React.FC<{
	id: string;
	at?: number;
	out?: number;
	x: number;
	y: number;
	h: number;
	from?: 'left' | 'right' | 'top' | 'bottom' | 'pop';
	bob?: number;
	flip?: boolean;
	rotate?: number;
	style?: React.CSSProperties;
}> = ({id, at = 0, out, x, y, h, from = 'pop', bob = 0, flip = false, rotate = 0, style}) => {
	const frame = useCurrentFrame();
	if (frame < at) return null;
	const enter = interpolate(frame, [at, at + 12], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.4))});
	const leave = out === undefined ? 0 : interpolate(frame, [out, out + 10], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const off = {left: [-1400, 0], right: [1400, 0], top: [0, -1200], bottom: [0, 1200], pop: [0, 0]}[from];
	const dx = off[0] * (1 - enter) + off[0] * leave;
	const dy = off[1] * (1 - enter) + off[1] * leave + Math.sin(frame / 9) * bob;
	const sc = from === 'pop' ? enter * (1 - leave) : 1;
	return (
		<Img
			src={art(id)}
			style={{
				position: 'absolute',
				left: x,
				top: y,
				height: h,
				translate: `calc(-50% + ${dx}px) calc(-50% + ${dy}px)`,
				scale: `${flip ? -sc : sc} ${sc}`,
				rotate: `${rotate}deg`,
				filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.55))',
				...style,
			}}
		/>
	);
};

/** Small caption plate (e.g. ability name). */
export const Plate: React.FC<{text: string; at: number; color: string; y?: number; size?: number}> = ({text, at, color, y = 300, size = 54}) => {
	// the delivered blueprint scroll (UI-INFO-HEADER art, as in the game's feature banner); the text sits in
	// its window with the crew colour as its outline
	const frame = useCurrentFrame();
	if (frame < at) return null;
	const W = Math.max(760, text.length * size * 0.72 + 360);
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', translate: `0px ${y}px`}}>
			<div
				style={{
					position: 'relative',
					width: W,
					height: W * (416 / 1600),
					scale: interpolate(frame, [at, at + 8], [0.4, 1], {...clamp, easing: Easing.out(Easing.back(2))}),
					opacity: interpolate(frame, [at, at + 4], [0, 1], clamp),
					filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.55))',
				}}
			>
				<Img src={art('UI-BANNER')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: '38%',
						bottom: '8%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontFamily: TITLE_FONT,
						fontSize: size,
						color: '#fff',
						letterSpacing: 3,
						WebkitTextStroke: `${Math.round(size / 9)}px ${color}`,
						paintOrder: 'stroke fill',
						textShadow: '0 5px 0 #120a24, 0 8px 14px rgba(0,0,0,0.6)',
					}}
				>
					{text}
				</div>
			</div>
		</AbsoluteFill>
	);
};
