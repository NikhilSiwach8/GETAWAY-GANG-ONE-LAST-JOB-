<script lang="ts">
	/** Scene background: BG-MAIN (base) / BG-HEIST / BG-ESCAPE, scaled to cover the canvas. */
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { getContext } from '../game/context';
	import { GG_LAYOUT, hasArt } from '../game/ggAssets';
	import ClipSprite from './ClipSprite.svelte';
	import { hasClip } from '../game/clips.svelte';

	// animated loops (BG-MAIN-LOOP, BG-ESCAPE-LOOP) play over the still art once loaded
	// HIDDEN BONUS: its own BG-HIDDEN once delivered; until then the Escape scene with a gold grade
	const ownHidden = hasArt('BG-HIDDEN');
	const LOOPS = { basegame: 'BG-MAIN-LOOP', heist: '', escape: 'BG-ESCAPE-LOOP', hidden: ownHidden ? '' : 'BG-ESCAPE-LOOP' } as const;
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
		{#if scene === key && LOOPS[key] && hasClip(LOOPS[key])}
			<ClipSprite id={LOOPS[key]} channel="bg" loop anchor={0.5} {...coverHD} />
		{/if}
		{#if key === 'hidden' && !ownHidden}
			<Rectangle {...sizes} backgroundColor={0xf7a928} backgroundAlpha={0.16} />
		{/if}
	</FadeContainer>
{/each}
{/if}
