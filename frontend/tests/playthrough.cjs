// End-to-end play-through: real frontend build + local RGS + forced feature books.
//   node frontend/tests/playthrough.cjs http://localhost:3010 <outDir> [case ...]   (dev RGS on :7771)
// Cases: base, pbp, heist, escape, maxwin, respin4, retrigger, masters4  (book ids from showcase.json)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [, , frontendUrl, outDir, ...wanted] = process.argv;
const showcase = JSON.parse(fs.readFileSync(path.join(__dirname, '../dev-rgs/data/showcase.json'), 'utf8'));
let sessionID;
let playUrl;
const CASES = {
	base: { force: null, waitMs: 12000 },
	pbp: { force: showcase.perfectlyBadPlan[1], waitMs: 300000 },
	respin4: { force: showcase.respin_chain_4[0], waitMs: 60000 },
	heist: { force: showcase.bonus_heist[0], waitMs: 240000 },
	escape: { force: showcase.bonus_escape[0], waitMs: 360000 },
	maxwin: { force: showcase.wincap[0], waitMs: 360000 },
	retrigger: { force: showcase.retrigger[0], waitMs: 360000 },
	masters4: { force: showcase.final_escape_masters_4[0], waitMs: 420000 },
};

const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
const force = (bookId) =>
	lgs(`/lgs/sessions/${sessionID}/force`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ force: bookId === null ? null : { bookId } }),
	});

(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	// Fresh session per run, so no unfinished round from an earlier run is resumed.
	const session = await lgs('/lgs/sessions', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ gameId: 'getaway_gang' }),
	});
	sessionID = session.sessionID;
	playUrl = `${frontendUrl}/?${session.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`;
	const browser = await chromium.launch();
	// Real https path to the dev RGS TLS proxy (self-signed certificate).
	const page = await browser.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
	await page.goto(playUrl);
	await page.waitForTimeout(20000);
	await page.screenshot({ path: path.join(outDir, '00_loading.png') });
	await page.mouse.click(711, 400); // "press anywhere to continue"
	await page.waitForTimeout(3000);
	await page.mouse.click(711, 400);
	await page.waitForTimeout(1000);
	await page.waitForTimeout(5000); // UI fades in after the loading screen; earlier clicks are ignored
	if (process.env.TURBO) await page.mouse.click(842, 742); // shared UI turbo button (desktop layout)
	await page.screenshot({ path: path.join(outDir, '01_idle.png') });

	const results = [];
	for (const name of wanted.length ? wanted : ['base', 'pbp']) {
		const c = CASES[name];
		await force(c.force);
		const before = (await lgs(`/lgs/sessions/${sessionID}`)).lastBet?.id ?? 0;
		const errorsBefore = errors.length;
		await page.mouse.click(731, 742); // shared UI BET button (desktop layout)
		const t0 = Date.now();
		let shot = 0;
		let done = false;
		while (Date.now() - t0 < c.waitMs) {
			await page.waitForTimeout(2500);
			const s = await lgs(`/lgs/sessions/${sessionID}`);
			if (shot < 40 && (Date.now() - t0) > shot * (Number(process.env.SHOT_MS) || 15000)) {
				await page.screenshot({ path: path.join(outDir, `${name}_${String(shot).padStart(2, '0')}.png`) });
				shot++;
			}
			// round finished on the RGS side and the client is ready for another bet again
			if ((s.lastBet?.id ?? 0) > before && !s.activeBet) {
				const ready = await page.evaluate(() => document.body.innerText.length >= 0);
				if (ready && Date.now() - t0 > 6000) {
					done = true;
					break;
				}
			}
			await page.mouse.click(711, 400); // dismiss intro/outro "press to continue" screens
		}
		await page.screenshot({ path: path.join(outDir, `${name}_end.png`) });
		const s = await lgs(`/lgs/sessions/${sessionID}`);
		results.push({
			case: name,
			bookId: s.lastBet?.bookId,
			payoutMultiplier: s.lastBet?.payoutMultiplier,
			settled: done,
			seconds: Math.round((Date.now() - t0) / 1000),
			newErrors: errors.slice(errorsBefore),
		});
		console.log(JSON.stringify(results[results.length - 1]));
	}
	await force(null);
	fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results, errors }, null, 1));
	await browser.close();
})();
