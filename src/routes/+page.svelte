<script lang="ts">
	import type { PageData } from './$types.js';
	import type { TractionType, LocomotiveClass } from '$lib/types.js';
	import TimelineCanvas from '$lib/components/TimelineCanvas.svelte';
	import FilterOverlay from '$lib/components/FilterOverlay.svelte';
	import MuseumPlacard from '$lib/components/MuseumPlacard.svelte';
	import ShowcaseGallery from '$lib/components/ShowcaseGallery.svelte';

	let { data } = $props<{ data: PageData }>();

	// Interactive filter states
	let selectedEraId = $state<number | null>(null);
	let selectedTraction = $state<TractionType | null>(null);
	let selectedWheelArrangement = $state<string | null>(null);

	// Navigation/selection states
	let selectedClass = $state<LocomotiveClass | null>(null);
	let showcaseOpen = $state<boolean>(false);

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

<div
	class="relative w-screen h-screen overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans"
>
	<!-- Top Navigation Filters -->
	<FilterOverlay
		eras={data.eras}
		{wheelArrangements}
		bind:selectedEraId
		bind:selectedTraction
		bind:selectedWheelArrangement
	/>

	<!-- London Underground inspired Timeline Map -->
	<div class="w-full h-full">
		<TimelineCanvas
			classes={data.classes}
			eras={data.eras}
			bind:selectedClass
			{selectedTraction}
			{selectedEraId}
			{selectedWheelArrangement}
		/>
	</div>

	<!-- Side Info placard drawer -->
	<MuseumPlacard
		classData={selectedClass}
		onClose={() => (selectedClass = null)}
		onShowcaseDetail={() => (showcaseOpen = true)}
	/>

	<!-- Immersive Detail Media & Specs Gallery -->
	<ShowcaseGallery
		classData={selectedClass}
		isOpen={showcaseOpen}
		onClose={() => (showcaseOpen = false)}
	/>
</div>
