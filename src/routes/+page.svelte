<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { tractionColor, mediaSrcset } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';
	import EraRoomCard from '$lib/components/EraRoomCard.svelte';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Trainpedia — A working museum of British rail traction</title>
	<meta
		name="description"
		content="Explore {data.stats
			.classCount} classes of British diesel and electric locomotives. Browse, compare, and discover the machines that shaped Britain's railways."
	/>
	<meta property="og:title" content="Trainpedia — A working museum of British rail traction" />
	<meta
		property="og:description"
		content="Explore {data.stats
			.classCount} classes of British diesel and electric locomotives. Browse, compare, and discover the machines that shaped Britain's railways."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://tog.hostrup.org/screenshot-real.png" />
</svelte:head>

<div style="background: var(--map-bg);">
	<!-- §1. Hero -->
	<section
		class="relative flex flex-col items-center justify-center px-4 py-20 text-center sm:py-28"
		style="background: linear-gradient(180deg, color-mix(in srgb, var(--tfl-blue) 8%, var(--map-bg)) 0%, var(--map-bg) 100%);"
	>
		<h1
			class="text-4xl font-bold tracking-tight sm:text-5xl"
			style="font-family: var(--font-map); color: var(--map-ink);"
		>
			Trainpedia
		</h1>
		<p class="mt-2 text-lg font-serif italic" style="color: var(--map-ink-soft);">
			A working museum of British rail traction
		</p>

		<form
			action={resolve('/browse')}
			method="GET"
			class="mx-auto mt-8 flex w-full max-w-lg items-center"
			role="search"
		>
			<input
				type="search"
				name="q"
				placeholder="Search classes, numbers, names…"
				aria-label="Search the collection"
				class="w-full rounded-l-xl border-y border-l px-5 py-3 text-base outline-none transition-all focus:ring-2"
				style="background: var(--map-bg); color: var(--map-ink); border-color: var(--map-zone); --tw-ring-color: var(--tfl-blue);"
			/>
			<button
				type="submit"
				class="rounded-r-xl border px-5 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
				style="background: var(--tfl-blue); border-color: var(--tfl-blue);"
			>
				Search
			</button>
		</form>

		<div class="mt-6 flex flex-wrap justify-center gap-4">
			<a
				href={resolve('/browse')}
				class="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 animate-fade-in"
				style="background: var(--tfl-blue);"
			>
				Browse the collection
			</a>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- all hrefs use resolve() -->
			<a
				href={resolve('/browse') + '?darling=yes'}
				class="rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105 flex items-center gap-1.5"
				style="border-color: #d97706; color: #d97706; background: rgba(217, 119, 6, 0.05);"
			>
				⭐ Museum Darlings
			</a>
			<a
				href={resolve('/browse') + '?lens=timeline'}
				class="rounded-full border px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
				style="border-color: var(--tfl-blue); color: var(--tfl-blue);"
			>
				Explore the timeline
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
	</section>

	<!-- §2. The collection at a glance -->
	<section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- all hrefs use resolve() -->
			{#each [{ label: 'Classes', value: data.stats.classCount, href: resolve('/browse') }, { label: 'Individuals tracked', value: data.stats.locomotiveCount, href: resolve('/browse') }, { label: 'Preserved', value: data.stats.preservedCount, href: resolve('/browse') + '?surviving=yes' }, { label: 'Photographs', value: data.stats.mediaCount, href: resolve('/browse') }] as stat (stat.label)}
				<a
					href={stat.href}
					class="group flex flex-col items-center rounded-xl border p-5 text-center transition-all hover:-translate-y-0.5"
					style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
				>
					<span
						class="text-3xl font-bold tabular-nums"
						style="font-family: var(--font-map); color: var(--tfl-blue);"
					>
						{stat.value.toLocaleString('en-GB')}
					</span>
					<span
						class="mt-1 text-xs font-semibold tracking-wider uppercase"
						style="color: var(--map-ink-soft);">{stat.label}</span
					>
				</a>
			{/each}
		</div>
		<p class="mt-4 text-center text-xs" style="color: var(--map-ink-soft);">
			Fleet histories traced for {data.stats.classesWithFleet} of {data.stats.classCount} classes — the
			archive grows weekly
		</p>
	</section>

	<!-- §3. Featured exhibits -->
	{#if data.featured.length > 0}
		<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			<h2
				class="mb-6 text-xl font-semibold"
				style="font-family: var(--font-map); color: var(--map-ink);"
			>
				Featured Exhibits
			</h2>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.featured as cls (cls.wikidataQid)}
					<a
						href={resolve('/class/[qid]', { qid: cls.wikidataQid })}
						class="group overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1"
						style="--line-color: {tractionColor(
							cls.regions
						)}; border-color: var(--map-zone); border-top: 3px solid var(--line-color); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
					>
						{#if cls.media.length > 0}
							{@const img = mediaSrcset(cls.media[0].localPath)}
							<div class="aspect-[3/2] overflow-hidden">
								<img
									src={img.src}
									srcset={img.srcset}
									sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
									alt={cls.media[0].title ?? cls.name}
									loading="lazy"
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							</div>
						{/if}
						<div class="p-4">
							<h3
								class="font-semibold"
								style="font-family: var(--font-map); color: var(--map-ink);"
							>
								{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
							</h3>
							{#if cls.nickname}
								<p class="font-serif text-sm italic" style="color: var(--line-color);">
									"{cls.nickname}"
								</p>
							{/if}

							<!-- Naming connections (TOPS, aliases, etc.) -->
							<div
								class="mt-2 flex flex-wrap gap-1 text-[10px] font-mono"
								style="color: var(--map-ink-soft);"
							>
								{#if resolveDisplayName(cls.name, cls.aliases, data.nameScheme) !== cls.name}
									<span
										class="rounded bg-zinc-200/40 px-1.5 py-0.5 border border-zinc-300/30"
										title="TOPS name"
									>
										TOPS: {cls.name}
									</span>
								{/if}
								{#each cls.aliases as alias (alias.alias + '-' + alias.scheme)}
									{#if alias.alias !== resolveDisplayName(cls.name, cls.aliases, data.nameScheme) && alias.alias !== cls.nickname}
										<span
											class="rounded bg-zinc-200/40 px-1.5 py-0.5 border border-zinc-300/30"
											title="{alias.scheme} designation"
										>
											{alias.scheme === 'PRE_TOPS'
												? 'Pre-TOPS'
												: alias.scheme === 'BUILDER'
													? 'Builder'
													: alias.scheme === 'ORIGINAL'
														? 'Original'
														: alias.scheme.charAt(0) +
															alias.scheme.slice(1).toLowerCase().replace('_', ' ')}: {alias.alias}
										</span>
									{/if}
								{/each}
							</div>
							{#if cls.narrative}
								<p
									class="mt-2 line-clamp-3 text-xs leading-relaxed"
									style="font-family: var(--font-narrative); color: var(--map-ink-soft);"
								>
									{cls.narrative}
								</p>
							{/if}
							<span class="mt-3 inline-block text-xs font-semibold" style="color: var(--tfl-blue);">
								Visit exhibit →
							</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- §3.5 Curated Stories & Exhibitions -->
	{#if data.tours && data.tours.length > 0}
		<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			<h2
				class="mb-6 text-xl font-semibold flex items-center gap-2"
				style="font-family: var(--font-map); color: var(--map-ink);"
			>
				<span>Curated Stories & Exhibitions</span>
				<span
					class="rounded-full bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider font-mono"
					>New</span
				>
			</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				{#each data.tours as tour (tour.id)}
					<a
						href={resolve('/tour/[slug]', { slug: tour.slug })}
						class="group flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1"
						style="border-color: var(--map-zone); border-top: 3px solid var(--tfl-blue); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
					>
						<div>
							<div
								class="flex items-center justify-between mb-3 text-xs font-semibold font-mono"
								style="color: var(--map-ink-soft);"
							>
								<span>EXHIBITION</span>
								<span
									class="rounded bg-zinc-200/40 border border-zinc-300/30 px-1.5 py-0.5 tabular-nums"
									>{tour.steps.length} stops</span
								>
							</div>
							<h3
								class="text-lg font-bold group-hover:text-red-700 transition-colors"
								style="font-family: var(--font-map); color: var(--map-ink);"
							>
								{tour.title}
							</h3>
							<p
								class="mt-2 text-xs leading-relaxed"
								style="font-family: var(--font-narrative); color: var(--map-ink-soft);"
							>
								{tour.description}
							</p>
						</div>
						<div
							class="mt-5 flex items-center justify-between text-xs font-semibold"
							style="color: var(--tfl-blue);"
						>
							<span>Start Tour ➔</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- §4. The Eras -->
	<section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
		<h2
			class="mb-6 text-xl font-semibold"
			style="font-family: var(--font-map); color: var(--map-ink);"
		>
			The Eras
		</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.eras as era (era.slug)}
				<a
					href={`${resolve('/browse')}?era=${era.slug}`}
					class="group block transition-all hover:-translate-y-0.5"
				>
					<EraRoomCard {era} eras={data.eras} size="compact" stats={data.eraStats[era.id]}>
						<div
							class="mt-2 text-xs font-semibold text-[var(--tfl-blue)] group-hover:underline flex items-center gap-1 font-sans"
						>
							Enter the era →
						</div>
					</EraRoomCard>
				</a>
			{/each}
		</div>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</section>

	<!-- §5. The Record Books (mini-leaderboards) -->
	<section class="py-12" style="background: color-mix(in srgb, var(--tfl-blue) 4%, var(--map-bg));">
		<div class="mx-auto max-w-5xl px-4 sm:px-6">
			<h2
				class="mb-6 text-xl font-semibold"
				style="font-family: var(--font-map); color: var(--map-ink);"
			>
				The Record Books
			</h2>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
				{#each [{ title: 'Fastest', icon: '🏎️', items: data.leaderboards.fastest }, { title: 'Most Numerous', icon: '🏭', items: data.leaderboards.mostNumerous }, { title: 'Longest Lived', icon: '⏳', items: data.leaderboards.longestLived }] as board (board.title)}
					<div
						class="rounded-xl border p-5"
						style="border-color: var(--map-zone); background: var(--map-bg);"
					>
						<h3
							class="mb-3 text-sm font-semibold tracking-wider uppercase"
							style="color: var(--map-ink-soft);"
						>
							{board.icon}
							{board.title}
						</h3>
						<ol class="space-y-2">
							{#each board.items as item, i (item.qid)}
								<li class="flex items-baseline gap-2">
									<span
										class="text-lg font-bold tabular-nums"
										style="font-family: var(--font-map); color: var(--tfl-blue);"
									>
										{i + 1}
									</span>
									<a
										href={resolve('/class/[qid]', { qid: item.qid })}
										class="flex-1 text-sm font-medium hover:underline"
										style="color: var(--map-ink);"
									>
										{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
									</a>
									<span class="text-xs font-medium tabular-nums" style="color: var(--map-ink-soft);"
										>{item.value}</span
									>
								</li>
							{/each}
						</ol>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- §6. From the Archive (daily photo) -->
	{#if data.dailyPhoto}
		{@const img = mediaSrcset(data.dailyPhoto.localPath)}
		<section class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
			<h2
				class="mb-4 text-xl font-semibold"
				style="font-family: var(--font-map); color: var(--map-ink);"
			>
				From the Archive
			</h2>
			<div class="overflow-hidden rounded-xl border" style="border-color: var(--map-zone);">
				<img
					src={img.src}
					srcset={img.srcset}
					sizes="(min-width: 640px) 80vw, 100vw"
					alt={data.dailyPhoto.title ?? 'Archive photograph'}
					class="w-full"
				/>
				<div class="p-4" style="background: var(--map-bg);">
					<p
						class="text-sm font-medium"
						style="font-family: var(--font-narrative); color: var(--map-ink);"
					>
						{data.dailyPhoto.title}
					</p>
					<p class="mt-1 text-[11px]" style="color: var(--map-ink-soft);">
						{data.dailyPhoto.year ? `${data.dailyPhoto.year} · ` : ''}{data.dailyPhoto
							.attribution ?? 'Unknown photographer'}
						{data.dailyPhoto.license ? ` · ${data.dailyPhoto.license}` : ''}
						{#if data.dailyPhoto.class}
							·
							<a
								href={resolve('/class/[qid]', { qid: data.dailyPhoto.class.wikidataQid })}
								class="hover:underline"
								style="color: var(--tfl-blue);"
							>
								{data.dailyPhoto.class.name}
							</a>
						{/if}
					</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- §7. Footer -->
	<footer
		class="border-t px-4 py-8 text-center text-xs sm:px-6"
		style="border-color: var(--map-zone); color: var(--map-ink-soft);"
	>
		<p>Trainpedia is built on strict factuality: every data point links to a verifiable source.</p>
		<p class="mt-2">
			Data sourced from
			<a href="https://www.wikidata.org" class="hover:underline" style="color: var(--tfl-blue);"
				>Wikidata</a
			>
			·
			<a href="https://en.wikipedia.org" class="hover:underline" style="color: var(--tfl-blue);"
				>Wikipedia</a
			>
			·
			<a
				href="https://commons.wikimedia.org"
				class="hover:underline"
				style="color: var(--tfl-blue);">Wikimedia Commons</a
			>
		</p>
	</footer>
</div>
