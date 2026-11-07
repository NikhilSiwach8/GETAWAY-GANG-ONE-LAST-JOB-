<script lang="ts">
	/** UI-PRESS-CONTINUE: "TAP ANYWHERE" on touch devices, "PRESS ANYWHERE" with a mouse; gently pulses. */
	import { onDestroy } from 'svelte';
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
	const key = touch ? 'UI-PRESS-CONTINUE-TAP' : 'UI-PRESS-CONTINUE-PRESS';
	const art = GG_LAYOUT[key];
	const width = 760;
	const height = (width * art.height) / art.width;

	let t = $state(0);
	let raf = 0;
	const tick = (now: number) => {
		t = now / 1000;
		raf = requestAnimationFrame(tick);
	};
	raf = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(raf));
	const pulse = $derived(1 + Math.sin(t * 3.2) * 0.03);
</script>

<MainContainer alignVertical="bottom">
	<Sprite
		{key}
		width={width * pulse}
		height={height * pulse}
		anchor={{ x: 0.5, y: 1 }}
		alpha={0.85 + Math.sin(t * 3.2) * 0.15}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - 20}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
