<script lang="ts">
	/**
	 * Scene background: the still art per scene (BG-MAIN / BG-HEIST / BG-ESCAPE / BG-HIDDEN), scaled to cover the
	 * canvas, with the live environment (Environment.svelte: lights, beams, reflections, particles, events) on top.
	 * The pre-rendered BG-*-LOOP videos are kept only as an optional fallback (BG_VIDEO_LOOPS).
	 */
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { getContext } from '../game/context';
	import { GG_LAYOUT, hasArt } from '../game/ggAssets';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';
	import Environment from './Environment.svelte';
	import { BG_VIDEO_LOOPS } from '../game/env/config';

	// every scene has an animated loop (BG-MAIN/HEIST/ESCAPE/HIDDEN-LOOP) over its still art, which only shows while loading
	// HIDDEN BONUS: its own BG-HIDDEN once delivered; until then the Escape scene with a gold grade
	const ownHidden = hasArt('BG-HIDDEN');
	const LOOPS = { basegame: 'BG-MAIN-LOOP', heist: 'BG-HEIST-LOOP', escape: 'BG-ESCAPE-LOOP', hidden: ownHidden ? 'BG-HIDDEN-LOOP' : 'BG-ESCAPE-LOOP' } as const;
	const coverHD = $derived.by(() => {
		const s = Math.max(sizes.width / 1920, sizes.height / 1080);
		return { width: 1920 * s, height: 1080 * s, x: sizes.width / 2, y: sizes.height / 2 };
	});

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const scene = $derived(context.stateGame.hud.bonus ?? 'basegame');
	const IDS = { basegame: 'BG-MAIN', heist: 'BG-HEIST', escape: 'BG-ESCAPE', hidden: (ownHidden ? 'BG-HIDDEN' : 'BG-ESCAPE') as 'BG-ESCAPE' } as const;
	const cover = (id: keyof typeof GG_LAYOUT) => {
		const { width, height } = GG_LAYOUT[id];
		const s = Math.max(sizes.width / width, sizes.height / height);
		return { width: width * s, height: height * s, x: sizes.width / 2, y: sizes.height / 2 };
	};
</script>

<Rectangle {...sizes} backgroundColor={0x05070f} zIndex={-3} />
<!-- the scene art is not preloaded: draw it once the main asset load has finished -->
{#if context.stateApp.loaded}
{#each Object.entries(IDS) as [key, id] (key)}
	<FadeContainer show={scene === key} duration={600} zIndex={-2}>
		<Sprite key={id} anchor={0.5} {...cover(id)} />
		{#if BG_VIDEO_LOOPS && scene === key && LOOPS[key] && hasClip(LOOPS[key])}
			<ClipSprite id={LOOPS[key]} channel="bg" loop anchor={0.5} {...coverHD} />
		{/if}
		{#if key === 'hidden' && !ownHidden}
			<Rectangle {...sizes} backgroundColor={0xf7a928} backgroundAlpha={0.16} />
		{/if}
	</FadeContainer>
{/each}
<Environment scene={scene as 'basegame'} arts={IDS} />
{/if}
