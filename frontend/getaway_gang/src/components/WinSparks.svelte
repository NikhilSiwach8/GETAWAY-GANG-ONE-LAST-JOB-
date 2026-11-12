<script lang="ts">
	/**
	 * Win sparks: one pooled ParticleContainer in board space. The win director calls `burst()` at each
	 * win's impact; sparks fly out of the winning cells, slow down (eased drag) and fade. The ticker callback
	 * is attached only while sparks are alive. Phones get half the pool.
	 */
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextApp, getContextParent } from 'pixi-svelte';
	import { winHooks } from '../game/wins/winDirector.svelte';
	import { PARTICLES } from '../game/wins/sequences';
	import { dotTexture } from '../game/env/textures';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { Position } from '../game/types';

	const S = SYMBOL_SIZE;
	const app = getContextApp();
	const parent = getContextParent();
	const ticker = app.stateApp.pixiApplication!.ticker;
	const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
	const N = mobile ? PARTICLES.poolMobile : PARTICLES.poolDesktop;

	const pc = new PIXI.ParticleContainer({ dynamicProperties: { position: true, color: true, vertex: true, rotation: false, uvs: false }, blendMode: 'add' });
	pc.zIndex = 30;
	pc.boundsArea = new PIXI.Rectangle(-S, -S, S * 9, S * 7);
	const tex = dotTexture();
	const ps: PIXI.Particle[] = [];
	const vx = new Float32Array(N);
	const vy = new Float32Array(N);
	const life = new Float32Array(N);
	const dur = new Float32Array(N);
	const size = new Float32Array(N);
	for (let i = 0; i < N; i++) {
		const p = new PIXI.Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, alpha: 0, scaleX: 0, scaleY: 0 });
		ps.push(p);
		pc.addParticle(p);
	}
	parent.addToParent(pc);

	let alive = 0;
	let cursor = 0;
	let attached = false;
	const step = (tk: PIXI.Ticker) => {
		const dt = Math.min(tk.deltaMS / 1000, 0.05);
		alive = 0;
		for (let i = 0; i < N; i++) {
			if (life[i] <= 0) continue;
			life[i] -= dt;
			const p = ps[i];
			if (life[i] <= 0) {
				p.alpha = 0;
				continue;
			}
			alive++;
			const k = 1 - life[i] / dur[i]; // 0 -> 1 over the spark's life
			const drag = Math.pow(0.04, dt); // eased slow-down
			vx[i] *= drag;
			vy[i] = vy[i] * drag + 420 * dt; // a little gravity
			p.x += vx[i] * dt;
			p.y += vy[i] * dt;
			const fade = 1 - k * k; // quadratic fade-out
			p.alpha = fade;
			p.scaleX = p.scaleY = (size[i] / 32) * (0.5 + 0.5 * fade);
		}
		if (!alive) detach();
	};
	const attach = () => {
		if (!attached) (attached = true), ticker.add(step);
	};
	const detach = () => {
		if (attached) (attached = false), ticker.remove(step);
	};

	/** deterministic spread: sparks leave each cell at evenly spaced angles (no random timing) */
	const burst = (cells: Position[], tint: number, count: number) => {
		const n = Math.max(1, Math.round(count * (mobile ? PARTICLES.mobileScale : 1)));
		for (const c of cells) {
			const x = getSymbolX(c.reel);
			const y = (c.row - 0.5) * S;
			for (let j = 0; j < n; j++) {
				const i = cursor;
				cursor = (cursor + 1) % N;
				const a = (j / n) * Math.PI * 2 + c.reel * 0.7 + c.row * 1.3;
				const v = S * (2.6 + (j % 3) * 0.9);
				const p = ps[i];
				p.x = x + Math.cos(a) * S * 0.25;
				p.y = y + Math.sin(a) * S * 0.25;
				p.tint = j % 3 === 0 ? 0xffffff : tint;
				vx[i] = Math.cos(a) * v;
				vy[i] = Math.sin(a) * v - S * 0.8;
				dur[i] = life[i] = 0.55 + (j % 4) * 0.08;
				size[i] = S * (0.07 + (j % 2) * 0.04);
			}
		}
		attach();
	};
	winHooks.burst = burst;
	onDestroy(() => {
		detach();
		if (winHooks.burst === burst) winHooks.burst = undefined;
	});
</script>
