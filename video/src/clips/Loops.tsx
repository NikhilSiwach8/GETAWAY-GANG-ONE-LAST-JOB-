import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {art, CREW, type CrewKey} from '../lib/assets';
import {Burst, SpeedLines} from '../lib/fx';
import {Prop, Title} from '../lib/ui';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Seamless loop helper: phase 0..1 over the composition. */
const usePhase = () => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	return frame / durationInFrames;
};

/** BG-MAIN-LOOP (12 s seamless): sweeping searchlights, rain, window flicker over BG-MAIN. */
export const BgMainLoop: React.FC = () => {
	const p = usePhase();
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Img src={art('BG-MAIN')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			{[0, 1].map((i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: i ? 1500 : 380,
						top: 640,
						width: 180,
						height: 1100,
						transformOrigin: '50% 0%',
						translate: '-50% -100%',
						rotate: `${180 + Math.sin((p + i * 0.37) * Math.PI * 2) * 28}deg`,
						background: 'linear-gradient(0deg, rgba(190,215,255,0.35), rgba(190,215,255,0))',
						clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
						mixBlendMode: 'screen',
					}}
				/>
			))}
			{new Array(120).fill(0).map((_, i) => {
				const x = random(`rx${i}`) * 1920;
				const speed = 2; // loops: each drop crosses the frame an integer number of times
				const y = ((random(`ry${i}`) + p * speed) % 1) * 1300 - 120;
				return <div key={i} style={{position: 'absolute', left: x + y * 0.08, top: y, width: 2, height: 46, background: 'rgba(200,220,255,0.35)', rotate: '8deg'}} />;
			})}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(circle at 20% 45%, rgba(255,200,90,0.18), transparent 25%)',
					opacity: 0.6 + 0.4 * Math.sin((frame / durationInFrames) * Math.PI * 2 * 6),
					mixBlendMode: 'screen',
				}}
			/>
		</AbsoluteFill>
	);
};

/** BG-ESCAPE-LOOP (8 s seamless): road rush, neon flicker, flying banknotes over BG-ESCAPE. */
export const BgEscapeLoop: React.FC = () => {
	const p = usePhase();
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Img src={art('BG-ESCAPE')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			{new Array(10).fill(0).map((_, i) => {
				const q = ((i / 10 + p * 4) % 1);
				const y = 760 + q * q * 360;
				return <div key={i} style={{position: 'absolute', left: 1050 + q * 260, top: y, width: 18 + q * 70, height: 6 + q * 28, background: 'rgba(255,255,255,0.75)', rotate: '28deg', opacity: q}} />;
			})}
			{new Array(40).fill(0).map((_, i) => {
				const q = (random(`sx${i}`) + p * 3) % 1;
				return <div key={`s${i}`} style={{position: 'absolute', left: 1920 - q * 2400, top: 520 + random(`sy${i}`) * 500, width: 260, height: 4, background: 'linear-gradient(90deg, transparent, rgba(255,120,220,0.6))'}} />;
			})}
			{new Array(8).fill(0).map((_, i) => {
				const q = (random(`bx${i}`) + p * 2) % 1;
				return (
					<div
						key={`b${i}`}
						style={{position: 'absolute', left: 520 - q * 700, top: 620 - q * 300 + Math.sin((q + i) * 9) * 40, width: 70, height: 34, borderRadius: 4, background: 'linear-gradient(135deg,#b9e6a5,#5c9e4a)', border: '2px solid #2f5f24', rotate: `${q * 720 + i * 40}deg`}}
					/>
				);
			})}
			<AbsoluteFill style={{background: 'rgba(255,60,200,0.08)', opacity: 0.5 + 0.5 * Math.sin(p * Math.PI * 2 * 8)}} />
		</AbsoluteFill>
	);
};

/**
 * CIN-FINAL-ESCAPE (7 s): the van leaves the bank, each crew member gets a beat. Levels and the award
 * come from the book at runtime, so they are props here; the game overlays its own values if needed.
 */
export const FinalEscape: React.FC<{levels: Record<CrewKey, number>; award: string}> = ({levels, award}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const keys: CrewKey[] = ['R', 'B', 'T', 'F'];
	return (
		<AbsoluteFill style={{background: '#05070f', overflow: 'hidden'}}>
			<Img src={art('BG-MAIN')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, 2 * fps], [1.25, 1], clamp)}} />
			<SpeedLines from={10} to={60} />
			<Img src={art('SYM-WILD')} style={{position: 'absolute', left: interpolate(frame, [0, 50], [700, 2300], {...clamp, easing: Easing.in(Easing.cubic)}), top: 780, height: 420, translate: '-50% -50%'}} />
			<Burst at={8} count={30} kind="smoke" x={760} y={900} angle={180} spread={60} seed="fes" life={60} />
			{keys.map((c, i) => {
				const at = Math.round(1.8 * fps) + i * Math.round(0.9 * fps);
				const show = frame >= at;
				if (!show) return null;
				return (
					<React.Fragment key={c}>
						<Prop id={CREW[c].pose} at={at} x={240 + i * 480} y={640} h={560} from="bottom" />
						<Title text={'★'.repeat(levels[c]) + '☆'.repeat(3 - levels[c])} at={at + 6} size={70} y={360} accent={CREW[c].color} tilt={0} fill={`linear-gradient(180deg,#fff3b0,${CREW[c].color})`} />
						{levels[c] >= 3 && <Title text="MASTER" at={at + 10} size={60} y={-30} accent={CREW[c].color} />}
					</React.Fragment>
				);
			})}
			<Title text="FINAL ESCAPE" at={10} out={Math.round(1.7 * fps)} size={200} />
			{award ? <Title text={award} at={Math.round(5.6 * fps)} size={170} y={-330} accent="#28B9EF" /> : null}
		</AbsoluteFill>
	);
};
