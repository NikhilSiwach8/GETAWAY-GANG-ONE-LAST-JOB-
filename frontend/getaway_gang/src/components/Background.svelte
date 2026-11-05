<script lang="ts">
	/** Scene background: BG-MAIN (base) / BG-HEIST / BG-ESCAPE, scaled to cover the canvas. */
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';

	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const scene = $derived(context.stateGame.hud.bonus ?? 'basegame');
	const IDS = { basegame: 'BG-MAIN', heist: 'BG-HEIST', escape: 'BG-ESCAPE' } as const;
	const cover = (id: keyof typeof GG_LAYOUT) => {
		const { width, height } = GG_LAYOUT[id];
		const s = Math.max(sizes.width / width, sizes.height / height);
		return { width: width * s, height: height * s, x: sizes.width / 2, y: sizes.height / 2 };
	};
</script>

<Rectangle {...sizes} backgroundColor={0x05070f} zIndex={-3} />
{#each Object.entries(IDS) as [key, id] (id)}
	<FadeContainer show={scene === key} duration={600} zIndex={-2}>
		<Sprite key={id} anchor={0.5} {...cover(id)} />
	</FadeContainer>
{/each}
