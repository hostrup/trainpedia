<script lang="ts">
	import type { PageData } from './$types.js';
	import type { MediaAsset } from '$lib/types.js';
	import { resolve } from '$app/paths';
	import SpecificationGrid from '$lib/components/SpecificationGrid.svelte';
	import InspectLightbox from '$lib/components/InspectLightbox.svelte';
	import FleetTable from '$lib/components/FleetTable.svelte';
	import { tractionColor, tractionLabel, buildPeriod, mediaSrcset } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData }>();
	const cls = $derived(data.cls);
	const displayName = $derived(resolveDisplayName(cls.name, cls.aliases, data.nameScheme));
	const lineColor = $derived(tractionColor(cls.regions));

	let activeLightboxMedia = $state<MediaAsset | null>(null);

	const heroMedia = $derived(cls.media.length > 0 ? cls.media[0] : null);

	// Wikidata-feltet totalBuilt er ofte tomt, mens infobox-spec'en har tallet.
	const totalBuilt = $derived(
		cls.totalBuilt ??
			cls.specs.find((s: { key: string }) => s.key === 'Total Built')?.value ??
			'Unknown'
	);

	function serviceYears(): string {
		const entry = cls.serviceEntry ? new Date(cls.serviceEntry).getUTCFullYear() : null;
		const exit = cls.serviceExit ? new Date(cls.serviceExit).getUTCFullYear() : null;
		if (entry === null) return '—';
		return exit ? `${entry}–${exit}` : `${entry}–present`;
	}
</script>

<svelte:head>
	<title>{displayName} — Trainpedia</title>
	{#if cls.narrative}
		<meta name="description" content={cls.narrative.slice(0, 160)} />
	{/if}
</svelte:head>

<!-- --line-color sat her følger med ind i ALLE accenter nedenfor (hero, badges, links,
     spec-kanter) — jf. F5.8-kravet om at linjefarven tematiserer hele undersektionen. -->
<div style="--line-color: {lineColor};">
	<!-- Hero -->
	<div
		class="relative h-[45vh] min-h-[320px] w-full overflow-hidden"
		style="background: var(--map-ink);"
	>
		{#if heroMedia}
			{@const img = mediaSrcset(heroMedia.localPath)}
			<img
				src={img.src}
				srcset={img.srcset}
				sizes="100vw"
				alt={heroMedia.title ?? cls.name}
				class="h-full w-full object-cover opacity-80"
			/>
		{/if}
		<div
			class="absolute inset-0"
			style="background: linear-gradient(to top, var(--map-bg), rgba(28,28,30,0.15) 50%, rgba(28,28,30,0.35));"
		></div>
		<div class="absolute inset-x-0 top-0 h-1.5" style="background: var(--line-color);"></div>

		<div class="absolute right-0 bottom-0 left-0">
			<div class="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
				<nav class="mb-3 text-xs" style="color: rgba(255,255,255,0.8);">
					<a href={resolve('/classes')} class="hover:underline hover:text-white">Explore</a>
					<span class="mx-1.5 opacity-50">/</span>
					<a
						href="{resolve('/classes')}?era={cls.era.slug}"
						class="hover:underline hover:text-white">{cls.era.name}</a
					>
				</nav>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm"
						style="background: var(--line-color);"
					>
						{tractionLabel(cls.regions)}
					</span>
					{#if cls.wheelArrangement}
						<span
							class="rounded-full border border-white/30 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-wider text-white backdrop-blur-sm"
						>
							{cls.wheelArrangement}
						</span>
					{/if}
				</div>
				<h1
					class="mt-2 text-3xl font-semibold text-white drop-shadow-lg sm:text-5xl"
					style="font-family: var(--font-map);"
				>
					{displayName}
				</h1>
				{#if cls.nickname}
					<p class="font-serif mt-1 text-lg text-white/90 italic drop-shadow">
						“{cls.nickname}”
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
		<div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
			<!-- Hovedspalte: narrativ + specs + galleri -->
			<div class="min-w-0 space-y-12">
				{#if cls.narrative}
					<section>
						<h2
							class="mb-3 text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							Why this class mattered
						</h2>
						<p
							class="font-serif max-w-prose text-lg leading-relaxed"
							style="color: var(--map-ink);"
						>
							{cls.narrative}
						</p>
						{#if cls.sourceUrl}
							<p class="mt-3 text-xs" style="color: var(--map-ink-soft);">
								Source:
								<a
									href={cls.sourceUrl}
									target="_blank"
									rel="external noopener noreferrer"
									class="hover:underline"
									style="color: var(--line-color);">Wikipedia</a
								>
							</p>
						{/if}
					</section>
				{/if}

				<section>
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						Technical specifications
					</h2>
					<SpecificationGrid specs={cls.specs} />
				</section>

				{#if data.fleet.length > 0}
					<section>
						<h2
							class="mb-4 text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							The Fleet — {data.fleet.length}
							{data.fleet.length === 1 ? 'individual' : 'individuals'}
						</h2>
						<FleetTable fleet={data.fleet} />
					</section>
				{/if}

				<section>
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						Gallery — {cls.media.length}
						{cls.media.length === 1 ? 'asset' : 'assets'}
					</h2>
					{#if cls.media.length > 0}
						<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
							{#each cls.media as media (media.id)}
								{@const img = mediaSrcset(media.localPath)}
								<button
									onclick={() => (activeLightboxMedia = media)}
									class="group overflow-hidden rounded-lg border text-left transition-colors"
									style="background: var(--map-zone); border-color: var(--map-zone);"
								>
									<div class="aspect-[3/2] overflow-hidden">
										<img
											src={img.src}
											srcset={img.srcset}
											sizes="(min-width: 768px) 25vw, 50vw"
											alt={media.title ?? cls.name}
											loading="lazy"
											class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									</div>
									<div
										class="flex items-center justify-between gap-2 px-2.5 py-2 text-[10px]"
										style="color: var(--map-ink-soft);"
									>
										<span class="truncate">{media.title ?? 'Untitled'}</span>
										<span class="tabular-nums">{media.year ?? ''}</span>
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<div
							class="rounded-xl border border-dashed py-12 text-center text-xs tracking-widest uppercase"
							style="border-color: var(--map-zone); color: var(--map-ink-soft);"
						>
							No media assets recorded
						</div>
					{/if}
				</section>
			</div>

			<!-- Sidespalte: nøglefakta -->
			<aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
				<div
					class="rounded-xl border p-5"
					style="background: var(--map-zone); border-color: var(--map-zone);"
				>
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						Key facts
					</h2>
					<dl class="space-y-3 text-sm">
						<div class="flex justify-between gap-4">
							<dt style="color: var(--map-ink-soft);">Era</dt>
							<dd class="text-right" style="color: var(--map-ink);">{cls.era.name}</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt style="color: var(--map-ink-soft);">Built</dt>
							<dd class="text-right tabular-nums" style="color: var(--map-ink);">
								{buildPeriod(cls.buildStart, cls.buildEnd)}
							</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt style="color: var(--map-ink-soft);">In service</dt>
							<dd class="text-right tabular-nums" style="color: var(--map-ink);">
								{serviceYears()}
							</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt style="color: var(--map-ink-soft);">Total built</dt>
							<dd class="text-right tabular-nums" style="color: var(--map-ink);">{totalBuilt}</dd>
						</div>
						{#if cls.wheelArrangement}
							<div class="flex justify-between gap-4">
								<dt style="color: var(--map-ink-soft);">Wheels</dt>
								<dd class="text-right font-mono" style="color: var(--map-ink);">
									{cls.wheelArrangement}
								</dd>
							</div>
						{/if}
					</dl>
					<div
						class="mt-5 flex flex-col gap-1.5 border-t pt-4 text-xs"
						style="border-color: var(--map-bg);"
					>
						{#if cls.sourceUrl}
							<a
								href={cls.sourceUrl}
								target="_blank"
								rel="external noopener noreferrer"
								class="hover:underline"
								style="color: var(--line-color);">Read the full Wikipedia article →</a
							>
						{/if}
						<a
							href="https://www.wikidata.org/wiki/{cls.wikidataQid}"
							target="_blank"
							rel="external noopener noreferrer"
							class="hover:underline"
							style="color: var(--map-ink-soft);">Wikidata: {cls.wikidataQid}</a
						>
					</div>
				</div>

				{#if data.related.length > 0}
					<div
						class="rounded-xl border p-5"
						style="background: var(--map-zone); border-color: var(--map-zone);"
					>
						<h2
							class="mb-4 text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							Related classes
						</h2>
						<div class="space-y-2.5">
							{#each data.related as rel (rel.wikidataQid)}
								<a
									href={resolve('/class/[qid]', { qid: rel.wikidataQid })}
									class="group flex items-center gap-3 rounded-lg border border-transparent p-1.5 transition-colors hover:bg-white"
								>
									<div
										class="h-11 w-16 flex-shrink-0 overflow-hidden rounded"
										style="background: var(--map-bg);"
									>
										{#if rel.media.length > 0}
											<img
												src="/{rel.media[0].localPath}"
												alt=""
												loading="lazy"
												class="h-full w-full object-cover"
											/>
										{/if}
									</div>
									<div class="min-w-0">
										<p class="truncate text-sm" style="color: var(--map-ink);">{rel.name}</p>
										<p class="text-xs tabular-nums" style="color: var(--map-ink-soft);">
											{buildPeriod(rel.buildStart, rel.buildEnd)}
										</p>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</aside>
		</div>
	</div>

	{#if activeLightboxMedia}
		<InspectLightbox media={activeLightboxMedia} onClose={() => (activeLightboxMedia = null)} />
	{/if}
</div>
