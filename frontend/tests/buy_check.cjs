// Buy a bonus through the real UI with a forced book, then follow the round (Space only, no clip skipping).
//   node frontend/tests/buy_check.cjs http://localhost:3010 <outDir> <cardIndex 0..2> <bookId> [seconds]
// THROTTLE=<Mbit/s>: emulate a real connection (60 ms latency); WAIT=<s>: seconds after load before buying.
// Logs when each ENTRY clip finished downloading, relative to the bonus purchase.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , url, outDir, cardIndex, bookId, secs = '240'] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	// UA=safari: Safari user agent (no transparent WebM: only the opaque clips play)
	const userAgent = process.env.UA === 'safari' ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15' : undefined;
	const page = await browser.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true, userAgent });
	// PROFILE=1: record every frame time (and what was presenting) and CPU-profile the bonus; no screenshots
	if (process.env.PROFILE)
		await page.addInitScript(() => {
			window.__frames = [];
			let last = performance.now();
			const loop = (t) => {
				window.__frames.push([t, t - last]);
				last = t;
				requestAnimationFrame(loop);
			};
			requestAnimationFrame(loop);
		});
	// AUDIO=1: record every sound the game starts (Web Audio buffer offset -> sprite name, mapped at the end)
	if (process.env.AUDIO)
		await page.addInitScript(() => {
			window.__aud = [];
			const start = AudioBufferSourceNode.prototype.start;
			AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
				window.__aud.push({ offset: offset ?? 0, loop: this.loop, t: performance.now() });
				return start.apply(this, arguments);
			};
		});
	if (process.env.NOCLIPS) await page.addInitScript(() => { HTMLMediaElement.prototype.canPlayType = () => ''; });
	const errors = [];
	if (process.env.THROTTLE) {
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Network.enable');
		const bps = Number(process.env.THROTTLE) * 125000;
		await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: bps, uploadThroughput: bps });
	}
	const clipDone = [];
	let tBuy = 0;
	page.on('requestfinished', (r) => /\/clips\/ENTRY-/.test(r.url()) && clipDone.push(`${r.url().split('/').pop()} @${tBuy ? ((Date.now() - tBuy) / 1000).toFixed(1) + 's after buy' : 'before buy'}`));
	if (process.env.LOG) page.on('console', (m) => /clip|webm|video/i.test(m.text()) && console.log('console', m.text().slice(0, 200)));
	page.on('pageerror', (e) => errors.push(e.message));
	// any request outside the game's own origin and the local RGS (Stake does not allow external requests)
	page.on('request', (r) => { const h = new URL(r.url()).host; if (!/^localhost(:\d+)?$/.test(h) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errors.push(`EXTERNAL ${r.url()}`); });
	page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().split('?')[0]}`));
	// CSP=1: serve the page with a policy that blocks blob: media (as a strict host page might)
	if (process.env.CSP)
		await page.addInitScript(() =>
			document.addEventListener('DOMContentLoaded', () => {
				const m = document.createElement('meta');
				m.httpEquiv = 'Content-Security-Policy';
				m.content = "media-src 'self'";
				document.head.prepend(m);
			}),
		);
	page.on('console', (m) => m.text().startsWith('[clips]') && console.log('console', m.text().slice(0, 240)));
	await page.goto(`${url}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(Number(process.env.LOADWAIT ?? 22) * 1000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(Number(process.env.WAIT ?? 9) * 1000);
	await lgs(`/lgs/sessions/${s.sessionID}/force`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: { bookId: Number(bookId) } }) });
	await page.screenshot({ path: path.join(outDir, '00_before_buy.png') });
	if (process.env.TURBO) {
		await page.mouse.click(1345, 671); // turbo (lightning, right corner cluster)
		await page.waitForTimeout(600);
		await page.screenshot({ path: path.join(outDir, '00_turbo.png') });
	}
	await page.mouse.click(185, 578); // Buy Bonus (left corner cluster)
	await page.waitForTimeout(1500);
	await page.screenshot({ path: path.join(outDir, '00_buy_menu.png') });
	await page.locator('.pop-up-wrap button.buy').nth(Number(cardIndex)).click();
	await page.waitForTimeout(1200);
	await page.screenshot({ path: path.join(outDir, '00_confirm.png') });
	await page.locator('.pop-up-wrap [data-test="confirm-button"]').click();
	tBuy = Date.now();
	let cdp, profStartPerf;
	if (process.env.PROFILE) {
		cdp = await page.context().newCDPSession(page);
		await cdp.send('Profiler.enable');
		await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
		await cdp.send('Profiler.start');
		profStartPerf = await page.evaluate(() => performance.now());
		await page.evaluate(() => (window.__frames = []));
	}
	const t0 = Date.now();
	let i = 0;
	while (Date.now() - t0 < Number(secs) * 1000) {
		await page.waitForTimeout(Number(process.env.STEP || 1500));
		if (process.env.PROFILE) i++;
		else await page.screenshot({ path: path.join(outDir, `s${String(i++).padStart(3, '0')}.png`) });
		const st = await lgs(`/lgs/sessions/${s.sessionID}`);
		if (st.lastBet && !st.activeBet && Date.now() - t0 > 8000) break;
		if (i % 2 === 0 && Date.now() - t0 > Number(process.env.QUIET || 0) * 1000) await page.keyboard.press('Space');
	}
	if (process.env.PROFILE) {
		const { profile } = await cdp.send('Profiler.stop');
		const frames = await page.evaluate(() => window.__frames);
		const d = frames.map((f) => f[1]).sort((a, b) => a - b);
		const q = (p) => d[Math.floor(p * (d.length - 1))].toFixed(1);
		console.log(`frames ${d.length}  p50 ${q(0.5)}ms  p95 ${q(0.95)}ms  p99 ${q(0.99)}ms  >50ms ${d.filter((x) => x > 50).length}  >100ms ${d.filter((x) => x > 100).length}  >200ms ${d.filter((x) => x > 200).length}`);
		// sample times (perf clock): profile timestamps are microseconds; align profile start with performance.now()
		const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
		let t = 0;
		const samples = profile.samples.map((id, k) => ((t += profile.timeDeltas[k]), { id, at: profStartPerf + t / 1000 }));
		const name = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber + 1}`;
		const tally = (list) => {
			const m = {};
			for (const sm of list) m[name(nodes.get(sm.id))] = (m[name(nodes.get(sm.id))] ?? 0) + 1;
			return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 14);
		};
		const long = frames.filter((f) => f[1] > 60);
		const inLong = samples.filter((sm) => long.some(([end, dur]) => sm.at <= end && sm.at >= end - dur));
		console.log('top self-time overall:', JSON.stringify(tally(samples)));
		console.log('top self-time during >60ms frames:', JSON.stringify(tally(inLong)));
		console.log('worst frames (s after buy, ms):', JSON.stringify(long.sort((a, b) => b[1] - a[1]).slice(0, 15).map(([end, dur]) => [((end - profStartPerf) / 1000).toFixed(1), Math.round(dur)])));
	}
	const st = await lgs(`/lgs/sessions/${s.sessionID}`);
	console.log('entry clips downloaded:', JSON.stringify(clipDone));
	if (process.env.AUDIO) {
		const sprite = require(path.resolve(__dirname, '../getaway_gang/static/assets/audio/sounds.json')).sprite;
		const byStart = Object.entries(sprite).map(([n, [ms, dur]]) => ({ n, s: ms / 1000, e: (ms + dur) / 1000 }));
		const plays = await page.evaluate(() => window.__aud);
		const counts = {};
		for (const p of plays) {
			const hit = byStart.find((x) => p.offset >= x.s - 0.02 && p.offset < x.e);
			const k = hit ? hit.n : `?${p.offset.toFixed(2)}`;
			counts[k] = (counts[k] ?? 0) + 1;
		}
		console.log('sounds played:', JSON.stringify(counts));
	}
	console.log(JSON.stringify({ mode: st.lastBet?.mode, cost: st.lastBet?.cost, payoutMultiplier: st.lastBet?.payoutMultiplier, settled: !st.activeBet, seconds: Math.round((Date.now() - t0) / 1000), errors }));
	await browser.close();
})();
