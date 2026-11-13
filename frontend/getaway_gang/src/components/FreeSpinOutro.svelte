<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	/**
	 * Bonus end screen: the TOTAL-<BONUS> clip builds the Total Win card (crew cheer, title slam, the gold plaque
	 * lands), then TOTAL-<BONUS>-LOOP runs until the player taps; 9:16 versions on portrait screens. From the
	 * plaque landing (TOTAL_HANDOVER_MS) the total counts up in the gold numerals inside the plaque, and the info
	 * panel shows the Heist loot milestones reached or each crew member's final Escape level. Everything is placed
	 * in the clip's own pixels (game/bonusTotal.ts, shared with the clips) inside one cover-fitted container.
	 * Without clips the bonus background with the same layout is drawn instead.
	 */
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import CoinShower from './CoinShower.svelte';
	import ClipSprite from './ClipSprite.svelte';
	import { BaseSprite } from 'pixi-svelte';
	import type * as PIXI from 'pixi.js';
	import { loadPoster } from '../game/posters';
	import { hasClip } from '../game/clips.svelte';
	import { LOOT_REWARDS } from '../game/tempArt';
	import { TOTAL_HANDOVER_MS, totalClips } from '../game/bonusTotal';
	import config from '../game/config';

	const context = getContext();

	let show = $state(true);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let bonus = $state<'heist' | 'escape' | 'hidden'>('heist');
	let portrait = $state(false);

	const LOOT = config.features.lootThresholds as readonly number[];
	const CREW = ['R', 'B', 'T', 'F'] as const;
	const CREW_SYM = { R: 'SYM-ROXY', B: 'SYM-BYTE', T: 'SYM-TANK', F: 'SYM-FUSE' } as const;
	const MAX_LEVEL = 3;

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const clips = $derived(totalClips(bonus, portrait));
	const L = $derived(clips.layout);
	const cover = $derived.by(() => {
		const s = Math.max(sizes.width / L.width, sizes.height / L.height);
		return { s, width: L.width * s, height: L.height * s, x: sizes.width / 2, y: sizes.height / 2 };
	});

	let phase = $state<'intro' | 'loop'>('intro');
	let clipFailed = $state(false);
	let clipShown = $state(false);
	let loopShown = $state(false);
	const useClip = $derived(hasClip(clips.intro) && !clipFailed);
	// the amount, loot and crew overlays appear (and the count-up starts) once the plaque has landed
	let handedOver = $state(false);
	$effect(() => {
		if (!clipShown) return;
		const id = setTimeout(() => (handedOver = true), TOTAL_HANDOVER_MS);
		return () => clearTimeout(id);
	});
	// poster: the finished card as a still, under the clip until it has a frame (never a black screen); if the
	// clip has not started after POSTER_MS the card is shown on the poster (amount, count-up, prompt)
	const POSTER_MS = 2500;
	let poster = $state<PIXI.Texture | null>(null);
	let posterMode = $state(false);
	$effect(() => {
		if (!show || clipShown) return;
		const id = setTimeout(() => {
			if (!clipShown && poster) {
				console.warn(`[clips] total win ${clips.intro}: not playing yet, showing the card on its poster`);
				posterMode = true;
			}
		}, POSTER_MS);
		return () => clearTimeout(id);
	});
	const ready = $derived(!useClip || posterMode || (clipShown && handedOver));
	// snapshot of the progression to show (resetHud runs only after this screen closes)
	const lootPoints = $derived(context.stateGame.hud.lootPoints);
	const levels = $derived(context.stateGame.hud.levels);

	const LABEL = { fontFamily: 'Luckiest Guy, sans-serif', fill: 0xffe27a, stroke: { color: 0x2a1200, width: 6 } };

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => {
			bonus = context.stateGame.hud.bonus ?? 'heist';
			portrait = sizes.height > sizes.width;
			phase = 'intro';
			posterMode = false;
			poster = null;
			loadPoster(totalClips(bonus, portrait).intro).then((t) => (poster = t));
			clipShown = false;
			loopShown = false;
			handedOver = false;
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
					<OnMount onmount={() => setTimeout(() => startCountUp(), useClip ? 150 : 300)} />
				{/if}

				<Rectangle {...sizes} backgroundColor={0x05070f} />
				{#if useClip && poster && !clipShown}
					<BaseSprite texture={poster} anchor={0.5} x={cover.x} y={cover.y} width={cover.width} height={cover.height} zIndex={0.5} />
				{/if}
				{#if useClip}
					<!-- the intro holds its last frame underneath until the loop has its first one (no black gap) -->
					{#if phase === 'intro' || !loopShown}
						<ClipSprite
							id={clips.intro}
							channel="outro"
							anchor={0.5}
							x={cover.x}
							y={cover.y}
							width={cover.width}
							height={cover.height}
							fadeMs={200}
							zIndex={1}
							readyMs={20000}
							onready={() => (clipShown = true)}
							onended={(ok) => {
								if (!ok && !clipShown && !hasClip(clips.loop)) {
									if (poster) posterMode = true;
									else {
										console.warn(`[clips] total win ${clips.intro}: fell back to the drawn card`);
										clipFailed = true;
									}
								} else if (hasClip(clips.loop)) phase = 'loop'; // played, a late hiccup, or could not start: the loop
							}}
						/>
					{/if}
					{#if phase === 'loop'}
						<ClipSprite
							id={clips.loop}
							channel="outro-loop"
							loop
							anchor={0.5}
							x={cover.x}
							y={cover.y}
							width={cover.width}
							height={cover.height}
							fadeMs={0}
							zIndex={2}
							readyMs={20000}
							onready={() => {
								loopShown = true;
								clipShown = true; // the loop counts as the card being on screen (intro could not start)
							}}
							onended={(ok) => {
								if (!ok && !clipShown) {
									if (poster) posterMode = true;
									else {
										console.warn(`[clips] total win ${clips.loop}: fell back to the drawn card`);
										clipFailed = true;
									}
								}
							}}
						/>
					{/if}
				{:else}
					<!-- no clips: the bonus background with the same layout, drawn live -->
					<Sprite key={bonus === 'heist' ? 'BG-HEIST' : bonus === 'escape' ? 'BG-ESCAPE' : 'BG-HIDDEN'} anchor={0.5} x={cover.x} y={cover.y} width={Math.max(sizes.width, (sizes.height * 16) / 9)} height={Math.max(sizes.height, (sizes.width * 9) / 16)} alpha={0.5} />
					<Container x={cover.x - (L.width / 2) * cover.s} y={cover.y - (L.height / 2) * cover.s} scale={cover.s}>
						<Text anchor={0.5} x={L.title.x} y={L.title.y} text="TOTAL WIN" style={{ ...LABEL, fontSize: L.title.size, stroke: { color: 0x2a1200, width: 14 } }} />
						<Rectangle anchor={0.5} x={L.plaque.x} y={L.plaque.y} width={L.plaque.w} height={L.plaque.h} borderRadius={L.plaque.h / 2} backgroundColor={0x0a1030} borderColor={0xf7c947} borderWidth={10} />
						<Text anchor={0.5} x={L.ribbon.x} y={L.ribbon.y} text={{ escape: 'PERFECT ESCAPE!', heist: 'HEIST COMPLETE!', hidden: 'HIDDEN BONUS!' }[bonus]} style={{ ...LABEL, fontSize: 62 }} />
					</Container>
				{/if}

				<!-- everything below is placed in the clip's own pixels -->
				<Container x={cover.x - (L.width / 2) * cover.s} y={cover.y - (L.height / 2) * cover.s} scale={cover.s} zIndex={5} visible={ready}>
					<Container x={L.plaque.x} y={L.plaque.y + 8}>
						<ResponsiveBitmapText anchor={0.5} maxWidth={L.plaque.w * 0.86} text={bookEventAmountToCurrencyString(countUpAmount)} style={{ fontFamily: 'ggGold', fontSize: L.plaque.h * 0.72 }} />
					</Container>

					{#if bonus === 'heist'}
						{@const top = L.info.y - L.info.h / 2}
						<Text anchor={0.5} x={L.info.x} y={top + 32} text="LOOT MILESTONES · {lootPoints} PTS" style={{ ...LABEL, fontSize: 34 }} />
						{#each LOOT as t, i (t)}
							{@const lit = lootPoints >= t}
							{@const cx = L.info.x - L.info.w / 2 + L.info.w * ((i + 0.5) / LOOT.length)}
							<!-- milestone plate (UI-MILESTONE art): points in the navy window, reward on the red plate -->
							<Container x={cx} y={L.info.y + 30} alpha={lit ? 1 : 0.8}>
								<Sprite key="UI-MILESTONE" anchor={0.5} width={176} height={176 * (475 / 600)} tint={lit ? 0xffffff : 0x6d6a80} />
								<Text anchor={0.5} y={-14} text="{t} PTS" style={{ ...LABEL, fontSize: 30, fill: lit ? 0xffe27a : 0xa9a6c0, stroke: { color: 0x0b0618, width: 5 } }} />
								<Text
									anchor={0.5}
									y={38}
									text={LOOT_REWARDS[i] ?? ''}
									style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: 13, fill: lit ? 0xffffff : 0xb9b6cc, align: 'center', wordWrap: true, wordWrapWidth: 140, stroke: { color: 0x2a0606, width: 3 } }}
								/>
								{#if lit}
									<Sprite key="UI-STAR-ON" anchor={0.5} x={70} y={-52} width={40} height={40} />
								{/if}
							</Container>
						{/each}
					{:else if bonus === 'escape'}
						<!-- each crew member's final level: medallion, LV n, stars -->
						{#each CREW as k, i (k)}
							{@const lv = Math.min(MAX_LEVEL, levels[k] ?? 1)}
							{@const cx = L.info.x - L.info.w / 2 + L.info.w * ((i + 0.5) / CREW.length)}
							<Container x={cx} y={L.info.y}>
								<Sprite key={CREW_SYM[k]} anchor={0.5} y={-40} width={120} height={120} />
								<Text anchor={0.5} y={40} text="LV {lv}" style={{ ...LABEL, fontSize: 36, fill: 0xffffff }} />
								{#each Array.from({ length: MAX_LEVEL }, (_, j) => j) as j (j)}
									<Sprite key="UI-STAR-ON" anchor={0.5} x={(j - 1) * 46} y={86} width={40} height={40} tint={j < lv ? 0xffffff : 0x2c2648} alpha={j < lv ? 1 : 0.9} />
								{/each}
							</Container>
						{/each}
					{/if}
				</Container>

				<CoinShower emit={ready && !countUpCompleted} levelAlias={winLevelData?.alias ?? 'big'} />

				<!-- the clip has no prompt baked in: the game's TAP / PRESS prompt appears once the card is built -->
				<Container zIndex={10}>
					<PressToContinue hideArt={!ready} onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
				</Container>
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
