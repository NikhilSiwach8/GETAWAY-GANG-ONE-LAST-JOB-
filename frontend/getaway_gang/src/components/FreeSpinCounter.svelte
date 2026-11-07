<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	/** UI-FS-COUNTER with live label, counter and bonus name drawn into its empty plates. */
	import { BitmapText, Container, Sprite, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { PALETTE } from '../game/tempArt';
	import { GG_LAYOUT } from '../game/ggAssets';
	import { frameRect } from '../game/frameLayout';
	import { portraitRows } from '../game/hudLayout';

	const context = getContext();
	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	const layout = $derived(context.stateGameDerived.boardLayout());
	const frame = $derived(frameRect(layout));
	const W = 230;
	const H = (W * GG_LAYOUT['UI-FS-COUNTER'].height) / GG_LAYOUT['UI-FS-COUNTER'].width;
	const bonusName = $derived(context.stateGame.hud.bonus === 'escape' ? 'THE PERFECT ESCAPE' : 'THE HEIST');
	const portrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const pr = $derived(portraitRows(layout, frame, context.stateGame.hud.bonus));
	const font = (size: number, fill: number) => ({ fontFamily: 'proxima-nova, Arial, sans-serif', fontWeight: '900' as const, fontSize: size, fill });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (e) => {
			if (e.current !== undefined) current = e.current;
			if (e.total !== undefined) total = e.total;
		},
	});
</script>

{#if show}
	<Container
		x={portrait ? pr.fsX : layout.x - frame.width / 2 - 6 - W}
		y={portrait ? pr.row2Y : layout.y - frame.height / 2 + 150}
		scale={portrait ? pr.fsW / W : 1}
		zIndex={5}
	>
		<Sprite key="UI-FS-COUNTER" width={W} height={H} />
		<Text anchor={0.5} x={W / 2} y={H * 0.16} text="FREE SPINS" style={font(14, PALETTE.gold)} />
		<!-- FONT-COUNTER silver numerals (the glyph set has no '/', drawn as text) -->
		<!-- remounted on change: an updated right-anchored BitmapText can keep its previous glyphs -->
		{#key current}
			<BitmapText anchor={{ x: 1, y: 0.5 }} x={W / 2 - 10} y={H * 0.51} text={String(current)} style={{ fontFamily: 'ggSilver', fontSize: 40 }} />
		{/key}
		<Text anchor={0.5} x={W / 2} y={H * 0.51} text="/" style={{ ...font(30, 0xdbe7ff), stroke: { color: 0x0a1633, width: 4 } }} />
		{#key total}
			<BitmapText anchor={{ x: 0, y: 0.5 }} x={W / 2 + 10} y={H * 0.51} text={String(total)} style={{ fontFamily: 'ggSilver', fontSize: 40 }} />
		{/key}
		<Text anchor={0.5} x={W / 2} y={H * 0.8} text={bonusName} style={font(13, 0xffffff)} />
	</Container>
{/if}
