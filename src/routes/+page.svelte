<script lang="ts">
	import type { PageData } from './$types.js';
	import type { LocomotiveClass } from '$lib/types.js';
	import TubeMap from '$lib/tubemap/TubeMap.svelte';
	import FilterOverlay from '$lib/components/FilterOverlay.svelte';
	import MuseumPlacard from '$lib/components/MuseumPlacard.svelte';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData }>();

	// Interactive filter states
	let selectedEraId = $state<number | null>(null);
	let selectedWheelArrangement = $state<string | null>(null);

	// Navigation/selection states
	let selectedClass = $state<LocomotiveClass | null>(null);

	// Extract unique, non-null wheel arrangements from seeded dataset with explicit types
	const wheelArrangements = $derived(
		Array.from(
			new Set(
				data.classes
					.map((c: LocomotiveClass) => c.wheelArrangement)
					.filter((wa: string | null): wa is string => wa !== null && wa !== '')
			)
		).sort() as string[]
	);
</script>

<svelte:head>
	<title>The Tube Map — Trainpedia</title>
</svelte:head>

<div class="flex h-full w-full flex-col overflow-hidden" style="background: var(--map-bg);">
	<!-- Top Navigation Filters -->
	<FilterOverlay
		eras={data.eras}
		{wheelArrangements}
		bind:selectedEraId
		bind:selectedWheelArrangement
	/>

	<!-- Tube map -->
	<div class="flex flex-col flex-1 min-h-0 w-full">
		<TubeMap
			classes={data.classes}
			eras={data.eras}
			bind:selectedClass
			{selectedEraId}
			{selectedWheelArrangement}
			displayName={(c) => resolveDisplayName(c.name, c.aliases ?? [], data.nameScheme)}
		/>
	</div>

	<!-- Side Info placard drawer -->
	<MuseumPlacard classData={selectedClass} onClose={() => (selectedClass = null)} />
</div>
