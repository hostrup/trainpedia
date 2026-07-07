<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { tractionColor, tractionLabel, buildPeriod, mediaSrcset, TRACTIONS } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData }>();

	// Bygger et filter-link der bevarer de øvrige aktive parametre.
	function filterHref(patch: { era?: string; traction?: string }): string {
		const params = new SvelteURLSearchParams();
		const q = data.filters.q;
		const era = patch.era !== undefined ? patch.era : data.filters.era;
		const traction = patch.traction !== undefined ? patch.traction : data.filters.traction;
		if (q) params.set('q', q);
		if (era) params.set('era', era);
		if (traction) params.set('traction', traction);
		const qs = params.toString();
		return qs ? `${resolve('/classes')}?${qs}` : resolve('/classes');
	}
</script>

<svelte:head>
	<title>Explore the fleet — Trainpedia</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
	<header class="mb-6">
		<h1 class="font-display text-3xl font-semibold text-white">Explore the fleet</h1>
		<p class="mt-1 text-sm text-[var(--color-text-muted)]">
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
				class="mr-1 text-[10px] font-semibold tracking-widest text-[var(--color-text-muted)] uppercase"
				>Era</span
			>
			<a
				href={filterHref({ era: '' })}
				class="rounded-full border px-3 py-1 text-xs transition-colors {data.filters.era === ''
					? 'border-white/40 bg-white/10 font-semibold text-white'
					: 'border-white/10 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-white'}"
				>All</a
			>
			{#each data.eras as era (era.slug)}
				<a
					href={filterHref({ era: era.slug })}
					class="rounded-full border px-3 py-1 text-xs transition-colors {data.filters.era ===
					era.slug
						? 'border-white/40 bg-white/10 font-semibold text-white'
						: 'border-white/10 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-white'}"
				>
					{era.name}
				</a>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-1.5">
			<span
				class="mr-1 text-[10px] font-semibold tracking-widest text-[var(--color-text-muted)] uppercase"
				>Traction</span
			>
			<a
				href={filterHref({ traction: '' })}
				class="rounded-full border px-3 py-1 text-xs transition-colors {data.filters.traction === ''
					? 'border-white/40 bg-white/10 font-semibold text-white'
					: 'border-white/10 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-white'}"
				>All</a
			>
			{#each TRACTIONS as traction (traction)}
				<a
					href={filterHref({ traction })}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors {data
						.filters.traction === traction
						? 'border-white/40 bg-white/10 font-semibold text-white'
						: 'border-white/10 text-[var(--color-text-secondary)] hover:border-white/25 hover:text-white'}"
				>
					<span class="h-2 w-2 rounded-full" style="background-color: {tractionColor(traction)}"
					></span>
					{tractionLabel(traction)}
				</a>
			{/each}
		</div>
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if data.classes.length === 0}
		<div
			class="flex flex-col items-center rounded-2xl border border-dashed border-white/10 py-20 text-center"
		>
			<p class="font-display text-lg text-[var(--color-text-secondary)]">No classes found</p>
			<p class="mt-1 text-sm text-[var(--color-text-muted)]">
				Try a different search term, or <a
					href={resolve('/classes')}
					class="text-amber-400 hover:underline">clear all filters</a
				>.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.classes as cls (cls.wikidataQid)}
				<a
					href={resolve('/class/[qid]', { qid: cls.wikidataQid })}
					class="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--color-bg-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[var(--shadow-subtle)]"
					style="border-top: 3px solid {tractionColor(cls.traction)};"
				>
					<div class="relative aspect-[3/2] overflow-hidden bg-black/40">
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
								class="flex h-full w-full items-center justify-center text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase"
							>
								No imagery
							</div>
						{/if}
					</div>

					<div class="flex flex-1 flex-col p-4">
						<h2 class="font-display text-base leading-snug font-semibold text-white">
							{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
						</h2>
						{#if cls.nickname}
							<p class="font-serif text-sm text-amber-400/90 italic">“{cls.nickname}”</p>
						{/if}

						<div
							class="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-[var(--color-text-secondary)]"
						>
							<span class="tabular-nums">{buildPeriod(cls.buildStart, cls.buildEnd)}</span>
							<span class="flex items-center gap-1.5">
								<span
									class="h-1.5 w-1.5 rounded-full"
									style="background-color: {tractionColor(cls.traction)}"
								></span>
								{tractionLabel(cls.traction)}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
