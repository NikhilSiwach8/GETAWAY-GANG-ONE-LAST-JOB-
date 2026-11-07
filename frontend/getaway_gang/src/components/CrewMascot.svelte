<script lang="ts">
	/**
	 * One crew member beside the reels in the base game: idles, reacts to features and wins (ANIM-<CREW>-*).
	 * The idle loop stays mounted underneath; it is hidden only once an action clip has a frame, and comes
	 * back the moment the action ends, so switching actions never shows an empty frame.
	 */
	import ClipSprite from './ClipSprite.svelte';
	import { getContext } from '../game/context';
	import { frameRect } from '../game/frameLayout';
	import { hasClip, mascot, mascotDo } from '../game/clips.svelte';

	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const left = $derived(layout.x - frame.width / 2);
	const size = 340;
	const idleId = $derived(`ANIM-${mascot.crew}-IDLE`);
	const actionId = $derived(mascot.action === 'IDLE' ? null : `ANIM-${mascot.crew}-${mascot.action}`);
	let actionShowing = $state(false);
	$effect(() => {
		void mascot.nonce;
		actionShowing = false;
	});
	const pos = $derived({ x: left / 2 + 10, y: layout.y + 40, width: size, height: size });
</script>

{#if context.stateGame.hud.bonus === null && left > size * 0.55 && hasClip(idleId)}
	{#key idleId}
		<ClipSprite id={idleId} channel="mascot-idle" loop {...pos} zIndex={4} alpha={actionShowing ? 0 : 1} />
	{/key}
	{#if actionId && hasClip(actionId)}
		{#key `${actionId}-${mascot.nonce}`}
			<ClipSprite
				id={actionId}
				channel="mascot"
				{...pos}
				zIndex={5}
				fadeMs={0}
				onready={() => (actionShowing = true)}
				onended={() => mascotDo(mascot.action === 'ABILITY' ? 'COMPLETE' : 'IDLE')}
			/>
		{/key}
	{/if}
{/if}
