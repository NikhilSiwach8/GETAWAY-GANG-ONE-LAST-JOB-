<!--
  GETAWAY GANG bet console for portrait phones (1080×1920 standard space). Same snippets, drawer and
  fold behaviour as the web-sdk LayoutPortrait; controls in corner clusters (no rail):
  left: settings, Buy Bonus, ANTE · right: SPIN with autoplay / turbo · bottom row: BALANCE | WIN | BET −/+
  (the buttons fold away in the bonus; the free-spin counter shows in the middle).
-->
<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import LabelFreeSpinCounter from 'components-ui-pixi/src/components/LabelFreeSpinCounter.svelte';
	import ButtonDrawer from 'components-ui-pixi/src/components/ButtonDrawer.svelte';
	import type { LayoutUiProps } from 'components-ui-pixi/src/types';
	import { getContext } from 'components-ui-pixi/src/context';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import ButtonAnte from './ButtonAnte.svelte';

	const props: LayoutUiProps = $props();
	const context = getContext();

	const DRAWER_Y = {
		unfold: 0,
		fold: 550,
	};
	const drawerTween = new Tween(stateUi.drawerFold ? DRAWER_Y.fold : DRAWER_Y.unfold, {
		easing: cubicInOut,
	});

	const DRAWER_BUTTON_Y = {
		unfold: 0,
		fold: 50,
	};
	const drawerButtonTween = new Tween(
		stateUi.drawerFold ? DRAWER_BUTTON_Y.fold : DRAWER_BUTTON_Y.unfold,
		{
			easing: cubicInOut,
		},
	);

	const std = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const cx = $derived(std.width * 0.5);
	// corner clusters (layout after Meta Gaming's Swamp King), y measured up from the bottom edge (standard px)
	const Q = {
		menuX: 70, menuD: 100, leftX: 300, buyY: 560, buyS: 1.45, anteY: 400, anteW: 300,
		spinX: 300, spinY: 470, spinD: 290, sideX: 100, sideDY: 100, sideD: 120,
		balX: 200, valueY: 140, valueW: 330, arrowDX: 140, arrowD: 72,
	};
	const railY = $derived(std.height - Q.buyY);
	const s = (d: number, base = UI_BASE_SIZE) => d / base;

	let drawerButtonFadeComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		drawerButtonShow: async () => {
			if (!stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = true;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerButtonHide: async () => {
			if (stateUi.drawerButtonShow) {
				stateUi.drawerButtonShow = false;
				await waitForResolve((resolve) => (drawerButtonFadeComplete = resolve));
			}
		},
		drawerUnfold: async () => {
			if (stateUi.drawerFold) {
				drawerButtonTween.set(DRAWER_BUTTON_Y.unfold);
				await drawerTween.set(DRAWER_Y.unfold);
			}
		},
		drawerFold: async () => {
			if (!stateUi.drawerFold) {
				drawerButtonTween.set(DRAWER_BUTTON_Y.fold);
				await drawerTween.set(DRAWER_Y.fold);
			}
		},
	});
</script>

<Container x={20}>
	{@render props.gameName()}
</Container>

<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
	{@render props.logo()}
</Container>

<MainContainer standard alignVertical="bottom">
	<!-- drawer: the buttons fold away during the bonus like the SDK layout -->
	<Container y={drawerTween.current}>
		<!-- LEFT: settings · Buy Bonus · ANTE -->
		<Container x={Q.menuX} y={std.height - Q.buyY} scale={s(Q.menuD)}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>
		<Container x={Q.leftX} y={std.height - Q.buyY} scale={Q.buyS}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>
		<Container x={Q.leftX - 60} y={std.height - Q.anteY}>
			<ButtonAnte width={Q.anteW} />
		</Container>
		<!-- RIGHT: SPIN with autoplay / turbo stacked beside it, paytable under them -->
		<Container x={std.width - Q.spinX} y={std.height - Q.spinY} scale={s(Q.spinD, UI_BASE_SIZE * 1.12)}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>
		<Container x={std.width - Q.sideX} y={std.height - Q.spinY - Q.sideDY} scale={s(Q.sideD)}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
		<Container x={std.width - Q.sideX} y={std.height - Q.spinY + Q.sideDY} scale={s(Q.sideD)}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>
	</Container>

	<!-- bottom row: BALANCE · WIN · BET (plain values) -->
	<Container x={Q.balX} y={std.height - Q.valueY}>
		{@render props.amountBalance({ stacked: true, width: Q.valueW, plain: true } as never)}
	</Container>
	<Container x={cx} y={std.height - Q.valueY}>
		{@render props.amountWin({ stacked: true, width: Q.valueW, plain: true } as never)}
	</Container>
	{#if stateUi.freeSpinCounterShow}
		<Container x={cx} y={std.height - Q.spinY}>
			<LabelFreeSpinCounter stacked />
		</Container>
	{/if}
	<Container x={std.width - Q.balX} y={std.height - Q.valueY}>
		{@render props.amountBet({ stacked: true, width: Q.valueW, plain: true } as never)}
		<Container x={-Q.arrowDX} y={Q.valueW * 0.06} scale={s(Q.arrowD)}>
			{@render props.buttonDecrease({ anchor: 0.5 })}
		</Container>
		<Container x={Q.arrowDX} y={Q.valueW * 0.06} scale={s(Q.arrowD)}>
			{@render props.buttonIncrease({ anchor: 0.5 })}
		</Container>
	</Container>

	<!-- drawer button -->
	<FadeContainer
		persistent
		show={stateUi.drawerButtonShow}
		oncomplete={drawerButtonFadeComplete}
		y={drawerButtonTween.current}
	>
		<Container x={std.width - Q.sideX} y={std.height - Q.spinY}>
			<ButtonDrawer disabled={!stateUi.drawerButtonShow} anchor={0.5} />
		</Container>
	</FadeContainer>
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

	<MainContainer standard alignVertical="bottom">
		<Container x={Q.menuX} y={railY}>
			{#each [props.buttonPayTable, props.buttonGameRules, props.buttonSettings, props.buttonSoundSwitch] as button, i}
				<Container y={-(4 - i) * 120} scale={s(Q.menuD)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}
			<Container scale={s(Q.menuD)}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
