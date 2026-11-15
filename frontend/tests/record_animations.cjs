// Record the UI animations as smooth 30 fps clips, independent of how fast this machine renders.
//   node frontend/tests/record_animations.cjs http://localhost:3010 <outDir>
// Canvas animations (Pixi): the page clock is frozen and stepped 1/30 s per frame (Playwright clock drives
// Date, performance.now, timers and requestAnimationFrame), so every frame is what a real device would show.
// CSS animations (dialogs, hover): the browser animation clock is slowed (default 50x) via DevTools and captured in real
// time; frames carry timestamps and are re-timed to real speed when encoded.
// Needs the dev server (the counter / multiplier clip uses the dev-only window.__playEvents hook).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [, , url = 'http://localhost:3010', outDir = '/dev/shm/rec'] = process.argv;
const lgs = (p, init) => fetch(`http://localhost:7770${p}`, init).then((r) => r.json());
const FPS = 30;

const encodeRegular = (dir, out) =>
	execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out]);
// CSS clips: frames captured at irregular real times under a 0.1x animation clock -> real-speed concat list
const encodeTimed = (dir, stamps, out, slow = 10) => {
	const list = stamps.map((t, i) => `file '${path.join(dir, `f${String(i).padStart(4, '0')}.png`)}'\nduration ${(((stamps[i + 1] ?? t + 300) - t) / slow / 1000).toFixed(4)}`).join('\n');
	fs.writeFileSync(path.join(dir, 'list.txt'), list + `\nfile '${path.join(dir, `f${String(stamps.length - 1).padStart(4, '0')}.png`)}'\n`);
	execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out]);
};
const fresh = (name) => {
	const d = path.join(outDir, name);
	fs.rmSync(d, { recursive: true, force: true });
	fs.mkdirSync(d, { recursive: true });
	return d;
};

(async () => {
	fs.mkdirSync(outDir, { recursive: true });
	const s = await lgs('/lgs/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: 'getaway_gang' }) });
	const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
	const page = await browser.newPage({ viewport: { width: 1422, height: 800 }, ignoreHTTPSErrors: true });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
	const CSS_ONLY = !!process.env.CSS_ONLY; // re-record just the CSS clips
	// CSS clips: the dialog / hover durations are stretched by SLOW in this page only (same easing curves), captured
	// in real time and re-timed to real speed. (DevTools' animation playback rate does not slow CSS transitions.)
	const SLOW = Number(process.env.CSS_SLOW ?? 20);
	const RATE = 1 / SLOW;
	if (!CSS_ONLY) await page.clock.install();
	await page.goto(`${url}/?${s.launchQuery.replace('localhost%3A7770', 'localhost%3A7771')}`);
	await page.waitForTimeout(Number(process.env.LOADWAIT ?? 45) * 1000);
	await page.mouse.click(711, 400); // press to continue
	await page.waitForTimeout(8000);
	await page.addStyleTag({ content: `
		.pop-up-wrap .ui-popup-standard-content-wrap, .pop-up-wrap .panel, .pop-up-wrap .wrap { animation-duration: ${280 * SLOW}ms !important; }
		.pop-up-wrap .card { transition-duration: ${180 * SLOW}ms !important; }
		.pop-up-wrap button, .pop-up-wrap button .rectangle { transition-duration: ${120 * SLOW}ms !important; }` });

	// ---- 1. dialog springs open (CSS) ---------------------------------------------------------------------
	{
		const d = fresh('dialog');
		const stamps = [];
		const t0 = Date.now();
		await page.mouse.click(1220, 755); // the BET value opens the bet menu
		for (let i = 0; Date.now() - t0 < 420 / RATE; i++) {
			await page.screenshot({ path: path.join(d, `f${String(i).padStart(4, '0')}.png`), clip: { x: 360, y: 90, width: 700, height: 620 } });
			stamps.push(Date.now() - t0);
		}
		encodeTimed(d, stamps, path.join(outDir, '1_dialog_spring_open.mp4'), 1 / RATE);
		await page.keyboard.press('Escape');
		await page.locator('.pop-up-wrap [data-test="close-button"]').first().click().catch(() => {});
		await page.waitForTimeout(1500);
		console.log('dialog frames', stamps.length);
	}

	// ---- 2. Buy Bonus cards: hover, then press the BUY button (CSS) ---------------------------------------
	{
		const d = fresh('hover');
		const stamps = [];
		const t0 = Date.now();
		await page.mouse.click(185, 578); // Buy Bonus: the window springs open, then hover / press
		await page.waitForTimeout(400);
		const buy = page.locator('.pop-up-wrap button.buy').first();
		await buy.waitFor();
		let bb = await buy.boundingBox();
		let phase = 0;
		const T = (ms) => ms / RATE; // animation-time milestones in real time
		for (let i = 0; Date.now() - t0 < T(1150); i++) {
			const el = Date.now() - t0;
			if (phase === 0 && el > T(330)) {
				const cb = await page.locator('.pop-up-wrap .card').first().boundingBox();
				await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height * 0.25, { steps: 4 }); // over the first card's art
				phase = 1;
			} else if (phase === 1 && el > T(650)) {
				bb = await buy.boundingBox();
				await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 3 }); // onto its BUY button
				phase = 2;
			} else if (phase === 2 && el > T(850)) {
				await page.mouse.down(); // press (held, never released: nothing is bought)
				phase = 3;
			}
			await page.screenshot({ path: path.join(d, `f${String(i).padStart(4, '0')}.png`), clip: { x: 60, y: 120, width: 520, height: 560 } });
			stamps.push(el);
		}
		encodeTimed(d, stamps, path.join(outDir, '2_card_hover_and_press.mp4'), 1 / RATE);
		await page.keyboard.press('Escape');
		await page.mouse.move(711, 300);
		await page.mouse.up();
		await page.locator('.pop-up-wrap [data-test="close-button"]').first().click().catch(() => {});
		await page.waitForTimeout(2000);
		console.log('hover frames', stamps.length);
	}

	if (CSS_ONLY) return void (await browser.close());
	// ---- 3. spin button: idle glow, hover, whirl on spin (canvas, stepped clock) --------------------------
	const now = await page.evaluate(() => Date.now());
	await page.clock.pauseAt(now + 200);
	await page.clock.runFor(250);
	{
		const d = fresh('spin');
		const frames = 4.2 * FPS;
		for (let i = 0; i < frames; i++) {
			if (i === Math.round(2.0 * FPS)) await page.mouse.move(1222, 628); // hover
			if (i === Math.round(2.6 * FPS)) await page.mouse.click(1222, 628); // spin
			await page.clock.runFor(1000 / FPS);
			await page.screenshot({ path: path.join(d, `f${String(i).padStart(4, '0')}.png`), clip: { x: 1080, y: 470, width: 300, height: 300 } });
		}
		encodeRegular(d, path.join(outDir, '3_spin_button_glow_and_whirl.mp4'));
		// let the spin finish
		for (let k = 0; k < 60; k++) await page.clock.runFor(200);
		await page.mouse.move(711, 300);
		console.log('spin frames', frames);
	}

	// ---- 4. free-spin counter, retrigger total and multiplier pop (canvas, stepped clock) ------------------
	{
		const d = fresh('pop');
		const fire = (events) => page.evaluate((ev) => { window.__playEvents(ev); }, events);
		const script = [
			[0.2, [{ index: 0, type: 'updateFreeSpin', amount: 0, total: 10 }]],
			[1.4, [{ index: 0, type: 'updateFreeSpin', amount: 1, total: 10 }]],
			[2.6, [{ index: 0, type: 'updateFreeSpin', amount: 2, total: 10 }]],
			[3.8, [{ index: 0, type: 'updateFreeSpin', amount: 2, total: 15 }]],
			[5.2, [{ index: 0, type: 'winMultiplier', multiplier: 2, parts: { getawayMeter: 2 } }]],
			[7.6, [{ index: 0, type: 'winMultiplier', multiplier: 5, parts: { getawayMeter: 5 } }]],
		];
		const frames = 10 * FPS;
		for (let i = 0; i < frames; i++) {
			for (const [at, ev] of script) if (i === Math.round(at * FPS)) await fire(ev);
			await page.clock.runFor(1000 / FPS);
			await page.screenshot({ path: path.join(d, `f${String(i).padStart(4, '0')}.png`) });
		}
		// the free-spin counter (left) and the multiplier plate (right), side by side
		execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(d, 'f%04d.png'), '-filter_complex',
			'[0:v]crop=240:220:70:200,scale=360:330[a];[0:v]crop=270:230:1100:330,scale=388:330[b];[a][b]hstack=inputs=2,pad=iw+16:ih:8:0',
			'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', path.join(outDir, '4_counter_and_multiplier_pop.mp4')]);
		console.log('pop frames', frames);
	}
	await browser.close();
})();
