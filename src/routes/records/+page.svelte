<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { tractionColor } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData & { nameScheme: string } }>();
</script>

<svelte:head>
	<title>The Record Books — Trainpedia</title>
	<meta
		name="description"
		content="Discover the extremes of British locomotive engineering: the fastest, the most numerous, and the longest-serving classes."
	/>
</svelte:head>

<div
	class="mx-auto max-w-[1200px] px-4 py-8 sm:px-6"
	style="background: var(--map-bg); min-height: 100vh;"
>
	<header class="mb-8 border-b pb-4" style="border-color: var(--map-zone);">
		<h1
			class="text-3xl font-bold tracking-tight"
			style="font-family: var(--font-map); color: var(--map-ink);"
		>
			The Record Books
		</h1>
		<p class="mt-2 text-sm" style="color: var(--map-ink-soft);">
			Verified rankings and extremes from the British railway archives.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
		<!-- Fastest -->
		<section
			class="flex flex-col rounded-xl border p-5"
			style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wider uppercase flex items-center gap-2"
				style="color: var(--map-ink-soft); font-family: var(--font-ui);"
			>
				<span>🏎️</span> Fastest Classes
			</h2>
			<ol class="space-y-3">
				{#each data.records.fastest as item, i (item.qid)}
					{@const color = tractionColor(item.regions)}
					<li
						class="flex items-center gap-3 p-3 rounded-lg border"
						style="border-color: var(--map-zone); border-left: 4px solid {color}; background: var(--map-bg);"
					>
						<span
							class="text-xl font-bold tabular-nums"
							style="font-family: var(--font-map); color: var(--tfl-blue); min-width: 1.5rem;"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<a
								href={resolve('/class/[qid]', { qid: item.qid })}
								class="block text-sm font-medium hover:underline truncate"
								style="color: var(--map-ink);"
							>
								{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
							</a>
							{#if item.nickname}
								<span
									class="block text-[11px] font-serif italic truncate"
									style="color: var(--map-ink-soft);">"{item.nickname}"</span
								>
							{/if}
						</div>
						<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink-soft);">
							{item.value}
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Most Numerous -->
		<section
			class="flex flex-col rounded-xl border p-5"
			style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wider uppercase flex items-center gap-2"
				style="color: var(--map-ink-soft); font-family: var(--font-ui);"
			>
				<span>🏭</span> Most Numerous
			</h2>
			<ol class="space-y-3">
				{#each data.records.mostNumerous as item, i (item.qid)}
					{@const color = tractionColor(item.regions)}
					<li
						class="flex items-center gap-3 p-3 rounded-lg border"
						style="border-color: var(--map-zone); border-left: 4px solid {color}; background: var(--map-bg);"
					>
						<span
							class="text-xl font-bold tabular-nums"
							style="font-family: var(--font-map); color: var(--tfl-blue); min-width: 1.5rem;"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<a
								href={resolve('/class/[qid]', { qid: item.qid })}
								class="block text-sm font-medium hover:underline truncate"
								style="color: var(--map-ink);"
							>
								{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
							</a>
							{#if item.nickname}
								<span
									class="block text-[11px] font-serif italic truncate"
									style="color: var(--map-ink-soft);">"{item.nickname}"</span
								>
							{/if}
						</div>
						<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink-soft);">
							{item.value}
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Longest Lived -->
		<section
			class="flex flex-col rounded-xl border p-5"
			style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wider uppercase flex items-center gap-2"
				style="color: var(--map-ink-soft); font-family: var(--font-ui);"
			>
				<span>⏳</span> Longest Lived
			</h2>
			<ol class="space-y-3">
				{#each data.records.longestLived as item, i (item.qid)}
					{@const color = tractionColor(item.regions)}
					<li
						class="flex items-center gap-3 p-3 rounded-lg border"
						style="border-color: var(--map-zone); border-left: 4px solid {color}; background: var(--map-bg);"
					>
						<span
							class="text-xl font-bold tabular-nums"
							style="font-family: var(--font-map); color: var(--tfl-blue); min-width: 1.5rem;"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<a
								href={resolve('/class/[qid]', { qid: item.qid })}
								class="block text-sm font-medium hover:underline truncate"
								style="color: var(--map-ink);"
							>
								{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
							</a>
							{#if item.nickname}
								<span
									class="block text-[11px] font-serif italic truncate"
									style="color: var(--map-ink-soft);">"{item.nickname}"</span
								>
							{/if}
						</div>
						<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink-soft);">
							{item.value}
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Most Survivors -->
		<section
			class="flex flex-col rounded-xl border p-5"
			style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wider uppercase flex items-center gap-2"
				style="color: var(--map-ink-soft); font-family: var(--font-ui);"
			>
				<span>🛡️</span> Most Survivors
			</h2>
			<ol class="space-y-3">
				{#each data.records.survivors as item, i (item.qid)}
					{@const color = tractionColor(item.regions)}
					<li
						class="flex items-center gap-3 p-3 rounded-lg border"
						style="border-color: var(--map-zone); border-left: 4px solid {color}; background: var(--map-bg);"
					>
						<span
							class="text-xl font-bold tabular-nums"
							style="font-family: var(--font-map); color: var(--tfl-blue); min-width: 1.5rem;"
						>
							{i + 1}
						</span>
						<div class="flex-1 min-w-0">
							<a
								href={resolve('/class/[qid]', { qid: item.qid })}
								class="block text-sm font-medium hover:underline truncate"
								style="color: var(--map-ink);"
							>
								{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
							</a>
							{#if item.nickname}
								<span
									class="block text-[11px] font-serif italic truncate"
									style="color: var(--map-ink-soft);">"{item.nickname}"</span
								>
							{/if}
						</div>
						<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink-soft);">
							{item.value}
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<!-- One-offs -->
		<section
			class="flex flex-col rounded-xl border p-5 md:col-span-2 lg:col-span-2"
			style="border-color: var(--map-zone); background: var(--map-bg); box-shadow: var(--shadow-subtle);"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wider uppercase flex items-center gap-2"
				style="color: var(--map-ink-soft); font-family: var(--font-ui);"
			>
				<span>💎</span> One-off Experiments (Unique Classes)
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each data.records.oneOffs as item (item.qid)}
					{@const color = tractionColor(item.regions)}
					<div
						class="flex items-center gap-3 p-3 rounded-lg border"
						style="border-color: var(--map-zone); border-left: 4px solid {color}; background: var(--map-bg);"
					>
						<div class="flex-1 min-w-0">
							<a
								href={resolve('/class/[qid]', { qid: item.qid })}
								class="block text-sm font-medium hover:underline truncate"
								style="color: var(--map-ink);"
							>
								{resolveDisplayName(item.name, item.aliases, data.nameScheme)}
							</a>
							{#if item.nickname}
								<span
									class="block text-[11px] font-serif italic truncate"
									style="color: var(--map-ink-soft);">"{item.nickname}"</span
								>
							{/if}
						</div>
						<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink-soft);">
							{item.value}
						</span>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>
