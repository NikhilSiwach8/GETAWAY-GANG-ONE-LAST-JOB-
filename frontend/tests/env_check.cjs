// Living-background check (dev server only: uses the window.__env hook from Environment.svelte).
//   node frontend/tests/env_check.cjs http://localhost:3010 <outDir> [scenes=basegame,heist,escape,hidden] [seconds=6] [fps=12]
// For each scene: shows it, verifies the environment is built and visible, checks pause/resume keeps the
// clock frozen and continuous, then renders a frame-stepped sequence (deterministic dt) to <outDir>/<scene>/.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , frontendUrl, outDir, sceneArg, secArg, fpsArg] = process.argv;
const scenes = (sceneArg || 'basegame,heist,escape,hidden').split(',');
const seconds = Number(secArg || 6);
const fps = Number(fpsArg || 12);
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
(async () => {
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
	const ok = (cond, msg) => console.log(cond ? 'PASS' : 'FAIL', msg) || cond;
	const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
	let allOk = true;
	for (const scene of scenes) {
		await page.evaluate((sc) => (window.__env.stateGame.hud.bonus = sc === 'basegame' ? undefined : sc), scene);
		await page.waitForTimeout(400);
		// finish the 0.6 s cross-fade deterministically (software GL in CI renders only a few fps)
		await page.evaluate(() => { for (let i = 0; i < 8; i++) window.__env.director.step(0.1); });
		await frame();
		const st = await page.evaluate((sc) => {
			const g = window.__env.groups.get(sc);
			return g && { visible: g.container.visible, alpha: g.container.alpha, children: g.container.children.length, others: [...window.__env.groups.entries()].filter(([k, x]) => k !== sc && x.container.visible).length };
		}, scene);
		allOk &= ok(st && st.visible && st.alpha > 0.99 && st.children > 10, `${scene}: built and visible ${JSON.stringify(st)}`);
		allOk &= ok(st && st.others === 0, `${scene}: other scenes faded out and idle`);
		// pause / resume: the clock must not move while paused and must continue from the same value
		const t0 = await page.evaluate(() => (window.__env.director.setPaused('check', true), window.__env.director.t));
		await page.waitForTimeout(800);
		const t1 = await page.evaluate(() => window.__env.director.t);
		await page.evaluate(() => window.__env.director.setPaused('check', false));
		await page.waitForTimeout(800);
		const t2 = await page.evaluate(() => window.__env.director.t);
		allOk &= ok(t1 === t0 && t2 > t1 && t2 - t1 < 1.2, `${scene}: pause holds the clock (${t0.toFixed(3)} -> ${t1.toFixed(3)}) and resume continues (${t2.toFixed(3)})`);
		// deterministic capture
		const dir = path.join(outDir, scene);
		fs.mkdirSync(dir, { recursive: true });
		await page.evaluate(() => window.__env.director.setPaused('capture', true));
		for (let i = 0; i < seconds * fps; i++) {
			await page.evaluate((dt) => window.__env.director.step(dt), 1 / fps);
			await frame();
			await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
		}
		await page.evaluate(() => window.__env.director.setPaused('capture', false));
	}
	allOk &= ok(errors.length === 0, `no page errors ${JSON.stringify(errors.slice(0, 3))}`);
	await browser.close();
	process.exit(allOk ? 0 : 1);
})();
