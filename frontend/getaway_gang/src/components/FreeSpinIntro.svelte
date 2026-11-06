<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	/** Bonus intro: SCR-HEIST-INTRO (10 free spins) or SCR-ESCAPE-INTRO (12). Press anywhere to continue. */
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

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
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
</FadeContainer>
{#if waiting}
	<OnHotkey hotkey="Space" onpress={() => oncomplete()} />
	<OnPressFullScreen onpress={() => oncomplete()} />
{/if}
