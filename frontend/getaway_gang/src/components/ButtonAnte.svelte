<!--
  ANTE SPIN toggle in the console's own capsule style (UI-ANTE-PANEL: the WIN capsule with a blank tab):
  "ANTE" on the tab, the state in the navy window (lamp + ON/OFF + what it does), a gold glow while on.
  ON = every spin costs anteCost x the bet with anteBonusFactor x the bonus chance. Changeable only while
  idle. Centred on (0, 0), `width` wide.
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { getContext } from 'components-ui-pixi/src/context';
	import config from '../game/config';
	import { ante, setAnte } from '../game/ante.svelte';
	import { GG_LAYOUT } from '../game/ggAssets';

	type Props = { width?: number };
	const props: Props = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const art = GG_LAYOUT['UI-ANTE-PANEL'];
	const W = $derived(props.width ?? 240);
	const H = $derived((W * art.height) / art.width);
	// measured on the art (fractions of its height): tab centre and navy window centre
	const TAB_Y = 62 / 341 - 0.5;
	const WIN_Y = 192 / 341 - 0.5;
	const disabled = $derived(!stateXstateDerived.isIdle());
	const on = new Tween(ante.on ? 1 : 0, { duration: 220, easing: cubicOut });
	$effect(() => {
		on.set(ante.on ? 1 : 0);
	});
	const f = config.features;
	const onpress = () => {
		if (disabled) return;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
		setAnte(!ante.on);
	};
	const font = { fontFamily: 'Luckiest Guy, sans-serif' };
</script>

<Button anchor={0.5} sizes={{ width: W, height: H }} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center} scale={pressed ? 0.96 : hovered ? 1.03 : 1} alpha={disabled ? 0.6 : 1}>
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={W * 1.25} height={H * 1.6} tint={0xffc93c} alpha={0.6 * on.current} blendMode="add" />
			<Sprite key="UI-ANTE-PANEL" anchor={0.5} width={W} height={H} />
			<Text anchor={0.5} y={H * TAB_Y} text="ANTE" style={{ ...font, fontSize: H * 0.22, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 4 }, letterSpacing: 2 }} />
			<Container y={H * WIN_Y}>
				<!-- lamp -->
				<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={-W * 0.33} width={H * 0.42} height={H * 0.42} tint={ante.on ? 0xffd23a : 0x5a6688} alpha={0.55 + 0.45 * on.current} />
				<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={-W * 0.33} width={H * 0.18} height={H * 0.18} tint={0xffffff} alpha={0.9 * on.current} blendMode="add" />
				<Text anchor={{ x: 0, y: 0.5 }} x={-W * 0.28} y={-H * 0.005} text={ante.on ? 'ON' : 'OFF'} style={{ ...font, fontSize: H * 0.27, fill: ante.on ? 0xffe27a : 0x9aa6c8, stroke: { color: 0x0a1633, width: 3 } }} />
				<Text anchor={{ x: 1, y: 0.5 }} x={W * 0.38} y={H * 0.005} text={`${f.anteBonusFactor}× BONUS · ${f.anteCost}× BET`} style={{ ...font, fontSize: H * 0.16, fill: 0xdbe7ff, stroke: { color: 0x0a1633, width: 3 } }} />
			</Container>
		</Container>
	{/snippet}
</Button>
