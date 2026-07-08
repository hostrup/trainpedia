<script lang="ts">
	import type { PageData } from './$types.js';
	import type { MediaAsset } from '$lib/types.js';
	import { resolve } from '$app/paths';
	import InspectLightbox from '$lib/components/InspectLightbox.svelte';
	import { tractionColor, tractionLabel, mediaSrcset } from '$lib/loco.js';

	let { data } = $props<{ data: PageData }>();
	const loco = $derived(data.loco);
	const lineColor = $derived(tractionColor(loco.class.regions));

	let activeLightboxMedia = $state<MediaAsset | null>(null);

	const STATUS_LABELS: Record<string, string> = {
		IN_SERVICE: 'In service',
		STORED: 'Stored',
		PRESERVED: 'Preserved',
		SCRAPPED: 'Scrapped',
		EXPORTED: 'Exported',
		UNKNOWN: 'Unknown'
	};

	const title = $derived(
		loco.currentName ? `${loco.currentNumber} "${loco.currentName}"` : loco.currentNumber
	);
	const rawGalleryItems = $derived(data.hasIndividualMedia ? data.media : data.fallbackMedia);
	const photos = $derived(rawGalleryItems.filter((m: { kind: string }) => m.kind !== 'VIDEO'));
	const videos = $derived(rawGalleryItems.filter((m: { kind: string }) => m.kind === 'VIDEO'));
</script>

<svelte:head>
	<title>{title} — Trainpedia</title>
	<meta
		name="description"
		content="Locomotive {title} from the {loco.class.name} class. Status: {STATUS_LABELS[
			loco.status
		] ?? 'Unknown'}."
	/>
	<meta property="og:title" content="{title} — Trainpedia" />
	<meta
		property="og:description"
		content="Locomotive {title} from the {loco.class.name} class. Status: {STATUS_LABELS[
			loco.status
		] ?? 'Unknown'}."
	/>
	<meta property="og:type" content="article" />
	{#if photos.length > 0}
		<meta property="og:image" content="https://tog.hostrup.org/{photos[0].localPath}" />
	{/if}
</svelte:head>

<div style="--line-color: {lineColor};">
	<div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
		<!-- Navigation and Siblings Pager -->
		<div
			class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4"
			style="border-color: var(--map-zone);"
		>
			<nav class="text-xs" style="color: var(--map-ink-soft);">
				<a href={resolve('/classes')} class="hover:underline">Explore</a>
				<span class="mx-1.5 opacity-50">/</span>
				<a href={resolve('/class/[qid]', { qid: loco.class.wikidataQid })} class="hover:underline"
					>{loco.class.name}</a
				>
			</nav>

			<div class="flex items-center gap-2 text-xs">
				{#if data.prevLoco}
					<a
						href={resolve('/loco/[number]', { number: data.prevLoco })}
						class="rounded-lg border px-2.5 py-1 transition-colors font-mono hover:bg-[var(--map-zone)]"
						style="border-color: var(--map-zone); color: var(--map-ink);"
					>
						&larr; {data.prevLoco}
					</a>
				{:else}
					<span
						class="rounded-lg border px-2.5 py-1 opacity-45 font-mono"
						style="border-color: var(--map-zone); color: var(--map-ink-soft);"
					>
						&larr; Start
					</span>
				{/if}

				<span class="font-semibold" style="color: var(--map-ink-soft);">Class Fleet</span>

				{#if data.nextLoco}
					<a
						href={resolve('/loco/[number]', { number: data.nextLoco })}
						class="rounded-lg border px-2.5 py-1 transition-colors font-mono hover:bg-[var(--map-zone)]"
						style="border-color: var(--map-zone); color: var(--map-ink);"
					>
						{data.nextLoco} &rarr;
					</a>
				{:else}
					<span
						class="rounded-lg border px-2.5 py-1 opacity-45 font-mono"
						style="border-color: var(--map-zone); color: var(--map-ink-soft);"
					>
						End &rarr;
					</span>
				{/if}
			</div>
		</div>

		<header class="mb-8 flex flex-wrap items-center gap-3">
			<span
				class="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase"
				style="background: var(--line-color); color: white;"
			>
				{tractionLabel(loco.class.regions)}
			</span>
			<span
				class="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase"
				style="background: color-mix(in srgb, var(--line-color) 12%, white); color: var(--line-color);"
			>
				{STATUS_LABELS[loco.status] ?? loco.status}
			</span>
		</header>

		<h1 class="text-4xl font-semibold" style="font-family: var(--font-map); color: var(--map-ink);">
			{loco.currentNumber}
		</h1>
		{#if loco.currentName}
			<p class="font-serif mt-1 text-xl italic" style="color: var(--line-color);">
				“{loco.currentName}”
			</p>
		{/if}

		<div class="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
			<div class="min-w-0 space-y-10">
				<!-- Renumbering history -->
				<section>
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						Renumbering history
					</h2>
					<div class="flex flex-wrap items-center gap-2">
						{#each loco.identities as identity, i (identity.id)}
							<span
								class="rounded-full border px-3 py-1.5 font-mono text-sm tabular-nums"
								style="border-color: var(--map-zone); background: {i === loco.identities.length - 1
									? 'var(--line-color)'
									: 'var(--map-zone)'}; color: {i === loco.identities.length - 1
									? 'white'
									: 'var(--map-ink)'};"
							>
								{identity.number}
							</span>
							{#if i < loco.identities.length - 1}
								<span style="color: var(--map-ink-soft);">→</span>
							{/if}
						{/each}
					</div>
				</section>

				{#if loco.nicknames.length > 0}
					<section>
						<h2
							class="mb-4 text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							Previous names
						</h2>
						<p class="font-serif text-lg italic" style="color: var(--map-ink);">
							{loco.nicknames.map((n: string) => `“${n}”`).join(' · ')}
						</p>
					</section>
				{/if}

				{#if loco.history}
					<section>
						<h2
							class="mb-4 text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							History
						</h2>
						<p
							class="font-serif max-w-prose text-lg leading-relaxed"
							style="color: var(--map-ink);"
						>
							{loco.history}
						</p>
					</section>
				{/if}

				<!-- "On film" Section (F12.5) -->
				<section class="border-t pt-8" style="border-color: var(--map-zone);">
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						On film
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- Local Commons video files -->
						{#each videos as video (video.id)}
							<div
								class="flex flex-col rounded-lg border overflow-hidden"
								style="background: var(--map-zone); border-color: var(--map-zone);"
							>
								<div class="aspect-[16/9] bg-black overflow-hidden relative">
									<!-- eslint-disable-next-line jsx-a11y/media-has-caption -->
									<video
										src="/{video.localPath}"
										controls
										preload="metadata"
										class="h-full w-full object-cover"
									>
										<track kind="captions" />
									</video>
								</div>
								<div class="p-3 text-xs space-y-1.5" style="color: var(--map-ink);">
									<div class="font-semibold truncate">
										{video.title || 'Wikimedia Commons footage'}
									</div>
									{#if video.attribution}
										<div class="text-[10px] text-zinc-500 font-mono truncate">
											Camera: {video.attribution}
										</div>
									{/if}
									<div class="text-[10px] text-zinc-500 font-mono">License: {video.license}</div>
								</div>
							</div>
						{/each}

						<!-- YouTube fallback link card -->
						<a
							href="https://www.youtube.com/results?search_query={encodeURIComponent(
								`Locomotive ${loco.currentNumber} ${loco.class.name}`
							)}"
							target="_blank"
							rel="external noopener noreferrer"
							class="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center hover:bg-white/40 transition-colors"
							style="border-color: var(--map-zone); background: var(--map-zone);"
						>
							<div class="text-3xl mb-2">🎬</div>
							<div class="font-semibold text-sm" style="color: var(--map-ink);">
								Watch on YouTube ➔
							</div>
							<div class="text-[10px] text-zinc-500 mt-1 max-w-xs">
								Search YouTube for live footage and operational video archives of locomotive {loco.currentNumber}.
							</div>
						</a>
					</div>
				</section>

				<!-- Gallery and Fallback Gallery -->
				<section>
					<h2
						class="mb-4 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);"
					>
						Gallery — {photos.length}
						{photos.length === 1 ? 'asset' : 'assets'}
					</h2>

					{#if !data.hasIndividualMedia && photos.length > 0}
						<div
							class="mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs"
							style="color: var(--map-ink);"
						>
							<span class="font-bold">📷 Archive Fallback:</span> No individual photographs of
							locomotive {loco.currentNumber} are currently catalogued. Showing representative media from
							the
							<a
								href={resolve('/class/[qid]', { qid: loco.class.wikidataQid })}
								class="underline font-semibold"
								style="color: var(--line-color);">{loco.class.name}</a
							> exhibit.
						</div>
					{/if}

					{#if photos.length > 0}
						<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
							{#each photos as media (media.id)}
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
											alt={media.title ?? loco.currentNumber}
											loading="lazy"
											class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<div
							class="rounded-xl border border-dashed py-12 text-center text-xs tracking-widest uppercase"
							style="border-color: var(--map-zone); color: var(--map-ink-soft);"
						>
							No media assets recorded yet
						</div>
					{/if}
				</section>
			</div>

			<!-- Side column key facts with links to survivors -->
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
							<dt style="color: var(--map-ink-soft);">Class</dt>
							<dd class="text-right">
								<a
									href={resolve('/class/[qid]', { qid: loco.class.wikidataQid })}
									class="hover:underline font-semibold"
									style="color: var(--line-color);"
								>
									{loco.class.name}
								</a>
							</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt style="color: var(--map-ink-soft);">Status</dt>
							<dd class="text-right">
								{#if loco.status === 'PRESERVED' || loco.status === 'IN_SERVICE'}
									<a
										href={resolve('/survivors')}
										class="hover:underline font-semibold"
										style="color: var(--tfl-blue);"
									>
										{STATUS_LABELS[loco.status] ?? loco.status} 🏆
									</a>
								{:else}
									<span style="color: var(--map-ink);">
										{STATUS_LABELS[loco.status] ?? loco.status}
									</span>
								{/if}
							</dd>
						</div>
						{#if loco.location}
							<div class="flex justify-between gap-4">
								<dt style="color: var(--map-ink-soft);">Location</dt>
								<dd class="text-right">
									{#if loco.status === 'PRESERVED' || loco.status === 'IN_SERVICE'}
										<a
											href="{resolve('/survivors')}?location={encodeURIComponent(loco.location)}"
											class="hover:underline font-semibold"
											style="color: var(--tfl-blue);"
										>
											{loco.location} &rarr;
										</a>
									{:else}
										<span style="color: var(--map-ink);">{loco.location}</span>
									{/if}
								</dd>
							</div>
						{/if}
					</dl>
					{#if loco.sourceUrl}
						<div
							class="mt-5 border-t pt-4 text-[11px] font-mono"
							style="border-color: var(--map-bg); color: var(--map-ink-soft);"
						>
							Source:
							<a
								href={loco.sourceUrl + (loco.sourceRevision ? `?oldid=${loco.sourceRevision}` : '')}
								target="_blank"
								rel="external noopener noreferrer"
								class="hover:underline"
								style="color: var(--line-color);">Wikipedia</a
							>
							{#if loco.sourceRevision}
								· oldid: {loco.sourceRevision}
							{/if}
							· retrieved 7 Jul 2026
						</div>
					{/if}
				</div>
			</aside>
		</div>
	</div>
</div>

{#if activeLightboxMedia}
	<InspectLightbox
		{photos}
		media={activeLightboxMedia}
		onClose={() => (activeLightboxMedia = null)}
	/>
{/if}
