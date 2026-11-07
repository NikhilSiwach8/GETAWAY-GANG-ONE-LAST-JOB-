<script lang="ts" module>
	export type EmitterEventTransition = { type: 'transition' };
</script>

<script lang="ts">
	/** Scene transition overlay: `await broadcastAsync({ type: 'transition' })` resolves once the screen is covered. */
	import { waitForResolve } from 'utils-shared/wait';

	import TransitionAnimation from './TransitionAnimation.svelte';
	import { getContext } from '../game/context';

	const context = getContext();

	let key = $state(0);
	let transitioning = $state(false);
	let oncovered = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		transition: async () => {
			key += 1;
			transitioning = true;
			await waitForResolve((resolve) => (oncovered = resolve));
		},
	});
</script>

{#if transitioning}
	{#key key}
		<TransitionAnimation oncovered={() => oncovered()} onfinished={() => (transitioning = false)} />
	{/key}
{/if}
