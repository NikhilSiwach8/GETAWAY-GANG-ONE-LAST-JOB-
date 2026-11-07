import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {GOLD} from '../lib/assets';
import {Burst, Flash, Rain, Rays, Shockwave} from '../lib/fx';
import {Prop, Stamp, Title} from '../lib/ui';
import {TITLE_FONT} from '../lib/font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** FX-RESPIN: stencil road sign drops in, chain-lock glow, upward blur streaks (transparent overlay). */
export const Respin: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = Math.round(1.2 * fps);
	const drop = interpolate(frame, [0, 10], [-700, 0], {...clamp, easing: Easing.out(Easing.bounce)});
	const leave = interpolate(frame, [end - 8, end], [0, 1], clamp);
	return (
		<AbsoluteFill>
			{new Array(14).fill(0).map((_, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: 140 + i * 125,
						top: interpolate(frame, [4, end], [1100, -400], clamp) + (i % 3) * 140,
						width: 10,
						height: 320,
						borderRadius: 10,
						background: 'linear-gradient(180deg, transparent, #F7C947aa, transparent)',
					}}
				/>
			))}
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', translate: `0px ${drop - leave * 700}px`}}>
				<div
					style={{
						fontFamily: TITLE_FONT,
						fontSize: 110,
						color: '#1c1f26',
						background: 'repeating-linear-gradient(-45deg, #F7C947 0 40px, #f59e0b 40px 80px)',
						border: '16px solid #1c1f26',
						borderRadius: 26,
						padding: '30px 70px 14px',
						boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
						rotate: `${interpolate(frame, [8, 14, 20], [0, -4, 0], clamp)}deg`,
					}}
				>
					CHAOS RE-SPIN!
				</div>
			</AbsoluteFill>
			<Burst at={10} count={30} kind="spark" y={600} seed="rsp" colors={[GOLD, '#ffffff']} />
		</AbsoluteFill>
	);
};

/** FX-RETRIGGER: blueprint flies in, unrolls, "+5 FREE SPINS" stamp (transparent overlay). */
export const Retrigger: React.FC = () => {
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill>
			<Rays from={0} opacity={0.4} color="#60a5fa" />
			<Prop id="SYM-SCATTER" at={0} x={960} y={520} h={560} from="top" rotate={-6} />
			<Burst at={10} count={40} kind="confetti" seed="rtc" colors={['#ffffff', '#93c5fd', GOLD]} />
			<Stamp text="+5 FREE SPINS" at={Math.round(0.5 * fps)} size={100} y={260} color="#dc2626" />
			<Title text="RETRIGGER!" at={6} size={120} y={-380} accent="#2563eb" />
		</AbsoluteFill>
	);
};

/** FX-METER-STAGE: gauge burst for a Getaway Meter stage (transparent overlay; stage text drawn by the game). */
export const MeterStage: React.FC = () => (
	<AbsoluteFill>
		<Flash at={2} color="#fff3b0" strength={0.5} />
		<Shockwave at={2} />
		<Rays from={2} opacity={0.5} />
		<Burst at={3} count={40} kind="spark" seed="ms" colors={[GOLD, '#ffffff', '#f59e0b']} speed={34} />
		<Title text="STAGE UP!" at={4} out={24} size={150} />
	</AbsoluteFill>
);

/** FX-LOOT-MILESTONE: coin cascade and chest pop (transparent overlay). */
export const LootMilestone: React.FC = () => (
	<AbsoluteFill>
		<Rays from={0} opacity={0.45} />
		<Rain from={0} count={50} seed="lm" duration={20} size={150} />
		<Prop id="SYM-H2" at={4} x={960} y={560} h={360} />
		<Burst at={8} count={50} kind="coin" y={560} seed="lmc" />
		<Title text="LOOT!" at={8} out={32} size={160} y={-300} />
	</AbsoluteFill>
);
