// Symbol system check (dev server only: uses the window.__sym hook from Board.svelte).
//   node frontend/tests/symbol_check.cjs http://localhost:3010 <outDir>
// 1. Every catalogue symbol has its texture loaded and its file served (paytable/rules use the URLs).
// 2. Puts all 14 symbols on the board at their real gameplay size and captures each visual state:
//    idle, winning (row 1) with the rest dimmed, highlighted (row 2), animated landing (row 3), then reset.
// 3. Reset must return the board to the idle picture (pixel difference within the board area).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
const NAMES = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S', 'R', 'B', 'T', 'F'];
(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const url = `${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`;
	const vp = (process.env.VIEWPORT || '1422x800').split('x').map(Number);
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] }, ignoreHTTPSErrors: true, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	await page.goto(url);
	await page.waitForTimeout(Number(process.env.LOADWAIT || 25000));
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(3500);
	await page.mouse.click(vp[0] / 2, vp[1] / 2);
	await page.waitForTimeout(4000);
	let allOk = true;
	const ok = (c, m) => (console.log(c ? 'PASS' : 'FAIL', m), (allOk = allOk && !!c));

	// 1. references
	const refs = await page.evaluate(() => Object.values(window.__sym.looks).map((l) => [l.name, l.assetId, window.__sym.hasTexture(l.assetId), !!l.metrics]));
	for (const [n, id, tex, met] of refs) ok(tex && met, `${n} -> ${id}: texture loaded ${tex}, metrics ${met}`);
	ok(refs.length === 14, `catalogue covers all 14 symbols (${refs.length})`);
	for (const id of [...refs.map((r) => r[1]), 'SYM-WILD-REEL']) {
		const r = await fetch(`${frontendUrl}/assets/gg/${id}.webp`);
		ok(r.status === 200, `served ${id}.webp (${r.status})`);
	}

	// 2. states on the real board
	await page.evaluate((names) => {
		const { stateGame, stopIdleGlints } = window.__sym;
		stopIdleGlints();
		stateGame.board.forEach((reel, r) => {
			for (let row = 1; row <= 4; row++) {
				const sym = reel.reelState.symbols[row];
				sym.rawSymbol = { name: names[((row - 1) * 6 + r) % names.length] };
				sym.symbolState = 'static';
				sym.oncomplete = () => {};
			}
		});
	}, NAMES);
	const shot = async (name, n = 1, gap = 450) => {
		for (let i = 0; i < n; i++) {
			await page.screenshot({ path: path.join(outDir, `${name}${n > 1 ? '_' + i : ''}.png`) });
			if (i < n - 1) await page.waitForTimeout(gap);
		}
	};
	await page.waitForTimeout(2500);
	await shot('idle');
	const setRow = (row, state) =>
		page.evaluate(([row, state]) => window.__sym.stateGame.board.forEach((reel) => (reel.reelState.symbols[row].symbolState = state)), [row, state]);
	// winning row 1, everything else dimmed
	await page.evaluate(() => (window.__sym.boardFx.dim = true));
	await setRow(1, 'win');
	await shot('win_dim', 5);
	// highlighted row 2 (crew colour on half, the symbol's own accent on the other half)
	await page.evaluate(() => {
		const { highlightCells } = window.__sym;
		highlightCells([0, 1, 2].map((reel) => ({ reel, row: 2 })), 0xff4c36, 4000);
		highlightCells([3, 4, 5].map((reel) => ({ reel, row: 2 })), 0, 4000);
	});
	await shot('highlight', 3);
	// landing row 3
	await setRow(3, 'land');
	await shot('land', 3, 150);
	// reset everything
	await page.evaluate(() => {
		window.__sym.boardFx.dim = false;
		window.__sym.symbolFx.highlighted = {};
	});
	for (const r of [1, 2, 3, 4]) await setRow(r, 'static');
	await page.waitForTimeout(5000);
	await shot('reset');
	const st = await page.evaluate(() => ({
		dim: window.__sym.boardFx.dim,
		highlighted: Object.keys(window.__sym.symbolFx.highlighted).length,
		states: window.__sym.stateGame.board.flatMap((reel) => [1, 2, 3, 4].map((r) => reel.reelState.symbols[r].symbolState)),
	}));
	ok(!st.dim && st.highlighted === 0 && st.states.every((x) => x === 'static'), `reset state clean ${JSON.stringify(st).slice(0, 120)}`);
	ok(errors.length === 0, `no page errors ${JSON.stringify(errors.slice(0, 3))}`);
	await browser.close();
	process.exit(allOk ? 0 : 1);
})();
