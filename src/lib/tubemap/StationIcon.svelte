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

	let hovered = $state(false);
	// Fremhævet (bold/farvet label + halo) når valgt ELLER når musen/fokus er over
	// stationen — giver eksplicit "her kan du klikke"-feedback (Ronnis feedback
	// 2026-07-07: "svært at se hvor man skal klikke").
	const emphasized = $derived(isSelected || hovered);

	// Navnelabels for ALLE 98 stationer på én gang giver en ulæselig tekstsuppe
	// ved zoom-to-fit (Ronnis feedback 2026-07-07: "ikke intuitiv"). Landmark/
	// interchange er få (~7) og velegnet som altid-synlige orienteringspunkter;
	// almindelige tick/endestations-navne vises kun ved hover/valg eller når man
	// har zoomet ind ("in") — ikonet (streg/bar) er stadig synligt, så linjen
	// bevarer sin visuelle tæthed uden tekst-kollisionerne.
	const showLabel = $derived(
		emphasized ||
			lod === 'in' ||
			station.stationType === 'landmark' ||
			station.stationType === 'interchange'
	);

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
	<!-- Hover/fokus-halo: farvet cirkel bag ikonet, kun synlig ved emphasized —
	     det primære signal om at stationen er klikbar. -->
	{#if emphasized}
		<circle
			cx={station.x}
			cy={station.y}
			r="15"
			fill={color}
			class="pointer-events-none"
			style="opacity: 0.18;"
		/>
	{/if}

	{#if station.stationType === 'terminus'}
		<rect
			x={station.x - GEOMETRY.terminusBarWidth / 2}
			y={station.y - GEOMETRY.terminusBarHeight / 2}
			width={GEOMETRY.terminusBarWidth}
			height={GEOMETRY.terminusBarHeight}
			fill={color}
			class="transition-transform duration-150"
			style={emphasized
				? `transform: scale(1.25); transform-origin: ${station.x}px ${station.y}px;`
				: ''}
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
			stroke-width={emphasized ? 5 : 3}
			class="transition-all duration-150"
		/>
	{/if}

	<circle
		cx={station.x}
		cy={station.y}
		r="18"
		fill="transparent"
		class="cursor-pointer"
		role="button"
		tabindex="0"
		aria-label="{station.name} — view details"
		onclick={onSelect}
		onkeydown={handleKeydown}
		onmouseenter={() => (hovered = true)}
		onmouseleave={() => (hovered = false)}
		onfocus={() => {
			hovered = true;
			onFocus?.();
		}}
		onblur={() => (hovered = false)}
	/>

	{#if showLabel}
		<text
			x={labelX}
			y={labelY}
			text-anchor={textAnchor}
			class="pointer-events-none transition-all duration-150 select-none"
			style="font-family: var(--font-map); font-size: {emphasized ? 13 : 12}px; fill: {emphasized
				? 'var(--tfl-blue)'
				: 'var(--map-ink)'}; font-weight: {emphasized ? 700 : 400};"
		>
			{station.name}
		</text>
		{#if lod === 'in' || emphasized}
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
{/if}
