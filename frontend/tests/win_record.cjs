// Deterministic win-presentation recorder (dev server only: window.__playEvents from Game.svelte).
//   node frontend/tests/win_record.cjs http://localhost:3010 <outDir> [tiers=2,4,6,8,9] [fps=20]
// Replays real reveal -> winInfo -> setWin -> setTotalWin sequences (frontend/tests/fixtures_win_sequences.json,
// cut from the published books) through the game's own book-event handlers. Time is driven by Playwright's
// fake clock, one frame step at a time, so the frames are evenly spaced however slow the renderer is.
// Writes <outDir>/<tier>/f0000.jpg ... and prints the presentation length per tier.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, tierArg, fpsArg] = process.argv;
const tiers = (tierArg || '2,4,6,8,9').split(',');
const fps = Number(fpsArg || 20);
const SEQ = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures_win_sequences.json'), 'utf8'));
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const url = `${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`;
	const vp = (process.env.VIEWPORT || '960x540').split('x').map(Number);
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ignoreHTTPSErrors: true });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.clock.install();
	await page.goto(url);
	await page.clock.resume();
	await page.waitForTimeout(Number(process.env.LOADWAIT || 25000));
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(3500);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(5000);
	const now = await page.evaluate(() => Date.now());
	await page.clock.pauseAt(now + 2000);
	for (const tier of tiers) {
		const seq = SEQ[tier];
		if (!seq) continue;
		const dir = path.join(outDir, tier);
		fs.mkdirSync(dir, { recursive: true });
		await page.evaluate((events) => {
			window.__recDone = false;
			window.__playEvents(events).then(() => (window.__recDone = true), (e) => ((window.__recDone = true), (window.__recErr = String(e))));
		}, seq.events);
		let i = 0;
		let tail = -1;
		const maxFrames = fps * 60;
		while (i < maxFrames) {
			await page.clock.runFor(1000 / fps);
			await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
			i++;
			if (tail < 0 && (await page.evaluate(() => window.__recDone))) tail = i;
			if (tail >= 0 && i - tail >= fps) break; // one second after the sequence resolved
		}
		console.log(`tier ${tier}: ${seq.nwins} win(s), sequence resolved after ${(tail / fps).toFixed(2)} s (${i} frames)`);
		await page.clock.runFor(1500);
	}
	console.log('errors', JSON.stringify(errors.slice(0, 5)), await page.evaluate(() => window.__recErr || ''));
	await browser.close();
})();
