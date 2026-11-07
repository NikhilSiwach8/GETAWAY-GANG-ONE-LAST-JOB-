<!--
  Override of web-sdk components-ui-pixi UiButton.svelte (wired in vite.config.js).
  Same props and behaviour; renders the game's delivered button art instead of plain rectangles.
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import type { Snippet } from 'svelte';
	import type { ButtonIcon } from 'components-ui-pixi/src/types';
	import { i18nDerived } from 'components-ui-pixi/src/i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from 'components-ui-pixi/src/constants';
	import { hasArt } from '../game/ggAssets';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
	};

	const { icon, active, variant = 'dark', children: childrenFromParent, ...buttonProps }: Props = $props();

	const ART: Partial<Record<ButtonIcon, (active?: boolean) => string>> = {
		turbo: (a) => (a ? 'UI-TURBO-1' : 'UI-TURBO-0'),
		autoSpin: () => 'UI-AUTOPLAY-0',
		soundOn: () => 'UI-SOUND-0',
		soundOff: () => 'UI-SOUND-1',
		menu: () => 'UI-SETTINGS-0',
		settings: () => 'UI-SETTINGS-0',
		info: () => 'UI-INFO-0',
		payTable: () => (hasArt('UI-PAYTABLE-BTN') ? 'UI-PAYTABLE-BTN' : 'UI-INFO-0'),
		increase: () => 'UI-BET-PLUS',
		decrease: () => 'UI-BET-MINUS',
	};
	const key = $derived(ART[icon]?.(active));
	// paytable and rules share the 'i' art until UI-PAYTABLE-BTN is delivered: label them
	const caption = $derived(icon === 'payTable' && !hasArt('UI-PAYTABLE-BTN') ? 'PAYS' : icon === 'info' ? 'RULES' : '');
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		{#if key}
			<Container {...center} scale={pressed ? 0.94 : hovered ? 1.05 : 1} alpha={buttonProps.disabled ? 0.45 : 1}>
				<Sprite {key} anchor={0.5} width={buttonProps.sizes.width} height={buttonProps.sizes.height} />
				{#if caption}
					<Text
						anchor={0.5}
						y={buttonProps.sizes.height * 0.5}
						text={caption}
						style={{ fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: '900', fontSize: UI_BASE_FONT_SIZE * 0.6, fill: 0xf7c947, stroke: { color: 0x1c1f26, width: 5 } }}
					/>
				{/if}
			</Container>
		{:else}
			<Text
				{...center}
				anchor={0.5}
				text={i18nDerived[icon]()}
				style={{ fontFamily: 'proxima-nova', fontWeight: '700', fontSize: UI_BASE_FONT_SIZE * 0.9, fill: variant === 'dark' ? 0xffffff : 0x000000 }}
			/>
		{/if}
		{@render childrenFromParent?.()}
	{/snippet}
</Button>
