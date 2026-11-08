<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	/**
	 * Bonus intro: the animated SCR-HEIST-INTRO / SCR-ESCAPE-INTRO clip plays once, then its seamless
	 * *-INTRO-LOOP runs until the player presses. The still art is drawn underneath until the video has a
	 * frame, and is the whole screen on browsers without clip support.
	 */
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';
	import { hasArt } from '../game/ggAssets';
	import config from '../game/config';
	import { Container, Text } from 'pixi-svelte';
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { OnPressFullScreen } from 'components-layout';
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
	const key = $derived(hidden && ownHidden ? 'SCR-HIDDEN-INTRO' : totalFs >= 12 ? 'SCR-ESCAPE-INTRO' : 'SCR-HEIST-INTRO');
	const f = config.features;
	let phase = $state<'intro' | 'loop'>('intro');
	const clipId = $derived(phase === 'intro' ? key : `${key}-LOOP`);
	const centre = $derived({ x: cover.x + cover.width / 2, y: cover.y + cover.height / 2 });
	// clips are 16:9 like the still: fit them to the same cover rectangle
	const clipSize = $derived({ width: cover.width, height: cover.height });

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			phase = 'intro';
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
	<Sprite {key} {...cover} />
	{#if show && hasClip(key)}
		{#key clipId}
			<ClipSprite
				id={clipId}
				channel={phase === 'intro' ? 'bonus-intro' : 'bonus-intro-loop'}
				loop={phase === 'loop'}
				anchor={0.5}
				x={centre.x}
				y={centre.y}
				{...clipSize}
				fadeMs={0}
				onended={(ok) => {
					if (ok && phase === 'intro' && hasClip(`${key}-LOOP`)) phase = 'loop';
				}}
			/>
		{/key}
	{/if}
	{#if hidden && !ownHidden}
		{@const px = cover.x + cover.width * 0.74}
		{@const py = cover.y + cover.height * 0.42}
		{@const pw = cover.width * 0.47}
		{@const ph = cover.height * 0.72}
		<Container x={px} y={py} zIndex={5}>
			<Rectangle anchor={0.5} width={pw + 16} height={ph + 16} borderRadius={30} backgroundColor={0x7a4a00} />
			<Rectangle anchor={0.5} width={pw + 9} height={ph + 9} borderRadius={27} backgroundColor={0xf7c947} />
			<Rectangle anchor={0.5} width={pw} height={ph} borderRadius={22} backgroundColor={0x0b1230} backgroundAlpha={0.96} />
			<Text anchor={0.5} y={-ph * 0.3} text="HIDDEN BONUS" style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: pw * 0.13, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 10 }, dropShadow: { color: 0xb5470f, alpha: 1, distance: 6, angle: Math.PI / 2, blur: 0 } }} />
			<Text anchor={0.5} y={-ph * 0.08} text={`${f.hiddenFs} FREE SPINS`} style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: pw * 0.095, fill: 0xffffff, stroke: { color: 0x1a0d00, width: 8 } }} />
			<Text anchor={0.5} y={ph * 0.1} text={`ALL CREW START AT LEVEL ${f.hiddenStartLevel}`} style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '900', fontSize: pw * 0.048, fill: 0x8fe3ff, stroke: { color: 0x0b1230, width: 4 } }} />
			<Text anchor={0.5} y={ph * 0.24} text={`GUARANTEED WIN: ${f.hiddenFloor}× BET`} style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: pw * 0.07, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 7 } }} />
			<Text anchor={0.5} y={ph * 0.39} text="TAP / PRESS ANYWHERE TO START" style={{ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '800', fontSize: pw * 0.036, fill: 0xffffff }} alpha={0.85} />
		</Container>
	{/if}
</FadeContainer>
{#if waiting}
	<OnHotkey hotkey="Space" onpress={() => oncomplete()} />
	<OnPressFullScreen onpress={() => oncomplete()} />
{/if}
