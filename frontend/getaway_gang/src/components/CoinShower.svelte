<script lang="ts">
	/**
	 * Coin shower with the gold coin cut from the delivered art (FX-COIN): a fountain from below the amount
	 * and, for the bigger tiers, rain from the top; coins tumble (flip + spin) under gravity.
	 * One pooled PixiJS ParticleContainer (no per-frame allocation, no Svelte work per coin); emission rates
	 * per tier come from game/wins/sequences.ts and are fixed (an accumulator, not random gaps); the ticker
	 * callback is attached only while coins are emitted or alive. Phones get half the pool and half the rate.
	 * `burst` adds an instant spray (tier stage impacts). Canvas coordinates.
	 */
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextApp, getContextParent } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { TIER_LOOK } from '../game/wins/sequences';

	type Props = { emit: boolean; levelAlias?: string; burst?: number };
	const props: Props = $props();
	const context = getContext();
	const app = getContextApp();
	const parent = getContextParent();
	const ticker = app.stateApp.pixiApplication!.ticker;
	const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
	const N = mobile ? 110 : 220;
	const SMALL: Record<string, [number, number]> = { nice: [10, 0], substantial: [18, 0] };
	const rate = $derived(((TIER_LOOK as Record<string, { coins: [number, number] }>)[props.levelAlias ?? '']?.coins ?? SMALL[props.levelAlias ?? ''] ?? [0, 0]).map((r) => r * (mobile ? 0.5 : 1)));

	const tex = app.stateApp.loadedAssets?.['FX-COIN'] as PIXI.Texture | undefined;
	const pc = new PIXI.ParticleContainer({ dynamicProperties: { position: true, rotation: true, vertex: true, color: true, uvs: false } });
	pc.zIndex = 40;
	const ps: PIXI.Particle[] = [];
	const st = { vx: new Float32Array(N), vy: new Float32Array(N), ph: new Float32Array(N), vph: new Float32Array(N), vr: new Float32Array(N), s: new Float32Array(N), on: new Uint8Array(N) };
	if (tex) {
		for (let i = 0; i < N; i++) {
			const p = new PIXI.Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
			ps.push(p);
			pc.addParticle(p);
		}
	}
	parent.addToParent(pc);

	const cs = $derived(context.stateLayoutDerived.canvasSizes());
	const k = $derived(Math.min(cs.width / 1920, cs.height / 1080));
	$effect(() => {
		pc.boundsArea = new PIXI.Rectangle(0, -200, cs.width, cs.height + 400);
	});

	let acc = [0, 0];
	let seq = 0; // deterministic variety: a golden-ratio sequence instead of random numbers
	const q = () => ((seq = (seq + 0.6180339887) % 1), seq);
	let cursor = 0;
	const spawn = (fountain: boolean) => {
		if (!ps.length) return;
		const i = cursor;
		cursor = (cursor + 1) % N;
		const p = ps[i];
		if (fountain) {
			const a = -Math.PI / 2 + (q() - 0.5) * 1.1;
			const v = (1500 + q() * 900) * k;
			p.x = cs.width / 2 + (q() - 0.5) * 160 * k;
			p.y = cs.height + 40 * k;
			st.vx[i] = Math.cos(a) * v;
			st.vy[i] = Math.sin(a) * v;
		} else {
			p.x = q() * cs.width;
			p.y = -60 * k;
			st.vx[i] = (q() - 0.5) * 120 * k;
			st.vy[i] = (200 + q() * 300) * k;
		}
		st.ph[i] = q() * 6;
		st.vph[i] = 7 + q() * 9;
		p.rotation = q() * 6;
		st.vr[i] = (q() - 0.5) * 6;
		st.s[i] = (0.7 + q() * 0.6) * k;
		st.on[i] = 1;
		p.alpha = 1;
	};

	let attached = false;
	const step = (tk: PIXI.Ticker) => {
		const dt = Math.min(tk.deltaMS / 1000, 0.05);
		const g = 2400 * k;
		let alive = 0;
		for (let i = 0; i < ps.length; i++) {
			if (!st.on[i]) continue;
			const p = ps[i];
			st.vy[i] += g * dt;
			p.x += st.vx[i] * dt;
			p.y += st.vy[i] * dt;
			st.ph[i] += st.vph[i] * dt;
			p.rotation += st.vr[i] * dt;
			const flip = Math.cos(st.ph[i]);
			p.scaleX = ((58 * st.s[i]) / (tex?.width || 58)) * Math.max(0.15, Math.abs(flip));
			p.scaleY = (46 * st.s[i]) / (tex?.height || 46);
			p.tint = flip > 0 ? 0xffffff : 0xd9a441;
			if (p.y > cs.height + 120 * k) {
				st.on[i] = 0;
				p.alpha = 0;
			} else alive++;
		}
		if (props.emit) {
			acc[0] += rate[0] * dt;
			acc[1] += rate[1] * dt;
			while (acc[0] >= 1) (acc[0] -= 1), spawn(true);
			while (acc[1] >= 1) (acc[1] -= 1), spawn(false);
		}
		if (!props.emit && !alive) detach();
	};
	const attach = () => {
		if (!attached) (attached = true), ticker.add(step);
	};
	const detach = () => {
		if (attached) (attached = false), ticker.remove(step), (acc = [0, 0]);
	};
	$effect(() => {
		if (props.emit) attach();
	});
	// an instant spray on each tier stage impact
	let lastBurst = 0;
	$effect(() => {
		const b = props.burst ?? 0;
		if (b > lastBurst) {
			lastBurst = b;
			for (let j = 0; j < (mobile ? 12 : 24); j++) spawn(true);
			attach();
		}
	});
	onDestroy(detach);
</script>
