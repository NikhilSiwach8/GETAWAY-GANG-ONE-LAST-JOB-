<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';

	// Win celebration clips by win level (the game draws the counting amount on top)
	const WIN_CLIPS: Record<string, { id: string; seconds: number }> = {
		big: { id: 'WIN-BIG', seconds: 4 },
		superwin: { id: 'WIN-SUPER', seconds: 5 },
		mega: { id: 'WIN-MEGA', seconds: 6 },
		epic: { id: 'WIN-EPIC', seconds: 8 },
		max: { id: 'WIN-EPIC', seconds: 8 }, // the 12,000x cap also plays CIN-MAX-WIN on the wincap event
	};
	// titles drawn when clips cannot play (no transparent-WebM support)
	const WIN_TITLES: Record<string, string> = { big: 'BIG WIN', superwin: 'SUPER WIN', mega: 'MEGA WIN', epic: 'EPIC WIN', max: 'MAXIMUM WIN' };

	const context = getContext();

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
		{@const winClip = WIN_CLIPS[winLevelData.alias] && hasClip(WIN_CLIPS[winLevelData.alias].id) ? WIN_CLIPS[winLevelData.alias] : null}
		{@const duration = winClip ? (winClip.seconds - 1) * 1000 : winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
				{/if}
				{#if winClip}
					{@const cs = context.stateLayoutDerived.canvasSizes()}
					{@const k = Math.min(cs.width / 1920, cs.height / 1080)}
					<ClipSprite id={winClip.id} channel="win" x={cs.width / 2} y={cs.height / 2} width={1920 * k} height={1080 * k} />
				{/if}

				<OnMount
					onmount={async () => {
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if winClip}
							<ResponsiveBitmapText
								anchor={0.5}
								y={SYMBOL_SIZE * 0.9}
								maxWidth={context.stateLayoutDerived.canvasSizes().width / context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{ fontFamily: 'ggGold', fontSize: SYMBOL_SIZE * 1.6, align: 'center', fontWeight: 'bold', letterSpacing: 0 }}
							/>
						{:else if isBigWin}
							<Text
								anchor={0.5}
								y={-SYMBOL_SIZE * 0.9}
								text={WIN_TITLES[winLevelData.alias] ?? 'BIG WIN'}
								style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: SYMBOL_SIZE * 1.2, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 14 }, dropShadow: { color: 0xff4c36, distance: 8, angle: Math.PI / 2, blur: 0, alpha: 1 } }}
							/>
							<ResponsiveBitmapText
								anchor={0.5}
								y={SYMBOL_SIZE * 0.6}
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

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
