<script lang="ts">
	import type { LayoutZone } from './layout.js';

	let {
		zones,
		eraNames,
		top,
		height
	}: {
		zones: LayoutZone[];
		eraNames: Record<string, string>;
		top: number;
		height: number;
	} = $props();
</script>

{#each zones as zone, i (zone.eraSlug)}
	<rect
		x={zone.xStart}
		y={top}
		width={Math.max(0, zone.xEnd - zone.xStart)}
		{height}
		fill={i % 2 === 0 ? 'var(--map-bg)' : 'var(--map-zone)'}
	/>
	<text
		x={zone.xStart + 16}
		y={top + 24}
		class="pointer-events-none select-none"
		style="font-family: var(--font-map); font-size: 12px; letter-spacing: 0.08em; fill: var(--map-ink-soft); text-transform: uppercase;"
	>
		{eraNames[zone.eraSlug] ?? zone.eraSlug}
	</text>
{/each}
