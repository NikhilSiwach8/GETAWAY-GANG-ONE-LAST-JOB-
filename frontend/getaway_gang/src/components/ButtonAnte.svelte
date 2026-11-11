<!--
  ANTE SPIN toggle on the bet console: a steel plate cut from the reel frame (UI-CONSOLE-PLATE) with a
  switch lamp. ON = every spin costs anteCost x the bet with anteBonusFactor x the bonus chance (math:
  ante bet mode). Only changeable while idle; centred on (0, 0), `width` wide.
-->
<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { getContext } from 'components-ui-pixi/src/context';
	import config from '../game/config';
	import { ante, setAnte } from '../game/ante.svelte';

	type Props = { width?: number };
	const props: Props = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const W = $derived(props.width ?? 200);
	const H = $derived(W * (134 / 272));
	const disabled = $derived(!stateXstateDerived.isIdle());
	const knob = new Tween(ante.on ? 1 : 0, { duration: 220, easing: cubicOut });
	$effect(() => {
		knob.set(ante.on ? 1 : 0);
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
			<Sprite key="UI-CONSOLE-PLATE" anchor={0.5} width={W} height={H} />
			<!-- glow while on -->
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={W * 1.15} height={H * 1.3} tint={0xffc93c} alpha={0.55 * knob.current} blendMode="add" />
			<Text anchor={0.5} x={-W * 0.13} y={-H * 0.13} text="ANTE" style={{ ...font, fontSize: H * 0.3, fill: ante.on ? 0xffe27a : 0xffffff, stroke: { color: 0x2a1200, width: 5 } }} />
			<Text anchor={0.5} x={-W * 0.13} y={H * 0.19} text={`${f.anteBonusFactor}× BONUS · ${f.anteCost}× BET`} style={{ ...font, fontSize: H * 0.13, fill: 0xdbe7ff, stroke: { color: 0x0a1633, width: 3 } }} />
			<!-- lamp: a steel rivet that lights up gold when the ante is on -->
			<Container x={W * 0.3}>
				<Sprite key="UI-CONSOLE-RIVET" anchor={0.5} y={-H * 0.1} width={H * 0.34} height={H * 0.34} />
				<Sprite key="UI-SOFT-GLOW" anchor={0.5} y={-H * 0.1} width={H * 0.7} height={H * 0.7} tint={0xffd23a} alpha={0.95 * knob.current} blendMode="add" />
				<Text anchor={0.5} y={H * 0.24} text={ante.on ? 'ON' : 'OFF'} style={{ ...font, fontSize: H * 0.15, fill: ante.on ? 0xffe27a : 0x9aa6c8 }} />
			</Container>
		</Container>
	{/snippet}
</Button>
