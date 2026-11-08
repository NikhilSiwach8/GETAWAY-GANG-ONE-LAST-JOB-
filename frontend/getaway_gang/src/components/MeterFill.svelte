<script lang="ts">
	/**
	 * Progress fill drawn *on top of* a meter frame's (opaque) bar channel. Points map piecewise onto the
	 * art's milestone pins, so reaching a milestone fills exactly up to its pin. The fill eases to new values
	 * and flashes when it grows.
	 */
	import { onDestroy } from 'svelte';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

	type Props = {
		points: number;
		thresholds: readonly number[]; // points at each pin
		pins: readonly number[]; // pin x positions, fractions of the frame width
		x0: number;
		x1: number;
		y0: number;
		y1: number; // channel, fractions of the frame
		width: number;
		height: number; // frame size
	};
	const props: Props = $props();

	const toX = (p: number) => {
		const t = props.thresholds;
		const xs = props.pins;
		if (p <= 0) return props.x0;
		if (p >= t[t.length - 1]) return props.x1;
		let prevP = 0;
		let prevX = props.x0;
		for (let i = 0; i < t.length; i++) {
			if (p <= t[i]) return prevX + ((p - prevP) / (t[i] - prevP)) * (xs[i] - prevX);
			prevP = t[i];
			prevX = xs[i];
		}
		return props.x1;
	};

	// eased display value
	let shown = $state(props.points);
	let flash = $state(0);
	let raf = 0;
	let last = 0;
	const tick = (now: number) => {
		const dt = last ? Math.min(64, now - last) : 16;
		last = now;
		const d = props.points - shown;
		shown = Math.abs(d) < 0.01 ? props.points : shown + d * Math.min(1, dt / 160);
		flash = Math.max(0, flash - dt / 500);
		raf = shown !== props.points || flash > 0 ? requestAnimationFrame(tick) : 0;
		if (!raf) last = 0;
	};
	$effect(() => {
		const target = props.points;
		if (target > shown + 0.01) flash = 1;
		if (target !== shown && !raf) raf = requestAnimationFrame(tick);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const cy = $derived(props.height * props.y0);
	const ch = $derived(props.height * (props.y1 - props.y0));
	const inset = $derived(ch * 0.14);
	const left = $derived(props.width * props.x0 + inset);
	const fillW = $derived(Math.max(0, props.width * toX(shown) - left - inset));
	const max = $derived(props.thresholds[props.thresholds.length - 1]);
	const fullW = $derived(Math.max(1, props.width * props.x1 - left - inset));
</script>

{#if fillW > 0.5}
	<Container x={left} y={cy + inset}>
		<!-- the delivered gold fill bar (UI-LOADING-BAR-FILL) at the channel's full length, revealed up to the value -->
		<Container>
			<Sprite key="UI-LOADING-BAR-FILL" width={fullW} height={ch - inset * 2} />
			<Rectangle isMask width={fillW} height={ch - inset * 2} borderRadius={(ch - inset * 2) / 2} backgroundColor={0xffffff} />
		</Container>
		{#if flash > 0}
			<Container alpha={0.5 * flash}>
				<Sprite key="UI-LOADING-BAR-FILL" width={fullW} height={ch - inset * 2} tint={0xffffff} blendMode="add" />
				<Rectangle isMask width={fillW} height={ch - inset * 2} borderRadius={(ch - inset * 2) / 2} backgroundColor={0xffffff} />
			</Container>
		{/if}
	</Container>
{/if}
<Text
	anchor={0.5}
	x={(props.width * (props.x0 + props.x1)) / 2}
	y={cy + ch / 2}
	text={`${Math.min(props.points, max)} / ${max}`}
	style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: Math.max(11, ch * 0.62), fill: 0xffffff, stroke: { color: 0x2a1600, width: 4 } }}
/>
