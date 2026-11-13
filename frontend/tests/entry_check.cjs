// Bonus entry check (dev server: window.__playEvents). Plays a real base book up to its freeSpinTrigger,
// screenshots the entry card over time, verifies the ENTRY clip (not the still) is on screen, then taps.
//   VIEWPORT=430x932 TOUCH=1 node frontend/tests/entry_check.cjs http://localhost:3010 <outDir> [bookId=4] [mode=base]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, bookArg, modeArg] = process.argv;
const bookId = Number(bookArg || 4);
const mode = modeArg || 'base';
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const book = fs
		.readFileSync(path.join(__dirname, '../dev-rgs/data', `books_${mode}.jsonl`), 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l))
		.find((b) => b.id === bookId);
	const upto = book.events.findIndex((e) => e.type === 'freeSpinTrigger');
	const events = book.events.slice(0, upto + 2); // reveal ... freeSpinTrigger, bonusStart
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const vp = (process.env.VIEWPORT || '1422x800').split('x').map(Number);
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ignoreHTTPSErrors: true, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
	const errors = [];
	const clips = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('request', (r) => r.url().includes('/clips/') && clips.push(r.url().split('/').pop()));
	page.on('console', (m) => m.text().startsWith('[clips]') && console.log('console', m.text().slice(0, 200)));
	// FAIL=<clip file>: make that clip unavailable (tests the fallbacks)
	if (process.env.FAIL) await page.route((u) => process.env.FAIL.split(',').some((f) => u.pathname.endsWith('/' + f)), (route) => route.abort());
	await page.goto(`${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(25000);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(3500);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(12000); // background prefetch
	await page.evaluate((ev) => {
		window.__entryDone = false;
		window.__playEvents(ev).then(() => (window.__entryDone = true));
	}, events);
	const t0 = Date.now();
	let i = 0;
	while (Date.now() - t0 < 30000) {
		await page.screenshot({ path: path.join(outDir, `s${String(i++).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 85 });
		await page.waitForTimeout(700);
	}
	// tap through
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(6000);
	await page.screenshot({ path: path.join(outDir, `after_tap.jpg`), type: 'jpeg', quality: 85 });
	const entryClips = [...new Set(clips.filter((c) => c.startsWith('ENTRY-')))];
	const oldClips = [...new Set(clips.filter((c) => /^SCR-.*-INTRO/.test(c)))];
	console.log('entry clips fetched', JSON.stringify(entryClips));
	console.log('old story intro clips fetched', JSON.stringify(oldClips));
	console.log('events resolved after tap', await page.evaluate(() => window.__entryDone));
	console.log('errors', JSON.stringify(errors.slice(0, 5)));
	await browser.close();
})();
