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
	await page.mouse.click(185, 578); // Buy Bonus (left corner cluster)
	await page.waitForTimeout(1500);
	await page.screenshot({ path: path.join(outDir, '00_buy_menu.png') });
	await page.locator('.pop-up-wrap button.buy').nth(Number(cardIndex)).click();
	await page.waitForTimeout(1200);
	await page.screenshot({ path: path.join(outDir, '00_confirm.png') });
	await page.locator('.pop-up-wrap [data-test="confirm-button"]').click();
	tBuy = Date.now();
	const t0 = Date.now();
	let i = 0;
	while (Date.now() - t0 < Number(secs) * 1000) {
		await page.waitForTimeout(Number(process.env.STEP || 1500));
		await page.screenshot({ path: path.join(outDir, `s${String(i++).padStart(3, '0')}.png`) });
		const st = await lgs(`/lgs/sessions/${s.sessionID}`);
		if (st.lastBet && !st.activeBet && Date.now() - t0 > 8000) break;
		if (i % 2 === 0 && Date.now() - t0 > Number(process.env.QUIET || 0) * 1000) await page.keyboard.press('Space');
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
