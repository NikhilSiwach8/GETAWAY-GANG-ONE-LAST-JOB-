<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	/**
	 * Bonus end screen: SCR-HEIST-OUTRO / SCR-ESCAPE-OUTRO (full-screen clip, holds its last frame) with the
	 * total win counting up in the gold FONT-WIN numerals inside the clip's vault panel. Without clip support
	 * the bonus background with the same counter is shown.
	 */
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';
	import { hasArt } from '../game/ggAssets';

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let bonus = $state<'heist' | 'escape' | 'hidden'>('heist');

	// panel centre and width inside the 1920×1080 clips (see video/src/clips/Round2.tsx)
	const PANEL = { heist: { y: 600, w: 760 }, escape: { y: 470, w: 600 }, hidden: { y: 726, w: 1137 } } as const;
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { s, width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});
	const clipId = $derived({ escape: 'SCR-ESCAPE-OUTRO', heist: 'SCR-HEIST-OUTRO', hidden: 'SCR-HIDDEN-OUTRO' }[bonus]);
	let clipFailed = $state(false);
	let clipShown = $state(false);
	const useClip = $derived(hasClip(clipId) && !clipFailed);
	// the amount and count-up wait for the clip's first frame (or start at once without a clip)
	const ready = $derived(!useClip || clipShown);
	const panel = $derived(PANEL[bonus]);
	// clip coordinates -> canvas (the clip is drawn cover-fit, centred)
	const panelY = $derived(cover.y + (panel.y - 540) * cover.s);
	const panelW = $derived(panel.w * cover.s);

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			bonus = context.stateGame.hud.bonus ?? 'heist';
			clipShown = false;
			clipFailed = false;
			show = true;
		},
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} zIndex={30}>
	{#if winLevelData}
		{@const duration = Math.max(2000, winLevelData.presentDuration)}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if ready}
					<!-- the clip's banner and vault panel land ~1.3 s in; count once the panel is there -->
					<OnMount onmount={() => setTimeout(() => startCountUp(), useClip ? 1300 : 300)} />
				{/if}

				<Rectangle {...sizes} backgroundColor={0x05070f} />
				{#snippet still()}
					<Sprite key={bonus === 'heist' ? 'BG-HEIST' : 'BG-ESCAPE'} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} alpha={0.55} />
				{/snippet}
				{#if useClip}
					<ClipSprite
						id={clipId}
						channel="outro"
						anchor={0.5}
						x={cover.x}
						y={cover.y}
						width={cover.width}
						height={cover.height}
						fadeMs={250}
						zIndex={1}
						fallback={still}
						onready={() => (clipShown = true)}
						onended={(ok) => !ok && !clipShown && (clipFailed = true)}
					/>
				{:else if bonus === 'hidden' && hasArt('SCR-HIDDEN-OUTRO')}
					<!-- the delivered Hidden Bonus end screen, with its own title and panel -->
					<Sprite key="SCR-HIDDEN-OUTRO" anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} />
					<Text anchor={0.5} x={cover.x} y={cover.y + (612 - 540) * cover.s} text="TOTAL WIN" style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: 64 * cover.s, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 8 } }} />
				{:else}
					<Sprite key={bonus === 'heist' ? 'BG-HEIST' : 'BG-ESCAPE'} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} alpha={0.55} />
					<Text
						anchor={0.5}
						x={cover.x}
						y={panelY - panelW * 0.45}
						text={{ escape: 'PERFECT ESCAPE!', heist: 'HEIST COMPLETE!', hidden: 'HIDDEN BONUS!' }[bonus]}
						style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: panelW * 0.13, fill: 0xffe27a, stroke: { color: 0x2a1200, width: 10 } }}
					/>
					<Text anchor={0.5} x={cover.x} y={panelY - panelW * 0.2} text="TOTAL WIN" style={{ fontFamily: 'Luckiest Guy, proxima-nova, sans-serif', fontSize: panelW * 0.06, fill: 0xffffff }} />
				{/if}

				<Container x={cover.x} y={panelY + panelW * 0.03} zIndex={5} visible={ready}>
					<ResponsiveBitmapText
						anchor={0.5}
						maxWidth={panelW * 0.82}
						text={bookEventAmountToCurrencyString(countUpAmount)}
						style={{ fontFamily: 'ggGold', fontSize: panelW * 0.16 }}
					/>
				</Container>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
