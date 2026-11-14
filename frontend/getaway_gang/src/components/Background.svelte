<script lang="ts">
	/**
	 * Scene background: the still art per scene (BG-MAIN / BG-HEIST / BG-ESCAPE / BG-HIDDEN), scaled to cover the
	 * canvas, with the live environment (Environment.svelte: lights, beams, reflections, particles, events) on top.
		 */
	import { onDestroy } from 'svelte';
	import type * as PIXI from 'pixi.js';
	import { BaseSprite, Container, Rectangle, Sprite, getContextApp } from 'pixi-svelte';
	import { boardFx } from '../game/stateGame.svelte';
	import { winFx } from '../game/wins/winDirector.svelte';
	import { fogTexture, vignetteTexture } from '../game/env/textures';
	import { FadeContainer } from 'components-pixi';
	import { getContext } from '../game/context';
	import { GG_LAYOUT, hasArt } from '../game/ggAssets';
	import Environment from './Environment.svelte';

	// HIDDEN BONUS: its own BG-HIDDEN once delivered; until then the Escape scene with a gold grade
	const ownHidden = hasArt('BG-HIDDEN');
	const coverHD = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const scene = $derived(context.stateGame.hud.bonus ?? 'basegame');
	const IDS = { basegame: 'BG-MAIN', heist: 'BG-HEIST', escape: 'BG-ESCAPE', hidden: (ownHidden ? 'BG-HIDDEN' : 'BG-ESCAPE') as 'BG-ESCAPE' } as const;
	// ---- scene camera: a slow drift and breathing zoom, a kick as reels stop, a push-in and light surge on wins.
	// One container transform for the whole scene (art + environment): no extra rendering cost.
	const ticker = getContextApp().stateApp.pixiApplication!.ticker as PIXI.Ticker;
	let t = $state(0);
	let kick = 0; // decaying reel-stop kick
	let surge = $state(0); // decaying win light surge (0..1)
	let lastJolt = boardFx.jolt;
	let lastBeat = winFx.counter.beat;
	let lastImpact = -1;
	const tick = (tk: PIXI.Ticker) => {
		const dt = Math.min(tk.deltaMS / 1000, 0.05);
		if (hidden) return;
		t += dt;
		kick *= Math.exp(-dt / 0.12);
		surge *= Math.exp(-dt / 0.35);
		if (boardFx.jolt !== lastJolt) (lastJolt = boardFx.jolt), (kick = Math.min(1, kick + 0.6));
		if (winFx.counter.beat !== lastBeat) (lastBeat = winFx.counter.beat), (surge = Math.min(1, surge + 0.55));
		const imp = winFx.tier?.impact ?? -1;
		if (imp !== lastImpact) (lastImpact = imp), imp >= 0 && (surge = 1);
	};
	ticker.add(tick);
	onDestroy(() => ticker.remove(tick));
	// nothing to move while a full-screen bonus card covers the scene
	let hidden = false;
	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (hidden = true),
		freeSpinIntroHide: () => (hidden = false),
		freeSpinOutroShow: () => (hidden = true),
		freeSpinOutroHide: () => (hidden = false),
	});
	const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const m = reduced ? 0.3 : 1;
	const cam = $derived.by(() => {
		const zoom = 1.045 + 0.012 * Math.sin((t * Math.PI * 2) / 26) * m + 0.012 * surge;
		return {
			x: sizes.width / 2 + Math.sin((t * Math.PI * 2) / 31) * sizes.width * 0.006 * m,
			y: sizes.height / 2 + Math.sin((t * Math.PI * 2) / 23) * sizes.height * 0.005 * m + kick * 5,
			scale: zoom,
		};
	});
	// drifting fog over the lower third of the scene (one layer: full-screen fills are what slow phones down)
	const fog = fogTexture();
	// phones skip the fog (a full-width additive layer): camera motion and the vignette stay
	const mobile = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches);
	const fogH = $derived(sizes.height * 0.3);

	const cover = (id: keyof typeof GG_LAYOUT) => {
		const { width, height } = GG_LAYOUT[id];
		const s = Math.max(sizes.width / width, sizes.height / height);
		return { width: width * s, height: height * s, x: sizes.width / 2, y: sizes.height / 2 };
	};
</script>

<Rectangle {...sizes} backgroundColor={0x05070f} zIndex={-3} />
<!-- the scene art is not preloaded: draw it once the main asset load has finished -->
{#if context.stateApp.loaded}
<!-- the scene camera: everything inside moves together -->
<Container x={cam.x} y={cam.y} pivot={{ x: sizes.width / 2, y: sizes.height / 2 }} scale={cam.scale} zIndex={-2}>

{#each Object.entries(IDS) as [key, id] (key)}
	<FadeContainer show={scene === key} duration={600} zIndex={-2}>
		<Sprite key={id} anchor={0.5} {...cover(id)} />
		{#if key === 'hidden' && !ownHidden}
			<Rectangle {...sizes} backgroundColor={0xf7a928} backgroundAlpha={0.16} />
		{/if}
	</FadeContainer>
{/each}
	<Environment scene={scene as 'basegame'} arts={IDS} />
	<!-- fog drifting across the street / vault floor -->
	<Container y={sizes.height - fogH} alpha={0.9} visible={!mobile}>
		<!-- each layer is two copies of the seamless fog texture side by side, scrolled by modulo: no jump -->
		{#each [0, 1] as k (k)}
			<BaseSprite texture={fog} x={k * sizes.width - ((t * 16) % sizes.width)} width={sizes.width + 1} height={fogH} tint={0xd8dcff} alpha={0.6} blendMode="add" />
		{/each}
	</Container>
	<!-- win surge: the scene's light swells with each win impact -->
	{#if surge > 0.02}
		<Sprite key="UI-SOFT-GLOW" anchor={0.5} x={sizes.width / 2} y={sizes.height * 0.45} width={sizes.width * 1.3} height={sizes.height * 1.2} tint={0xffd27a} alpha={0.22 * surge} blendMode="add" />
	{/if}
</Container>
<!-- one colour grade and a vignette over the whole scene: pulls the generated art into one look, and leaves the
     board area as the brightest, clearest part of the screen -->
<BaseSprite texture={vignetteTexture()} x={0} y={0} width={sizes.width} height={sizes.height} zIndex={-1.3} />
{/if}
