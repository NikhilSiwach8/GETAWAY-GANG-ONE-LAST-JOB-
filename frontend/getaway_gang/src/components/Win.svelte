<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	/**
	 * Win counter and big-win layer: a view of the win director's state (game/wins/winDirector). The amount
	 * is the setWin event's amount, counted up on an eased curve (it always lands exactly on the event value);
	 * the counter beats on every win impact of the cycle. Big tiers add the dark backdrop, BigWinScene and the
	 * coin shower. Press anywhere: first press completes the count-up, the second ends the presentation.
	 */
	import { Container } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import CoinShower from './CoinShower.svelte';
	import BigWinScene from './BigWinScene.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { skipWin, winFx } from '../game/wins/winDirector.svelte';
	import { Timeline, play } from '../game/wins/timeline';

	const context = getContext();
	const c = $derived(winFx.counter);
	const tier = $derived(winFx.tier);

	// a short eased beat on every win impact (scale 1 -> 1.1 -> 1)
	let beat = $state(0);
	let lastBeat = winFx.counter.beat;
	$effect(() => {
		const b = winFx.counter.beat;
		if (b === lastBeat) return;
		lastBeat = b;
		play(new Timeline('beat').tween(0, 0.09, 0, 1, 'quadOut', (v) => (beat = v)).tween(0.09, 0.28, 1, 0, 'cubicOut', (v) => (beat = v)));
	});
	const maxWidth = $derived(context.stateLayoutDerived.canvasSizes().width / context.stateLayoutDerived.mainLayout().scale);
</script>

{#if c.show}
	<Container alpha={c.alpha}>
		{#if c.big}
			<CanvasSizeRectangle backgroundColor={0x05070f} backgroundAlpha={0.72} />
			<BigWinScene />
		{/if}
		<MainContainer>
			<Container x={context.stateGameDerived.boardLayout().x} y={context.stateGameDerived.boardLayout().y} scale={c.scale * (1 + 0.1 * beat)}>
				<ResponsiveBitmapText
					anchor={0.5}
					y={c.big ? SYMBOL_SIZE * 0.75 : 0}
					{maxWidth}
					text={bookEventAmountToCurrencyString(c.value)}
					style={{ fontFamily: 'ggGold', fontSize: c.big ? SYMBOL_SIZE * 1.6 : SYMBOL_SIZE, align: 'center', letterSpacing: 0 }}
				/>
			</Container>
		</MainContainer>
		{#if c.big}
			<CoinShower emit={c.counting} levelAlias={tier?.stageAlias ?? 'big'} burst={tier?.impact ?? 0} />
		{/if}
		<!-- skip: tap / Space; the prompt graphic only on big wins -->
		<PressToContinue onpress={skipWin} hideArt={!c.big} />
	</Container>
{/if}
