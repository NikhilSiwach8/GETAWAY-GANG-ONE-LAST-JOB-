import './lib/font';
import React from 'react';
import {Composition, Folder} from 'remotion';
import {AbilityFx, CrewChaos} from './clips/Abilities';
import {CleanGetaway, Combo, PerfectlyBadPlan} from './clips/Combos';
import {LootMilestone, MeterStage, Respin, Retrigger} from './clips/Feature';
import {MaxWin, WinBig, WinEpic, WinMega, WinSuper} from './clips/Wins';
import {BgEscapeLoop, BgMainLoop, FinalEscape} from './clips/Loops';
import {SymbolAnim, SymbolTransform} from './clips/Symbols';
import {CharacterAnim, type CharacterAction} from './clips/Characters';
import {SYMBOLS, type CrewKey} from './lib/assets';

// Composition ids are the asset ids from docs/ASSET_PROMPTS.txt (Remotion ids cannot contain "_", so "-" is kept).
const FPS = 30;
const HD = {fps: FPS, width: 1920, height: 1080} as const;
const CELL = {fps: FPS, width: 512, height: 512} as const;
const CHAR = {fps: FPS, width: 1024, height: 1024} as const;

const CHARACTER_ACTIONS: {action: CharacterAction; seconds: number}[] = [
	{action: 'IDLE', seconds: 4},
	{action: 'ABILITY', seconds: 2},
	{action: 'COMPLETE', seconds: 0.8},
	{action: 'WIN', seconds: 1.2},
	{action: 'LOSE', seconds: 1},
	{action: 'BONUS-INTRO', seconds: 2},
	{action: 'VICTORY', seconds: 3},
	{action: 'COMBO', seconds: 1.5},
];
const CREW_IDS: {key: CrewKey; id: string}[] = [
	{key: 'R', id: 'ROXY'},
	{key: 'B', id: 'BYTE'},
	{key: 'T', id: 'TANK'},
	{key: 'F', id: 'FUSE'},
];

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Folder name="Feature-effects">
				<Composition id="FX-CREW-CHAOS" component={CrewChaos} durationInFrames={36} {...HD} />
				<Composition id="ANIM-ROXY-ABILITY-FX" component={AbilityFx} durationInFrames={60} {...HD} defaultProps={{crew: 'R' as const}} />
				<Composition id="ANIM-BYTE-ABILITY-FX" component={AbilityFx} durationInFrames={60} {...HD} defaultProps={{crew: 'B' as const}} />
				<Composition id="ANIM-TANK-ABILITY-FX" component={AbilityFx} durationInFrames={60} {...HD} defaultProps={{crew: 'T' as const}} />
				<Composition id="ANIM-FUSE-ABILITY-FX" component={AbilityFx} durationInFrames={60} {...HD} defaultProps={{crew: 'F' as const}} />
				<Composition id="FX-RESPIN" component={Respin} durationInFrames={36} {...HD} />
				<Composition id="FX-RETRIGGER" component={Retrigger} durationInFrames={45} {...HD} />
				<Composition id="FX-METER-STAGE" component={MeterStage} durationInFrames={30} {...HD} />
				<Composition id="FX-LOOT-MILESTONE" component={LootMilestone} durationInFrames={40} {...HD} />
			</Folder>
			<Folder name="Combination-cinematics">
				<Composition id="FX-COMBO-RB" component={Combo} durationInFrames={60} {...HD} defaultProps={{combo: 'RB' as const}} />
				<Composition id="FX-COMBO-BT" component={Combo} durationInFrames={60} {...HD} defaultProps={{combo: 'BT' as const}} />
				<Composition id="FX-COMBO-TF" component={Combo} durationInFrames={60} {...HD} defaultProps={{combo: 'TF' as const}} />
				<Composition id="FX-COMBO-FR" component={Combo} durationInFrames={60} {...HD} defaultProps={{combo: 'FR' as const}} />
				<Composition id="FX-COMBO-RT" component={Combo} durationInFrames={60} {...HD} defaultProps={{combo: 'RT' as const}} />
				<Composition id="CIN-PERFECTLY-BAD-PLAN" component={PerfectlyBadPlan} durationInFrames={90} {...HD} />
				<Composition id="CIN-CLEAN-GETAWAY" component={CleanGetaway} durationInFrames={60} {...HD} />
			</Folder>
			<Folder name="Win-celebrations">
				<Composition id="WIN-BIG" component={WinBig} durationInFrames={120} {...HD} />
				<Composition id="WIN-SUPER" component={WinSuper} durationInFrames={150} {...HD} />
				<Composition id="WIN-MEGA" component={WinMega} durationInFrames={180} {...HD} />
				<Composition id="WIN-EPIC" component={WinEpic} durationInFrames={240} {...HD} />
				<Composition id="CIN-MAX-WIN" component={MaxWin} durationInFrames={270} {...HD} />
			</Folder>
			<Folder name="Backgrounds-and-screens">
				<Composition id="BG-MAIN-LOOP" component={BgMainLoop} durationInFrames={360} {...HD} />
				<Composition id="BG-ESCAPE-LOOP" component={BgEscapeLoop} durationInFrames={240} {...HD} />
				<Composition
					id="CIN-FINAL-ESCAPE"
					component={FinalEscape}
					durationInFrames={210}
					{...HD}
					defaultProps={{levels: {R: 3, B: 2, T: 3, F: 1} as Record<CrewKey, number>, award: '+60× BET'}}
				/>
			</Folder>
			<Folder name="Symbol-animations">
				{SYMBOLS.map((id) => (
					<React.Fragment key={id}>
						<Composition id={`${id}-ANIM-LAND`} component={SymbolAnim} durationInFrames={12} {...CELL} defaultProps={{id, mode: 'land' as const}} />
						<Composition id={`${id}-ANIM-WIN`} component={SymbolAnim} durationInFrames={30} {...CELL} defaultProps={{id, mode: 'win' as const}} />
					</React.Fragment>
				))}
				<Composition id="SYM-FX-CLONE-IN" component={SymbolTransform} durationInFrames={15} {...CELL} defaultProps={{kind: 'CLONE-IN' as const, from: 'SYM-L4', to: 'SYM-H1'}} />
				<Composition id="SYM-FX-UPGRADE-IN" component={SymbolTransform} durationInFrames={15} {...CELL} defaultProps={{kind: 'UPGRADE-IN' as const, from: 'SYM-L3', to: 'SYM-H2'}} />
				<Composition id="SYM-FX-VAULT-REVEAL" component={SymbolTransform} durationInFrames={18} {...CELL} defaultProps={{kind: 'VAULT-REVEAL' as const, from: 'SYM-L2', to: 'SYM-H3'}} />
				<Composition id="SYM-FX-WILD-STAMP" component={SymbolTransform} durationInFrames={15} {...CELL} defaultProps={{kind: 'WILD-STAMP' as const, from: 'SYM-L1', to: 'SYM-WILD'}} />
				<Composition id="SYM-FX-CREW-EXIT" component={SymbolTransform} durationInFrames={18} {...CELL} defaultProps={{kind: 'CREW-EXIT' as const, from: 'SYM-ROXY', to: 'SYM-WILD'}} />
			</Folder>
			<Folder name="Character-animations">
				{CREW_IDS.flatMap(({key, id}) =>
					CHARACTER_ACTIONS.map(({action, seconds}) => (
						<Composition
							key={`${id}-${action}`}
							id={`ANIM-${id}-${action}`}
							component={CharacterAnim}
							durationInFrames={Math.round(seconds * FPS)}
							{...CHAR}
							defaultProps={{crew: key, action}}
						/>
					)),
				)}
			</Folder>
		</>
	);
};
