<!--
  GETAWAY GANG bet console for portrait phones (1080×1920 standard space). Same snippets, drawer and
  fold behaviour as the web-sdk LayoutPortrait; arranged on the steel rail (UI-CONSOLE-PORTRAIT):
  bottom: BET plate with its −/+ ends (free-spin counter in the bonus) · above: BALANCE | WIN ·
  top row: settings · autoplay · SPIN · turbo · Buy Bonus.
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
	import GGConsole from './GGConsole.svelte';
	import ButtonAnte from './ButtonAnte.svelte';
	import { BET_ZONE } from '../game/betConsole';

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
	const RAIL_H = 134;
	// clear of the phone's home indicator / rounded corners
	const railY = $derived(std.height - RAIL_H * 0.5 - 46);
	const railW = $derived(Math.max(1080, context.stateLayoutDerived.canvasSizes().width / std.scale + 40));
	const BET_W = 600;
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
	<!-- drawer: folds away during the bonus like the SDK layout -->
	<Container y={drawerTween.current}>
		<Container x={cx - 420} y={railY - 410} scale={s(120)}>
			{@render props.buttonMenu({ anchor: 0.5 })}
		</Container>
		<Container x={cx - 222} y={railY - 410} scale={s(146)}>
			{@render props.buttonAutoSpin({ anchor: 0.5 })}
		</Container>
		<Container x={cx} y={railY - 425} scale={s(256, UI_BASE_SIZE * 1.12)}>
			{@render props.buttonBet({ anchor: 0.5 })}
		</Container>
		<Container x={cx + 222} y={railY - 410} scale={s(146)}>
			{@render props.buttonTurbo({ anchor: 0.5 })}
		</Container>
		<Container x={cx + 410} y={railY - 410} scale={1.05}>
			{@render props.buttonBuyBonus({ anchor: 0.5 })}
		</Container>
		<Container x={cx - 262} y={railY - 190}>
			{@render props.amountBalance({ stacked: true, width: 470 } as never)}
		</Container>
	</Container>

	<Container y={Math.min(drawerTween.current, 350)}>
		<Container x={cx + 262} y={railY - 190}>
			{@render props.amountWin({ stacked: true, width: 470 } as never)}
		</Container>
	</Container>
</MainContainer>

<MainContainer standard alignVertical="bottom">
	<GGConsole x={cx} y={railY} width={railW} />
	{#if stateUi.freeSpinCounterShow}
		<Container x={cx} y={railY - 10}>
			<LabelFreeSpinCounter stacked />
		</Container>
	{:else}
		<Container x={cx} y={railY}>
			{@render props.amountBet({ stacked: true, width: BET_W } as never)}
			<Container x={-BET_W * BET_ZONE.dx} y={BET_W * BET_ZONE.dy} scale={s(BET_W * BET_ZONE.size)}>
				{@render props.buttonDecrease({ anchor: 0.5 })}
			</Container>
			<Container x={BET_W * BET_ZONE.dx} y={BET_W * BET_ZONE.dy} scale={s(BET_W * BET_ZONE.size)}>
				{@render props.buttonIncrease({ anchor: 0.5 })}
			</Container>
		</Container>
	{/if}

	<!-- ante capsule on the rail, left of the BET plate (the drawer button sits on the right) -->
	<Container x={cx - 428} y={railY - 4}>
		<ButtonAnte width={210} />
	</Container>

	<!-- drawer button -->
	<FadeContainer
		persistent
		show={stateUi.drawerButtonShow}
		oncomplete={drawerButtonFadeComplete}
		y={drawerButtonTween.current}
	>
		<Container x={cx + 455} y={railY - 4}>
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
		<Container x={cx - 420} y={railY - 410}>
			{#each [props.buttonPayTable, props.buttonGameRules, props.buttonSettings, props.buttonSoundSwitch] as button, i}
				<Container y={-(4 - i) * 150} scale={s(120)}>
					{@render button({ anchor: 0.5 })}
				</Container>
			{/each}
			<Container scale={s(120)}>
				{@render props.buttonMenuClose({ anchor: 0.5 })}
			</Container>
		</Container>
	</MainContainer>
{/if}
