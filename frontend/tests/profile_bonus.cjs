// CPU-profile the main thread while a forced bonus book plays; prints self-time per function and frame stats.
//   node frontend/tests/profile_bonus.cjs http://localhost:3010 <bookId> [seconds]
const { chromium } = require('playwright');
const [, , frontendUrl, bookId, secs = '45'] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	await page.addInitScript(() => {
		window.__frames = [];
		let last = performance.now();
		const loop = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(loop); };
		requestAnimationFrame(loop);
	});
	await page.goto(`${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(22000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(8000);
	await lgs(`/lgs/sessions/${s.sessionID}/force`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: { bookId: Number(bookId) } }) });
	await page.mouse.click(731, 742);
	await page.waitForTimeout(9000); // trigger + intro
	await page.mouse.click(711, 400);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Profiler.enable');
	await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
	await page.evaluate(() => (window.__frames = []));
	await cdp.send('Profiler.start');
	await page.waitForTimeout(Number(secs) * 1000);
	const { profile } = await cdp.send('Profiler.stop');
	const f = await page.evaluate(() => window.__frames.slice(3));
	const vids = await page.evaluate(() => document.querySelectorAll('video').length);
	// self time per node
	const byId = new Map(profile.nodes.map((n) => [n.id, n]));
	const self = new Map();
	const dt = profile.timeDeltas;
	profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0)));
	const agg = new Map();
	for (const [id, t] of self) {
		const n = byId.get(id).callFrame;
		const key = `${n.functionName || '(anon)'} ${n.url.split('/').pop()}:${n.lineNumber}`;
		agg.set(key, (agg.get(key) || 0) + t);
	}
	const total = [...agg.values()].reduce((a, b) => a + b, 0);
	console.log('top self time (ms):');
	[...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, t]) => console.log((t / 1000).toFixed(0).padStart(7), ((100 * t) / total).toFixed(1).padStart(5) + '%', k));
	const sorted = [...f].sort((a, b) => a - b);
	const q = (p) => sorted[Math.floor(p * (sorted.length - 1))].toFixed(0);
	console.log(JSON.stringify({ frames: f.length, p50: q(0.5), p95: q(0.95), max: q(1), videos: vids }));
	await browser.close();
})();
