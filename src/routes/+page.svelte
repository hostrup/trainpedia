<script lang="ts">
	import type { PageData } from './$types.js';
	import type { TractionType, LocomotiveClass } from '$lib/types.js';
	import TubeMap from '$lib/tubemap/TubeMap.svelte';
	import FilterOverlay from '$lib/components/FilterOverlay.svelte';
	import MuseumPlacard from '$lib/components/MuseumPlacard.svelte';

	let { data } = $props<{ data: PageData }>();

	// Interactive filter states
	let selectedEraId = $state<number | null>(null);
	let selectedTraction = $state<TractionType | null>(null);
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

<div class="relative h-full w-full overflow-hidden" style="background: var(--map-bg);">
	<!-- Top Navigation Filters -->
	<FilterOverlay
		eras={data.eras}
		{wheelArrangements}
		bind:selectedEraId
		bind:selectedTraction
		bind:selectedWheelArrangement
	/>

	<!-- Tube map -->
	<div class="h-full w-full">
		<TubeMap
			classes={data.classes}
			eras={data.eras}
			bind:selectedClass
			{selectedTraction}
			{selectedEraId}
			{selectedWheelArrangement}
		/>
	</div>

	<!-- Side Info placard drawer -->
	<MuseumPlacard classData={selectedClass} onClose={() => (selectedClass = null)} />
</div>
