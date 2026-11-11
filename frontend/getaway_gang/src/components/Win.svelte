<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { backOut, elasticOut } from 'svelte/easing';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import CoinShower from './CoinShower.svelte';
	import BigWinScene from './BigWinScene.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';

	// count-up length per win level (the celebration itself is BigWinScene)
	const WIN_CLIPS: Record<string, { id: string; seconds: number }> = {
		big: { id: 'WIN-BIG', seconds: 4 },
		superwin: { id: 'WIN-SUPER', seconds: 5 },
		mega: { id: 'WIN-MEGA', seconds: 6 },
		epic: { id: 'WIN-EPIC', seconds: 8 },
		max: { id: 'WIN-EPIC', seconds: 8 }, // the 12,000x cap also plays CIN-MAX-WIN on the wincap event
	};

	const context = getContext();
	// the amount pops in with an elastic bounce, breathes while counting, and lands with a final beat
	const punch = new Tween(1, { duration: 520, easing: backOut });
	const beat = new Tween(0, { duration: 0 });
	let beatRaf = 0;
	const beatLoop = (now: number) => {
		beat.set(now / 90, { duration: 0 });
		beatRaf = requestAnimationFrame(beatLoop);
	};
	$effect(() => {
		if (show) beatRaf = requestAnimationFrame(beatLoop);
		return () => cancelAnimationFrame(beatRaf);
	});

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const winClip = WIN_CLIPS[winLevelData.alias] ?? null}
		{@const duration = winClip ? (winClip.seconds - 1) * 1000 : winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x05070f} backgroundAlpha={0.72} />
				{/if}
				{#if isBigWin}
					<!-- live celebration: rays, tier title, crew (works everywhere, no video) -->
					<BigWinScene alias={winLevelData.alias} />
				{/if}

				<OnMount
					onmount={async () => {
						punch.set(0.2, { duration: 0 });
						punch.set(1);
						await startCountUp();
						punch.set(1.18, { duration: 120 }).then(() => punch.set(1, { duration: 380, easing: elasticOut }));
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
						scale={punch.current * (1 + (countUpCompleted ? 0 : 0.03 * Math.sin(beat.current)))}
					>
						{#if isBigWin}
							<ResponsiveBitmapText
								anchor={0.5}
								y={SYMBOL_SIZE * 0.75}
								maxWidth={context.stateLayoutDerived.canvasSizes().width / context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{ fontFamily: 'ggGold', fontSize: SYMBOL_SIZE * 1.6, align: 'center', letterSpacing: 0 }}
							/>
						{:else}
							<ResponsiveBitmapText
								anchor={0.5}
								maxWidth={context.stateLayoutDerived.canvasSizes().width /
									context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'ggGold',
									fontSize: SYMBOL_SIZE,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
							/>
						{/if}
					</Container>
				</MainContainer>

				<CoinShower emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
