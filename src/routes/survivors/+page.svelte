<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { tractionColor } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData & { nameScheme: string } }>();
</script>

<svelte:head>
	<title>Preserved Survivors — Trainpedia</title>
	<meta name="description" content="Explore all preserved and surviving locomotives in Britain." />
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
			Preserved Survivors
		</h1>
		<p class="mt-2 text-sm" style="color: var(--map-ink-soft);">
			Locomotives preserved in heritage railways, museums, or active main-line operations.
		</p>
	</header>

	<div class="overflow-x-auto rounded-lg border" style="border-color: var(--map-zone);">
		<table class="w-full text-sm text-left" style="color: var(--map-ink);">
			<thead>
				<tr
					class="border-b text-[10px] font-semibold tracking-wider uppercase"
					style="border-color: var(--map-zone); color: var(--map-ink-soft);"
				>
					<th class="px-4 py-3">Number</th>
					<th class="px-4 py-3">Name</th>
					<th class="px-4 py-3">Class</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3">Location</th>
				</tr>
			</thead>
			<tbody>
				{#each data.locomotives as loco (loco.id)}
					<tr
						class="border-b transition-colors hover:bg-[var(--map-zone)]"
						style="border-color: var(--map-zone);"
					>
						<td class="px-4 py-3 font-semibold tabular-nums">
							<a
								href={resolve('/loco/[number]', { number: loco.currentNumber })}
								class="hover:underline"
								style="color: var(--tfl-blue);"
							>
								{loco.currentNumber}
							</a>
						</td>
						<td class="px-4 py-3 font-serif italic">{loco.currentName ?? '—'}</td>
						<td class="px-4 py-3">
							<a
								href={resolve('/class/[qid]', { qid: loco.class.wikidataQid })}
								class="hover:underline font-semibold"
								style="color: {tractionColor(loco.class.regions)};"
							>
								{resolveDisplayName(loco.class.name, loco.class.aliases, data.nameScheme)}
							</a>
						</td>
						<td class="px-4 py-3">
							<span
								class="inline-block rounded px-2 py-0.5 text-xs font-bold"
								style="background: var(--map-zone); color: var(--map-ink-soft);"
							>
								{loco.status}
							</span>
						</td>
						<td class="px-4 py-3">{loco.location ?? '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
