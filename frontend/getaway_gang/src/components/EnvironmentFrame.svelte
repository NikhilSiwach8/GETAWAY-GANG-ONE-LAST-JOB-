<script lang="ts">
	/**
	 * Reel-frame machinery (the vault wheel on UI-REEL-FRAME), driven by the same EnvDirector as the
	 * backgrounds. Sits exactly over the frame art drawn by BoardFrame.svelte and never touches the reels.
	 */
	import { onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { getContextApp, getContextParent } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { frameRect } from '../game/frameLayout';
	import { acquireEnvDirector } from '../game/env/director';
	import { SceneGroup } from '../game/env/sceneGroup';
	import { buildFrameMachinery, FRAME_WHEEL } from '../game/env/scenes';

	const context = getContext();
	const app = getContextApp();
	const parent = getContextParent();
	const { director, release } = acquireEnvDirector(app.stateApp.pixiApplication!.ticker);
	const FRAME = GG_LAYOUT['UI-REEL-FRAME'];

	const frameTex = app.stateApp.loadedAssets?.['UI-REEL-FRAME'] as PIXI.Texture | undefined;
	const group = frameTex ? new SceneGroup((r) => buildFrameMachinery(r, frameTex), 0.01) : null;
	if (group) {
		group.container.zIndex = -1;
		group.container.eventMode = 'none';
		group.active = true;
		parent.addToParent(group.container);
		director.add(group);
	}

	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	// the frame is scaled unevenly (taller than its art); the wheel is drawn at one even scale around its centre
	// (a turning part under an uneven scale would shear), at the larger of the two so it covers the painted wheel
	$effect(() => {
		if (!group) return;
		const sx = frame.width / FRAME.width;
		const sy = frame.height / FRAME.height;
		group.container.scale.set(Math.max(sx, sy));
		group.container.position.set(layout.x - frame.width / 2 + FRAME_WHEEL.cx * sx, layout.y - frame.height / 2 + FRAME_WHEEL.cy * sy);
	});

	onDestroy(() => {
		if (group) director.remove(group);
		release();
	});
</script>
