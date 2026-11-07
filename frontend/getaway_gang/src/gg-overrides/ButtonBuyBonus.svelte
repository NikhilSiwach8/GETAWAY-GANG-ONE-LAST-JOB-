<!--
  Override of web-sdk components-ui-pixi ButtonBuyBonus.svelte (wired in vite.config.js). Same behaviour:
  opens the Buy Bonus modal while idle. Art: UI-BUY-BONUS idle / hover / pressed / disabled states.
-->
<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal } from 'state-shared';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import { getContext } from 'components-ui-pixi/src/context';
	import { GG_LAYOUT } from '../game/ggAssets';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const { stateLayoutDerived } = getContext();
	const art = GG_LAYOUT['UI-BUY-BONUS-0'];
	// portrait puts this button near the right edge in a square slot: keep it narrower there
	const widthK = $derived(stateLayoutDerived.layoutType() === 'portrait' ? 1.25 : 1.7);
	const sizes = $derived({ width: UI_BASE_SIZE * widthK, height: (UI_BASE_SIZE * widthK * art.height) / art.width });
	const disabled = $derived(!stateXstateDerived.isIdle());
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};
</script>

<Button {...props} {sizes} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Sprite
			key={disabled ? 'UI-BUY-BONUS-3' : pressed ? 'UI-BUY-BONUS-2' : hovered ? 'UI-BUY-BONUS-1' : 'UI-BUY-BONUS-0'}
			anchor={0.5}
			{...center}
			width={sizes.width * (pressed ? 0.96 : 1)}
			height={sizes.height * (pressed ? 0.96 : 1)}
		/>
	{/snippet}
</Button>
