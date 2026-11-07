// UI check: loads the game, screenshots idle, then clicks the given (x,y) points in order with screenshots,
// and reports frame-time stats (rAF) and long tasks while a forced book plays.
//   node frontend/tests/ui_check.cjs http://localhost:3010 <outDir> [bookId] [x,y ...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, bookArg, ...clicks] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const session = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const url = `${frontendUrl}/?${session.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`;
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const vp = (process.env.VIEWPORT || '1422x800').split('x').map(Number);
	const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ignoreHTTPSErrors: true, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
	await page.addInitScript(() => {
		window.__frames = [];
		window.__long = [];
		let last = performance.now();
		const loop = (t) => {
			window.__frames.push(t - last);
			last = t;
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
		new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
	});
	await page.goto(url);
	await page.waitForTimeout(20000);
	await page.screenshot({ path: path.join(outDir, '00_loading.png') });
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(400);
	await page.screenshot({ path: path.join(outDir, '00b_transition.png') });
	await page.waitForTimeout(3000);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(6000);
	await page.screenshot({ path: path.join(outDir, '01_idle.png') });
	let n = 2;
	for (const c of clicks) {
		if (c === 'esc') await page.keyboard.press('Escape');
		else if (c.startsWith('wait')) await page.waitForTimeout(Number(c.slice(4)));
		else if (c.startsWith('scroll')) await page.mouse.wheel(0, Number(c.slice(6)));
		else {
			const [x, y] = c.split(',').map(Number);
			await page.mouse.click(x, y);
		}
		await page.waitForTimeout(1200);
		await page.screenshot({ path: path.join(outDir, `${String(n++).padStart(2, '0')}_${c.replace(/[^0-9a-z]/gi, '_')}.png`) });
	}
	if (bookArg && bookArg !== '-') {
		await lgs(`/lgs/sessions/${session.sessionID}/force`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: { bookId: Number(bookArg) } }) });
		await page.evaluate(() => {
			window.__frames = [];
			window.__long = [];
		});
		await page.mouse.click(731, 742);
		for (let i = 0; i < 24; i++) {
			await page.waitForTimeout(2500);
			await page.screenshot({ path: path.join(outDir, `play_${String(i).padStart(2, '0')}.png`) });
			await page.mouse.click(vp[0] / 2, vp[1] / 2);
		}
		const f = await page.evaluate(() => window.__frames.slice(5));
		const longs = await page.evaluate(() => window.__long);
		const s = [...f].sort((a, b) => a - b);
		const q = (p) => s[Math.floor(p * (s.length - 1))].toFixed(1);
		console.log(JSON.stringify({ frames: f.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1].toFixed(0), over100ms: f.filter((x) => x > 100).length, longTasks: longs.length, longestTask: Math.max(0, ...longs.map((l) => l[1])) }));
	}
	const st = await lgs(`/lgs/sessions/${session.sessionID}`);
	console.log('lastBet', JSON.stringify({ mode: st.lastBet?.mode, amount: st.lastBet?.amount, cost: st.lastBet?.cost, payoutMultiplier: st.lastBet?.payoutMultiplier, active: !!st.activeBet }));
	console.log('errors', JSON.stringify(errors.slice(0, 10)));
	await browser.close();
})();
