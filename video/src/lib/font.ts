import {continueRender, delayRender, staticFile} from 'remotion';

/** Luckiest Guy (SIL OFL), bundled in public/fonts so renders never need the network. */
export const TITLE_FONT = 'Luckiest Guy';
export const BODY_FONT = '"Inter Display", Inter, sans-serif';

const handle = delayRender('Loading title font');
const face = new FontFace(TITLE_FONT, `url(${staticFile('fonts/LuckiestGuy.woff2')}) format('woff2')`);
face
	.load()
	.then(() => {
		document.fonts.add(face);
		continueRender(handle);
	})
	.catch((err) => {
		console.error(err);
		continueRender(handle);
	});
