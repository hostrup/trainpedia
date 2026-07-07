<script lang="ts">
	import type { Era, LocomotiveClass } from '$lib/types.js';
	import { computeLayout, GEOMETRY } from './layout.js';
	import { mapClassesToStations, type MappableClass } from './mapClasses.js';
	import { lineColorVar } from './colors.js';
	import ZoneBands from './ZoneBands.svelte';
	import StationIcon from './StationIcon.svelte';

	let {
		classes,
		eras,
		selectedClass = $bindable(null),
		displayName
	}: {
		classes: LocomotiveClass[];
		eras: Era[];
		selectedClass: LocomotiveClass | null;
		displayName?: (c: MappableClass) => string;
	} = $props();

	const eraNames = $derived(Object.fromEntries(eras.map((e) => [e.slug, e.name])));
	const eraOrder = $derived([...eras].sort((a, b) => a.sortIndex - b.sortIndex).map((e) => e.slug));

	// 1D-mode: linjediagrammet er den klassiske "stribekort over dørene i toget" —
	// altid fuldt detaljeret (ticks + navne), ingen zoom/LOD, kun vandret scroll.
	const layout = $derived.by(() => {
		const stations = mapClassesToStations(classes, eras, displayName ?? ((c) => c.name));
		return computeLayout(stations, { eraOrder, mode: '1d' });
	});

	const classById = $derived(new Map(classes.map((c) => [String(c.id), c])));

	function selectStation(id: string) {
		const c = classById.get(id);
		if (c) selectedClass = c;
	}
</script>

<div class="h-full w-full overflow-x-auto overflow-y-hidden" style="background: var(--map-bg);">
	<svg width={layout.width} height={layout.height} style="display: block;">
		<ZoneBands zones={layout.zones} {eraNames} top={0} height={layout.height} />

		{#each layout.paths as path (path.traction)}
			<path
				d={path.d}
				stroke={lineColorVar(path.traction)}
				stroke-width={GEOMETRY.lineWidthDiagram}
				stroke-linecap="round"
				stroke-linejoin="round"
				fill="none"
			/>
		{/each}

		{#each layout.stations as station (station.id)}
			<StationIcon
				{station}
				lod="mid"
				isSelected={selectedClass !== null && String(selectedClass.id) === station.id}
				onSelect={() => selectStation(station.id)}
			/>
		{/each}
	</svg>
</div>
