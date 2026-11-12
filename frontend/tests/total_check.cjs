// Total Win check (dev server: window.__playEvents). Replays a real bonus book's bonusStart -> freeSpinEnd ->
// finalWin, screenshots the Total Win card, verifies the TOTAL clips (not the old story outros) are used, taps.
//   VIEWPORT=430x932 TOUCH=1 node frontend/tests/total_check.cjs http://localhost:3010 <outDir> [mode=heist] [bookId=0]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, modeArg, bookArg] = process.argv;
const mode = modeArg || 'heist';
const bookId = Number(bookArg || 0);
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const book = fs.readFileSync(path.join(__dirname, '../dev-rgs/data', `books_${mode}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((b) => b.id === bookId);
	const pick = (t) => book.events.find((e) => e.type === t);
	const events = [pick('bonusStart'), pick('freeSpinEnd'), pick('finalWin')].filter(Boolean);
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const vp = (process.env.VIEWPORT || '1422x800').split('x').map(Number);
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ignoreHTTPSErrors: true, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
	const errors = [];
	const clips = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => m.text().startsWith('[clips]') && console.log('console', m.text().slice(0, 200)));
	page.on('request', (r) => r.url().includes('/clips/') && clips.push(r.url().split('/').pop()));
	await page.goto(`${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(25000);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(3500);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(12000);
	await page.evaluate((ev) => {
		window.__totalDone = false;
		window.__playEvents(ev).then(() => (window.__totalDone = true));
	}, events);
	const t0 = Date.now();
	let i = 0;
	while (Date.now() - t0 < 28000) {
		await page.screenshot({ path: path.join(outDir, `s${String(i++).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 85 });
		await page.waitForTimeout(600);
	}
	await page.mouse.click(vp[0] / 2, vp[1] / 2); // finish the count / close
	await page.waitForTimeout(1500);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(6000);
	console.log('total clips fetched', JSON.stringify([...new Set(clips.filter((c) => c.startsWith('TOTAL-')))]));
	console.log('old outro clips fetched', JSON.stringify([...new Set(clips.filter((c) => /^SCR-.*-OUTRO/.test(c)))]));
	console.log('events resolved after taps', await page.evaluate(() => window.__totalDone));
	console.log('errors', JSON.stringify(errors.slice(0, 5)));
	await browser.close();
})();
