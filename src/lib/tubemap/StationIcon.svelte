<script lang="ts">
	import type { LayoutStation } from './layout.js';
	import { GEOMETRY } from './layout.js';
	import { lineColorVar } from './colors.js';

	let {
		station,
		lod,
		isSelected = false,
		onSelect,
		onFocus
	}: {
		station: LayoutStation;
		lod: 'out' | 'mid' | 'in';
		isSelected?: boolean;
		onSelect: () => void;
		onFocus?: () => void;
	} = $props();

	const color = $derived(lineColorVar(station.traction));
	// LOD "ud": kun landmark-stationer vises (jf. spec §4). Alm. ticks/endestationer
	// venter til "mellem". Landmark er altid synlig.
	const visible = $derived(lod !== 'out' || station.stationType === 'landmark');
	const labelY = $derived(station.labelSide === 'above' ? station.y - 14 : station.y + 24);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect();
		}
	}
</script>

{#if visible}
	{#if station.stationType === 'terminus'}
		<rect
			x={station.x - GEOMETRY.terminusBarWidth / 2}
			y={station.y - GEOMETRY.terminusBarHeight / 2}
			width={GEOMETRY.terminusBarWidth}
			height={GEOMETRY.terminusBarHeight}
			fill={color}
		/>
	{:else if station.stationType === 'landmark'}
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius}
			fill="var(--map-bg)"
			stroke="var(--map-ink)"
			stroke-width={GEOMETRY.landmarkRingStroke}
		/>
	{:else if station.stationType === 'interchange'}
		<!-- Bruges KUN når stationen renderes uden en anden linje at forbinde til (fx
		     LineDiagram/F5.7, som kun viser én linje ad gangen). TubeMap.svelte foretrækker
		     InterchangeCapsule, der tegner den rigtige kapsel mellem to linjer. -->
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius}
			fill="var(--map-bg)"
			stroke="var(--map-ink)"
			stroke-width={GEOMETRY.landmarkRingStroke}
		/>
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius - 4}
			fill="var(--map-ink)"
		/>
	{:else}
		<line
			x1={station.x}
			y1={station.y - GEOMETRY.tickLength / 2}
			x2={station.x}
			y2={station.y + GEOMETRY.tickLength / 2}
			stroke={color}
			stroke-width="3"
		/>
	{/if}

	<circle
		cx={station.x}
		cy={station.y}
		r="14"
		fill="transparent"
		class="cursor-pointer"
		role="button"
		tabindex="0"
		aria-label={station.name}
		onclick={onSelect}
		onkeydown={handleKeydown}
		onfocus={onFocus}
	/>

	<text
		x={station.x}
		y={labelY}
		text-anchor="middle"
		class="pointer-events-none select-none"
		style="font-family: var(--font-map); font-size: 12px; fill: {isSelected
			? 'var(--tfl-blue)'
			: 'var(--map-ink)'}; font-weight: {isSelected ? 700 : 400};"
	>
		{station.name}
	</text>
	{#if lod === 'in'}
		<text
			x={station.x}
			y={labelY + (station.labelSide === 'above' ? -13 : 13)}
			text-anchor="middle"
			class="pointer-events-none tabular-nums select-none"
			style="font-family: var(--font-ui); font-size: 10px; fill: var(--map-ink-soft);"
		>
			{station.introYear}{station.retiredYear ? `–${station.retiredYear}` : ''}
		</text>
	{/if}
{/if}
