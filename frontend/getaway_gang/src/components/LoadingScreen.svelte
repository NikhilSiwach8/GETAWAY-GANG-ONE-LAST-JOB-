<script lang="ts">
	/** SCR-LOADING (preloaded) with live progress drawn in the art's road-shaped bar. */
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { OnPressFullScreen } from 'components-layout';

	import { getContext } from '../game/context';
	import TransitionAnimation from './TransitionAnimation.svelte';

	type Props = { onloaded: () => void };
	const props: Props = $props();
	const context = getContext();
	let loadingType = $state<'start' | 'transition'>('start');

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: (sizes.width - 1920 * s) / 2, y: (sizes.height - 1080 * s) / 2 };
	});
	// bar track inside the art (fractions of the image)
	const BAR = { x0: 0.272, x1: 0.735, y0: 0.857, y1: 0.891 };
	const bar = $derived({
		x: cover.x + cover.width * BAR.x0,
		y: cover.y + cover.height * BAR.y0,
		width: cover.width * (BAR.x1 - BAR.x0),
		height: cover.height * (BAR.y1 - BAR.y0),
	});
	const progress = $derived(context.stateApp.loaded ? 1 : context.stateApp.loadingProgress / 100);
	const proceed = () => {
		if (context.stateApp.loaded && loadingType === 'start') loadingType = 'transition';
	};
</script>

<FadeContainer show={loadingType === 'start'}>
	<Rectangle {...sizes} backgroundColor={0x05070f} />
	<Sprite key="SCR-LOADING" {...cover} />
	<Rectangle {...bar} borderRadius={bar.height / 2} backgroundColor={0x11182c} />
	<Rectangle {...bar} width={Math.max(bar.height, bar.width * progress)} borderRadius={bar.height / 2} backgroundColor={0xf7c947} />
</FadeContainer>

{#if loadingType === 'start' && context.stateApp.loaded}
	<OnHotkey hotkey="Space" onpress={proceed} />
	<OnPressFullScreen onpress={proceed} />
{/if}

<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation oncomplete={props.onloaded} />
</FadeContainer>
