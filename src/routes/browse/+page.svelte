<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { tractionColor, tractionLabel, buildPeriod, mediaSrcset } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData }>();

	/* eslint-disable svelte/no-navigation-without-resolve -- all goto() calls in this file use resolve() */
	// --- URL State Management ---
	function updateUrl(patch: Record<string, string | null>) {
		const params = new SvelteURLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(patch)) {
			if (value === null || value === '') {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		const qs = params.toString();
		if (qs) {
			goto(`${resolve('/browse')}?${qs}`, { replaceState: false, noScroll: true });
		} else {
			goto(resolve('/browse'), { replaceState: false, noScroll: true });
		}
	}

	function clearFilters() {
		const lens = data.lens ?? 'grid';
		goto(`${resolve('/browse')}?lens=${lens}`, { replaceState: false });
	}

	function setLens(newLens: string) {
		updateUrl({ lens: newLens });
	}

	function setSort(newSort: string) {
		const currentSort = data.filters.sort;
		const currentDir = data.filters.dir;
		if (newSort === currentSort) {
			// Toggle direction, third click resets
			if (currentDir === 'asc') updateUrl({ dir: 'desc' });
			else updateUrl({ sort: null, dir: null });
		} else {
			updateUrl({ sort: newSort, dir: 'asc' });
		}
	}

	function selectClass(qid: string) {
		updateUrl({ sel: qid });
	}

	function closeQuickView() {
		updateUrl({ sel: null });
	}

	// --- Computed ---
	const activeFilterCount = $derived(
		[
			data.filters.q,
			data.filters.era,
			data.filters.region,
			data.filters.type,
			data.filters.wheel,
			data.filters.builder,
			data.filters.decade,
			data.filters.surviving
		].filter(Boolean).length
	);

	// Extract TOPS number from class name for display
	function topsNumber(name: string): string {
		const m = name.match(/class\s+(\d{1,3})\b/i);
		return m ? m[1] : '—';
	}

	// Helper: get spec value
	function specValue(cls: (typeof data.classes)[number], key: string): string {
		const s = cls.specs[key];
		if (!s || s.numeric === null) return '—';
		// Format with appropriate precision
		if (key === 'Power Output')
			return s.numeric.toLocaleString('en-GB') + (s.unit ? ` ${s.unit}` : '');
		if (key === 'Top Speed')
			return s.numeric.toLocaleString('en-GB') + (s.unit ? ` ${s.unit}` : '');
		if (key === 'Tractive Effort')
			return s.numeric.toLocaleString('en-GB') + (s.unit ? ` ${s.unit}` : '');
		return s.value;
	}
</script>

<svelte:head>
	<title>Browse the collection — Trainpedia</title>
	<meta
		name="description"
		content="Explore {data.total} British locomotive classes — filter, sort and compare by era, power type, builder and more."
	/>
</svelte:head>

<div
	class="mx-auto max-w-[1400px] px-4 py-6 sm:px-6"
	style="background: var(--map-bg); min-height: 100vh;"
>
	<!-- Header -->
	<header class="mb-4">
		<h1 class="text-2xl font-semibold" style="font-family: var(--font-map); color: var(--map-ink);">
			The Roster
		</h1>
		<p class="mt-0.5 text-sm" style="color: var(--map-ink-soft);">
			{data.classes.length} of {data.total} classes
			{#if activeFilterCount > 0}
				· {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
			{/if}
		</p>
	</header>

	<!-- Control Bar (sticky) -->
	<div
		class="sticky top-0 z-20 -mx-4 mb-6 border-b px-4 py-3 sm:-mx-6 sm:px-6"
		style="background: var(--map-bg); border-color: var(--map-zone);"
	>
		<!-- Lens switcher + Sort -->
		<div class="mb-2 flex flex-wrap items-center gap-3">
			<div class="flex rounded-lg border" style="border-color: var(--map-zone);">
				{#each [{ id: 'grid', icon: '▦', label: 'Grid' }, { id: 'table', icon: '☰', label: 'Table' }, { id: 'timeline', icon: '⟝', label: 'Timeline' }, { id: 'chart', icon: '⣿', label: 'Chart' }] as lens (lens.id)}
					<button
						onclick={() => setLens(lens.id)}
						class="px-3 py-1.5 text-xs font-medium transition-colors"
						class:rounded-l-lg={lens.id === 'grid'}
						class:rounded-r-lg={lens.id === 'chart'}
						style={data.lens === lens.id
							? 'background: var(--tfl-blue); color: white;'
							: 'color: var(--map-ink-soft);'}
					>
						<span class="mr-1">{lens.icon}</span>{lens.label}
					</button>
				{/each}
			</div>

			<div class="ml-auto flex items-center gap-2">
				<span
					class="text-[10px] font-semibold tracking-widest uppercase"
					style="color: var(--map-ink-soft);"
				>
					Sort
				</span>
				{#each [{ id: 'year', label: 'Year' }, { id: 'name', label: 'Name' }, { id: 'built', label: 'Built' }] as s (s.id)}
					<button
						onclick={() => setSort(s.id)}
						class="rounded-full border px-2.5 py-0.5 text-[11px] transition-colors"
						style={data.filters.sort === s.id
							? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white; font-weight: 600;'
							: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
					>
						{s.label}{data.filters.sort === s.id ? (data.filters.dir === 'asc' ? ' ↑' : ' ↓') : ''}
					</button>
				{/each}
			</div>
		</div>

		<!-- Filter chips -->
		<div class="flex flex-wrap items-center gap-1.5">
			<!-- Era filter -->
			<div class="flex flex-wrap items-center gap-1">
				{#each data.eras as e (e.slug)}
					<button
						onclick={() => updateUrl({ era: data.filters.era === e.slug ? null : e.slug })}
						class="rounded-full border px-2.5 py-0.5 text-[11px] transition-colors"
						style={data.filters.era === e.slug
							? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white; font-weight: 600;'
							: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
					>
						{e.name}
					</button>
				{/each}
			</div>

			<!-- Power Type filter -->
			{#if data.facets.powerTypes.length > 0}
				<span class="mx-1 text-[10px]" style="color: var(--map-zone);">·</span>
				{#each data.facets.powerTypes as pt (pt)}
					{@const ptLabel = pt.startsWith('TYPE_')
						? `Type ${pt.slice(5)}`
						: pt.charAt(0) + pt.slice(1).toLowerCase()}
					<button
						onclick={() =>
							updateUrl({
								type:
									data.filters.type === (pt.startsWith('TYPE_') ? pt.slice(5) : pt.toLowerCase())
										? null
										: pt.startsWith('TYPE_')
											? pt.slice(5)
											: pt.toLowerCase()
							})}
						class="rounded-full border px-2.5 py-0.5 text-[11px] transition-colors"
						style={data.filters.type
							? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white; font-weight: 600;'
							: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
					>
						{ptLabel}
					</button>
				{/each}
			{/if}

			<!-- Clear all -->
			{#if activeFilterCount > 0}
				<button
					onclick={clearFilters}
					class="ml-2 text-[11px] font-medium underline"
					style="color: var(--tfl-blue);"
				>
					Clear all
				</button>
			{/if}
		</div>
	</div>

	<!-- Empty state -->
	{#if data.classes.length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed py-20 text-center"
			style="border-color: var(--map-zone);"
		>
			<p class="text-lg" style="font-family: var(--font-map); color: var(--map-ink);">
				No classes match these filters
			</p>
			<p class="mt-1 text-sm" style="color: var(--map-ink-soft);">
				Try removing some filters, or
				<button onclick={clearFilters} class="underline" style="color: var(--tfl-blue);">
					clear all
				</button>.
			</p>
		</div>

		<!-- GRID LENS -->
	{:else if data.lens === 'grid'}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.classes as cls (cls.wikidataQid)}
				<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
				<div
					onclick={() => selectClass(cls.wikidataQid)}
					class="group flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5"
					style="--line-color: {tractionColor(
						cls.regions
					)}; background: var(--map-bg); border-color: var(--map-zone); border-top: 3px solid var(--line-color); box-shadow: var(--shadow-subtle);"
				>
					<div class="relative aspect-[3/2] overflow-hidden" style="background: var(--map-zone);">
						{#if cls.media.length > 0}
							{@const img = mediaSrcset(cls.media[0].localPath)}
							<img
								src={img.src}
								srcset={img.srcset}
								sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
								alt={cls.media[0].title ?? cls.name}
								loading="lazy"
								class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
							/>
						{:else}
							<div
								class="flex h-full w-full items-center justify-center text-[10px] tracking-widest uppercase"
								style="color: var(--map-ink-soft);"
							>
								No imagery
							</div>
						{/if}
						<!-- Type badge -->
						{#if cls.powerType}
							<span
								class="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
								style="background: rgba(0,0,0,0.6); color: white;"
							>
								{cls.powerType.startsWith('TYPE_') ? `T${cls.powerType.slice(5)}` : '⚙'}
							</span>
						{/if}
					</div>

					<div class="flex flex-1 flex-col p-4">
						<h2
							class="text-base leading-snug font-semibold"
							style="font-family: var(--font-map); color: var(--map-ink);"
						>
							{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
						</h2>
						{#if cls.nickname}
							<p class="font-serif text-sm italic" style="color: var(--line-color);">
								"{cls.nickname}"
							</p>
						{/if}

						<!-- Data points -->
						<div
							class="mt-auto flex items-center justify-between border-t pt-3 text-[11px]"
							style="border-color: var(--map-zone); color: var(--map-ink-soft);"
						>
							<span class="tabular-nums">{buildPeriod(cls.buildStart, cls.buildEnd)}</span>
							{#if cls.totalBuilt}
								<span class="tabular-nums">{cls.totalBuilt} built</span>
							{/if}
							<span class="flex items-center gap-1">
								<span class="h-1.5 w-1.5 rounded-full" style="background-color: var(--line-color);"
								></span>
								{tractionLabel(cls.regions)}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- TABLE LENS -->
	{:else if data.lens === 'table'}
		<div class="overflow-x-auto rounded-lg border" style="border-color: var(--map-zone);">
			<table class="w-full text-sm" style="color: var(--map-ink);">
				<thead>
					<tr
						class="border-b text-[10px] font-semibold tracking-wider uppercase"
						style="border-color: var(--map-zone); color: var(--map-ink-soft);"
					>
						<th class="px-3 py-2 text-left">
							<button onclick={() => setSort('number')} class="hover:underline">
								№{data.filters.sort === 'number' ? (data.filters.dir === 'asc' ? ' ↑' : ' ↓') : ''}
							</button>
						</th>
						<th class="px-3 py-2 text-left">
							<button onclick={() => setSort('name')} class="hover:underline">
								Class{data.filters.sort === 'name'
									? data.filters.dir === 'asc'
										? ' ↑'
										: ' ↓'
									: ''}
							</button>
						</th>
						<th class="px-3 py-2 text-left">Nickname</th>
						<th class="px-3 py-2 text-right">
							<button onclick={() => setSort('year')} class="hover:underline">
								Intro{data.filters.sort === 'year'
									? data.filters.dir === 'asc'
										? ' ↑'
										: ' ↓'
									: ''}
							</button>
						</th>
						<th class="px-3 py-2 text-center">Type</th>
						<th class="px-3 py-2 text-right">Power</th>
						<th class="px-3 py-2 text-right">T.E.</th>
						<th class="px-3 py-2 text-right">Speed</th>
						<th class="px-3 py-2 text-right">
							<button onclick={() => setSort('built')} class="hover:underline">
								Built{data.filters.sort === 'built'
									? data.filters.dir === 'asc'
										? ' ↑'
										: ' ↓'
									: ''}
							</button>
						</th>
						<th class="px-3 py-2 text-center">Region</th>
					</tr>
				</thead>
				<tbody>
					{#each data.classes as cls (cls.wikidataQid)}
						<tr
							onclick={() => selectClass(cls.wikidataQid)}
							class="cursor-pointer border-b transition-colors hover:bg-[var(--map-zone)]"
							style="--line-color: {tractionColor(
								cls.regions
							)}; border-color: color-mix(in srgb, var(--map-zone) 50%, transparent);"
						>
							<td
								class="px-3 py-2 font-semibold tabular-nums"
								style="font-family: var(--font-map);"
							>
								{topsNumber(cls.name)}
							</td>
							<td class="px-3 py-2 font-medium">
								{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
							</td>
							<td class="px-3 py-2 font-serif text-xs italic" style="color: var(--map-ink-soft);">
								{cls.nickname ?? ''}
							</td>
							<td class="px-3 py-2 text-right tabular-nums">{cls.buildStart ?? '—'}</td>
							<td class="px-3 py-2 text-center text-[10px] font-bold tracking-wider">
								{#if cls.powerType}
									{cls.powerType.startsWith('TYPE_') ? `T${cls.powerType.slice(5)}` : '⚙'}
								{:else}
									—
								{/if}
							</td>
							<td class="px-3 py-2 text-right tabular-nums">{specValue(cls, 'Power Output')}</td>
							<td class="px-3 py-2 text-right tabular-nums">{specValue(cls, 'Tractive Effort')}</td>
							<td class="px-3 py-2 text-right tabular-nums">{specValue(cls, 'Top Speed')}</td>
							<td class="px-3 py-2 text-right tabular-nums">{cls.totalBuilt ?? '—'}</td>
							<td class="px-3 py-2 text-center">
								<span
									class="inline-block h-2.5 w-2.5 rounded-full"
									style="background-color: var(--line-color);"
								></span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- TIMELINE LENS (F11.2) -->
	{:else if data.lens === 'timeline'}
		{@const ROW_H = 28}
		{@const LABEL_W = 180}
		{@const CHART_W = 800}
		{@const HEADER_H = 40}
		{@const timelineClasses = [...data.classes].sort(
			(a, b) => (a.buildStart ?? 9999) - (b.buildStart ?? 9999)
		)}
		{@const minYear = Math.min(
			...timelineClasses
				.map((c) => c.buildStart ?? c.serviceEntry?.getFullYear() ?? 1930)
				.filter(Boolean),
			1925
		)}
		{@const maxYear = new Date().getFullYear() + 2}
		{@const yearRange = maxYear - minYear}
		{@const svgH = HEADER_H + timelineClasses.length * ROW_H + 20}

		<div class="overflow-x-auto rounded-lg border" style="border-color: var(--map-zone);">
			<svg
				width={LABEL_W + CHART_W + 20}
				height={svgH}
				viewBox="0 0 {LABEL_W + CHART_W + 20} {svgH}"
				style="background: var(--map-bg); font-family: var(--font-ui);"
				role="img"
				aria-label="Timeline of British locomotive classes"
			>
				<!-- Era background bands -->
				{#each data.eras as era (era.slug)}
					{@const eraX = LABEL_W + ((era.startYear - minYear) / yearRange) * CHART_W}
					{@const eraEndYear = era.endYear ?? maxYear}
					{@const eraW = ((eraEndYear - era.startYear) / yearRange) * CHART_W}
					<rect
						x={eraX}
						y={0}
						width={eraW}
						height={svgH}
						fill="color-mix(in srgb, var(--tfl-blue) {Math.max(
							5,
							25 - data.eras.indexOf(era) * 5
						)}%, var(--map-zone))"
						opacity="0.3"
					/>
					<text
						x={eraX + 4}
						y={HEADER_H - 6}
						font-size="9"
						fill="var(--map-ink-soft)"
						opacity="0.7"
					>
						{era.startYear}
					</text>
				{/each}

				<!-- Decade gridlines -->
				{#each Array.from({ length: Math.ceil(yearRange / 10) + 1 }, (_, i) => Math.floor(minYear / 10) * 10 + i * 10) as decade (decade)}
					{@const dx = LABEL_W + ((decade - minYear) / yearRange) * CHART_W}
					<line
						x1={dx}
						y1={HEADER_H}
						x2={dx}
						y2={svgH}
						stroke="var(--map-zone)"
						stroke-width="0.5"
					/>
					<text
						x={dx + 2}
						y={HEADER_H - 4}
						font-size="10"
						fill="var(--map-ink-soft)"
						style="font-family: var(--font-map);"
					>
						{decade}
					</text>
				{/each}

				<!-- Class bars -->
				{#each timelineClasses as cls, i (cls.wikidataQid)}
					{@const y = HEADER_H + i * ROW_H}
					{@const startYear =
						cls.buildStart ?? (cls.serviceEntry ? new Date(cls.serviceEntry).getFullYear() : null)}
					{@const endYear = cls.serviceExit ? new Date(cls.serviceExit).getFullYear() : null}
					{@const barStart = startYear
						? LABEL_W + ((startYear - minYear) / yearRange) * CHART_W
						: 0}
					{@const barEnd = endYear
						? LABEL_W + ((endYear - minYear) / yearRange) * CHART_W
						: LABEL_W + CHART_W}
					{@const barW = Math.max(barEnd - barStart, 3)}
					{@const color = tractionColor(cls.regions)}

					<!-- Row background on hover handled via CSS -->
					<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
					<g class="timeline-row" onclick={() => selectClass(cls.wikidataQid)}>
						<rect
							x={0}
							{y}
							width={LABEL_W + CHART_W + 20}
							height={ROW_H}
							fill="transparent"
							class="cursor-pointer hover:fill-[var(--map-zone)]"
							opacity="0.3"
						/>

						<!-- Label -->
						<text
							x={LABEL_W - 8}
							y={y + ROW_H / 2 + 4}
							font-size="11"
							fill="var(--map-ink)"
							text-anchor="end"
							style="font-family: var(--font-map);"
						>
							{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
						</text>

						<!-- Bar -->
						{#if startYear}
							<rect
								x={barStart}
								y={y + 6}
								width={barW}
								height={ROW_H - 12}
								rx="3"
								fill={color}
								opacity="0.85"
							/>
							<!-- Open-ended arrow for classes still in service -->
							{#if !endYear}
								<polygon
									points="{barEnd},{y + ROW_H / 2} {barEnd - 6},{y + 6} {barEnd - 6},{y +
										ROW_H -
										6}"
									fill={color}
									opacity="0.85"
								/>
							{:else}
								<!-- Terminus mark -->
								<line
									x1={barEnd}
									y1={y + 4}
									x2={barEnd}
									y2={y + ROW_H - 4}
									stroke={color}
									stroke-width="2"
								/>
							{/if}

							<!-- Landmark marker -->
							{#if cls.isLandmark}
								<circle
									cx={barStart}
									cy={y + ROW_H / 2}
									r="4"
									fill="white"
									stroke={color}
									stroke-width="1.5"
								/>
							{/if}
						{/if}

						<!-- Hover tooltip (SVG title) -->
						<title
							>{cls.name}{cls.nickname ? ` "${cls.nickname}"` : ''} — {startYear ?? '?'}–{endYear ??
								'present'}{cls.totalBuilt ? ` · ${cls.totalBuilt} built` : ''}</title
						>
					</g>
				{/each}
			</svg>
		</div>

		<!-- CHART LENS (placeholder — F11.4) -->
	{:else if data.lens === 'chart'}
		<div
			class="flex items-center justify-center rounded-2xl border border-dashed py-20"
			style="border-color: var(--map-zone);"
		>
			<p style="color: var(--map-ink-soft);">Chart lens — coming in F11.4</p>
		</div>
	{/if}

	<!-- Quick-view drawer (MuseumPlacard) -->
	{#if data.selectedClass}
		<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
		<div
			class="fixed inset-0 z-30"
			style="background: rgba(0,0,0,0.4);"
			onclick={closeQuickView}
		></div>
		<div
			class="fixed top-0 right-0 z-40 flex h-full w-[480px] max-w-full flex-col shadow-2xl transition-transform"
			style="background: var(--map-bg);"
		>
			<div
				class="flex items-center justify-between border-b p-4"
				style="border-color: var(--map-zone);"
			>
				<h2
					class="text-lg font-semibold"
					style="font-family: var(--font-map); color: var(--map-ink);"
				>
					{data.selectedClass.name}
				</h2>
				<button onclick={closeQuickView} class="text-lg" style="color: var(--map-ink-soft);"
					>✕</button
				>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				{#if data.selectedClass.narrative}
					<p
						class="mb-4 text-sm leading-relaxed"
						style="font-family: var(--font-narrative); color: var(--map-ink);"
					>
						{data.selectedClass.narrative}
					</p>
				{/if}
				{#if data.selectedClass.media.length > 0}
					{@const img = mediaSrcset(data.selectedClass.media[0].localPath)}
					<img
						src={img.src}
						srcset={img.srcset}
						sizes="480px"
						alt={data.selectedClass.media[0].title ?? data.selectedClass.name}
						class="mb-4 w-full rounded-lg"
					/>
				{/if}
				{#if data.selectedClass.specs.length > 0}
					<div class="grid grid-cols-2 gap-2">
						{#each data.selectedClass.specs as spec (spec.key)}
							<div class="rounded-lg border p-2" style="border-color: var(--map-zone);">
								<span
									class="block text-[10px] font-semibold tracking-wider uppercase"
									style="color: var(--map-ink-soft);">{spec.key}</span
								>
								<span class="text-sm font-medium tabular-nums" style="color: var(--map-ink);"
									>{spec.value}</span
								>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<div class="flex-shrink-0 border-t p-4" style="border-color: var(--map-zone);">
				<a
					href={resolve('/class/[qid]', { qid: data.selectedClass.wikidataQid })}
					class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg"
					style="background: var(--tfl-blue);"
				>
					Open full chronicle <span class="text-xs">➔</span>
				</a>
			</div>
		</div>
	{/if}
</div>
