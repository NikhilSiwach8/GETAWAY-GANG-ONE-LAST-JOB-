<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	/**
	 * Bonus entry card: the animated ENTRY-<BONUS> clip (crew land, title slams, free spins count up) plays
	 * once, then its seamless ENTRY-<BONUS>-LOOP runs until the player taps. Portrait screens get the 9:16
	 * versions. The game's own prompt (TAP / PRESS, PressToContinue) is drawn on top. The SCR-<BONUS>-INTRO
	 * still is only used where clips cannot play or a clip fails; the clips are prefetched after load and
	 * ensured on freeSpinTrigger (see game/bonusEntry.ts).
	 */
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';
	import { hasArt } from '../game/ggAssets';
	import config from '../game/config';
	import { Container, Text } from 'pixi-svelte';
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import PressToContinue from './PressToContinue.svelte';
	import { entryBonus, entryClips } from '../game/bonusEntry';
	import { waitForResolve } from 'utils-shared/wait';
	import { getContext } from '../game/context';

	const context = getContext();
	let show = $state(false);
	let waiting = $state(false);
	let totalFs = $state(0);
	let oncomplete = $state(() => {});
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: (sizes.width - 1920 * s) / 2, y: (sizes.height - 1080 * s) / 2 };
	});
	// The base-game trigger awards 10 FS for 3 Scatters (The Heist) and 12 for 4+ (The Perfect Escape).
	// Mystery Vault Hidden Bonus: its own SCR-HIDDEN-INTRO once delivered; until then the Escape intro with a
	// plate covering the Escape title/badges (they would state the wrong number of spins)
	const hidden = $derived(context.stateGame.hud.mystery === 'hidden');
	const ownHidden = hasArt('SCR-HIDDEN-INTRO');
	// orientation is fixed when the screen opens, so the clip never swaps half-way
	let portrait = $state(false);
	const entry = $derived(entryClips(entryBonus(totalFs, hidden ? 'hidden' : null), portrait));
	const key = $derived(hidden && !ownHidden ? 'SCR-ESCAPE-INTRO' : entry.still);
	const f = config.features;
	let phase = $state<'intro' | 'loop'>('intro');
	// the still is only a fallback: shown when clips are unsupported or the clip could not play
	let clipFailed = $state(false);
	let clipShown = $state(false);
	let loopShown = $state(false);
	const useClip = $derived(hasClip(entry.intro) && !clipFailed);
	const centre = $derived({ x: sizes.width / 2, y: sizes.height / 2 });
	// cover-fit the clip in its own aspect (16:9 or 9:16)
	const clipSize = $derived.by(() => {
		const s = Math.max(sizes.width / entry.width, sizes.height / entry.height);
		return { width: entry.width * s, height: entry.height * s };
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			portrait = sizes.height > sizes.width;
			phase = 'intro';
			clipFailed = false;
			clipShown = false;
			loopShown = false;
			show = true;
		},
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (e) => {
			totalFs = e.totalFreeSpins;
			waiting = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			waiting = false;
		},
	});
</script>

<FadeContainer {show} zIndex={30}>
	<Rectangle {...sizes} backgroundColor={0x000000} />
	<!-- the intro clip is a story that opens on its own scene: the still is only the no-clip fallback -->
	{#if !useClip}
		<Sprite {key} {...cover} />
	{/if}
	{#if show && useClip}
		<!-- the intro holds its last frame underneath until the loop has its first one (no black gap) -->
		{#if phase === 'intro' || !loopShown}
			<ClipSprite
				id={entry.intro}
				channel="bonus-intro"
				anchor={0.5}
				x={centre.x}
				y={centre.y}
				{...clipSize}
				fadeMs={0}
				zIndex={1}
				onready={() => (clipShown = true)}
				onended={(ok) => {
					if (!ok) {
						console.warn(`[clips] bonus entry ${entry.intro}: fell back to the still card`);
						clipFailed = true;
					}
					else if (hasClip(entry.loop)) phase = 'loop';
				}}
			/>
		{/if}
		{#if phase === 'loop'}
			<ClipSprite
				id={entry.loop}
				channel="bonus-intro-loop"
				loop
				anchor={0.5}
				x={centre.x}
				y={centre.y}
				{...clipSize}
				fadeMs={0}
				zIndex={2}
				onready={() => (loopShown = true)}
			/>
		{/if}
	{/if}
	{#if hidden && !ownHidden && !useClip}
		{@const px = cover.x + cover.width * 0.74}
		{@const py = cover.y + cover.height * 0.42}
		{@const pw = cover.width * 0.47}
		{@const ph = cover.height * 0.72}
		<Container x={px} y={py} zIndex={5}>
			<Rectangle anchor={0.5} width={pw + 16} height={ph + 16} borderRadius={30} backgroundColor={0x7a4a00} />
			<Rectangle anchor={0.5} width={pw + 9} height={ph + 9} borderRadius={27} backgroundColor={0xf7c947} />
			<Rectangle anchor={0.5} width={pw} height={ph} borderRadius={22} backgroundColor={0x0b1230} backgroundAlpha={0.96} />
			<Text anchor={0.5} y={-ph * 0.3} text="HIDDEN BONUS" style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: pw * 0.13, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 10 }, dropShadow: { color: 0xb5470f, alpha: 1, distance: 6, angle: Math.PI / 2, blur: 0 } }} />
			<Text anchor={0.5} y={-ph * 0.08} text={`${f.hiddenFs} FREE SPINS`} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: pw * 0.095, fill: 0xffffff, stroke: { color: 0x1a0d00, width: 8 } }} />
			<Text anchor={0.5} y={ph * 0.1} text={`ALL CREW START AT LEVEL ${f.hiddenStartLevel}`} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: pw * 0.048, fill: 0x8fe3ff, stroke: { color: 0x0b1230, width: 4 } }} />
			<Text anchor={0.5} y={ph * 0.24} text={`GUARANTEED WIN: ${f.hiddenFloor}× BET`} style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: pw * 0.07, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 7 } }} />
			<Text anchor={0.5} y={ph * 0.39} text="TAP / PRESS ANYWHERE TO START" style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: pw * 0.036, fill: 0xffffff }} alpha={0.85} />
		</Container>
	{/if}
	{#if waiting}
		<!-- TAP on touch / PRESS with a mouse; the still has its prompt painted in, so only the input there -->
		<Container zIndex={10}>
			<!-- tapping works at once; the prompt graphic appears when the card has built up (loop phase) -->
			<PressToContinue onpress={() => oncomplete()} hideArt={!useClip || phase !== 'loop'} />
		</Container>
	{/if}
</FadeContainer>
