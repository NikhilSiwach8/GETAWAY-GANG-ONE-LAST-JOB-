import { GG_ASSETS } from './ggAssets';
// Every visual is GETAWAY GANG art (art/delivery -> art/process_assets.py, video/ -> Remotion clips).
// Only 'sound' is still the web-sdk sample audio set, pending the game's own audio.
export default {
	...GG_ASSETS,
	// bitmap fonts built from FONT-WIN / FONT-COUNTER by art/make_fonts.py
	ggGold: {
		type: 'font',
		src: new URL('../../assets/fonts/ggGold/ggGold.xml', import.meta.url).href,
	},
	ggSilver: {
		type: 'font',
		src: new URL('../../assets/fonts/ggSilver/ggSilver.xml', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
