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
export const FinalEscape: React.FC<{levels?: Record<CrewKey, number>; award: string}> = ({levels, award}) => {
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
						{levels && <Title text={'★'.repeat(levels[c]) + '☆'.repeat(3 - levels[c])} at={at + 6} size={70} y={360} accent={CREW[c].color} tilt={0} fill={`linear-gradient(180deg,#fff3b0,${CREW[c].color})`} />}
						{levels && levels[c] >= 3 && <Title text="MASTER" at={at + 10} size={60} y={-30} accent={CREW[c].color} />}
					</React.Fragment>
				);
			})}
			<Title text="FINAL ESCAPE" at={10} out={Math.round(1.7 * fps)} size={200} />
			{award ? <Title text={award} at={Math.round(5.6 * fps)} size={170} y={-330} accent="#28B9EF" /> : null}
		</AbsoluteFill>
	);
};

/** Soft twinkling 4-point glint (seamless: brightness follows whole sine cycles of the loop phase). */
const Glint: React.FC<{x: number; y: number; size: number; p: number; seed: string; cycles?: number}> = ({x, y, size, p, seed, cycles = 2}) => {
	const v = Math.max(0, Math.sin((p * cycles + random(seed)) * Math.PI * 2));
	const k = v ** 4;
	return (
		<div style={{position: 'absolute', left: x, top: y, translate: '-50% -50%', opacity: k, scale: 0.4 + k * 0.8, rotate: `${p * 360}deg`}}>
			<div style={{position: 'absolute', width: size, height: size / 7, translate: '-50% -50%', background: 'radial-gradient(ellipse, #fff 0%, rgba(255,230,150,0.8) 35%, transparent 70%)'}} />
			<div style={{position: 'absolute', width: size / 7, height: size, translate: '-50% -50%', background: 'radial-gradient(ellipse, #fff 0%, rgba(255,230,150,0.8) 35%, transparent 70%)'}} />
			<div style={{position: 'absolute', width: size / 3, height: size / 3, translate: '-50% -50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)'}} />
		</div>
	);
};

/** Dust / sparkle motes drifting upward; each crosses the frame a whole number of times per loop. */
const Motes: React.FC<{p: number; n: number; seed: string; area: [number, number, number, number]; color: string; speed?: number}> = ({p, n, seed, area, color, speed = 1}) => (
	<>
		{new Array(n).fill(0).map((_, i) => {
			const [x0, y0, w, h] = area;
			const t = (random(`${seed}y${i}`) + p * speed) % 1;
			const x = x0 + random(`${seed}x${i}`) * w + Math.sin((p * 2 + random(`${seed}s${i}`)) * Math.PI * 2) * 18;
			const y = y0 + h - t * h;
			const s = 3 + random(`${seed}r${i}`) * 5;
			return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: color, boxShadow: `0 0 ${s * 3}px ${color}`, opacity: Math.sin(t * Math.PI) * 0.85}} />;
		})}
	</>
);

/** BG-HEIST-LOOP (8 s seamless): chandelier shimmer, flickering wall lamps, glinting gold, dust in the light. */
export const BgHeistLoop: React.FC = () => {
	const p = usePhase();
	const lamps: [number, number][] = [[176, 76], [488, 364], [1732, 112], [1428, 364]];
	const glints: [number, number, number][] = [[90, 900, 70], [250, 820, 60], [420, 880, 54], [150, 980, 80], [330, 950, 50], [520, 840, 44], [1780, 700, 70], [1860, 760, 56], [1720, 820, 50], [1650, 1000, 60], [950, 70, 90], [880, 140, 50], [1040, 130, 56], [450, 860, 40], [1900, 650, 46]];
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Img src={art('BG-HEIST')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			{/* chandelier bloom */}
			<div style={{position: 'absolute', left: 960, top: 90, width: 720, height: 520, translate: '-50% -50%', background: 'radial-gradient(ellipse, rgba(255,226,150,0.45), transparent 62%)', mixBlendMode: 'screen', opacity: 0.75 + 0.25 * Math.sin(p * Math.PI * 2 * 4)}} />
			{/* light cone onto the floor seal, slowly breathing */}
			<div style={{position: 'absolute', left: 960, top: 120, width: 1100, height: 900, translate: '-50% 0', clipPath: 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)', background: 'linear-gradient(180deg, rgba(255,220,140,0.16), rgba(255,220,140,0) 80%)', filter: 'blur(40px)', mixBlendMode: 'screen', opacity: 0.45 + 0.3 * Math.sin(p * Math.PI * 2)}} />
			{lamps.map(([x, y], i) => {
				const flick = 0.75 + 0.18 * Math.sin((p * 12 + i * 0.3) * Math.PI * 2) + 0.07 * Math.sin((p * 31 + i) * Math.PI * 2);
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: 260, height: 260, translate: '-50% -50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,90,60,0.55), rgba(255,60,40,0.15) 40%, transparent 70%)', mixBlendMode: 'screen', opacity: flick}} />;
			})}
			{/* a slow gleam sweeping across the polished floor */}
			<div style={{position: 'absolute', left: -600 + ((p * 2) % 1) * 3100, top: 760, width: 380, height: 320, rotate: '-18deg', background: 'linear-gradient(90deg, transparent, rgba(255,240,200,0.18), transparent)', mixBlendMode: 'screen'}} />
			<Motes p={p} n={60} seed="hd" area={[560, 120, 800, 900]} color="rgba(255,236,180,0.9)" />
			{glints.map(([x, y, s], i) => (
				<Glint key={i} x={x} y={y} size={s * 1.6} p={p} seed={`hg${i}`} cycles={1 + (i % 3)} />
			))}
		</AbsoluteFill>
	);
};

/** BG-HIDDEN-LOOP (8 s seamless): glowing vault, rushing road lights, drifting gold coins and sparkles. */
export const BgHiddenLoop: React.FC = () => {
	const p = usePhase();
	const coins: [number, number, number][] = [[300, 1100, 70], [700, 1300, 50], [1180, 1200, 60], [1500, 1350, 44], [1820, 1150, 64], [120, 1400, 40], [980, 1500, 36]];
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<Img src={art('BG-HIDDEN')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			{/* vault light pulsing out of the open door */}
			<div style={{position: 'absolute', left: 1680, top: 700, width: 900, height: 700, translate: '-50% -50%', background: 'radial-gradient(ellipse, rgba(255,214,110,0.6), rgba(255,170,40,0.18) 40%, transparent 68%)', mixBlendMode: 'screen', opacity: 0.7 + 0.3 * Math.sin(p * Math.PI * 2 * 2)}} />
			{/* road light streaks racing from the vault toward the viewer */}
			{new Array(10).fill(0).map((_, i) => {
				const t = (random(`rl${i}`) + p * 2) % 1;
				const e = t * t;
				const x = 1640 + (random(`rx${i}`) - 0.5) * 80 + (-900 + random(`rw${i}`) * 1500) * e;
				const y = 880 + 260 * e;
				return <div key={i} style={{position: 'absolute', left: x, top: y, width: 20 + 260 * e, height: 3 + 6 * e, translate: '-50% -50%', borderRadius: 8, background: 'linear-gradient(90deg, transparent, rgba(255,220,130,0.9), transparent)', opacity: Math.sin(t * Math.PI), mixBlendMode: 'screen'}} />;
			})}
			{/* gold coins tumbling upward through the sky */}
			{coins.map(([x0, y0, s], i) => {
				const t = (random(`hc${i}`) + p) % 1;
				const y = y0 - t * 1600;
				const x = x0 + Math.sin((p * 2 + i * 0.4) * Math.PI * 2) * 40;
				const flip = Math.cos((p * (2 + (i % 2)) + i * 0.2) * Math.PI * 2);
				return (
					<div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, translate: '-50% -50%', scale: `${Math.max(0.08, Math.abs(flip))} 1`, rotate: `${-20 + i * 9}deg`, borderRadius: '50%', background: flip > 0 ? 'radial-gradient(circle at 35% 30%, #fff6c0, #ffcc33 40%, #b87400 80%)' : 'radial-gradient(circle at 60% 60%, #ffe17a, #c98a00 70%)', border: '3px solid #8a5200', boxShadow: '0 0 18px rgba(255,200,60,0.7)'}} />
				);
			})}
			<Motes p={p} n={70} seed="hs" area={[0, 80, 1920, 1000]} color="rgba(255,214,110,0.95)" speed={1} />
			{[[1650, 690, 120], [1720, 600, 60], [60, 600, 60], [1730, 380, 50], [190, 1010, 70], [1840, 1010, 70]].map(([x, y, s], i) => (
				<Glint key={i} x={x} y={y} size={s * 1.6} p={p} seed={`hhg${i}`} cycles={1 + (i % 2)} />
			))}
		</AbsoluteFill>
	);
};
