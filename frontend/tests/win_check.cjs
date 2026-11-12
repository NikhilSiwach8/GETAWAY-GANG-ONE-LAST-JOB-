// Win presentation checks (dev server: window.__win from WinBoardFx, window.__playEvents from Game).
//   node frontend/tests/win_check.cjs http://localhost:3010
// Replays the real event sequences of fixtures_win_sequences.json on Playwright's fake clock and checks:
//  - the counter lands exactly on the setWin amount; tier stages follow the event's win level
//  - after each presentation: no timelines running, phase idle, board undimmed, no symbol left winning
//  - same outcome -> same presentation length (no random delays); fast play is shorter
//  - skip completes the count-up at once; two overlapping sequences never show a win while reels spin
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl] = process.argv;
const SEQ = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures_win_sequences.json'), 'utf8'));
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
let allOk = true;
const ok = (c, m) => (console.log(c ? 'PASS' : 'FAIL', m), (allOk = allOk && !!c));
(async () => {
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const url = `${frontendUrl}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`;
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 960, height: 540 }, ignoreHTTPSErrors: true });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.clock.install();
	await page.goto(url);
	await page.clock.resume();
	await page.waitForTimeout(25000);
	await page.mouse.click(480, 270);
	await page.waitForTimeout(3500);
	await page.mouse.click(480, 270);
	await page.waitForTimeout(5000);
	await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 2000);

	const STEP = 50;
	/** play events; sample every step; returns {ms, maxValue, stages, spinWhileWin} */
	const playSeq = async (events, opts = {}) =>
		page.evaluate(
			async ([events, opts]) => {
				const w = window.__win;
				w.stateBet.isTurbo = !!opts.turbo;
				window.__res = { done: false, stages: [], maxValue: 0, spinWhileWin: 0, skipped: null };
				const r = window.__res;
				const p = window.__playEvents(events).then(() => (r.done = true));
				if (opts.second) window.__playEvents(opts.second);
				window.__sampler = () => {
					const t = w.winFx.tier;
					if (t && r.stages[r.stages.length - 1] !== t.stageAlias) r.stages.push(t.stageAlias);
					r.maxValue = Math.max(r.maxValue, w.winFx.counter.value);
					const states = w.board().flatMap((reel) => reel.reelState.symbols.map((x) => x.symbolState));
					if (states.includes('spin') && (w.winFx.current || states.includes('win'))) r.spinWhileWin++;
					if (opts.skipAt && w.winFx.counter.counting && w.winFx.tier && r.skipped === null && w.winFx.counter.value > 0) {
						w.skipWin();
						r.skipped = w.winFx.counter.value;
					}
				};
				return true;
			},
			[events, opts],
		);
	const runUntilDone = async (maxMs = 90000) => {
		let ms = 0;
		while (ms < maxMs) {
			await page.clock.runFor(STEP);
			ms += STEP;
			const done = await page.evaluate(() => (window.__sampler(), window.__res.done));
			if (done) break;
		}
		return ms;
	};
	const after = () =>
		page.evaluate(() => {
			const w = window.__win;
			const states = w.board().flatMap((reel) => reel.reelState.symbols.map((x) => x.symbolState));
			return { live: w.liveTimelines(), running: w.runner.running, phase: w.winFx.phase, dim: w.boardFx.dim, winning: states.filter((x) => x === 'win').length, show: w.winFx.counter.show, current: !!w.winFx.current };
		});

	const lengths = {};
	for (const tier of ['2', '4', '6', '8', '9']) {
		const seq = SEQ[tier];
		const setWin = seq.events.find((e) => e.type === 'setWin');
		const amount = setWin.amount;
		await playSeq(seq.events);
		const ms = await runUntilDone();
		lengths[tier] = ms;
		const res = await page.evaluate(() => window.__res);
		const st = await after();
		// the counter shows amounts in bet-relative book units; the max value reached must be the event amount
		ok(Math.abs(res.maxValue - amount) < 1e-9, `tier ${tier}: counter landed on the setWin amount (${res.maxValue} == ${amount})`);
		if (Number(tier) >= 6) {
			const ladder = ['big', 'superwin', 'mega', 'epic'].slice(0, Number(tier) - 5);
			ok(JSON.stringify(res.stages) === JSON.stringify(ladder), `tier ${tier}: stages ${res.stages.join(' > ')} (expected ${ladder.join(' > ')})`);
		}
		ok(st.live === 0 && st.running === 0 && st.phase === 'idle' && !st.dim && st.winning === 0 && !st.show && !st.current, `tier ${tier}: clean reset ${JSON.stringify(st)} after ${(ms / 1000).toFixed(2)} s`);
		await page.clock.runFor(1000);
	}
	// determinism: the same sequence twice -> the same length
	await playSeq(SEQ['8'].events);
	const again = await runUntilDone();
	ok(again === lengths['8'], `tier 8 replayed: same length (${again} ms vs ${lengths['8']} ms)`);
	await page.clock.runFor(1000);
	// fast play
	await playSeq(SEQ['8'].events, { turbo: true });
	const turbo = await runUntilDone();
	ok(turbo < lengths['8'] * 0.75, `tier 8 fast play shorter (${turbo} ms vs ${lengths['8']} ms)`);
	await page.clock.runFor(1000);
	// skip: first skip completes the count-up immediately
	await playSeq(SEQ['9'].events, { skipAt: true });
	await page.clock.runFor(STEP);
	await runUntilDone();
	const sk = await page.evaluate(() => window.__res);
	ok(sk.skipped !== null && Math.abs(sk.maxValue - SEQ['9'].events.find((e) => e.type === 'setWin').amount) < 1e-9, `skip: count-up completed to the event amount (skipped at ${sk.skipped})`);
	ok(JSON.stringify(await after()).includes('"live":0'), 'skip: clean reset');
	await page.clock.runFor(1000);
	// overlap: a second sequence started while the first presents must wait (no win shown while reels spin)
	await playSeq(SEQ['4'].events, { second: SEQ['2'].events });
	await runUntilDone();
	await page.clock.runFor(9000);
	const ov = await page.evaluate(() => (window.__sampler(), window.__res));
	ok(ov.spinWhileWin === 0, `overlap: never a win on screen while reels spin (${ov.spinWhileWin} frames)`);
	ok(errors.length === 0, `no page errors ${JSON.stringify(errors.slice(0, 3))}`);
	console.log('lengths ms', JSON.stringify(lengths), 'turbo 8', turbo);
	await browser.close();
	process.exit(allOk ? 0 : 1);
})();
