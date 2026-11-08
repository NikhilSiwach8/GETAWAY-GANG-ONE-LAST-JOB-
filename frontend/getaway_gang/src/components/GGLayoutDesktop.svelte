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
	import GGConsole from './GGConsole.svelte';
	import { BET_ZONE } from '../game/betConsole';

	const props: LayoutUiProps = $props();
	const context = getContext();
	const std = $derived(context.stateLayoutDerived.mainLayoutStandard());
	// positions on the 1920-wide rail (x, standard px) and sizes; touch screens get bigger SPIN/BET targets
	const DESK = { menu: 80, buy: 252, buyS: 0.78, bal: 560, plateW: 290, side: 168, sideD: 118, spinD: 196, win: 1340, betW: 400, smallD: 104 };
	const TOUCH = { menu: 90, buy: 300, buyS: 0.72, bal: 600, plateW: 260, side: 160, sideD: 120, spinD: 212, win: 1320, betW: 440, smallD: 116 };
	const P = $derived(context.stateLayoutDerived.layoutType() === 'desktop' ? DESK : TOUCH);

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
	const betX = $derived(std.width - 25 - P.betW * 0.5);
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
	<!-- the rail -->
	<GGConsole x={cx} y={railY} width={railW} />

	<!-- left: settings menu + Buy Bonus -->
	<Container x={P.menu} y={railY - 6} scale={s(P.smallD)}>
		{@render props.buttonMenu({ anchor: 0.5 })}
	</Container>
	<Container x={P.buy} y={railY - 8} scale={P.buyS}>
		{@render props.buttonBuyBonus({ anchor: 0.5 })}
	</Container>

	<!-- balance -->
	<Container x={P.bal} y={railY}>
		{@render props.amountBalance({ stacked: true, width: P.plateW } as never)}
	</Container>

	<!-- spin cluster: the big SPIN sits raised on the rail's centre plate -->
	<Container x={cx - P.side} y={railY - 14} scale={s(P.sideD)}>
		{@render props.buttonAutoSpin({ anchor: 0.5 })}
	</Container>
	<Container x={cx} y={railY - 52} scale={s(P.spinD, UI_BASE_SIZE * 1.12)}>
		{@render props.buttonBet({ anchor: 0.5 })}
	</Container>
	<Container x={cx + P.side} y={railY - 14} scale={s(P.sideD)}>
		{@render props.buttonTurbo({ anchor: 0.5 })}
	</Container>

	<!-- win -->
	<Container x={P.win} y={railY}>
		{@render props.amountWin({ stacked: true, width: P.plateW } as never)}
	</Container>

	<!-- bet plate, -/+ on its own ends -->
	<Container x={betX} y={railY}>
		{@render props.amountBet({ stacked: true, width: P.betW } as never)}
		<Container x={P.betW * BET_ZONE.dx * -1} y={P.betW * BET_ZONE.dy} scale={s(P.betW * BET_ZONE.size)}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>
		<Container x={P.betW * BET_ZONE.dx} y={P.betW * BET_ZONE.dy} scale={s(P.betW * BET_ZONE.size)}>
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
		<Container x={cx + (P.menu - cx) * f} y={std.height + (railY - 6 - std.height) * f} scale={f}>
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
