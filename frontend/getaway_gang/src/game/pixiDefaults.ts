/**
 * GPU safety net. If the browser drops the WebGL context (out of GPU memory, driver reset, too many tabs),
 * Pixi can only draw again once the browser restores it; some never do, which leaves a black canvas while
 * the game and its audio keep running. Give the browser a few seconds, then reload: the RGS resumes an
 * unfinished round on load, so nothing is lost.
 */
if (typeof window !== 'undefined') {
	let timer: ReturnType<typeof setTimeout> | undefined;
	window.addEventListener(
		'webglcontextlost',
		(e) => {
			e.preventDefault(); // allow the browser to restore the context
			clearTimeout(timer);
			timer = setTimeout(() => window.location.reload(), 4000);
		},
		true,
	);
	window.addEventListener('webglcontextrestored', () => clearTimeout(timer), true);
}
