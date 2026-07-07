<script lang="ts">
	import type { LocomotiveClass } from '$lib/types.js';
	import { resolve } from '$app/paths';

	let { classData, onClose } = $props<{
		classData: LocomotiveClass | null;
		onClose: () => void;
	}>();

	const isOpen = $derived(classData !== null);

	function getTractionLabel(t: string): string {
		switch (t) {
			case 'STEAM':
				return 'Steam 🚂';
			case 'DIESEL':
				return 'Diesel 🛢️';
			case 'ELECTRIC':
				return 'Electric ⚡';
			default:
				return 'Other ⚙️';
		}
	}
</script>

<!-- Backdrop overlay (closes drawer when clicked) -->
{#if isOpen}
	<button
		onclick={onClose}
		class="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
		aria-label="Close panel"
	></button>
{/if}

<!-- Sliding Placard Drawer -->
<div
	class="absolute top-0 right-0 h-full w-[450px] max-w-full z-40 shadow-2xl flex flex-col transition-transform duration-500 bg-slate-950/90 border-l border-white/10 backdrop-blur-md"
	style="transition-timing-function: var(--transition-bezier-heavy);"
	class:translate-x-full={!isOpen}
	class:translate-x-0={isOpen}
>
	{#if classData}
		<!-- Header (Image Thumbnail Banner) -->
		<div
			class="relative h-60 w-full bg-slate-900 overflow-hidden flex-shrink-0 border-b border-white/10"
		>
			{#if classData.media && classData.media.length > 0}
				<img
					src="/{classData.media[0].localPath}"
					alt={classData.name}
					class="w-full h-full object-cover opacity-80"
				/>
				<div
					class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"
				></div>
			{:else}
				<div class="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
					<span class="text-xs uppercase font-mono tracking-wider">No Media Available</span>
				</div>
			{/if}

			<!-- Close Button -->
			<button
				onclick={onClose}
				class="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition cursor-pointer"
				aria-label="Close"
			>
				✕
			</button>

			<!-- Quick Info overlay -->
			<div class="absolute bottom-4 left-6 right-6">
				<span
					class="text-[10px] font-bold tracking-widest text-zinc-400 uppercase bg-black/40 px-2 py-1 rounded border border-white/5"
				>
					{getTractionLabel(classData.traction)}
				</span>
				<h2 class="text-2xl font-bold mt-2 font-display text-white">{classData.name}</h2>
				{#if classData.nickname}
					<p class="text-sm font-serif italic text-amber-400/90">"{classData.nickname}"</p>
				{/if}
			</div>
		</div>

		<!-- Scrollable Narrative & Specifications -->
		<div class="flex-1 overflow-y-auto p-6 space-y-6">
			<!-- Narrative summary from Wikipedia -->
			{#if classData.narrative}
				<div class="space-y-2">
					<h3
						class="text-xs font-mono tracking-widest text-zinc-400 uppercase border-b border-white/5 pb-1"
					>
						Historical Narrative
					</h3>
					<p class="text-sm leading-relaxed text-zinc-300 font-serif font-light">
						{classData.narrative}
					</p>
				</div>
			{/if}

			<!-- Specification Blueprint Checklist -->
			<div class="space-y-3">
				<h3
					class="text-xs font-mono tracking-widest text-zinc-400 uppercase border-b border-white/5 pb-1"
				>
					Quick Blueprint Specifications
				</h3>
				<div class="grid grid-cols-2 gap-2 text-xs font-mono">
					<div
						class="bg-zinc-900/60 p-2.5 rounded border border-white/5 flex flex-col justify-between"
					>
						<span class="text-[10px] text-zinc-500 uppercase">Wheel Arrangement</span>
						<span class="text-zinc-200 mt-1 font-semibold"
							>{classData.wheelArrangement ?? 'Unknown'}</span
						>
					</div>
					<div
						class="bg-zinc-900/60 p-2.5 rounded border border-white/5 flex flex-col justify-between"
					>
						<span class="text-[10px] text-zinc-500 uppercase">Production Count</span>
						<span class="text-zinc-200 mt-1 font-semibold tabular-nums"
							>{classData.totalBuilt ?? 'Unknown'} built</span
						>
					</div>
					<div
						class="bg-zinc-900/60 p-2.5 rounded border border-white/5 flex flex-col justify-between"
					>
						<span class="text-[10px] text-zinc-500 uppercase">Build Period</span>
						<span class="text-zinc-200 mt-1 font-semibold tabular-nums">
							{classData.buildStart ?? '—'}
							{#if classData.buildEnd}
								– {classData.buildEnd}
							{:else if classData.buildStart}
								– Present
							{/if}
						</span>
					</div>
					<div
						class="bg-zinc-900/60 p-2.5 rounded border border-white/5 flex flex-col justify-between"
					>
						<span class="text-[10px] text-zinc-500 uppercase">Wikidata ID</span>
						<a
							href="https://www.wikidata.org/wiki/{classData.wikidataQid}"
							target="_blank"
							rel="noopener noreferrer"
							class="text-amber-400 hover:underline mt-1 truncate"
						>
							{classData.wikidataQid}
						</a>
					</div>
				</div>

				<!-- Quick specifications overview from specs array -->
				{#if classData.specs && classData.specs.length > 0}
					<div class="bg-zinc-900/40 border border-white/5 rounded-lg p-3.5 space-y-2">
						<span class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1"
							>Key Metrics</span
						>
						{#each classData.specs.slice(0, 5) as spec (spec.id)}
							<div class="flex justify-between items-center text-xs border-b border-white/5 pb-1">
								<span class="text-zinc-400 font-mono">{spec.key}</span>
								<span class="text-zinc-200 font-semibold tabular-nums">
									{spec.value}
									{spec.unit ?? ''}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer actions (Sticky) -->
		<div class="p-6 border-t border-white/10 bg-slate-950 flex flex-col gap-2 flex-shrink-0">
			<a
				href={resolve('/class/[qid]', { qid: classData.wikidataQid })}
				class="w-full py-3 px-4 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
			>
				<span>Open full chronicle</span>
				<span class="text-xs">➔</span>
			</a>
		</div>
	{/if}
</div>
