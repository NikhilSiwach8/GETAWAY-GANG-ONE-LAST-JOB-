/**
 * Story versions (6-8 s) of the bonus intros and the bonus total-win screens, told with the delivered art.
 * Each story ends by playing the existing screen (BonusIntro / OutroScreen / HiddenOutro) as its last scene,
 * so it hands over seamlessly to the game's SCR-*-INTRO-LOOP and to the win-amount layout of the end screen.
 *
 *   SCR-HEIST-INTRO   the crew assembles at the bank -> Tank drills the vault -> THE HEIST
 *   SCR-ESCAPE-INTRO  alarm, the crew runs -> highway chase -> THE PERFECT ESCAPE
 *   SCR-HIDDEN-INTRO  Byte cracks the mystery vault -> gold floods out -> HIDDEN BONUS
 *   SCR-*-OUTRO       getaway with flying cash -> the crew counts the loot -> TOTAL WIN screen
 */
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {art, CREW, type CrewKey} from '../lib/assets';
import {Burst, Flash, Rain, Shockwave, SpeedLines} from '../lib/fx';
import {Title} from '../lib/ui';
import {BonusIntro} from './BonusIntro';
import {OutroScreen} from './Outros';
import {HiddenOutro} from './Mystery';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const FADE = 10; // frames of cross-fade between scenes

/** Story timing (frames @30 fps); the game reads the outro handover from OUTRO_STORY_HANDOVER. */
export const INTRO_STORY = {s1: [0, 75], s2: [65, 135], final: 125, total: 215} as const;
export const OUTRO_STORY = {s1: [0, 80], s2: [70, 135], final: 125, total: 245} as const;

/** A scene layer that cross-fades in and out over FADE frames of its own (local) timeline. */
const Scene: React.FC<{length: number; children: React.ReactNode; fadeIn?: boolean}> = ({length, children, fadeIn = true}) => {
	const f = useCurrentFrame();
	const o = Math.min(fadeIn ? interpolate(f, [0, FADE], [0, 1], clamp) : 1, interpolate(f, [length - FADE, length], [1, 0], clamp));
	return <AbsoluteFill style={{opacity: o, overflow: 'hidden', background: '#05070f'}}>{children}</AbsoluteFill>;
};

/** Full-frame image with a slow camera move (scale and drift over the scene). */
const Shot: React.FC<{image: string; length: number; from?: number; to?: number; dx?: number; dy?: number; filter?: string}> = ({
	image,
	length,
	from = 1.18,
	to = 1.04,
	dx = 0,
	dy = 0,
	filter,
}) => {
	const f = useCurrentFrame();
	const p = interpolate(f, [0, length], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	return (
		<Img
			src={art(image)}
			style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', scale: from + (to - from) * p, translate: `${dx * p}px ${dy * p}px`, filter}}
		/>
	);
};

/** A crew pose that springs in from below (or a side), then breathes. */
const Crew: React.FC<{k: CrewKey; x: number; at: number; h?: number; from?: 'below' | 'left' | 'right'; run?: number; name?: boolean; y?: number}> = ({
	k,
	x,
	at,
	h = 620,
	from = 'below',
	run = 0,
	name = false,
	y = 1100,
}) => {
	const f = useCurrentFrame();
	const t = f - at;
	if (t < 0) return null;
	const e = interpolate(t, [0, 14], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.6))});
	const off = from === 'below' ? `0px ${(1 - e) * 500}px` : `${(from === 'left' ? -1 : 1) * (1 - e) * 1200}px 0px`;
	const bob = Math.sin(t / 5) * (run ? 10 : 4);
	const c = CREW[k];
	return (
		<div style={{position: 'absolute', left: x + run * t, top: y, translate: `-50% -100%`}}>
			<div style={{translate: off, rotate: `${run ? Math.sin(t / 3) * 3 : 0}deg`}}>
				<Img src={art(c.pose)} style={{height: h, translate: `0px ${bob}px`, filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.55))'}} />
				{name && (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							bottom: 40,
							translate: '-50% 0',
							fontFamily: 'Luckiest Guy',
							fontSize: 54,
							color: '#fff',
							WebkitTextStroke: `7px ${c.color}`,
							paintOrder: 'stroke fill',
							textShadow: '0 6px 0 #120a24',
							opacity: interpolate(t, [8, 16], [0, 1], clamp),
						}}
					>
						{c.name}
					</div>
				)}
			</div>
		</div>
	);
};

const Caption: React.FC<{text: string; at: number; out: number; accent?: string; y?: number; size?: number}> = ({text, at, out, accent = '#FF4C36', y = -360, size = 96}) => (
	<Title text={text} at={at} out={out} size={size} y={y} accent={accent} />
);

/** Red/blue police light wash. */
const Sirens: React.FC<{from: number; strength?: number}> = ({from, strength = 0.35}) => {
	const f = useCurrentFrame() - from;
	if (f < 0) return null;
	const red = (Math.sin(f / 3) + 1) / 2;
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: 'radial-gradient(circle at 15% 30%, rgba(255,40,40,1), transparent 55%)', opacity: strength * red}} />
			<AbsoluteFill style={{background: 'radial-gradient(circle at 85% 30%, rgba(40,110,255,1), transparent 55%)', opacity: strength * (1 - red)}} />
		</AbsoluteFill>
	);
};

/** Whole-frame shake for a few frames from `at` (local frames). */
const useShake = (at: number, strength = 18, length = 16) => {
	const t = useCurrentFrame() - at;
	if (t < 0 || t > length) return '0px 0px';
	const k = strength * (1 - t / length);
	return `${Math.sin(t * 2.7) * k}px ${Math.cos(t * 3.3) * k}px`;
};

// ============================================================================ THE HEIST
const HeistPlan: React.FC<{length: number}> = ({length}) => (
	<Scene length={length} fadeIn={false}>
		<Shot image="BG-MAIN" length={length} from={1.3} to={1.08} dy={-30} filter="brightness(0.8)" />
		<Caption text="ONE LAST JOB..." at={6} out={length - 12} accent="#F7C947" />
		<Crew k="R" x={420} at={18} h={560} name />
		<Crew k="B" x={800} at={26} h={560} name />
		<Crew k="T" x={1160} at={34} h={600} name />
		<Crew k="F" x={1520} at={42} h={560} name />
	</Scene>
);

const HeistDrill: React.FC<{length: number}> = ({length}) => {
	const shake = useShake(22, 22, 30);
	const f = useCurrentFrame();
	return (
		<Scene length={length}>
			<AbsoluteFill style={{translate: shake}}>
				<Shot image="BG-HEIST" length={length} from={1.25} to={1.1} filter={`brightness(${0.75 + 0.25 * interpolate(f, [20, 40], [0, 1], clamp)})`} />
				<Crew k="T" x={760} at={0} h={820} y={1120} />
				<Flash at={22} length={6} />
				<Shockwave at={24} x="62%" y="48%" />
				<Burst at={22} count={46} kind="spark" x={1180} y={520} speed={34} seed="hd-s" life={30} />
				<Burst at={34} count={60} kind="coin" x={1180} y={520} speed={38} seed="hd-c" life={44} />
				<Caption text="CRACK THE VAULT!" at={14} out={length - 12} accent="#FFA12B" y={-380} />
			</AbsoluteFill>
		</Scene>
	);
};

export const HeistIntroStory: React.FC = () => (
	<AbsoluteFill style={{background: '#05070f'}}>
		<Sequence from={INTRO_STORY.s1[0]} durationInFrames={INTRO_STORY.s1[1] - INTRO_STORY.s1[0]} name="The plan">
			<HeistPlan length={INTRO_STORY.s1[1] - INTRO_STORY.s1[0]} />
		</Sequence>
		<Sequence from={INTRO_STORY.s2[0]} durationInFrames={INTRO_STORY.s2[1] - INTRO_STORY.s2[0]} name="Break-in">
			<HeistDrill length={INTRO_STORY.s2[1] - INTRO_STORY.s2[0]} />
		</Sequence>
		<Sequence from={INTRO_STORY.final} name="The Heist">
			<FadeInto>
				<BonusIntro bonus="heist" />
			</FadeInto>
		</Sequence>
	</AbsoluteFill>
);

const FadeInto: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	return <AbsoluteFill style={{opacity: interpolate(f, [0, FADE], [0, 1], clamp)}}>{children}</AbsoluteFill>;
};

// ============================================================================ THE PERFECT ESCAPE
const EscapeAlarm: React.FC<{length: number}> = ({length}) => {
	const f = useCurrentFrame();
	const alarm = (Math.sin(f / 2.5) + 1) / 2;
	return (
		<Scene length={length} fadeIn={false}>
			<Shot image="BG-HEIST" length={length} from={1.15} to={1.05} dx={-60} />
			<AbsoluteFill style={{background: 'rgba(255,30,30,1)', mixBlendMode: 'multiply', opacity: 0.25 + 0.3 * alarm}} />
			<Caption text="ALARM!" at={4} out={length - 12} accent="#FF4C36" size={130} />
			<Crew k="R" x={-200} at={10} h={520} run={20} y={1080} />
			<Crew k="B" x={-480} at={14} h={520} run={20} y={1090} />
			<Crew k="T" x={-760} at={18} h={560} run={20} y={1100} />
			<Crew k="F" x={-1040} at={22} h={520} run={20} y={1090} />
			<Rain from={20} count={20} kind="coin" seed="ea-r" duration={50} size={70} />
		</Scene>
	);
};

const EscapeChase: React.FC<{length: number}> = ({length}) => {
	const f = useCurrentFrame();
	const vanIn = interpolate(f, [0, 22], [1.25, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	return (
		<Scene length={length}>
			<Shot image="BG-ESCAPE" length={length} from={1.12} to={1.22} />
			<SpeedLines from={0} to={length} color="#ffffff" count={34} seed="ec" />
			{/* the getaway van (card art), zoomed past its card frame, rocking with the road */}
			<AbsoluteFill style={{translate: `${Math.sin(f / 5) * 6}px ${90 + Math.sin(f / 3) * 4}px`, scale: vanIn}}>
				<Shot image="BUY-ESCAPE-CARD" length={length} from={1.62} to={1.5} />
			</AbsoluteFill>
			<Sirens from={0} strength={0.45} />
			<Rain from={6} count={26} kind="bill" seed="ec-b" duration={60} size={90} />
			<Caption text="GET TO THE VAN!" at={6} out={length - 12} accent="#28B9EF" y={-400} />
		</Scene>
	);
};

export const EscapeIntroStory: React.FC = () => (
	<AbsoluteFill style={{background: '#05070f'}}>
		<Sequence from={INTRO_STORY.s1[0]} durationInFrames={INTRO_STORY.s1[1] - INTRO_STORY.s1[0]} name="Alarm">
			<EscapeAlarm length={INTRO_STORY.s1[1] - INTRO_STORY.s1[0]} />
		</Sequence>
		<Sequence from={INTRO_STORY.s2[0]} durationInFrames={INTRO_STORY.s2[1] - INTRO_STORY.s2[0]} name="Chase">
			<EscapeChase length={INTRO_STORY.s2[1] - INTRO_STORY.s2[0]} />
		</Sequence>
		<Sequence from={INTRO_STORY.final} name="The Perfect Escape">
			<FadeInto>
				<BonusIntro bonus="escape" />
			</FadeInto>
		</Sequence>
	</AbsoluteFill>
);

// ============================================================================ MYSTERY VAULT -> HIDDEN BONUS
const DOOR = {src: 1254, size: 760, dial: {x: 648, y: 294, r: 140}, wheel: {x: 640, y: 664, r: 245}};
const DoorPart: React.FC<{id: string; at: {x: number; y: number; r: number}; rotate: number}> = ({id, at, rotate}) => {
	const k = DOOR.size / DOOR.src;
	return <Img src={art(id)} style={{position: 'absolute', left: (at.x - at.r) * k, top: (at.y - at.r) * k, width: at.r * 2 * k, height: at.r * 2 * k, rotate: `${rotate}deg`}} />;
};

const VaultCrack: React.FC<{length: number}> = ({length}) => {
	const f = useCurrentFrame();
	// the dial clicks through a combination: left, right, left, with pauses
	const dial = interpolate(f, [8, 22, 28, 40, 46, 56], [0, -220, -220, 140, 140, -60], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const wheel = interpolate(f, [56, 74], [0, 270], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const glow = interpolate(f, [50, 78], [0, 1], clamp);
	return (
		<Scene length={length} fadeIn={false}>
			<Shot image="BG-HEIST" length={length} from={1.1} to={1.16} filter="brightness(0.45) saturate(0.8)" />
			<div style={{position: 'absolute', left: 1080, top: 520, translate: '-50% -50%', width: DOOR.size, height: DOOR.size, filter: `drop-shadow(0 0 ${20 + glow * 60}px rgba(255,210,90,${0.3 + glow * 0.6}))`}}>
				<Img src={art('MYSTERY-VAULT-DOOR-SLAB')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
				<DoorPart id="MYSTERY-VAULT-DOOR-DIAL" at={DOOR.dial} rotate={dial} />
				<DoorPart id="MYSTERY-VAULT-DOOR-WHEEL" at={DOOR.wheel} rotate={wheel} />
			</div>
			<Crew k="B" x={330} at={4} h={680} y={1120} />
			<Caption text="WHAT'S IN THE VAULT?" at={6} out={length - 12} accent="#A34BFF" y={-410} size={86} />
		</Scene>
	);
};

const VaultOpen: React.FC<{length: number}> = ({length}) => {
	const f = useCurrentFrame();
	const open = interpolate(f, [0, 22], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	return (
		<Scene length={length}>
			<Shot image="MYSTERY-REVEAL-HIDDEN" length={length} from={1.3} to={1.05} />
			{/* the door swings away on its hinge, revealing the gold */}
			<div style={{position: 'absolute', left: 960, top: 540, translate: '-50% -50%', width: DOOR.size * 1.4, height: DOOR.size * 1.4, transform: `perspective(1600px) rotateY(${-open * 100}deg)`, transformOrigin: '0% 50%', opacity: 1 - interpolate(f, [18, 26], [0, 1], clamp)}}>
				<Img src={art('MYSTERY-VAULT-DOOR')} style={{width: '100%', height: '100%'}} />
			</div>
			<Flash at={20} length={10} color="#fff1c0" />
			<Shockwave at={22} color="#ffd65a" />
			<Burst at={22} count={80} kind="coin" speed={44} seed="vo-c" life={50} />
			<Caption text="THE HIDDEN BONUS!" at={26} out={length - 12} accent="#F7C947" y={-380} />
		</Scene>
	);
};

export const HiddenIntroStory: React.FC = () => (
	<AbsoluteFill style={{background: '#05070f'}}>
		<Sequence from={INTRO_STORY.s1[0]} durationInFrames={INTRO_STORY.s1[1] - INTRO_STORY.s1[0] + 5} name="Crack the vault">
			<VaultCrack length={INTRO_STORY.s1[1] - INTRO_STORY.s1[0] + 5} />
		</Sequence>
		<Sequence from={INTRO_STORY.s2[0] + 5} durationInFrames={INTRO_STORY.s2[1] - INTRO_STORY.s2[0] - 5} name="Vault opens">
			<VaultOpen length={INTRO_STORY.s2[1] - INTRO_STORY.s2[0] - 5} />
		</Sequence>
		<Sequence from={INTRO_STORY.final} name="Hidden Bonus">
			<FadeInto>
				<BonusIntro bonus="hidden" />
			</FadeInto>
		</Sequence>
	</AbsoluteFill>
);

// ============================================================================ TOTAL WIN
const Getaway: React.FC<{length: number}> = ({length}) => {
	const f = useCurrentFrame();
	return (
		<Scene length={length} fadeIn={false}>
			<Shot image="BG-ESCAPE" length={length} from={1.1} to={1.25} />
			<SpeedLines from={0} to={length} color="#fff3b0" count={30} seed="gw" />
			<AbsoluteFill style={{translate: `${Math.sin(f / 5) * 6}px ${90 + Math.sin(f / 3) * 4}px`}}>
				<Shot image="BUY-ESCAPE-CARD" length={length} from={1.5} to={1.62} />
			</AbsoluteFill>
			<Rain from={0} count={40} kind="bill" seed="gw-b" duration={length} size={100} />
			<Caption text="WE MADE IT!" at={8} out={length - 12} accent="#28B9EF" y={-400} size={120} />
		</Scene>
	);
};

const CountLoot: React.FC<{length: number; vault: string}> = ({length, vault}) => (
	<Scene length={length}>
		<Shot image={vault} length={length} from={1.25} to={1.08} filter="brightness(0.9)" />
		<Rain from={0} count={50} kind="coin" seed="cl-c" duration={length} size={80} />
		<Crew k="R" x={360} at={4} h={600} />
		<Crew k="T" x={760} at={8} h={640} />
		<Crew k="B" x={1160} at={12} h={600} />
		<Crew k="F" x={1560} at={16} h={600} />
		<Caption text="COUNT THE LOOT!" at={4} out={length - 10} accent="#F7C947" y={-400} />
	</Scene>
);

export const TotalWinStory: React.FC<{bonus: 'heist' | 'escape' | 'hidden'}> = ({bonus}) => (
	<AbsoluteFill style={{background: '#05070f'}}>
		<Sequence from={OUTRO_STORY.s1[0]} durationInFrames={OUTRO_STORY.s1[1] - OUTRO_STORY.s1[0]} name="Getaway">
			<Getaway length={OUTRO_STORY.s1[1] - OUTRO_STORY.s1[0]} />
		</Sequence>
		<Sequence from={OUTRO_STORY.s2[0]} durationInFrames={OUTRO_STORY.s2[1] - OUTRO_STORY.s2[0]} name="Count the loot">
			<CountLoot length={OUTRO_STORY.s2[1] - OUTRO_STORY.s2[0]} vault={bonus === 'hidden' ? 'BG-HIDDEN' : 'BG-HEIST'} />
		</Sequence>
		<Sequence from={OUTRO_STORY.final} name="Total win">
			<FadeInto>{bonus === 'hidden' ? <HiddenOutro /> : <OutroScreen bonus={bonus} />}</FadeInto>
		</Sequence>
	</AbsoluteFill>
);
