<script lang="ts">
	/**
	 * One crew member beside the reels in the base game, animated live on the delivered pose art (LivePose):
	 * breathes and sways while idle, lunges for abilities and combos, jumps for wins and the bonus, slumps
	 * on a losing crew round. Actions come from mascotDo() in the book event handlers.
	 */
	import LivePose, { type PoseAction } from './LivePose.svelte';
	import { getContext } from '../game/context';
	import { frameRect } from '../game/frameLayout';
	import { mascot, mascotDo, type MascotAction } from '../game/clips.svelte';

	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const left = $derived(layout.x - frame.width / 2);
	const height = 330;
	const ACTION: Record<MascotAction, PoseAction> = {
		IDLE: 'idle',
		ABILITY: 'ability',
		COMBO: 'ability',
		COMPLETE: 'idle',
		WIN: 'cheer',
		VICTORY: 'cheer',
		'BONUS-INTRO': 'cheer',
		LOSE: 'lose',
	};
	const action = $derived(ACTION[mascot.action] ?? 'idle');
</script>

{#if context.stateGame.hud.bonus === null && left > height * 0.45}
	{#key mascot.crew}
		<LivePose
			id={mascot.crew}
			x={left / 2 + 10}
			y={layout.y - 30 + height / 2}
			{height}
			{action}
			nonce={mascot.nonce}
			zIndex={4}
			onended={() => action !== 'idle' && mascotDo('IDLE')}
		/>
	{/key}
{/if}
