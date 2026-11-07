import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, CREW, GOLD, type CrewKey} from '../lib/assets';
import {Burst} from '../lib/fx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export type CharacterAction = 'IDLE' | 'ABILITY' | 'COMPLETE' | 'WIN' | 'LOSE' | 'BONUS-INTRO' | 'VICTORY' | 'COMBO';

/**
 * ANIM-<CREW>-<ACTION>, 1024x1024 transparent.
 * LIMITATION: built from one still pose, so motion is whole-body (breathing squash, hops, leans, slides)
 * plus effects; there is no blinking, facial acting or limb animation. Replace with rigged Spine/3D
 * animation for the final premium build.
 */
export const CharacterAnim: React.FC<{crew: CrewKey; action: CharacterAction}> = ({crew, action}) => {
	const frame = useCurrentFrame();
	const {durationInFrames, fps} = useVideoConfig();
	const p = frame / durationInFrames;
	const c = CREW[crew];
	let x = 0;
	let y = 0;
	let sx = 1;
	let sy = 1;
	let rot = 0;
	let effects: React.ReactNode = null;
	switch (action) {
		case 'IDLE': {
			const b = Math.sin(p * Math.PI * 2 * 2); // two breaths per loop, seamless
			sy = 1 + 0.015 * b;
			sx = 1 - 0.006 * b;
			rot = Math.sin(p * Math.PI * 2) * 1.2;
			break;
		}
		case 'ABILITY':
			sy = interpolate(frame, [0, 8, 14, 20], [1, 0.9, 1.06, 1], clamp);
			sx = interpolate(frame, [0, 8, 14, 20], [1, 1.06, 0.97, 1], clamp);
			rot = interpolate(frame, [0, 10, 20], [0, -6, 0], clamp);
			x = interpolate(frame, [8, 16], [0, 40], clamp);
			effects = (
				<>
					<div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 55%, ${c.color}aa, transparent 55%)`, opacity: interpolate(frame, [10, 16, 40, durationInFrames], [0, 1, 1, 0], clamp)}} />
					<Burst at={14} count={30} kind="spark" x={512} y={560} colors={[c.color, '#ffffff', GOLD]} seed={`ab${crew}`} speed={24} />
				</>
			);
			break;
		case 'COMPLETE':
			y = interpolate(frame, [0, 6, 12, 18], [0, 10, -14, 0], clamp);
			rot = interpolate(frame, [0, 8, 16], [0, 4, 0], clamp);
			break;
		case 'WIN':
			y = -Math.abs(Math.sin((frame / fps) * Math.PI * 1.6)) * 90;
			sy = interpolate(Math.abs(Math.sin((frame / fps) * Math.PI * 1.6)), [0, 0.15, 1], [0.92, 1, 1.03]);
			effects = <Burst at={6} count={30} kind="star" x={512} y={300} colors={[GOLD, c.color]} seed={`w${crew}`} speed={18} gravity={0.3} />;
			break;
		case 'LOSE':
			rot = interpolate(frame, [0, 10, 24, durationInFrames], [0, -5, -5, 0], clamp);
			sy = interpolate(frame, [0, 10, 24, durationInFrames], [1, 0.95, 0.95, 1], clamp);
			y = interpolate(frame, [0, 10, 24, durationInFrames], [0, 18, 18, 0], clamp);
			break;
		case 'BONUS-INTRO':
			x = interpolate(frame, [0, 18], [-900, 0], {...clamp, easing: Easing.out(Easing.back(1.4))});
			rot = interpolate(frame, [0, 14, 22, 30], [12, -6, 2, 0], clamp);
			effects = <Burst at={18} count={20} kind="smoke" x={512} y={940} angle={180} spread={70} speed={14} seed={`bi${crew}`} />;
			break;
		case 'VICTORY':
			y = -Math.abs(Math.sin((frame / fps) * Math.PI * 1.2)) * 120;
			rot = Math.sin((frame / fps) * Math.PI * 1.2) * 6;
			effects = (
				<>
					<Burst at={10} count={40} kind="coin" x={512} y={200} seed={`v1${crew}`} speed={26} />
					<Burst at={40} count={40} kind="coin" x={512} y={200} seed={`v2${crew}`} speed={26} />
					<Burst at={10} count={50} kind="confetti" x={512} y={200} seed={`v3${crew}`} speed={30} />
				</>
			);
			break;
		case 'COMBO':
			x = interpolate(frame, [0, 10, 18, durationInFrames], [-200, 60, 0, 0], {...clamp, easing: Easing.out(Easing.cubic)});
			rot = interpolate(frame, [0, 10, 18], [-10, 8, 0], clamp);
			effects = <Burst at={10} count={30} kind="star" x={760} y={420} colors={[c.color, GOLD]} seed={`co${crew}`} speed={20} />;
			break;
	}
	return (
		<AbsoluteFill>
			{effects}
			<Img
				src={art(c.pose)}
				style={{
					position: 'absolute',
					left: 512,
					top: 1000,
					height: 940,
					translate: `calc(-50% + ${x}px) calc(-100% + ${y}px)`,
					scale: `${sx} ${sy}`,
					rotate: `${rot}deg`,
					transformOrigin: '50% 100%',
					filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.45))',
				}}
			/>
		</AbsoluteFill>
	);
};
