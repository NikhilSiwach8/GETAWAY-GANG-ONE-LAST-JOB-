import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CREW, GOLD, type CrewKey} from '../lib/assets';
import {Burst, Flash, Halftone, Rays, Shake, Shockwave, SpeedLines} from '../lib/fx';
import {Prop, Stamp, Title} from '../lib/ui';
import {TITLE_FONT} from '../lib/font';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type ComboId = 'RB' | 'BT' | 'TF' | 'FR' | 'RT';
const COMBOS: Record<ComboId, {title: string; a: CrewKey; b: CrewKey}> = {
	RB: {title: 'HOT-WIRED CLONE', a: 'R', b: 'B'},
	BT: {title: 'VAULT CLONE', a: 'B', b: 'T'},
	TF: {title: 'GOLDEN VAULT', a: 'T', b: 'F'},
	FR: {title: 'BLAST DRIFT', a: 'F', b: 'R'},
	RT: {title: 'ARMORED GETAWAY', a: 'R', b: 'T'},
};

/** A glowing link between the two characters (cable, scan beam, chain...). */
const Link: React.FC<{from: number; color: string; dashed?: boolean; height?: number}> = ({from, color, dashed, height = 16}) => {
	const frame = useCurrentFrame();
	const t = interpolate(frame, [from, from + 10], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	if (frame < from) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 560,
				top: 560,
				width: 800 * t,
				height,
				borderRadius: height,
				background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 40px, #4b5563 40px 60px)` : color,
				boxShadow: `0 0 30px ${color}`,
			}}
		/>
	);
};

/** FX-COMBO-*: two crew members, a unique interaction per pair (transparent overlay). */
export const Combo: React.FC<{combo: ComboId}> = ({combo}) => {
	const {fps} = useVideoConfig();
	const {title, a, b} = COMBOS[combo];
	const A = CREW[a];
	const B = CREW[b];
	const end = Math.round(2 * fps);
	return (
		<Shake at={14} strength={combo === 'RT' || combo === 'TF' ? 20 : 8}>
			<AbsoluteFill>
				<Halftone color={A.color} opacity={0.18} />
				<Rays color={GOLD} from={10} opacity={0.35} />
				<Prop id={A.pose} at={0} out={end - 10} x={360} y={600} h={820} from="left" />
				<Prop id={B.pose} at={2} out={end - 10} x={1560} y={600} h={820} from="right" flip />
				{combo === 'RB' && (
					<>
						<Link from={10} color="#c58bff" height={12} />
						<SpeedLines from={14} to={end} color="#A34BFF" seed="rb" />
						<Burst at={18} count={30} kind="pixel" x={960} y={560} colors={['#A34BFF', '#FF4C36', '#e9d5ff']} seed="rbp" />
					</>
				)}
				{combo === 'BT' && (
					<>
						<Link from={10} color="#A34BFF" height={60} />
						<Burst at={16} count={40} kind="pixel" x={960} y={560} colors={['#A34BFF', '#F7C947']} seed="btp" speed={22} />
						<Prop id="SYM-H1" at={18} x={760} y={380} h={170} />
						<Prop id="SYM-H1" at={22} x={1160} y={380} h={170} />
					</>
				)}
				{combo === 'TF' && (
					<>
						<Flash at={14} color="#fff3b0" />
						<Shockwave at={14} color={GOLD} />
						<Burst at={14} count={60} kind="coin" x={960} y={560} seed="tfc" speed={34} />
						<Burst at={16} count={40} kind="confetti" x={960} y={560} seed="tff" colors={['#28B9EF', '#F7C947', '#FFA12B']} />
						<Prop id="SYM-H3" at={16} x={960} y={520} h={240} />
					</>
				)}
				{combo === 'FR' && (
					<>
						<Shockwave at={10} color="#28B9EF" />
						<Burst at={12} count={30} kind="smoke" x={960} y={760} seed="frs" speed={26} life={50} />
						<SpeedLines from={14} to={end} color="#FF4C36" direction={-1} seed="fr" />
						<Prop id="SYM-WILD" at={14} x={960} y={720} h={300} from="right" rotate={-8} />
					</>
				)}
				{combo === 'RT' && (
					<>
						<Link from={8} color="#cbd5e1" dashed height={22} />
						<Burst at={14} count={40} kind="spark" x={960} y={800} angle={180} spread={60} seed="rts" colors={['#FFA12B', '#F7C947', '#ffffff']} />
						<SpeedLines from={14} to={end} seed="rt" />
						<Prop id="SYM-WILD" at={12} x={960} y={760} h={280} from="left" />
					</>
				)}
				<Title text={title} at={12} out={end - 6} size={128} y={-330} accent={A.color} accent2={B.color} />
				<Title text={`${A.name} + ${B.name}`} at={16} out={end - 6} size={58} y={-215} accent={B.color} tilt={-2} />
			</AbsoluteFill>
		</Shake>
	);
};

/** One comic panel for Perfectly Bad Plan. */
const Panel: React.FC<{crew: CrewKey; index: number; caption: string; shatterAt: number}> = ({crew, index, caption, shatterAt}) => {
	const frame = useCurrentFrame();
	const c = CREW[crew];
	const at = index * 7;
	const x = (index % 2) * 960;
	const y = Math.floor(index / 2) * 540;
	const enter = interpolate(frame, [at, at + 8], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.5))});
	const shatter = interpolate(frame, [shatterAt, shatterAt + 12], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const dir = [[-1, -1], [1, -1], [-1, 1], [1, 1]][index];
	if (frame < at) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: x + 14,
				top: y + 14,
				width: 932,
				height: 512,
				overflow: 'hidden',
				border: '10px solid #111',
				background: `radial-gradient(circle at 30% 40%, ${c.color}, #1c1f26 75%)`,
				scale: enter,
				rotate: `${(index % 2 ? 2 : -2) + shatter * dir[0] * 25}deg`,
				translate: `${shatter * dir[0] * 900}px ${shatter * dir[1] * 700}px`,
				opacity: 1 - shatter,
			}}
		>
			<div style={{position: 'absolute', inset: 0}}>
				<Prop id={c.pose} x={300} y={330} h={560} />
			</div>
			<div
				style={{
					position: 'absolute',
					right: 30,
					top: 40,
					width: 470,
					fontFamily: TITLE_FONT,
					fontSize: 50,
					lineHeight: 1.05,
					color: '#1c1f26',
					background: '#fffbe0',
					border: '6px solid #111',
					borderRadius: 30,
					padding: '22px 26px 14px',
				}}
			>
				{caption}
			</div>
		</div>
	);
};

/** CIN-PERFECTLY-BAD-PLAN: four comic panels of mistakes, shatter, loot reveal, ×3 stamp (full frame). */
export const PerfectlyBadPlan: React.FC = () => {
	const {fps} = useVideoConfig();
	const shatter = Math.round(1.25 * fps);
	return (
		<AbsoluteFill style={{background: '#0b1026'}}>
			<Panel crew="R" index={0} caption="WRONG GEAR! REVERSING INTO THE WALL!" shatterAt={shatter} />
			<Panel crew="B" index={1} caption="I MAY HAVE OPENED THE WRONG ACCOUNT!" shatterAt={shatter} />
			<Panel crew="T" index={2} caption="THAT'S DEFINITELY NOT THE RIGHT VAULT!" shatterAt={shatter} />
			<Panel crew="F" index={3} caption="OOPS... TOO EARLY! BIG OOPS!" shatterAt={shatter} />
			<Flash at={shatter} />
			<Rays from={shatter} opacity={0.6} />
			<Burst at={shatter} count={70} kind="coin" seed="pbpc" speed={38} />
			<Burst at={shatter + 2} count={40} kind="bill" seed="pbpb" speed={30} />
			<Prop id="CHR-ROXY-POSE" at={shatter + 4} x={330} y={640} h={640} from="bottom" />
			<Prop id="CHR-BYTE-POSE" at={shatter + 6} x={720} y={680} h={560} from="bottom" />
			<Prop id="CHR-TANK-POSE" at={shatter + 8} x={1200} y={660} h={620} from="bottom" />
			<Prop id="CHR-FUSE-POSE" at={shatter + 10} x={1600} y={660} h={600} from="bottom" />
			<Title text="PERFECTLY BAD PLAN!" at={shatter + 10} size={150} y={-330} />
			<Stamp text="×3" at={shatter + 20} size={190} y={60} />
		</AbsoluteFill>
	);
};

/** CIN-CLEAN-GETAWAY: green lights, van races through, chequered wipe, "CLEAN GETAWAY ×5". */
export const CleanGetaway: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const end = Math.round(2 * fps);
	return (
		<AbsoluteFill>
			{[0, 1, 2, 3, 4].map((i) => {
				const on = frame > 3 + i * 4;
				return (
					<div key={i} style={{position: 'absolute', left: 260 + i * 330, top: 90, width: 90, height: 230, borderRadius: 20, background: '#1c1f26', border: '6px solid #6b7280'}}>
						<div style={{width: 56, height: 56, margin: '18px auto 0', borderRadius: '50%', background: on ? '#3b0a0a' : '#ff3b30'}} />
						<div style={{width: 56, height: 56, margin: '12px auto 0', borderRadius: '50%', background: on ? '#22ff66' : '#0a3b14', boxShadow: on ? '0 0 40px #22ff66' : 'none'}} />
					</div>
				);
			})}
			<SpeedLines from={20} to={end} />
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					bottom: 0,
					width: interpolate(frame, [36, 48], [0, 1920], clamp),
					background: 'repeating-conic-gradient(#111 0 25%, #fff 0 50%) 0 0 / 120px 120px',
					opacity: interpolate(frame, [36, 40, 52, 58], [0, 0.85, 0.85, 0], clamp),
				}}
			/>
			<Prop id="SYM-WILD" at={18} out={42} x={760} y={760} h={420} from="left" />
			<Title text="CLEAN GETAWAY" at={26} out={end - 4} size={150} y={-60} fill="linear-gradient(180deg,#ffffff,#d1d5db 50%,#6b7280)" accent="#22c55e" />
			<Stamp text="×5" at={34} color="#16a34a" size={150} x={560} y={170} />
		</AbsoluteFill>
	);
};
