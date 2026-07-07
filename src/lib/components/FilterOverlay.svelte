<script lang="ts">
	import type { Era, TractionType } from '$lib/types.js';

	let {
		eras,
		wheelArrangements,
		selectedEraId = $bindable(null),
		selectedTraction = $bindable(null),
		selectedWheelArrangement = $bindable(null)
	} = $props<{
		eras: Era[];
		wheelArrangements: string[];
		selectedEraId: number | null;
		selectedTraction: TractionType | null;
		selectedWheelArrangement: string | null;
	}>();

	const tractions: { label: string; value: TractionType | null }[] = [
		{ label: 'All Tractions', value: null },
		{ label: 'Steam 🚂', value: 'STEAM' },
		{ label: 'Diesel 🛢️', value: 'DIESEL' },
		{ label: 'Electric ⚡', value: 'ELECTRIC' },
		{ label: 'Other ⚙️', value: 'OTHER' }
	];

	function resetFilters() {
		selectedEraId = null;
		selectedTraction = null;
		selectedWheelArrangement = null;
	}

	const hasActiveFilters = $derived(
		selectedEraId !== null || selectedTraction !== null || selectedWheelArrangement !== null
	);
</script>

<div
	class="absolute top-6 left-1/2 z-20 flex max-w-[90vw] -translate-x-1/2 flex-wrap items-center gap-4 rounded-full px-6 py-3.5 shadow-lg md:max-w-max"
	style="background: var(--map-bg); border: 1px solid var(--map-zone);"
>
	<!-- Era Selector dropdown -->
	<div class="flex items-center gap-2">
		<span class="text-[11px] font-mono tracking-wider uppercase" style="color: var(--map-ink-soft);"
			>Era:</span
		>
		<select
			bind:value={selectedEraId}
			aria-label="Filtrér efter æra"
			class="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition"
			style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
		>
			<option value={null}>All Historical Eras</option>
			{#each eras as era (era.id)}
				<option value={era.id}
					>{era.name} ({era.startYear}–{era.endYear ? era.endYear : 'Present'})</option
				>
			{/each}
		</select>
	</div>

	<div class="hidden h-6 w-px sm:block" style="background: var(--map-zone);"></div>

	<!-- Traction Button Selector -->
	<div class="flex flex-wrap items-center gap-1.5">
		{#each tractions as t (t.label)}
			{@const isSelected = selectedTraction === t.value}
			<button
				onclick={() => (selectedTraction = t.value)}
				class="cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-all duration-200"
				style={isSelected
					? 'background: var(--tfl-blue); color: white; border-color: var(--tfl-blue);'
					: 'background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);'}
			>
				{t.label}
			</button>
		{/each}
	</div>

	<div class="hidden h-6 w-px md:block" style="background: var(--map-zone);"></div>

	<!-- Wheel Arrangement Filter -->
	<div class="flex items-center gap-2">
		<span class="text-[11px] font-mono tracking-wider uppercase" style="color: var(--map-ink-soft);"
			>Wheel:</span
		>
		<select
			bind:value={selectedWheelArrangement}
			aria-label="Filtrér efter hjularrangement"
			class="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition"
			style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
		>
			<option value={null}>All Arrangements</option>
			{#each wheelArrangements as wa (wa)}
				<option value={wa}>{wa}</option>
			{/each}
		</select>
	</div>

	<!-- Reset Button -->
	{#if hasActiveFilters}
		<button
			onclick={resetFilters}
			class="cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all"
			style="background: #fdecee; color: #c0152f; border-color: #f6c3ca;"
		>
			Reset
		</button>
	{/if}
</div>
