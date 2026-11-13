// Frame-time check (dev server): average fps on the idle board over 8 s, with and without the living background.
// Software rendering here makes absolute numbers low; compare runs against each other.
//   node frontend/tests/perf_check.cjs http://localhost:3010
const { chromium } = require('playwright');
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await b.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	await page.goto(`${process.argv[2]}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(25000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(3500);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(15000); // let prefetch settle
	const fps = () =>
		page.evaluate(
			() =>
				new Promise((r) => {
					let n = 0;
					const t0 = performance.now();
					const f = () => (++n, performance.now() - t0 < 8000 ? requestAnimationFrame(f) : r((n / (performance.now() - t0)) * 1000));
					requestAnimationFrame(f);
				}),
		);
	const a = await fps();
	const hasEnv = await page.evaluate(() => !!window.__env);
	if (hasEnv) await page.evaluate(() => (window.__env.root.visible = false, window.__env.director.setPaused('perf', true)));
	const c = hasEnv ? await fps() : NaN;
	console.log(JSON.stringify({ idleFps: +a.toFixed(1), idleFpsWithoutBackgroundFx: +c.toFixed(1) }));
	await b.close();
})();
