<script lang="ts">
	/**
	 * Living background: mounts the environment controllers of every scene (src/game/env) over the scene's
	 * still art, cover-fitted exactly like the art, and cross-fades them with the scene. Animation runs on the
	 * PixiJS ticker through the shared EnvDirector and pauses while the tab is hidden or an opaque full-screen
	 * clip covers the scene. Purely visual: it reads only the current scene and the canvas size.
	 */
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextApp, getContextParent } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { acquireEnvDirector } from '../game/env/director';
	import { SceneGroup } from '../game/env/sceneGroup';
	import { buildScene, type SceneId } from '../game/env/scenes';
	import { clipLayer } from '../game/clips.svelte';
	import { OPAQUE_CLIPS } from '../game/clipUrls';

	type Props = { scene: SceneId; arts: Record<SceneId, keyof typeof GG_LAYOUT> };
	const props: Props = $props();

	const context = getContext();
	const app = getContextApp();
	const parent = getContextParent();
	const { director, release } = acquireEnvDirector(app.stateApp.pixiApplication!.ticker);

	const root = new PIXI.Container({ zIndex: -1.5, eventMode: 'none' });
	root.interactiveChildren = false;
	parent.addToParent(root);

	const groups = new Map<SceneId, SceneGroup>();
	// dev builds only: lets the Playwright checks inspect and step the environment
	if (import.meta.env.DEV) (window as unknown as { __env: unknown }).__env = { director, groups, root, stateGame: context.stateGame };
	const texture = (key: string) => app.stateApp.loadedAssets?.[key] as PIXI.Texture | undefined;

	// build a scene the first time it is shown (textures are loaded by then) and keep it for later visits
	$effect(() => {
		const id = props.scene;
		if (!groups.has(id)) {
			const art = texture(props.arts[id]);
			const glow = texture('UI-SOFT-GLOW');
			if (!art || !glow) return;
			const g = new SceneGroup((r) => buildScene(id, r, { art, glow }, director.quality));
			groups.set(id, g);
			root.addChild(g.container);
			director.add(g);
		}
		for (const [k, g] of groups) g.active = k === id;
	});

	// cover-fit each scene's container to the canvas, the same way Background.svelte fits the still art
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	$effect(() => {
		const { width, height } = sizes;
		for (const [k, g] of groups) {
			const a = GG_LAYOUT[props.arts[k]];
			const s = Math.max(width / a.width, height / a.height);
			g.container.scale.set(s);
			g.container.position.set((width - a.width * s) / 2, (height - a.height * s) / 2);
		}
	});

	// the bonus entry and Total Win cards cover the whole scene: stop drawing and animating it underneath
	const cover = (on: boolean) => {
		director.setPaused('bonus-card', on);
		root.visible = !on;
	};
	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => cover(true),
		freeSpinIntroHide: () => cover(false),
		freeSpinOutroShow: () => cover(true),
		freeSpinOutroHide: () => cover(false),
	});

	// nothing to animate under an opaque full-screen clip
	$effect(() => {
		const c = clipLayer.current;
		director.setPaused('opaque-clip', !!c && OPAQUE_CLIPS.has(c.id));
	});

	onDestroy(() => {
		for (const g of groups.values()) director.remove(g);
		groups.clear();
		release();
	});
</script>
