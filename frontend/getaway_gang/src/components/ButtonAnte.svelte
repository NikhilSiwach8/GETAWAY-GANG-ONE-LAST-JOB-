<!--
  ANTE SPIN toggle on the painted navy plate (UI-PLATE-NAVY, cut from the delivered UI art), `width` wide and
  centred on (0, 0). The gold star lamp and the lettering show the state at a glance: lit star and gold ANTE when
  on (with a warm glow around the plate), grey star and silver lettering when off; the second line says what it
  does ("2x BONUS"). ON = every spin costs anteCost x the bet with anteBonusFactor x the bonus chance.
  Changeable only while idle.
-->
<script lang="ts">
	import { Container, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { Rectangle as HitRect } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { getContext } from 'components-ui-pixi/src/context';
	import config from '../game/config';
	import { ante, setAnte } from '../game/ante.svelte';
	import Title from './Title.svelte';

	type Props = { width?: number };
	const props: Props = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const W = $derived(props.width ?? 180);
	const H = $derived(W * 0.42); // the plate is 3.2:1; slightly taller than native leaves room for two lines
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
	// star lamp at the plate's left end, lettering centred in the space to its right
	const lampD = $derived(H * 0.66);
	const lampX = $derived(-W / 2 + W * 0.2);
	const textX = $derived(W * 0.1);
</script>

<!-- explicit hit area = the plate: without it the (invisible) glow sprite widens the tap target over Buy Bonus -->
<Button anchor={0.5} sizes={{ width: W, height: H }} hitArea={new HitRect(0, 0, W, H)} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		<Container {...center} scale={pressed ? 0.95 : hovered ? 1.04 : 1} alpha={disabled ? 0.55 : 1}>
			<!-- warm glow around the plate while on -->
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} width={W * 1.4} height={H * 2.1} tint={0xffc93c} alpha={0.6 * on.current} blendMode="add" />
			<Sprite key="UI-PLATE-NAVY" anchor={0.5} width={W} height={H} />
			<!-- the lamp: the game's gold star, lit when on -->
			<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={lampX} width={lampD * 2.2} height={lampD * 2.2} tint={0xffd23a} alpha={0.75 * on.current} blendMode="add" />
			<Sprite key="UI-STAR-ON" anchor={0.5} x={lampX} width={lampD * (0.9 + 0.1 * on.current)} height={lampD * (0.9 + 0.1 * on.current)} tint={ante.on ? 0xffffff : 0x59607a} />
			<Title x={textX} y={-H * 0.13} text="ANTE" size={H * 0.42} silver={!ante.on} letterSpacing={2} />
			<Title x={textX} y={H * 0.22} text={`${f.anteBonusFactor}× BONUS`} size={H * 0.22} silver />
		</Container>
	{/snippet}
</Button>
