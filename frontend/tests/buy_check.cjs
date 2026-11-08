// Buy a bonus through the real UI with a forced book, then follow the round (Space only, no clip skipping).
//   node frontend/tests/buy_check.cjs http://localhost:3010 <outDir> <cardIndex 0..2> <bookId> [seconds]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , url, outDir, cardIndex, bookId, secs = '240'] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	if (process.env.NOCLIPS) await page.addInitScript(() => { HTMLMediaElement.prototype.canPlayType = () => ''; });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().split('?')[0]}`));
	await page.goto(`${url}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(22000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(9000);
	await lgs(`/lgs/sessions/${s.sessionID}/force`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: { bookId: Number(bookId) } }) });
	await page.mouse.click(331, 742);
	await page.waitForTimeout(1500);
	await page.locator('.pop-up-wrap button.buy').nth(Number(cardIndex)).click();
	await page.waitForTimeout(1200);
	await page.screenshot({ path: path.join(outDir, '00_confirm.png') });
	await page.locator('.pop-up-wrap [data-test="confirm-button"]').click();
	const t0 = Date.now();
	let i = 0;
	while (Date.now() - t0 < Number(secs) * 1000) {
		await page.waitForTimeout(1500);
		await page.screenshot({ path: path.join(outDir, `s${String(i++).padStart(3, '0')}.png`) });
		const st = await lgs(`/lgs/sessions/${s.sessionID}`);
		if (st.lastBet && !st.activeBet && Date.now() - t0 > 8000) break;
		if (i % 2 === 0) await page.keyboard.press('Space');
	}
	const st = await lgs(`/lgs/sessions/${s.sessionID}`);
	console.log(JSON.stringify({ mode: st.lastBet?.mode, cost: st.lastBet?.cost, payoutMultiplier: st.lastBet?.payoutMultiplier, settled: !st.activeBet, seconds: Math.round((Date.now() - t0) / 1000), errors }));
	await browser.close();
})();
