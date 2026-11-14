<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container, Sprite, getContextApp } from 'pixi-svelte';

	import { UiGameName } from 'components-ui-pixi';
	import GameUI from './GameUI.svelte';
	import { GameVersion } from 'components-ui-html';
	import GameModals from './GameModals.svelte';
	import { installMeta } from '../game/meta';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import Hud from './Hud.svelte';
	import FeatureBanner from './FeatureBanner.svelte';
	import CellHighlights from './CellHighlights.svelte';
	import WinBoardFx from './WinBoardFx.svelte';
	import WildReels from './WildReels.svelte';
	import ClipLayer from './ClipLayer.svelte';
	import CrewMascot from './CrewMascot.svelte';
	import CellFxLayer from './CellFxLayer.svelte';
	import { prefetchClips } from '../game/clips.svelte';
	import { playBookEvents } from '../game/utils';

	const context = getContext();
	installMeta(); // bet modes (bonus buys) for the shared UI

	// dev builds only: replay real book events through the game's own handlers (frontend/tests/win_record.cjs)
	if (import.meta.env.DEV) (window as unknown as { __playEvents: unknown }).__playEvents = (events: never[]) => playBookEvents(events);

	// render resolution: at most 2x (1.75x on phones). A 3x phone screen would otherwise draw 9x the pixels of
	// the layout every frame for a barely visible gain; this is the biggest single cost on high-density screens
	const app = getContextApp();
	$effect(() => {
		const r = app.stateApp.pixiApplication?.renderer;
		if (!r) return;
		const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
		const cap = mobile ? 1.75 : 2;
		if (r.resolution > cap) r.resolution = cap;
	});

	// while a bonus entry / Total Win card fully covers the screen (after its 0.5 s fade-in), the scene, board,
	// HUD and console behind it are not drawn at all: the card's video gets the whole frame budget
	let covered = $state(false);
	let coverTimer: ReturnType<typeof setTimeout> | undefined;
	const cover = (on: boolean) => {
		clearTimeout(coverTimer);
		if (on) coverTimer = setTimeout(() => (covered = true), 700);
		else covered = false;
	};
	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => cover(true),
		freeSpinIntroHide: () => cover(false),
		freeSpinOutroShow: () => cover(true),
		freeSpinOutroHide: () => cover(false),
	});

	onMount(() => {
		context.stateLayout.showLoadingScreen = true;
		prefetchClips();
	});

</script>

<App>
	<EnableSound />
	<EnableHotkey />
	<EnableGameActor />
	<EnablePixiExtension />

	<!-- everything behind the full-screen bonus cards: not drawn while a card covers the whole screen -->
	<Container visible={!covered}>
	<Background />

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
	{:else}
		<ResumeBet />
		<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
		<Sound />

		<MainContainer>
			<BoardFrame />
		</MainContainer>

		<MainContainer>
			<Board />
			<Anticipations />
			<WildReels />
			<CellFxLayer />
			<CellHighlights />
			<WinBoardFx />
			<CrewMascot />
			<Hud />
			<FreeSpinCounter />
			<FeatureBanner />
		</MainContainer>

		<GameUI>
			{#snippet gameName()}
				<UiGameName name="GETAWAY GANG" />
			{/snippet}
			{#snippet logo()}
				<Sprite key="UI-LOGO" anchor={{ x: 1, y: 0 }} width={240} height={120} />
			{/snippet}
		</GameUI>
	{/if}
	</Container>
	{#if !context.stateLayout.showLoadingScreen}
		<Win />
		<FreeSpinIntro />
		<FreeSpinOutro />

	{/if}
	<ClipLayer />
	<!-- scene transition: above everything, also used by the loading screen -->
	<Transition />
</App>

<GameModals>
	{#snippet version()}
		<GameVersion version="1.0.0" />
	{/snippet}
</GameModals>
