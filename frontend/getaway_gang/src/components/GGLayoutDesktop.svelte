<!--
  GETAWAY GANG bet console for desktop, landscape phones and tablets (1920×1080 standard space).
  One steel rail across the bottom (UI-CONSOLE, cut from the reel frame's own bottom edge) carries every
  control: settings + Buy Bonus | BALANCE | autoplay · SPIN · turbo | WIN | BET plate with its −/+ ends.
  Same snippets and behaviour as the web-sdk LayoutDesktop; only the arrangement and the art differ.
-->
<script lang="ts">
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';

	import { getContext } from 'components-ui-pixi/src/context';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import type { LayoutUiProps } from 'components-ui-pixi/src/types';
	import ButtonAnte from './ButtonAnte.svelte';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const std = $derived(context.stateLayoutDerived.mainLayoutStandard());
	// corner clusters beside the reels (layout after Meta Gaming's Swamp King): no rail across the screen.
	// x positions on the 1920 design width; y measured up from the bottom edge (standard px)
	const L = {
		menuX: 62, menuY: 300, menuD: 84,
		leftX: 250, buyY: 300, buyS: 0.92, anteY: 196, anteW: 236,
		valueY: 82, valueW: 300,
		spinY: 230, spinD: 210, sideDX: 165, sideDY: 58, sideD: 96,
		arrowD: 64, betArrowDX: 128,
	};
	const P = { menu: L.menuX, smallD: L.menuD };
	const RAIL_H = 134;
	// the rail runs edge to edge of the screen, wider than the 1920 design width on wide screens
	const screenW = $derived(context.stateLayoutDerived.canvasSizes().width / std.scale);
	// phones in landscape are wider than 16:9: use that width to enlarge the console (bigger touch targets)
	const f = $derived(context.stateLayoutDerived.layoutType() === 'desktop' ? 1 : Math.max(1, Math.min(1.3, screenW / 1920)));
	const railW = $derived(Math.max(1920, screenW + 40) / f);
	const railY = $derived(std.height - RAIL_H * 0.5 - 4); // rail centre line
	const cx = $derived(std.width * 0.5);
	// SDK buttons are UI_BASE_SIZE wide (SPIN 1.12×): scale a button to a diameter
	const s = (d: number, base = UI_BASE_SIZE) => d / base;
	const rightX = $derived(std.width - 270);
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<!-- whole console scaled by f around the bottom centre -->
	<Container x={cx} y={std.height} scale={f}>
	<Container x={-cx} y={-std.height}>
	<!-- LEFT corner: settings · Buy Bonus · ANTE · BALANCE -->
	<Container x={L.menuX} y={std.height - L.menuY} scale={s(L.menuD)}>
		{@render props.buttonMenu({ anchor: 0.5 })}
	</Container>
	<Container x={L.leftX} y={std.height - L.buyY} scale={L.buyS}>
		{@render props.buttonBuyBonus({ anchor: 0.5 })}
	</Container>
	<Container x={L.leftX} y={std.height - L.anteY}>
		<ButtonAnte width={L.anteW} />
	</Container>
	<Container x={L.leftX} y={std.height - L.valueY}>
		{@render props.amountBalance({ stacked: true, width: L.valueW, plain: true } as never)}
	</Container>

	<!-- centre: WIN under the reels -->
	<Container x={cx} y={std.height - L.valueY}>
		{@render props.amountWin({ stacked: true, width: L.valueW, plain: true } as never)}
	</Container>

	<!-- RIGHT corner: SPIN with autoplay / turbo stacked beside it · BET with − / + -->
	<Container x={rightX} y={std.height - L.spinY} scale={s(L.spinD, UI_BASE_SIZE * 1.12)}>
		{@render props.buttonBet({ anchor: 0.5 })}
	</Container>
	<Container x={rightX + L.sideDX} y={std.height - L.spinY - L.sideDY} scale={s(L.sideD)}>
		{@render props.buttonAutoSpin({ anchor: 0.5 })}
	</Container>
	<Container x={rightX + L.sideDX} y={std.height - L.spinY + L.sideDY} scale={s(L.sideD)}>
		{@render props.buttonTurbo({ anchor: 0.5 })}
	</Container>
	<Container x={rightX} y={std.height - L.valueY}>
		{@render props.amountBet({ stacked: true, width: L.valueW, plain: true } as never)}
		<Container x={-L.betArrowDX} y={L.valueW * 0.06} scale={s(L.arrowD)}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>
		<Container x={L.betArrowDX} y={L.valueW * 0.06} scale={s(L.arrowD)}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	</Container>
	</Container>
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	<Rectangle
		eventMode="static"
		cursor="pointer"
		alpha={0.5}
		anchor={0.5}
		backgroundColor={BLACK}
		width={context.stateLayoutDerived.canvasSizes().width}
		height={context.stateLayoutDerived.canvasSizes().height}
		x={context.stateLayoutDerived.canvasSizes().width * 0.5}
		y={context.stateLayoutDerived.canvasSizes().height * 0.5}
		onpointerup={() => (stateUi.menuOpen = false)}
	/>
	<!-- menu column rises from the settings button -->
	<MainContainer standard alignVertical="bottom">
		<Container x={cx + (P.menu - cx) * f} y={std.height - L.menuY * f} scale={f}>
			{#each [props.buttonPayTable, props.buttonGameRules, props.buttonSettings, props.buttonSoundSwitch] as button, i}
				<Container y={-(4 - i) * (P.smallD + 18)} scale={s(P.smallD)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}
			<Container scale={s(P.smallD)}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
