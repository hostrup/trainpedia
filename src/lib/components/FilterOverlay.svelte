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
	class="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-4 px-6 py-3.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-md max-w-[90vw] md:max-w-max bg-slate-950/70"
>
	<!-- Era Selector dropdown -->
	<div class="flex items-center gap-2">
		<span class="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">Era:</span>
		<select
			bind:value={selectedEraId}
			class="bg-zinc-900/90 text-xs font-semibold text-zinc-200 border border-white/10 px-3 py-1.5 rounded-full outline-none focus:border-white/30 transition cursor-pointer"
		>
			<option value={null}>All Historical Eras</option>
			{#each eras as era (era.id)}
				<option value={era.id}
					>{era.name} ({era.startYear}–{era.endYear ? era.endYear : 'Present'})</option
				>
			{/each}
		</select>
	</div>

	<div class="hidden sm:block w-px h-6 bg-white/10"></div>

	<!-- Traction Button Selector -->
	<div class="flex flex-wrap items-center gap-1.5">
		{#each tractions as t (t.label)}
			{@const isSelected = selectedTraction === t.value}
			<button
				onclick={() => (selectedTraction = t.value)}
				class="text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all duration-200 uppercase tracking-wide cursor-pointer {isSelected
					? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
					: 'bg-zinc-900/60 text-zinc-300 border-white/5 hover:bg-zinc-800 hover:text-white hover:border-white/20'}"
			>
				{t.label}
			</button>
		{/each}
	</div>

	<div class="hidden md:block w-px h-6 bg-white/10"></div>

	<!-- Wheel Arrangement Filter -->
	<div class="flex items-center gap-2">
		<span class="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">Wheel:</span>
		<select
			bind:value={selectedWheelArrangement}
			class="bg-zinc-900/90 text-xs font-semibold text-zinc-200 border border-white/10 px-3 py-1.5 rounded-full outline-none focus:border-white/30 transition cursor-pointer"
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
			class="text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full bg-red-950 text-red-400 border border-red-900/50 hover:bg-red-900 hover:text-red-200 transition-all cursor-pointer"
		>
			Reset
		</button>
	{/if}
</div>
