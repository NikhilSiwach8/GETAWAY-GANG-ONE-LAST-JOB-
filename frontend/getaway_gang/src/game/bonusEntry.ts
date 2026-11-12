/**
 * Bonus entry clips (video/src/clips/Entry.tsx): ENTRY-<BONUS> plays once (4 s build-up), then
 * ENTRY-<BONUS>-LOOP runs until the player taps. Each comes in 16:9 and in 9:16 (-PORTRAIT) for phones held
 * upright. The SCR-<BONUS>-INTRO still is the fallback when clips cannot play.
 */
export type EntryBonus = 'heist' | 'escape' | 'hidden';

/** Which bonus is starting: the Mystery Vault's hidden bonus, else 12+ spins = The Perfect Escape, else The Heist. */
export const entryBonus = (totalFs: number, mystery?: string | null): EntryBonus =>
	mystery === 'hidden' ? 'hidden' : totalFs >= 12 ? 'escape' : 'heist';

export const isPortrait = (width = window.innerWidth, height = window.innerHeight) => height > width;

export const entryClips = (bonus: EntryBonus, portrait: boolean) => {
	const b = bonus.toUpperCase();
	const p = portrait ? '-PORTRAIT' : '';
	return {
		intro: `ENTRY-${b}${p}`,
		loop: `ENTRY-${b}-LOOP${p}`,
		/** clip pixel size (both orientations are full HD) */
		width: portrait ? 1080 : 1920,
		height: portrait ? 1920 : 1080,
		still: `SCR-${b}-INTRO` as 'SCR-HEIST-INTRO' | 'SCR-ESCAPE-INTRO' | 'SCR-HIDDEN-INTRO',
	};
};

/** Every entry clip for one orientation, for background download. */
export const allEntryClips = (portrait: boolean) =>
	(['heist', 'escape', 'hidden'] as const).flatMap((b) => {
		const c = entryClips(b, portrait);
		return [c.intro, c.loop];
	});
