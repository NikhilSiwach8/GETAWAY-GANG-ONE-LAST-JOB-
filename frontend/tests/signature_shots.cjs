// Captures every symbol's signature win effect at fixed moments of the win timeline (dev server, fake clock).
//   node frontend/tests/signature_shots.cjs http://localhost:3010 <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
const NAMES = ['H1', 'H2', 'H3', 'H4', 'W', 'S', 'L1', 'L2', 'L3', 'L4', 'R', 'B', 'T', 'F', 'H1', 'H2', 'H3', 'H4', 'W', 'S', 'R', 'B', 'T', 'F'];
(async () => {
	const [, , url, out] = process.argv;
	fs.mkdirSync(out, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await b.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	await page.clock.install();
	await page.goto(`${url}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.clock.resume();
	await page.waitForTimeout(25000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(3500);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(5000);
	await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000);
	await page.clock.runFor(2100);
	await page.evaluate((names) => {
		const { stateGame, stopIdleGlints } = window.__sym;
		stopIdleGlints();
		stateGame.board.forEach((reel, r) => {
			for (let row = 1; row <= 4; row++) {
				const sym = reel.reelState.symbols[row];
				sym.rawSymbol = { name: names[(row - 1) * 6 + r] };
				sym.symbolState = 'static';
				sym.oncomplete = () => {};
			}
		});
	}, NAMES);
	await page.clock.runFor(500);
	await page.evaluate(() => window.__sym.stateGame.board.forEach((reel) => [1, 2, 3, 4].forEach((r) => (reel.reelState.symbols[r].symbolState = 'win'))));
	let at = 0;
	for (const ms of [200, 380, 480, 600, 760, 950]) {
		await page.clock.runFor(ms - at);
		at = ms;
		await page.screenshot({ path: `${out}/t${ms}.png`, clip: { x: 380, y: 185, width: 665, height: 425 } });
	}
	await b.close();
})();
