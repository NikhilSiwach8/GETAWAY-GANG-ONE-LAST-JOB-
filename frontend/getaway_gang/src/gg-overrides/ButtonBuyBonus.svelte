<!--
  Override of web-sdk components-ui-pixi ButtonBuyBonus.svelte (wired in vite.config.js). Same behaviour:
  opens the Buy Bonus modal while idle. Uses the delivered UI-BUY-BONUS art when present, otherwise a
  gold pill in the game's palette.
-->
<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal } from 'state-shared';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import { getContext } from 'components-ui-pixi/src/context';
	import { hasArt } from '../game/ggAssets';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const sizes = { width: UI_BASE_SIZE * 1.25, height: UI_BASE_SIZE * 0.85 };
	const disabled = $derived(!stateXstateDerived.isIdle());
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};
</script>

<Button {...props} {sizes} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center} scale={pressed ? 0.94 : hovered ? 1.05 : 1} alpha={disabled ? 0.45 : 1}>
			{#if hasArt('UI-BUY-BONUS')}
				<Sprite key="UI-BUY-BONUS" anchor={0.5} width={sizes.width} height={sizes.height} />
			{:else}
				<Rectangle anchor={0.5} width={sizes.width} height={sizes.height} borderRadius={sizes.height / 2} backgroundColor={0xf7a928} borderColor={0xffe27a} borderWidth={5} />
				<Text
					anchor={0.5}
					text={'BUY\nBONUS'}
					style={{ align: 'center', fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: '900', fontSize: UI_BASE_FONT_SIZE * 0.85, fill: 0x2a1600, lineHeight: UI_BASE_FONT_SIZE * 0.9 }}
				/>
			{/if}
		</Container>
	{/snippet}
</Button>
