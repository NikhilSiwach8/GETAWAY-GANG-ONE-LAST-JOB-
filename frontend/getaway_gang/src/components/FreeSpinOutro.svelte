<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	/**
	 * Bonus end screen: SCR-HEIST-OUTRO / SCR-ESCAPE-OUTRO / SCR-HIDDEN-OUTRO (full-screen clip, holds its last
	 * frame) with the total win counting up in the gold FONT-WIN numerals on the clip's plaque. The Heist screen
	 * also lights the loot milestones reached; the Escape screen shows each crew member's final level in the
	 * hex badges. Everything is laid out in the clips' 1920×1080 space inside one cover-fitted container.
	 * Without clip support the cleaned still of the same screen is shown, so the positions still match.
	 */
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
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
	import { LOOT_REWARDS } from '../game/tempArt';
	import config from '../game/config';

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let bonus = $state<'heist' | 'escape' | 'hidden'>('heist');

	// win-amount plaque per screen, in clip pixels (measured on the delivered art, see art/prep_outros.py)
	const AMOUNT = {
		heist: { x: 962, y: 462, w: 700, size: 128 },
		escape: { x: 1475, y: 582, w: 640, size: 118 },
		hidden: { x: 960, y: 760, w: 900, size: 150 },
	} as const;
	// Heist loot panel (x 585..1352, y 700..898): four milestone chips
	const LOOT = config.features.lootThresholds as readonly number[];
	const lootChipX = (i: number) => 585 + 767 * ((i + 0.5) / LOOT.length);
	// Escape: crew hex badge centres and star strips (x0, x1, y centre)
	const CREW = [
		{ k: 'T', hex: [156, 152], stars: [212, 392, 163] },
		{ k: 'B', hex: [88, 440], stars: [143, 322, 449] },
		{ k: 'F', hex: [906, 400], stars: [958, 1142, 409] },
		{ k: 'R', hex: [306, 733], stars: [362, 552, 740] },
	] as const;
	const MAX_LEVEL = 3;

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { s, width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});
	const clipId = $derived({ escape: 'SCR-ESCAPE-OUTRO', heist: 'SCR-HEIST-OUTRO', hidden: 'SCR-HIDDEN-OUTRO' }[bonus]);
	const stillId = $derived({ escape: 'SCR-ESCAPE-OUTRO-CLEAN', heist: 'SCR-HEIST-OUTRO-CLEAN', hidden: 'SCR-HIDDEN-OUTRO' }[bonus]);
	let clipFailed = $state(false);
	let clipShown = $state(false);
	const useClip = $derived(hasClip(clipId) && !clipFailed);
	const hasStill = $derived(hasArt(stillId));
	// the amount and count-up wait for the clip's first frame (or start at once without a clip)
	const ready = $derived(!useClip || clipShown);
	const amt = $derived(AMOUNT[bonus]);
	// snapshot of the progression to show (resetHud runs only after this screen closes)
	const lootPoints = $derived(context.stateGame.hud.lootPoints);
	const levels = $derived(context.stateGame.hud.levels);

	const LABEL = { fontFamily: 'Luckiest Guy, sans-serif', fill: 0xffe27a, stroke: { color: 0x2a1200, width: 6 } };

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
					{#if hasStill}
						<Sprite key={stillId} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} />
					{:else}
						<Sprite key={bonus === 'heist' ? 'BG-HEIST' : 'BG-ESCAPE'} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} alpha={0.55} />
					{/if}
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
				{:else if hasStill}
					{@render still()}
				{:else}
					<Sprite key={bonus === 'heist' ? 'BG-HEIST' : 'BG-ESCAPE'} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} alpha={0.55} />
					<Text
						anchor={0.5}
						x={cover.x}
						y={cover.y + (amt.y - 200 - 540) * cover.s}
						text={{ escape: 'PERFECT ESCAPE!', heist: 'HEIST COMPLETE!', hidden: 'HIDDEN BONUS!' }[bonus]}
						style={{ ...LABEL, fontSize: 110 * cover.s, stroke: { color: 0x2a1200, width: 10 } }}
					/>
				{/if}
				{#if bonus === 'hidden' && !useClip && hasStill}
					<Text anchor={0.5} x={cover.x} y={cover.y + (612 - 540) * cover.s} text="TOTAL WIN" style={{ ...LABEL, fontSize: 64 * cover.s, stroke: { color: 0x2a1200, width: 8 } }} />
				{/if}

				<!-- everything below is placed in the clip's own 1920×1080 pixels -->
				<Container x={cover.x - 960 * cover.s} y={cover.y - 540 * cover.s} scale={cover.s} zIndex={5} visible={ready}>
					<Container x={amt.x} y={amt.y}>
						<ResponsiveBitmapText
							anchor={0.5}
							maxWidth={amt.w}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							style={{ fontFamily: 'ggGold', fontSize: amt.size }}
						/>
					</Container>

					{#if bonus === 'heist'}
						<Text anchor={0.5} x={968} y={728} text="LOOT MILESTONES · {lootPoints} PTS" style={{ ...LABEL, fontSize: 34 }} />
						{#each LOOT as t, i (t)}
							{@const lit = lootPoints >= t}
							<Container x={lootChipX(i)} y={815}>
								<Rectangle
									anchor={0.5}
									width={176}
									height={120}
									borderRadius={18}
									backgroundColor={lit ? 0xf7b928 : 0x1a1030}
									backgroundAlpha={lit ? 0.95 : 0.6}
									borderColor={lit ? 0xfff1a8 : 0x6b5a8a}
									borderWidth={4}
								/>
								<Text anchor={0.5} y={-28} text="{t} PTS" style={{ ...LABEL, fontSize: 36, fill: lit ? 0x3b1d00 : 0x9c8fb8, stroke: { color: lit ? 0xfff1a8 : 0x0b0618, width: 3 } }} />
								<Text
									anchor={0.5}
									y={22}
									text={LOOT_REWARDS[i] ?? ''}
									style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: 20, fill: lit ? 0x3b1d00 : 0x9c8fb8, align: 'center', wordWrap: true, wordWrapWidth: 160 }}
								/>
								{#if lit}
									<Graphics x={70} y={-42} draw={(g) => g.star(0, 0, 5, 16, 7).fill(0xffffff).stroke({ color: 0x8a4a00, width: 3 })} />
								{/if}
							</Container>
						{/each}
					{:else if bonus === 'escape'}
						{#each CREW as c (c.k)}
							{@const lv = Math.min(MAX_LEVEL, levels[c.k] ?? 1)}
							<Text anchor={0.5} x={c.hex[0]} y={c.hex[1] - 14} text="LV" style={{ ...LABEL, fontSize: 24, stroke: { color: 0x2a1200, width: 4 } }} />
							<Text anchor={0.5} x={c.hex[0]} y={c.hex[1] + 14} text={String(lv)} style={{ ...LABEL, fontSize: 44, fill: 0xffffff }} />
							{#each Array.from({ length: MAX_LEVEL }, (_, i) => i) as i (i)}
								{@const sx = c.stars[0] + ((c.stars[1] - c.stars[0]) * (i + 0.5)) / MAX_LEVEL}
								<Graphics
									x={sx}
									y={c.stars[2]}
									draw={(g) =>
										g
											.star(0, 0, 5, 21, 9)
											.fill(i < lv ? 0xffd23a : 0x2a2440)
											.stroke({ color: i < lv ? 0x7a3d00 : 0x0b0618, width: 4 })}
								/>
							{/each}
						{/each}
					{/if}
				</Container>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<!-- the Heist/Escape art has the prompt painted in; keep the key/tap only -->
				<PressToContinue hideArt={bonus !== 'hidden' && (useClip || hasStill)} onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
