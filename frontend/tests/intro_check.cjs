// Force a bonus trigger and screenshot the intro screen every 300 ms (no clicks while it plays).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, bookId] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(`${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(22000);
	await page.mouse.click(480, 270);
	await page.waitForTimeout(9000);
	await lgs(`/lgs/sessions/${s.sessionID}/force`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: { bookId: Number(bookId) } }) });
	await page.keyboard.press('Space');
	await page.waitForTimeout(5000);
	for (let i = 0; i < 40; i++) {
		await page.screenshot({ path: path.join(outDir, `i${String(i).padStart(2, '0')}.png`) });
		await page.waitForTimeout(300);
	}
	console.log('errors', JSON.stringify(errors));
	await browser.close();
})();
