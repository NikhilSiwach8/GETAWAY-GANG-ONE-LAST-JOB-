import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, GOLD} from '../lib/assets';
import {Burst, Flash, Rain, Rays, Shake, Shockwave, SpeedLines} from '../lib/fx';
import {Prop, Title} from '../lib/ui';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Fountain of coins from the bottom centre, re-emitted every few frames. */
const Fountain: React.FC<{from: number; to: number; every?: number; seed: string}> = ({from, to, every = 6, seed}) => {
	const bursts = [];
	for (let at = from; at < to; at += every) {
		bursts.push(<Burst key={at} at={at} count={10} kind="coin" x={960} y={1120} speed={46} spread={50} gravity={1.1} life={50} seed={`${seed}-${at}`} />);
	}
	return <>{bursts}</>;
};

/** WIN-BIG (transparent overlay; the game draws the counting amount below the title). */
export const WinBig: React.FC = () => {
	const {fps} = useVideoConfig();
	const end = 4 * fps;
	return (
		<AbsoluteFill>
			<Rays from={0} />
			<Fountain from={4} to={end - 20} seed="wb" />
			<Prop id="CHR-ROXY-POSE" at={10} out={end - 14} x={130} y={760} h={600} from="left" rotate={8} />
			<Prop id="CHR-TANK-POSE" at={14} out={end - 14} x={1790} y={760} h={620} from="right" rotate={-8} />
			<Title text="BIG WIN" at={2} out={end - 10} size={230} y={-200} />
		</AbsoluteFill>
	);
};

/** WIN-SUPER: the van drifts across dropping money bags. */
export const WinSuper: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = 5 * fps;
	const vanX = interpolate(frame, [10, 80], [-500, 2400], clamp);
	return (
		<AbsoluteFill>
			<Rays from={0} color="#FF4C36" />
			<SpeedLines from={10} to={80} />
			<Img src={art('SYM-WILD')} style={{position: 'absolute', left: vanX, top: 700, height: 360, translate: '-50% -50%', rotate: `${Math.sin(frame / 4) * 4 - 6}deg`}} />
			{[0, 1, 2, 3, 4].map((i) => {
				const dropAt = 18 + i * 12;
				if (frame < dropAt) return null;
				const t = frame - dropAt;
				const x = interpolate(dropAt, [10, 80], [-500, 2400]) - 120;
				return <Img key={i} src={art('SYM-H2')} style={{position: 'absolute', left: x, top: 700 + Math.min(t * t * 0.6, 260), height: 150, translate: '-50% -50%', rotate: `${t * 6}deg`}} />;
			})}
			<Burst at={40} count={30} kind="coin" y={900} seed="wsc" />
			<Title text="SUPER WIN" at={4} out={end - 10} size={220} y={-220} accent="#FF4C36" />
		</AbsoluteFill>
	);
};

/** WIN-MEGA: gold bars rain, Tank juggles a money bag. */
export const WinMega: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = 6 * fps;
	return (
		<AbsoluteFill>
			<Rays from={0} opacity={0.6} />
			<Rain from={6} count={60} image="SYM-H3" seed="wmr" duration={end - 40} size={150} />
			<Prop id="CHR-TANK-POSE" at={8} out={end - 14} x={1600} y={680} h={760} from="right" />
			<Img
				src={art('SYM-H2')}
				style={{position: 'absolute', left: 1500 + Math.sin(frame / 6) * 60, top: 300 - Math.abs(Math.sin(frame / 8)) * 160, height: 190, translate: '-50% -50%', rotate: `${frame * 7}deg`}}
			/>
			<Title text="MEGA WIN" at={4} out={end - 10} size={240} y={-200} accent="#A34BFF" />
		</AbsoluteFill>
	);
};

/** WIN-EPIC: vault blast, loot flood, all four crew. */
export const WinEpic: React.FC = () => {
	const {fps} = useVideoConfig();
	const end = 8 * fps;
	return (
		<Shake at={6} strength={30} length={30}>
			<AbsoluteFill>
				<Flash at={6} />
				<Shockwave at={6} />
				<Rays from={6} opacity={0.7} size={2200} />
				<Burst at={6} count={90} kind="coin" seed="we1" speed={50} />
				<Burst at={8} count={40} kind="bill" seed="we2" speed={40} />
				<Rain from={10} count={70} image="SYM-H1" seed="wer" duration={end - 50} size={120} />
				<Prop id="CHR-ROXY-POSE" at={14} out={end - 14} x={250} y={700} h={640} from="bottom" />
				<Prop id="CHR-BYTE-POSE" at={18} out={end - 14} x={620} y={760} h={560} from="bottom" />
				<Prop id="CHR-TANK-POSE" at={22} out={end - 14} x={1300} y={720} h={620} from="bottom" />
				<Prop id="CHR-FUSE-POSE" at={26} out={end - 14} x={1680} y={720} h={600} from="bottom" />
				<Title text="EPIC WIN" at={8} out={end - 10} size={260} y={-230} accent="#28B9EF" />
			</AbsoluteFill>
		</Shake>
	);
};

/** Firework burst that spells nothing but looks festive. */
const Firework: React.FC<{at: number; x: number; y: number; color: string; seed: string}> = ({at, x, y, color, seed}) => (
	<>
		<Burst at={at} count={60} kind="spark" x={x} y={y} speed={22} gravity={0.25} life={40} colors={[color, '#ffffff']} seed={seed} />
		<Shockwave at={at} x={`${x}px`} y={`${y}px`} max={500} color={color} width={10} />
	</>
);

/** CIN-MAX-WIN: full-frame cinematic over the bank at night (9 s). */
export const MaxWin: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = 9 * fps;
	const push = interpolate(frame, [0, end], [1.0, 1.25], {...clamp, easing: Easing.inOut(Easing.quad)});
	const fireworks = new Array(14).fill(0).map((_, i) => ({
		at: 40 + i * 14,
		x: 200 + random(`fwx${i}`) * 1520,
		y: 120 + random(`fwy${i}`) * 360,
		color: ['#FF4C36', '#A34BFF', '#FFA12B', '#28B9EF', GOLD][i % 5],
	}));
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<Img src={art('BG-MAIN')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', scale: push}} />
			<AbsoluteFill style={{background: 'radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6) 100%)'}} />
			{fireworks.map((f, i) => (
				<Firework key={i} at={f.at} x={f.x} y={f.y} color={f.color} seed={`fw${i}`} />
			))}
			<Prop id="SYM-WILD" at={20} x={960} y={820} h={420} from="left" rotate={interpolate(frame, [20, 60, 90], [-20, 10, 0], clamp)} />
			<Burst at={44} count={30} kind="smoke" x={960} y={950} seed="mws" speed={20} life={60} />
			<Prop id="CHR-ROXY-POSE" at={70} x={330} y={700} h={620} from="bottom" />
			<Prop id="CHR-BYTE-POSE" at={76} x={620} y={740} h={540} from="bottom" />
			<Prop id="CHR-TANK-POSE" at={82} x={1300} y={700} h={600} from="bottom" />
			<Prop id="CHR-FUSE-POSE" at={88} x={1600} y={710} h={580} from="bottom" />
			<Rain from={100} count={80} seed="mwr" duration={end - 140} size={150} />
			<Rays from={110} opacity={0.5} size={2400} />
			<Title text="MAXIMUM WIN" at={110} size={220} y={-260} accent="#FF4C36" />
			<Title text="12,000×" at={130} size={260} y={-20} accent="#A34BFF" tilt={-2} />
			<Flash at={110} strength={0.7} />
		</AbsoluteFill>
	);
};
