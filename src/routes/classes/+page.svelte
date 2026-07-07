<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { tractionColor, tractionLabel, buildPeriod, mediaSrcset } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData }>();

	// Bygger et filter-link der bevarer de øvrige aktive parametre.
	function filterHref(patch: { era?: string }): string {
		const params = new SvelteURLSearchParams();
		const q = data.filters.q;
		const era = patch.era !== undefined ? patch.era : data.filters.era;
		if (q) params.set('q', q);
		if (era) params.set('era', era);
		const qs = params.toString();
		return qs ? `${resolve('/classes')}?${qs}` : resolve('/classes');
	}
</script>

<svelte:head>
	<title>Explore the fleet — Trainpedia</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6" style="background: var(--map-bg);">
	<header class="mb-6">
		<h1 class="text-3xl font-semibold" style="font-family: var(--font-map); color: var(--map-ink);">
			Explore the fleet
		</h1>
		<p class="mt-1 text-sm" style="color: var(--map-ink-soft);">
			{#if data.filters.q}
				{data.classes.length} of {data.total} classes matching “{data.filters.q}”
			{:else}
				{data.classes.length} of {data.total} locomotive classes from British railway history
			{/if}
		</p>
	</header>

	<!-- Filterbar — filterHref bygger alle links oven på resolve('/classes') -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<div class="mb-8 flex flex-col gap-3">
		<div class="flex flex-wrap items-center gap-1.5">
			<span
				class="mr-1 text-[10px] font-semibold tracking-widest uppercase"
				style="color: var(--map-ink-soft);">Era</span
			>
			<a
				href={filterHref({ era: '' })}
				class="rounded-full border px-3 py-1 text-xs transition-colors"
				style={data.filters.era === ''
					? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white; font-weight: 600;'
					: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}>All</a
			>
			{#each data.eras as era (era.slug)}
				<a
					href={filterHref({ era: era.slug })}
					class="rounded-full border px-3 py-1 text-xs transition-colors"
					style={data.filters.era === era.slug
						? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white; font-weight: 600;'
						: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
				>
					{era.name}
				</a>
			{/each}
		</div>
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if data.classes.length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed py-20 text-center"
			style="border-color: var(--map-zone);"
		>
			<p class="text-lg" style="font-family: var(--font-map); color: var(--map-ink);">
				No classes found
			</p>
			<p class="mt-1 text-sm" style="color: var(--map-ink-soft);">
				Try a different search term, or <a
					href={resolve('/classes')}
					class="hover:underline"
					style="color: var(--tfl-blue);">clear all filters</a
				>.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.classes as cls (cls.wikidataQid)}
				<a
					href={resolve('/class/[qid]', { qid: cls.wikidataQid })}
					class="group flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5"
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
								“{cls.nickname}”
							</p>
						{/if}

						<div
							class="mt-3 flex items-center justify-between border-t pt-3 text-xs"
							style="border-color: var(--map-zone); color: var(--map-ink-soft);"
						>
							<span class="tabular-nums">{buildPeriod(cls.buildStart, cls.buildEnd)}</span>
							<span class="flex items-center gap-1.5">
								<span class="h-1.5 w-1.5 rounded-full" style="background-color: var(--line-color);"
								></span>
								{tractionLabel(cls.regions)}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
