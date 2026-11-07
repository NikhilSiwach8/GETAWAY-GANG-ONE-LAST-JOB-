// Screenshot the loading-screen -> game transition every 150 ms after "press anywhere".
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true });
	await page.goto(`${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(25000);
	await page.mouse.click(480, 270);
	for (let i = 0; i < 16; i++) {
		await page.screenshot({ path: path.join(outDir, `t${String(i).padStart(2, '0')}.png`) });
		await page.waitForTimeout(150);
	}
	await browser.close();
})();
