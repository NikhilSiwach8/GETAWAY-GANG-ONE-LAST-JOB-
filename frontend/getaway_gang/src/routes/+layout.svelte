<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderStakeEngine, LoadI18n } from 'components-shared';
	import '../lib/fonts/register';
	import '../game/pixiDefaults';
	import '../lib/gg-ui.css';
	import { ggUrl } from '../game/ggAssets';
	import { UI_PLATES } from '../game/uiPlates';
	// painted art for the HTML windows (lib/gg-ui.css): close button, panel frame, plate buttons, star knob
	if (typeof document !== 'undefined') {
		const css = document.documentElement.style;
		css.setProperty('--gg-close', `url(${ggUrl('UI-CLOSE')})`);
		css.setProperty('--gg-panel', `url(${ggUrl('UI-BUY-PANEL')})`);
		css.setProperty('--gg-plate-navy', `url(${UI_PLATES['UI-PLATE-NAVY']})`);
		css.setProperty('--gg-plate-red', `url(${UI_PLATES['UI-PLATE-RED']})`);
		css.setProperty('--gg-star', `url(${ggUrl('UI-STAR-ON')})`);
	}
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	const loaderUrlStakeEngine = new URL('../../stake-engine-loader.gif', import.meta.url).href;

	setContext();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<!-- Stake Engine intro; the game's own loading screen (SCR-LOADING) follows inside the canvas -->
<LoaderStakeEngine src={loaderUrlStakeEngine} oncomplete={() => {}} />

{@render props.children()}