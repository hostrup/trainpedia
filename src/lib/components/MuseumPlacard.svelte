<script lang="ts">
	import type { LocomotiveClass } from '$lib/types.js';
	import { resolve } from '$app/paths';
	import { tractionColor, tractionLabel } from '$lib/loco.js';

	let { classData, onClose } = $props<{
		classData: LocomotiveClass | null;
		onClose: () => void;
	}>();

	const isOpen = $derived(classData !== null);
	const lineColor = $derived(
		classData && classData.regions.length > 0 ? tractionColor(classData.regions) : 'var(--tfl-blue)'
	);
	const lineLabel = $derived(
		classData && classData.regions.length > 0 ? tractionLabel(classData.regions) : 'Unclassified'
	);
</script>

<!-- Backdrop overlay (closes drawer when clicked) -->
{#if isOpen}
	<button
		onclick={onClose}
		class="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
		aria-label="Close panel"
	></button>
{/if}

<!-- Sliding Placard Drawer -->
<div
	class="absolute top-0 right-0 z-40 flex h-full w-[450px] max-w-full flex-col shadow-2xl transition-transform duration-500"
	style="--line-color: {lineColor}; transition-timing-function: var(--transition-bezier-heavy); background: var(--map-bg); border-left: 1px solid var(--map-zone);"
	class:translate-x-full={!isOpen}
	class:translate-x-0={isOpen}
>
	{#if classData}
		<!-- Header (Image Thumbnail Banner) -->
		<div
			class="relative h-60 w-full flex-shrink-0 overflow-hidden"
			style="background: var(--map-zone); border-bottom: 3px solid var(--line-color);"
		>
			{#if classData.media && classData.media.length > 0}
				<img
					src="/{classData.media[0].localPath}"
					alt={classData.name}
					class="h-full w-full object-cover"
				/>
				<div
					class="absolute inset-0"
					style="background: linear-gradient(to top, var(--map-bg), transparent 60%);"
				></div>
			{:else}
				<div
					class="flex h-full w-full items-center justify-center"
					style="color: var(--map-ink-soft);"
				>
					<span class="font-mono text-xs tracking-wider uppercase">No media available</span>
				</div>
			{/if}

			<!-- Close Button -->
			<button
				onclick={onClose}
				class="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition"
				style="background: var(--map-bg); color: var(--map-ink);"
				aria-label="Close"
			>
				✕
			</button>

			<!-- Quick Info overlay -->
			<div class="absolute right-6 bottom-4 left-6">
				<span
					class="rounded px-2 py-1 text-[10px] font-bold tracking-widest uppercase"
					style="background: var(--map-bg); color: var(--line-color);"
				>
					{lineLabel}
				</span>
				<h2
					class="mt-2 text-2xl font-bold"
					style="font-family: var(--font-map); color: var(--map-ink);"
				>
					{classData.name}
				</h2>
				{#if classData.nickname}
					<p class="font-serif text-sm italic" style="color: var(--map-ink-soft);">
						"{classData.nickname}"
					</p>
				{/if}
			</div>
		</div>

		<!-- Scrollable Narrative & Specifications -->
		<div class="flex-1 space-y-6 overflow-y-auto p-6">
			<!-- Narrative summary from Wikipedia -->
			{#if classData.narrative}
				<div class="space-y-2">
					<h3
						class="border-b pb-1 font-mono text-xs tracking-widest uppercase"
						style="color: var(--map-ink-soft); border-color: var(--map-zone);"
					>
						Historical Narrative
					</h3>
					<p class="font-serif text-sm leading-relaxed" style="color: var(--map-ink);">
						{classData.narrative}
					</p>
				</div>
			{/if}

			<!-- Specification Blueprint Checklist -->
			<div class="space-y-3">
				<h3
					class="border-b pb-1 font-mono text-xs tracking-widest uppercase"
					style="color: var(--map-ink-soft); border-color: var(--map-zone);"
				>
					Quick Blueprint Specifications
				</h3>
				<div class="grid grid-cols-2 gap-2 font-mono text-xs">
					<div
						class="flex flex-col justify-between rounded p-2.5"
						style="background: var(--map-zone);"
					>
						<span class="text-[10px] uppercase" style="color: var(--map-ink-soft);"
							>Wheel Arrangement</span
						>
						<span class="mt-1 font-semibold" style="color: var(--map-ink);"
							>{classData.wheelArrangement ?? 'Unknown'}</span
						>
					</div>
					<div
						class="flex flex-col justify-between rounded p-2.5"
						style="background: var(--map-zone);"
					>
						<span class="text-[10px] uppercase" style="color: var(--map-ink-soft);"
							>Production Count</span
						>
						<span class="mt-1 font-semibold tabular-nums" style="color: var(--map-ink);"
							>{classData.totalBuilt ?? 'Unknown'} built</span
						>
					</div>
					<div
						class="flex flex-col justify-between rounded p-2.5"
						style="background: var(--map-zone);"
					>
						<span class="text-[10px] uppercase" style="color: var(--map-ink-soft);"
							>Build Period</span
						>
						<span class="mt-1 font-semibold tabular-nums" style="color: var(--map-ink);">
							{classData.buildStart ?? '—'}
							{#if classData.buildEnd}
								– {classData.buildEnd}
							{:else if classData.buildStart}
								– Present
							{/if}
						</span>
					</div>
					<div
						class="flex flex-col justify-between rounded p-2.5"
						style="background: var(--map-zone);"
					>
						<span class="text-[10px] uppercase" style="color: var(--map-ink-soft);"
							>Wikidata ID</span
						>
						<a
							href="https://www.wikidata.org/wiki/{classData.wikidataQid}"
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 truncate hover:underline"
							style="color: var(--line-color);"
						>
							{classData.wikidataQid}
						</a>
					</div>
				</div>

				<!-- Quick specifications overview from specs array -->
				{#if classData.specs && classData.specs.length > 0}
					<div class="space-y-2 rounded-lg p-3.5" style="background: var(--map-zone);">
						<span
							class="mb-1 block font-mono text-[10px] tracking-wider uppercase"
							style="color: var(--map-ink-soft);">Key Metrics</span
						>
						{#each classData.specs.slice(0, 5) as spec (spec.id)}
							<div
								class="flex items-center justify-between border-b pb-1 text-xs"
								style="border-color: var(--map-bg);"
							>
								<span class="font-mono" style="color: var(--map-ink-soft);">{spec.key}</span>
								<span class="font-semibold tabular-nums" style="color: var(--map-ink);">
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
		<div
			class="flex flex-shrink-0 flex-col gap-2 p-6"
			style="border-top: 1px solid var(--map-zone);"
		>
			<a
				href={resolve('/class/[qid]', { qid: classData.wikidataQid })}
				class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors"
				style="background: var(--line-color);"
			>
				<span>Open full chronicle</span>
				<span class="text-xs">➔</span>
			</a>
		</div>
	{/if}
</div>
