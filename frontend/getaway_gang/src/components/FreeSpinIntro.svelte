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
	const key = $derived(totalFs >= 12 ? 'SCR-ESCAPE-INTRO' : 'SCR-HEIST-INTRO');
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
</FadeContainer>
{#if waiting}
	<OnHotkey hotkey="Space" onpress={() => oncomplete()} />
	<OnPressFullScreen onpress={() => oncomplete()} />
{/if}
