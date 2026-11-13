// Bet console screenshots on desktop, portrait phone and landscape phone (dev server).
//   node frontend/tests/console_shots.cjs http://localhost:3010 <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	const [, , url, out] = process.argv;
	fs.mkdirSync(out, { recursive: true });
	const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	for (const [w, h, touch, name] of [[1422, 800, false, 'desktop'], [430, 932, true, 'portrait'], [932, 430, true, 'landscape']]) {
		const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
		const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, ignoreHTTPSErrors: true, hasTouch: touch, isMobile: touch });
		await page.goto(`${url}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
		await page.waitForTimeout(25000);
		await page.mouse.click(w / 2, h / 2);
		await page.waitForTimeout(3500);
		await page.mouse.click(w / 2, h / 2);
		await page.waitForTimeout(6000);
		await page.screenshot({ path: `${out}/${name}.png` });
		await page.close();
	}
	await b.close();
})();
