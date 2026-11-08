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
		payTable: () => 'UI-PAYTABLE-0',
		increase: () => 'UI-BET-PLUS',
		decrease: () => 'UI-BET-MINUS',
		menuExit: () => 'UI-CLOSE',
	};
	const key = $derived(ART[icon]?.(active));
	// the paytable button has its own glow state for hover
	const hoverKey = (k: string | undefined) => (k === 'UI-PAYTABLE-0' ? 'UI-PAYTABLE-1' : k);
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		{#if key}
			<Container {...center} scale={pressed ? 0.94 : hovered ? 1.05 : 1} alpha={buttonProps.disabled ? 0.45 : 1}>
				<Sprite key={hovered ? hoverKey(key) : key} anchor={0.5} width={buttonProps.sizes.width} height={buttonProps.sizes.height} />
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
