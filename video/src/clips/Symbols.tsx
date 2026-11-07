import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, GOLD} from '../lib/assets';
import {Burst} from '../lib/fx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** SYM-*-ANIM: 'land' (0.4 s squash-and-settle), 'win' (1 s loopable glow + bounce + shine), 'idle' (4 s shimmer). 512x512. */
export const SymbolAnim: React.FC<{id: string; mode: 'land' | 'win' | 'idle'}> = ({id, mode}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const p = frame / durationInFrames;
	let scaleX = 1;
	let scaleY = 1;
	let y = 0;
	let glow = 0;
	if (mode === 'land') {
		y = interpolate(frame, [0, 5], [-140, 0], {...clamp, easing: Easing.in(Easing.quad)});
		scaleY = interpolate(frame, [5, 7, 10, 12], [1, 0.82, 1.06, 1], clamp);
		scaleX = interpolate(frame, [5, 7, 10, 12], [1, 1.12, 0.97, 1], clamp);
	} else if (mode === 'win') {
		const s = Math.sin(p * Math.PI * 2);
		scaleX = scaleY = 1 + 0.08 * Math.max(0, s) + 0.02;
		y = -12 * Math.max(0, s);
		glow = 0.5 + 0.5 * Math.max(0, s);
	} else {
		glow = 0.15 + 0.15 * Math.sin(p * Math.PI * 2);
	}
	const shineX = interpolate(p, [0.1, 0.6], [-400, 600], clamp);
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			{glow > 0 && (
				<div style={{position: 'absolute', width: 470, height: 470, borderRadius: 90, background: `radial-gradient(circle, ${GOLD}cc, transparent 65%)`, opacity: glow}} />
			)}
			<div style={{position: 'relative', width: 460, height: 460, translate: `0px ${y}px`, scale: `${scaleX} ${scaleY}`, transformOrigin: '50% 100%'}}>
				<Img src={art(id)} style={{width: 460, height: 460}} />
				{mode !== 'land' && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: `linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.75) 50%, transparent 60%)`,
							backgroundPositionX: shineX,
							backgroundSize: '200% 100%',
							backgroundRepeat: 'no-repeat',
							maskImage: `url(${art(id)})`,
							WebkitMaskImage: `url(${art(id)})`,
							maskSize: '100% 100%',
							WebkitMaskSize: '100% 100%',
							mixBlendMode: 'screen',
						}}
					/>
				)}
			</div>
			{mode === 'win' && <Burst at={0} count={10} kind="star" x={256} y={256} speed={10} gravity={0.1} life={durationInFrames} colors={[GOLD, '#ffffff']} seed={`sw${id}`} size={0.6} />}
		</AbsoluteFill>
	);
};

type TransformKind = 'CLONE-IN' | 'UPGRADE-IN' | 'VAULT-REVEAL' | 'WILD-STAMP' | 'CREW-EXIT';

/** SYM-FX-*: cell-sized transformation ending on the new symbol (512x512, transparent). */
export const SymbolTransform: React.FC<{kind: TransformKind; from: string; to: string}> = ({kind, from, to}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const t = frame / (durationInFrames - 1);
	const img = (id: string, style: React.CSSProperties) => <Img src={art(id)} style={{position: 'absolute', left: 26, top: 26, width: 460, height: 460, ...style}} />;
	if (kind === 'CLONE-IN') {
		const reveal = interpolate(t, [0.1, 0.8], [0, 100], clamp);
		return (
			<AbsoluteFill>
				{img(from, {opacity: 1 - t * 1.4})}
				{img(to, {clipPath: `inset(0 0 ${100 - reveal}% 0)`, filter: `drop-shadow(0 0 20px #A34BFF) hue-rotate(${(1 - t) * 60}deg)`})}
				<div style={{position: 'absolute', left: 0, right: 0, top: `${reveal}%`, height: 10, background: '#e9d5ff', boxShadow: '0 0 30px 10px #A34BFF', opacity: t < 0.85 ? 1 : 0}} />
				<Burst at={0} count={30} kind="pixel" x={256} y={256} speed={8} gravity={0} life={durationInFrames} colors={['#A34BFF', '#e9d5ff']} seed="cl" size={0.7} />
			</AbsoluteFill>
		);
	}
	if (kind === 'UPGRADE-IN') {
		return (
			<AbsoluteFill>
				{img(from, {opacity: interpolate(t, [0, 0.35], [1, 0], clamp)})}
				<Burst at={2} count={14} kind="smoke" x={256} y={256} speed={6} life={durationInFrames} seed="up" size={0.8} />
				<Burst at={4} count={30} kind="confetti" x={256} y={256} speed={14} life={durationInFrames} seed="upc" size={0.7} />
				{img(to, {scale: interpolate(t, [0.4, 0.7, 1], [0, 1.15, 1], clamp), filter: `drop-shadow(0 0 ${30 * (1 - t)}px ${GOLD})`})}
			</AbsoluteFill>
		);
	}
	if (kind === 'VAULT-REVEAL') {
		return (
			<AbsoluteFill style={{overflow: 'hidden'}}>
				<div style={{position: 'absolute', left: 56, right: 56, bottom: 60, height: 60, borderRadius: '50%', background: `radial-gradient(ellipse, #fff3b0, ${GOLD} 40%, transparent 70%)`, opacity: interpolate(t, [0, 0.2, 0.9, 1], [0, 1, 1, 0], clamp)}} />
				{img(to, {translate: `0px ${interpolate(t, [0.1, 0.8], [420, 0], {...clamp, easing: Easing.out(Easing.back(1.3))})}px`})}
				<Burst at={4} count={24} kind="spark" x={256} y={440} angle={-90} spread={60} speed={16} life={durationInFrames} colors={[GOLD, '#ffffff']} seed="vr" size={0.7} />
			</AbsoluteFill>
		);
	}
	if (kind === 'WILD-STAMP') {
		return (
			<AbsoluteFill>
				{img(from, {opacity: interpolate(t, [0.3, 0.5], [1, 0], clamp)})}
				{img('SYM-WILD', {translate: `${interpolate(t, [0, 0.55], [-520, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px 0px`, rotate: `${interpolate(t, [0.45, 0.6, 0.75], [0, -6, 0], clamp)}deg`})}
				<Burst at={6} count={14} kind="smoke" x={150} y={420} angle={180} spread={50} speed={8} life={durationInFrames} seed="ws" size={0.6} />
			</AbsoluteFill>
		);
	}
	// CREW-EXIT: the crew badge jumps toward the camera and away, replacement drops in
	return (
		<AbsoluteFill>
			{img(from, {scale: interpolate(t, [0, 0.5], [1, 1.6], clamp), translate: `${interpolate(t, [0.2, 0.6], [0, 600], clamp)}px ${interpolate(t, [0, 0.25, 0.6], [0, -80, 200], clamp)}px`, opacity: interpolate(t, [0.45, 0.6], [1, 0], clamp)})}
			{img(to, {translate: `0px ${interpolate(t, [0.55, 0.85], [-520, 0], {...clamp, easing: Easing.out(Easing.bounce)})}px`, opacity: t > 0.5 ? 1 : 0})}
		</AbsoluteFill>
	);
};
