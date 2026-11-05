<!-- Override of components-ui-pixi ButtonBet.svelte: same logic (spacebar hotkey, spin/stop), delivered UI-SPIN art. -->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived } from 'state-shared';
	import ButtonBetProvider from 'components-ui-pixi/src/components/ButtonBetProvider.svelte';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const disabled = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE * 1.12, height: UI_BASE_SIZE * 1.12 };
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<OnHotkey hotkey="Space" {disabled} {onpress} />
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center, hovered, pressed })}
				<Container
					{...center}
					scale={pressed ? 0.94 : hovered ? 1.04 : 1}
					alpha={disabled || ['spin_disabled', 'stop_disabled'].includes(key) ? 0.5 : 1}
				>
					<Sprite
						key={['spin_default', 'spin_disabled'].includes(key) ? 'UI-SPIN-0' : 'UI-SPIN-1'}
						anchor={0.5}
						width={sizes.width}
						height={sizes.height}
					/>
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
