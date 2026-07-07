<script lang="ts">
	import type { LocomotiveClass, MediaAsset } from '$lib/types.js';
	import SpecificationGrid from './SpecificationGrid.svelte';
	import InspectLightbox from './InspectLightbox.svelte';

	let { classData, isOpen, onClose } = $props<{
		classData: LocomotiveClass | null;
		isOpen: boolean;
		onClose: () => void;
	}>();

	// Lightbox active media asset state
	let activeLightboxMedia = $state<MediaAsset | null>(null);

	// Sort media assets by sortIndex
	const mediaAssets = $derived(
		classData ? [...classData.media].sort((a, b) => a.sortIndex - b.sortIndex) : []
	);

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

<div
	class="fixed inset-0 z-50 flex flex-col transition-transform duration-500"
	style="transition-timing-function: var(--transition-bezier-heavy); background-color: var(--color-bg-base);"
	class:translate-y-full={!isOpen}
	class:translate-y-0={isOpen}
	class:pointer-events-none={!isOpen}
	class:pointer-events-auto={isOpen}
>
	{#if classData}
		<!-- Header Section -->
		<header
			class="flex-shrink-0 bg-slate-950 border-b border-white/10 px-8 py-5 flex items-center justify-between shadow-lg"
		>
			<div class="flex flex-col">
				<div class="flex items-center gap-3">
					<span
						class="text-[10px] font-bold tracking-widest text-amber-500 uppercase px-2 py-0.5 border border-amber-900/50 bg-amber-950/40 rounded"
					>
						{getTractionLabel(classData.traction)}
					</span>
					<span class="text-xs font-mono text-zinc-400 font-bold uppercase"
						>{classData.wheelArrangement ?? '—'}</span
					>
				</div>
				<h1 class="text-3xl font-bold mt-1 font-display text-white">
					{classData.name} Showcase
					{#if classData.nickname}
						<span class="text-xl font-serif text-zinc-400 font-light italic ml-2"
							>"{classData.nickname}"</span
						>
					{/if}
				</h1>
			</div>

			<!-- Back to Timeline Button -->
			<button
				onclick={onClose}
				class="py-2.5 px-5 rounded-full border border-white/15 bg-white/5 hover:bg-white hover:text-black font-semibold text-xs transition cursor-pointer flex items-center gap-2"
			>
				<span>←</span> Back to Timeline
			</button>
		</header>

		<!-- Main content: Gallery + SpecificationGrid (Scrollable) -->
		<main class="flex-1 overflow-y-auto p-8 space-y-12">
			<!-- Gallery Section -->
			<section class="space-y-4">
				<div class="border-b border-white/5 pb-2">
					<h2 class="text-lg font-bold font-display text-zinc-200">Historical Media Gallery</h2>
					<p class="text-xs font-mono text-zinc-500 mt-0.5">
						Click any image to inspect copyright, photographer credits, and high-res details
					</p>
				</div>

				{#if mediaAssets.length > 0}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{#each mediaAssets as media (media.id)}
							<button
								onclick={() => (activeLightboxMedia = media)}
								class="bg-zinc-900/40 border border-white/5 hover:border-white/20 p-2.5 rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer text-left w-full shadow-lg"
							>
								<!-- Image Container -->
								<div class="aspect-[3/2] overflow-hidden rounded-xl bg-neutral-900 relative">
									<img
										src="/{media.localPath}"
										alt={media.title || ''}
										class="w-full h-full object-cover transition duration-500 group-hover:scale-105"
										loading="lazy"
									/>
									<div
										class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
									>
										<span
											class="px-3 py-1.5 rounded-full bg-black/70 border border-white/10 text-[10px] font-mono tracking-wider uppercase text-white shadow-xl"
										>
											🔍 Inspect Asset
										</span>
									</div>
								</div>
								<!-- Caption / Details -->
								<div class="mt-3 px-1 text-xs font-mono flex flex-col gap-1 overflow-hidden">
									<span class="text-zinc-300 truncate font-semibold">
										{media.title || 'Untitled Archive Asset'}
									</span>
									<div class="flex justify-between items-center text-[10px] text-zinc-500">
										<span class="truncate">By: {media.attribution || 'Unknown'}</span>
										<span class="tabular-nums">{media.year ?? '—'}</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div
						class="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-2xl bg-zinc-900/10"
					>
						<span class="text-zinc-600 text-3xl">📷</span>
						<span class="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-4"
							>No Media Assets Found</span
						>
					</div>
				{/if}
			</section>

			<!-- Specification Blueprint Section -->
			<section class="space-y-6">
				<div class="border-b border-white/5 pb-2">
					<h2 class="text-lg font-bold font-display text-zinc-200">
						Complete Technical Blueprint Specs
					</h2>
					<p class="text-xs font-mono text-zinc-500 mt-0.5">
						Fully mapped specifications from historical archives
					</p>
				</div>

				<SpecificationGrid specs={classData.specs} />
			</section>
		</main>
	{/if}

	<!-- Cinematic Lightbox Overlay -->
	{#if activeLightboxMedia}
		<InspectLightbox media={activeLightboxMedia} onClose={() => (activeLightboxMedia = null)} />
	{/if}
</div>
