<!--
  Painted title text: the game's own gold / silver lettering (ggTitleGold / ggTitleSilver bitmap fonts, baked
  from the delivered number-font material by art/make_title_fonts.py), so titles and labels read as part of
  the art instead of as a standard font. `maxWidth` shrinks long strings to fit. Strings with characters the
  painted set does not have (e.g. some currency symbols) fall back to the plain face so nothing goes blank.
-->
<script lang="ts" module>
	const PAINTED = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.,:;'\"-+×/%&$€£·()#*= ");
	export const painted = (s: string) => [...s].every((c) => PAINTED.has(c));
</script>

<script lang="ts">
	import { BitmapText, Container, Text } from 'pixi-svelte';

	type Props = {
		text: string;
		size: number;
		silver?: boolean;
		x?: number;
		y?: number;
		anchor?: number | { x: number; y: number };
		maxWidth?: number;
		alpha?: number;
		tint?: number;
		letterSpacing?: number;
	};
	const p: Props = $props();
	// painted capitals average 0.63 em wide (measured from the atlas)
	const size = $derived(p.maxWidth ? Math.min(p.size, p.maxWidth / Math.max(1, p.text.length * 0.63 + (p.letterSpacing ?? 0) / p.size)) : p.size);
</script>

{#if painted(p.text)}
	<!-- remounted when the face changes (gold <-> silver): switching fontFamily on a live BitmapText leaves Pixi
	     drawing a generated fallback font (black glyphs) instead of the painted atlas -->
	<!-- the painted text is drawn at one fixed size and fitted by scaling its container: changing any style field
	     (fontSize included) on a live BitmapText makes Pixi fall back to a generated font with black glyphs -->
	{#key `${p.silver}|${p.size}|${p.letterSpacing ?? 0}`}
	<Container x={p.x ?? 0} y={p.y ?? 0} scale={size / p.size}>
		<BitmapText
			anchor={p.anchor ?? 0.5}
			alpha={p.alpha ?? 1}
			tint={p.tint ?? 0xffffff}
			text={p.text}
			style={{ fontFamily: p.silver ? 'ggTitleSilver' : 'ggTitleGold', fontSize: p.size, letterSpacing: p.letterSpacing ?? 0 }}
		/>
	</Container>
	{/key}
{:else}
	<Text
		anchor={p.anchor ?? 0.5}
		x={p.x ?? 0}
		y={p.y ?? 0}
		alpha={p.alpha ?? 1}
		text={p.text}
		style={{ fontFamily: 'Luckiest Guy, sans-serif', fontSize: size * 0.92, fill: p.silver ? 0xe8eefc : 0xffd34d, stroke: { color: 0x2a1200, width: Math.max(3, size * 0.1) } }}
	/>
{/if}
