<!--
  Override of components-ui-pixi ButtonBet.svelte: same logic (spacebar hotkey, spin/stop), delivered UI-SPIN art.
  Motion: the button whirls a full turn (like a vault dial) when a spin starts, and a soft gold glow breathes
  behind it while it is ready to spin. Display only.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived } from 'state-shared';
	import ButtonBetProvider from 'components-ui-pixi/src/components/ButtonBetProvider.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE * 1.12, height: UI_BASE_SIZE * 1.12 };

	// clock for the idle glow and the whirl (one rAF loop, cheap: two numbers)
	let now = $state(performance.now());
	let raf = 0;
	const loop = (t: number) => {
		now = t;
		raf = requestAnimationFrame(loop);
	};
	raf = requestAnimationFrame(loop);
	onDestroy(() => cancelAnimationFrame(raf));

	let whirlAt = -1e9;
	let lastKey = '';
	const WHIRL_MS = 520;
	const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
	const track = (key: string) => {
		// a spin starts when the button flips from SPIN to STOP
		if (lastKey.startsWith('spin') && key.startsWith('stop')) whirlAt = performance.now();
		lastKey = key;
		return key;
	};
	const whirl = $derived(Math.min(1, (now - whirlAt) / WHIRL_MS));
	const rotation = $derived(whirl < 1 ? easeOut(whirl) * Math.PI * 2 : 0);
	const breathe = $derived(0.22 + 0.16 * Math.sin(now / 520));
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		{@const k = track(key)}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center, hovered, pressed })}
				<Container
					{...center}
					scale={pressed ? 0.94 : hovered ? 1.04 : 1}
					alpha={disabled || ['spin_disabled', 'stop_disabled'].includes(k) ? 0.5 : 1}
				>
					{#if k === 'spin_default' && !disabled}
						<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={sizes.width * 1.55} height={sizes.height * 1.55} tint={0xffc93c} alpha={breathe} blendMode="add" />
					{/if}
					<Sprite
						key={['spin_default', 'spin_disabled'].includes(k) ? 'UI-SPIN-0' : 'UI-SPIN-1'}
						anchor={0.5}
						width={sizes.width}
						height={sizes.height}
						{rotation}
					/>
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
