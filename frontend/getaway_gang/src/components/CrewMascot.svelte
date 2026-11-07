<script lang="ts">
	/** One crew member beside the reels in the base game: idles, reacts to features and wins (ANIM-<CREW>-*). */
	import ClipSprite from './ClipSprite.svelte';
	import { getContext } from '../game/context';
	import { frameRect } from '../game/frameLayout';
	import { hasClip, mascot, mascotDo } from '../game/clips.svelte';

	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const left = $derived(layout.x - frame.width / 2);
	const size = 340;
	const id = $derived(`ANIM-${mascot.crew}-${mascot.action}`);
</script>

{#if context.stateGame.hud.bonus === null && left > size * 0.55 && hasClip(id)}
	{#key `${id}-${mascot.nonce}`}
		<ClipSprite
			{id}
			channel="mascot"
			loop={mascot.action === 'IDLE'}
			x={left / 2 + 10}
			y={layout.y + 40}
			width={size}
			height={size}
			zIndex={4}
			onended={() => mascotDo(mascot.action === 'ABILITY' ? 'COMPLETE' : 'IDLE')}
		/>
	{/key}
{/if}
