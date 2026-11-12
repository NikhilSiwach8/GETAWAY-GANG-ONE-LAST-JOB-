/**
 * Total Win clips (video/src/clips/Total.tsx): TOTAL-<BONUS> builds the card (3.5 s), then TOTAL-<BONUS>-LOOP
 * runs until the player taps; -PORTRAIT versions for phones held upright. The game writes the amount into the
 * plaque and the Heist loot milestones / Escape crew levels into the info panel, at the places below.
 * KEEP IN SYNC with video/src/clips/totalLayout.ts.
 */
import type { EntryBonus } from './bonusEntry';

export const TOTAL_FPS = 30;
/** the plaque has landed: the amount appears and starts counting */
export const TOTAL_HANDOVER_MS = (52 / TOTAL_FPS) * 1000;

type Box = { x: number; y: number; w: number; h: number };
export type TotalLayout = { width: number; height: number; title: { x: number; y: number; size: number }; plaque: Box; ribbon: { x: number; y: number }; info: Box };

export const TOTAL_LAYOUT: { landscape: TotalLayout; portrait: TotalLayout } = {
	landscape: { width: 1920, height: 1080, title: { x: 960, y: 165, size: 165 }, plaque: { x: 960, y: 375, w: 980, h: 200 }, ribbon: { x: 960, y: 535 }, info: { x: 960, y: 715, w: 1100, h: 220 } },
	portrait: { width: 1080, height: 1920, title: { x: 540, y: 300, size: 150 }, plaque: { x: 540, y: 520, w: 960, h: 200 }, ribbon: { x: 540, y: 690 }, info: { x: 540, y: 910, w: 1000, h: 250 } },
};

export const totalClips = (bonus: EntryBonus, portrait: boolean) => {
	const b = bonus.toUpperCase();
	const p = portrait ? '-PORTRAIT' : '';
	return { intro: `TOTAL-${b}${p}`, loop: `TOTAL-${b}-LOOP${p}`, layout: portrait ? TOTAL_LAYOUT.portrait : TOTAL_LAYOUT.landscape };
};

export const allTotalClips = (portrait: boolean) =>
	(['heist', 'escape', 'hidden'] as const).flatMap((b) => {
		const c = totalClips(b, portrait);
		return [c.intro, c.loop];
	});
