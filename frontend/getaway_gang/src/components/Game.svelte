<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Sprite } from 'pixi-svelte';

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
	import WildReels from './WildReels.svelte';
	import ClipLayer from './ClipLayer.svelte';
	import CrewMascot from './CrewMascot.svelte';
	import CellFxLayer from './CellFxLayer.svelte';
	import { prefetchClips } from '../game/clips.svelte';

	const context = getContext();
	installMeta(); // bet modes (bonus buys) for the shared UI

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
