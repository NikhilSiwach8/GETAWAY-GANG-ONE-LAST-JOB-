import { GG_ASSETS } from './ggAssets';
import { UI_PLATES } from './uiPlates';
// Every visual is GETAWAY GANG art (art/delivery -> art/process_assets.py, video/ -> Remotion clips).
// Sound is the game's own audio (art/audio/build.py).
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
	// painted plates cut from the delivered UI art (art/make_ui_plates.py)
	'UI-PLATE-NAVY': { type: 'sprite', src: UI_PLATES['UI-PLATE-NAVY'] },
	'UI-PLATE-RED': { type: 'sprite', src: UI_PLATES['UI-PLATE-RED'] },
	// painted title alphabets in the same gold / silver material (art/make_title_fonts.py)
	ggTitleGold: {
		type: 'font',
		src: new URL('../../assets/fonts/ggTitleGold/ggTitleGold.xml', import.meta.url).href,
	},
	ggTitleSilver: {
		type: 'font',
		src: new URL('../../assets/fonts/ggTitleSilver/ggTitleSilver.xml', import.meta.url).href,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
