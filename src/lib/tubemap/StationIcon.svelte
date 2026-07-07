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

	const labelX = $derived(
		station.labelSide === 'left'
			? station.x - 14
			: station.labelSide === 'right'
				? station.x + 14
				: station.x
	);
	const labelY = $derived(
		station.labelSide === 'above'
			? station.y - 14
			: station.labelSide === 'below'
				? station.y + 24
				: station.y + 4
	);
	const textAnchor = $derived(
		station.labelSide === 'left' ? 'end' : station.labelSide === 'right' ? 'start' : 'middle'
	);

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
		<!-- Landmark: Double-contour ring using line-color and ink-color -->
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius + 2}
			fill="var(--map-bg)"
			stroke="var(--map-ink)"
			stroke-width="2"
		/>
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius - 2}
			fill="var(--map-bg)"
			stroke={color}
			stroke-width="2"
		/>
	{:else if station.stationType === 'interchange'}
		<!-- Interchange: White circle with a bold dark outline and dark dot center -->
		<circle
			cx={station.x}
			cy={station.y}
			r={GEOMETRY.landmarkRingRadius + 1}
			fill="var(--map-bg)"
			stroke="var(--map-ink)"
			stroke-width="3"
		/>
		<circle cx={station.x} cy={station.y} r="3" fill="var(--map-ink)" />
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
		x={labelX}
		y={labelY}
		text-anchor={textAnchor}
		class="pointer-events-none select-none"
		style="font-family: var(--font-map); font-size: 12px; fill: {isSelected
			? 'var(--tfl-blue)'
			: 'var(--map-ink)'}; font-weight: {isSelected ? 700 : 400};"
	>
		{station.name}
	</text>
	{#if lod === 'in'}
		<text
			x={labelX}
			y={labelY + (station.labelSide === 'above' ? -13 : 13)}
			text-anchor={textAnchor}
			class="pointer-events-none tabular-nums select-none"
			style="font-family: var(--font-ui); font-size: 10px; fill: var(--map-ink-soft);"
		>
			{station.introYear}{station.retiredYear ? `–${station.retiredYear}` : ''}
		</text>
	{/if}
{/if}
