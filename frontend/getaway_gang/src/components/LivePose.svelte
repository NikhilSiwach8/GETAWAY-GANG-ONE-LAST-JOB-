<script lang="ts" module>
	export type PoseAction = 'idle' | 'cheer' | 'ability' | 'lose' | 'enter';
</script>

<script lang="ts">
	/**
	 * A crew member's delivered pose art (CHR-<NAME>-POSE) brought to life without new art: the picture is drawn
	 * on a 12×16 mesh and its vertices are bent every frame, weighted by height so the feet stay planted and the
	 * upper body moves most.
	 *   idle   : breathing (chest rises, shoulders widen a touch), slow sway from the hips, small head bob
	 *   cheer  : crouch → jump with stretch → land with squash, arms-up lean, then happy bounces
	 *   ability: wind-up lean back, lunge forward with a shake, settle
	 *   lose   : slump (shrink and lean), slow sigh
	 *   enter  : springs up from a squash
	 * Plus a periodic shine sweep across the figure (masked to its own shape). Anchored at the feet (x, y).
	 */
	import * as PIXI from 'pixi.js';
	import { onDestroy } from 'svelte';
	import { getContextApp, getContextParent, Container, Sprite } from 'pixi-svelte';

	type Props = {
		id: 'ROXY' | 'BYTE' | 'TANK' | 'FUSE';
		x: number;
		y: number;
		height: number;
		action?: PoseAction;
		/** bump to restart the action */
		nonce?: number;
		flip?: boolean;
		alpha?: number;
		zIndex?: number;
		/** phase offset so several characters do not breathe in sync */
		seed?: number;
		shine?: boolean;
		onended?: () => void;
	};
	const props: Props = $props();
	const app = getContextApp();
	const parent = getContextParent();

	const key = $derived(`CHR-${props.id}-POSE`);
	const texture = $derived((app.stateApp.loadedAssets?.[key] as PIXI.Texture) ?? PIXI.Texture.EMPTY);
	const COLS = 12;
	const ROWS = 16;

	const root = new PIXI.Container();
	const mesh = new PIXI.MeshPlane({ texture: PIXI.Texture.EMPTY, verticesX: COLS, verticesY: ROWS });
	root.addChild(mesh);
	parent.addToParent(root);
	let base: Float32Array | null = null;

	$effect(() => {
		const tex = texture;
		if (tex === PIXI.Texture.EMPTY) return;
		mesh.texture = tex;
		base = new Float32Array(mesh.geometry.getBuffer('aPosition').data as Float32Array);
	});

	$effect(() => {
		root.position.set(props.x, props.y);
		root.alpha = props.alpha ?? 1;
		root.zIndex = props.zIndex ?? 0;
	});

	let actionT0 = performance.now();
	let ended = false;
	$effect(() => {
		void props.action;
		void props.nonce;
		actionT0 = performance.now();
		ended = false;
	});
	const DUR: Record<PoseAction, number> = { idle: 0, cheer: 1.6, ability: 1.3, lose: 1.4, enter: 0.6 };

	const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
	const ease = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

	let shineX = $state(-2);
	let raf = 0;
	const tick = (now: number) => {
		raf = requestAnimationFrame(tick);
		if (!base || !texture.width) return;
		const t = now / 1000 + (props.seed ?? 0) * 1.7;
		const a = (now - actionT0) / 1000;
		const action = props.action ?? 'idle';
		const dur = DUR[action];
		if (dur && a > dur && !ended) {
			ended = true;
			props.onended?.();
		}
		// layered motion parameters
		const breathe = Math.sin(t * 1.9) * 0.012; // vertical stretch
		let sway = Math.sin(t * 0.9) * 0.018 + Math.sin(t * 2.3) * 0.004; // fraction of height, at the head
		let squash = 0; // + = taller/narrower
		let lift = 0; // whole-body jump, fraction of height
		let lean = 0; // forward lean (toward the reels), fraction of height at the head
		if (action === 'cheer' && a < dur) {
			if (a < 0.18) squash = -0.12 * ease(a / 0.18);
			else if (a < 0.5) {
				const p = (a - 0.18) / 0.32;
				squash = -0.12 + 0.26 * ease(p) - 0.14 * clamp01((p - 0.6) / 0.4);
				lift = Math.sin(clamp01(p) * Math.PI) * 0.12;
			} else {
				const p = a - 0.5;
				squash = -0.09 * Math.exp(-p * 7) * Math.cos(p * 22);
				lift = Math.abs(Math.sin(p * 7)) * 0.035 * Math.exp(-p * 2);
			}
			sway += Math.sin(a * 9) * 0.025 * Math.exp(-a * 1.5);
		} else if (action === 'ability' && a < dur) {
			lean = a < 0.3 ? -0.06 * ease(a / 0.3) : -0.06 + 0.16 * ease((a - 0.3) / 0.2) - 0.1 * ease((a - 0.6) / 0.6);
			if (a > 0.45 && a < 0.9) sway += Math.sin(a * 70) * 0.008 * (1 - (a - 0.45) / 0.45); // shake
			squash = a < 0.3 ? -0.05 * ease(a / 0.3) : -0.05 + 0.08 * ease((a - 0.3) / 0.2) - 0.03 * ease((a - 0.6) / 0.5);
		} else if (action === 'lose' && a < dur) {
			const p = Math.sin(clamp01(a / dur) * Math.PI);
			squash = -0.07 * p;
			lean = 0.05 * p;
		} else if (action === 'enter' && a < dur) {
			squash = -0.15 * (1 - ease(a / dur)) * Math.cos(a * 14);
		}
		const dir = props.flip ? -1 : 1;
		const H = props.height;
		const W = (H * texture.width) / texture.height;
		const bw = texture.width;
		const bh = texture.height;
		const pos = mesh.geometry.getBuffer('aPosition');
		const v = pos.data as Float32Array;
		for (let i = 0; i < v.length; i += 2) {
			const u = base[i] / bw - 0.5; // -0.5 .. 0.5
			const h = 1 - base[i + 1] / bh; // 0 at the feet .. 1 at the top
			const w = h * h; // upper body moves most
			const sy = 1 + breathe * h + squash;
			const sx = 1 + breathe * 0.6 * (h > 0.45 && h < 0.8 ? 1 : 0) - squash * 0.5;
			v[i] = dir * u * W * sx + (sway + lean) * dir * H * w;
			v[i + 1] = -h * H * sy - lift * H;
		}
		pos.update();
		// shine sweep every ~6 s
		const cyc = (t % 6.5) / 1.1;
		shineX = cyc < 1 ? -0.7 + cyc * 1.4 : -2;
	};
	raf = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(raf));
</script>

{#if props.shine !== false && shineX > -1.5}
	<!-- shine across the figure, clipped to it with a plain sprite mask of the same art -->
	<Container x={props.x} y={props.y} zIndex={(props.zIndex ?? 0) + 0.1} alpha={props.alpha ?? 1}>
		<Sprite {key} anchor={{ x: 0.5, y: 1 }} width={((props.flip ? -1 : 1) * props.height * texture.width) / Math.max(1, texture.height)} height={props.height} isMask />
		<Sprite key="UI-SHINE" anchor={0.5} x={shineX * props.height * 0.6} y={-props.height * 0.55} width={props.height * 0.22} height={props.height * 1.3} rotation={0.35} alpha={0.45} blendMode="add" />
	</Container>
{/if}
