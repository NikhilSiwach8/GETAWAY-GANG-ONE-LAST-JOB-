import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {CREW, type CrewKey} from '../lib/assets';
import {Burst, Flash, Halftone, Rays, Shake, Shockwave, SpeedLines} from '../lib/fx';
import {Plate, Prop, Title} from '../lib/ui';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** FX-CREW-CHAOS: board-wide comic title burst (transparent overlay). */
export const CrewChaos: React.FC = () => {
	const {fps} = useVideoConfig();
	return (
		<AbsoluteFill>
			<Halftone color="#F7C947" opacity={0.3} />
			<Rays from={0} opacity={0.45} />
			{(['R', 'B', 'T', 'F'] as CrewKey[]).map((c, i) => (
				<SpeedLines key={c} from={2 + i} to={Math.round(1.1 * fps)} color={CREW[c].color} direction={i % 2 ? -1 : 1} count={8} seed={`cc${c}`} />
			))}
			<Title text="CREW CHAOS!" at={2} out={Math.round(1.0 * fps)} size={190} />
			<Burst at={4} count={40} kind="star" seed="ccs" speed={30} />
		</AbsoluteFill>
	);
};

/** Glitch bars + scan beams for Byte. */
const ScanBeams: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame();
	const t = frame - from;
	if (t < 0) return null;
	return (
		<AbsoluteFill>
			{[0, 1, 2].map((i) => {
				const y = ((t * 38 + i * 360) % 1300) - 110;
				return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: 14, background: '#c58bff', boxShadow: '0 0 40px 18px #A34BFFaa', opacity: 0.85}} />;
			})}
			{new Array(10).fill(0).map((_, i) => {
				const on = random(`gl-${i}-${Math.floor(t / 2)}`) > 0.6;
				if (!on) return null;
				return (
					<div
						key={`g${i}`}
						style={{
							position: 'absolute',
							left: random(`glx-${i}-${Math.floor(t / 2)}`) * 1700,
							top: random(`gly-${i}-${Math.floor(t / 2)}`) * 1000,
							width: 120 + random(`glw-${i}`) * 300,
							height: 10 + random(`glh-${i}`) * 26,
							background: i % 2 ? '#A34BFF' : '#39ff8a',
							mixBlendMode: 'screen',
							opacity: 0.7,
						}}
					/>
				);
			})}
			{[0, 1, 2, 3].map((i) => {
				const at = 18 + i * 6;
				if (t < at) return null;
				return (
					<div
						key={`c${i}`}
						style={{
							position: 'absolute',
							left: 980 + (i % 2 ? 380 : 120) - i * 40,
							top: 220 + i * 170,
							fontFamily: 'JetBrains Mono, monospace',
							fontWeight: 800,
							fontSize: 44,
							color: '#e9d5ff',
							background: '#4c1d95cc',
							border: '3px solid #c58bff',
							padding: '4px 16px',
							opacity: interpolate(t, [at, at + 3, at + 14, at + 18], [0, 1, 1, 0], clamp),
						}}
					>
						COPY
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

/** Tank: vault ring that unbolts. */
const VaultRing: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame();
	const t = frame - from;
	if (t < 0) return null;
	const open = interpolate(t, [10, 24], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	return (
		<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
			<div
				style={{
					width: 560,
					height: 560,
					borderRadius: '50%',
					border: '34px solid #b8bec8',
					boxShadow: 'inset 0 0 0 14px #6b7280, 0 0 80px #FFA12B',
					background: 'radial-gradient(circle, #fff3b0 0%, #F7C947 30%, rgba(247,201,71,0) 70%)',
					scale: interpolate(t, [0, 8], [0.2, 1], {...clamp, easing: Easing.out(Easing.back(1.6))}),
					opacity: interpolate(t, [0, 4, 40, 48], [0, 1, 1, 0], clamp),
					transform: `perspective(1200px) rotateZ(${t * 6}deg) rotateY(${open * 75}deg)`,
				}}
			/>
		</AbsoluteFill>
	);
};

const ABILITY_LINES: Record<CrewKey, string> = {
	R: 'EVERYBODY HOLD ON!',
	B: 'WRONG ACCOUNT... OOPS!',
	T: 'STAND BACK!',
	F: 'THE DOOR IS GONE!',
};

/** ANIM-<CREW>-ABILITY-FX: character enters, signature effect plays, ability plate holds (transparent overlay).
 * 3.6 s: slow enough to read who acted and what the ability is, ends with a 0.4 s fade so the next clip
 * (or the board) takes over without a cut. */
export const ABILITY_SECONDS = 3.6;
export const AbilityFx: React.FC<{crew: CrewKey}> = ({crew}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const c = CREW[crew];
	const fromLeft = crew === 'R' || crew === 'T';
	const charX = fromLeft ? 360 : 1560;
	const end = Math.round(ABILITY_SECONDS * fps);
	const at = (f: number) => Math.round(f * 1.5); // entrance paced 1.5x slower than the 2 s cut
	const fadeOut = interpolate(frame, [end - 12, end - 1], [1, 0], clamp);
	const body = (
		<AbsoluteFill style={{opacity: fadeOut}}>
			<Rays color={c.color} from={at(2)} opacity={0.35} />
			{crew === 'R' && (
				<>
					<SpeedLines from={at(4)} to={end} color="#ffffff" />
					<Burst at={at(6)} count={26} kind="smoke" x={charX + (fromLeft ? 260 : -260)} y={960} angle={fromLeft ? 0 : 180} spread={50} speed={22} life={60} seed="rs" size={0.6} />
					<Burst at={at(10)} count={20} kind="spark" x={charX + 200} y={880} angle={-30} spread={70} seed="rk" colors={['#FF4C36', '#ffffff']} />
					<Burst at={at(30)} count={16} kind="spark" x={charX + 260} y={900} angle={-20} spread={60} seed="rk2" colors={['#FF4C36', '#F7C947']} />
				</>
			)}
			{crew === 'B' && <ScanBeams from={at(8)} />}
			{crew === 'T' && (
				<>
					<VaultRing from={at(8)} />
					<Burst at={at(12) + 6} count={36} kind="spark" x={960} y={540} seed="ts" colors={['#FFA12B', '#F7C947', '#ffffff']} speed={34} />
					<Burst at={at(20) + 6} count={12} kind="debris" x={960} y={540} seed="td" speed={28} />
					<Burst at={at(28) + 6} count={24} kind="coin" x={960} y={540} seed="tc" speed={30} />
				</>
			)}
			{crew === 'F' && (
				<>
					<Flash at={at(14)} color="#cdefff" />
					<Shockwave at={at(14)} color="#28B9EF" />
					<Shockwave at={at(18)} color="#F7C947" />
					<Burst at={at(14)} count={80} kind="confetti" seed="fc" speed={40} life={70} />
					<Burst at={at(14)} count={20} kind="smoke" seed="fs" speed={18} life={70} />
					<Burst at={at(16)} count={24} kind="star" seed="fst" speed={30} colors={['#F7C947', '#28B9EF']} />
				</>
			)}
			<Prop id={c.pose} at={0} x={charX} y={600} h={860} from={fromLeft ? 'left' : 'right'} bob={6} />
			<Title text={c.name} at={at(6)} size={130} y={-330} accent={c.color} />
			<Plate text={c.ability} at={at(10)} color={c.color} y={-200} />
			<Title text={ABILITY_LINES[crew]} at={at(16)} size={64} y={380} accent={c.color} tilt={-2} />
		</AbsoluteFill>
	);
	return crew === 'T' ? <Shake at={at(10)} strength={22} length={24}>{body}</Shake> : body;
};
