<!--
  ANTE SPIN toggle: a pill on the console in the same gold-rimmed navy as the other controls, `width` wide and
  centred on (0, 0). A lamp and a big ON / OFF show the state at a glance; the second line says what it does
  ("2x BONUS"). While on, the pill glows gold. ON = every spin costs anteCost x the bet with anteBonusFactor x
  the bonus chance. Changeable only while idle.
-->
<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { getContext } from 'components-ui-pixi/src/context';
	import config from '../game/config';
	import { ante, setAnte } from '../game/ante.svelte';

	type Props = { width?: number };
	const props: Props = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const W = $derived(props.width ?? 180);
	const H = $derived(W * 0.52);
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
	const R = $derived(H / 2);
	// lamp on the left, text centred in the space to its right
	const lampD = $derived(H * 0.56);
	const lampX = $derived(-W / 2 + H * 0.48);
	const textX = $derived((lampX + lampD / 2 + W / 2 - H * 0.12) / 2);
</script>

<Button anchor={0.5} sizes={{ width: W, height: H }} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center} scale={pressed ? 0.95 : hovered ? 1.04 : 1} alpha={disabled ? 0.55 : 1}>
			<!-- gold glow while on -->
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={W * 1.35} height={H * 1.9} tint={0xffc93c} alpha={0.55 * on.current} blendMode="add" />
			<!-- rim: dark outline, gold bevel, navy face (lighter when on) -->
			<Rectangle anchor={0.5} width={W} height={H} borderRadius={R} backgroundColor={0x2a1200} />
			<Rectangle anchor={0.5} width={W - 6} height={H - 6} borderRadius={R - 3} backgroundColor={0xf7c947} />
			<Rectangle anchor={0.5} y={-H * 0.04} width={W - 6} height={(H - 6) * 0.5} borderRadius={R - 3} backgroundColor={0xfff1b0} backgroundAlpha={0.35} />
			<Rectangle anchor={0.5} width={W - 16} height={H - 16} borderRadius={R - 8} backgroundColor={ante.on ? 0x1c3a8a : 0x0a1633} />
			<!-- lamp: a disc with the state written in it (gold ON / grey OFF) -->
			<Rectangle anchor={0.5} x={lampX} width={lampD + 6} height={lampD + 6} borderRadius={(lampD + 6) / 2} backgroundColor={0x2a1200} />
			<Rectangle anchor={0.5} x={lampX} width={lampD} height={lampD} borderRadius={lampD / 2} backgroundColor={ante.on ? 0xffc93c : 0x36405e} />
			<Rectangle anchor={0.5} x={lampX} y={-lampD * 0.18} width={lampD * 0.7} height={lampD * 0.36} borderRadius={lampD * 0.18} backgroundColor={0xffffff} backgroundAlpha={ante.on ? 0.45 : 0.12} />
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={lampX} width={lampD * 2.2} height={lampD * 2.2} tint={0xffd23a} alpha={0.7 * on.current} blendMode="add" />
			<Text anchor={0.5} x={lampX} y={1} text={ante.on ? 'ON' : 'OFF'} style={{ ...font, fontSize: lampD * 0.36, fill: ante.on ? 0x3a1a00 : 0xc9d2ea }} />
			<!-- ANTE and what it does -->
			<Text anchor={0.5} x={textX} y={-H * 0.12} text="ANTE" style={{ ...font, fontSize: H * 0.33, fill: ante.on ? 0xffe27a : 0xffffff, stroke: { color: 0x0a1633, width: 4 }, letterSpacing: 2 }} />
			<Text anchor={0.5} x={textX} y={H * 0.22} text={`${f.anteBonusFactor}× BONUS`} style={{ ...font, fontSize: H * 0.17, fill: ante.on ? 0xffffff : 0x9aa6c8, stroke: { color: 0x0a1633, width: 3 } }} />
		</Container>
	{/snippet}
</Button>
