<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- compare page uses resolved paths */
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { tractionColor, mediaSrcset } from '$lib/loco.js';
	import { resolveDisplayName } from '$lib/nameScheme.js';

	let { data } = $props<{ data: PageData & { nameScheme: string } }>();

	let selectedToAdd = $state('');

	function addClass(qid: string) {
		if (!qid) return;
		const current = data.qids;
		if (current.includes(qid)) return;
		if (current.length >= 4) {
			alert('You can compare a maximum of 4 classes side-by-side.');
			return;
		}
		const updated = [...current, qid];
		goto(`${resolve('/compare')}?ids=${updated.join(',')}`);
		selectedToAdd = '';
	}

	function removeClass(qid: string) {
		const updated = data.qids.filter((id: string) => id !== qid);
		if (updated.length > 0) {
			goto(`${resolve('/compare')}?ids=${updated.join(',')}`);
		} else {
			goto(resolve('/compare'));
		}
	}

	const availableClasses = $derived(
		data.allSelectorClasses.filter(
			(c: (typeof data.allSelectorClasses)[number]) => !data.qids.includes(c.qid)
		)
	);

	const specKeys = [
		'Power Output',
		'Top Speed',
		'Tractive Effort',
		'Manufacturer',
		'Introduction',
		'Total Built'
	];
</script>

<svelte:head>
	<title>The Workshop — Compare Classes — Trainpedia</title>
	<meta
		name="description"
		content="Compare specifications of British rail traction side-by-side in The Workshop."
	/>
</svelte:head>

<div
	class="mx-auto max-w-[1400px] px-4 py-8 sm:px-6"
	style="background: var(--map-bg); min-height: 100vh;"
>
	<header
		class="mb-8 border-b pb-4 flex flex-wrap items-center justify-between gap-4"
		style="border-color: var(--map-zone);"
	>
		<div>
			<h1
				class="text-3xl font-bold tracking-tight"
				style="font-family: var(--font-map); color: var(--map-ink);"
			>
				The Workshop
			</h1>
			<p class="mt-2 text-sm" style="color: var(--map-ink-soft);">
				Compare British diesel and electric locomotive specifications side-by-side.
			</p>
		</div>

		{#if data.qids.length < 4}
			<div class="flex items-center gap-2">
				<label
					for="class-add-select"
					class="text-xs font-semibold tracking-wider uppercase"
					style="color: var(--map-ink-soft);">Add class:</label
				>
				<select
					id="class-add-select"
					bind:value={selectedToAdd}
					onchange={(e) => addClass(e.currentTarget.value)}
					class="rounded-lg border px-3 py-1.5 text-xs outline-none"
					style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
				>
					<option value="">-- Choose a class --</option>
					{#each availableClasses as cls (cls.qid)}
						<option value={cls.qid}>
							{cls.name}
							{#if cls.aliases.length > 0}({cls.aliases[0]}){/if}
						</option>
					{/each}
				</select>
			</div>
		{/if}
	</header>

	{#if data.selectedClasses.length === 0}
		<div
			class="flex flex-col items-center justify-center border border-dashed rounded-2xl py-24 px-4 text-center"
			style="border-color: var(--map-zone);"
		>
			<span class="text-4xl mb-4">🛠️</span>
			<h2 class="text-lg font-bold" style="font-family: var(--font-map); color: var(--map-ink);">
				Compare locomotive classes
			</h2>
			<p class="mt-2 text-sm max-w-sm mb-6" style="color: var(--map-ink-soft);">
				Select two or more classes from the dropdown menu above to compare their dimensions, speed,
				and builder specifications.
			</p>
			{#if availableClasses.length > 0}
				<div class="flex flex-wrap gap-2 justify-center max-w-md">
					{#each availableClasses.slice(0, 5) as cls (cls.qid)}
						<button
							onclick={() => addClass(cls.qid)}
							class="rounded-full px-4 py-1.5 text-xs font-semibold border hover:bg-[var(--map-zone)] transition-colors"
							style="border-color: var(--tfl-blue); color: var(--tfl-blue);"
						>
							+ {cls.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div
			class="grid gap-6"
			style="grid-template-columns: repeat({data.selectedClasses.length}, minmax(0, 1fr));"
		>
			{#each data.selectedClasses as cls (cls.wikidataQid)}
				{@const color = tractionColor(cls.regions)}
				<div
					class="relative flex flex-col rounded-xl border p-4 transition-shadow hover:shadow-md"
					style="border-color: var(--map-zone); border-top: 4px solid {color}; background: var(--map-bg);"
				>
					<!-- Close/Remove button -->
					<button
						onclick={() => removeClass(cls.wikidataQid)}
						class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--map-zone)] text-xs font-bold"
						style="color: var(--map-ink-soft);"
						aria-label="Remove from comparison"
					>
						✕
					</button>

					<!-- Class Header -->
					<div class="mb-4 pr-6">
						<a
							href={resolve('/class/[qid]', { qid: cls.wikidataQid })}
							class="text-lg font-bold hover:underline"
							style="font-family: var(--font-map); color: var(--map-ink);"
						>
							{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
						</a>
						{#if cls.nickname}
							<p class="font-serif italic text-xs mt-0.5" style="color: {color};">
								"{cls.nickname}"
							</p>
						{/if}
					</div>

					<!-- Class image -->
					{#if cls.media && cls.media.length > 0}
						{@const img = mediaSrcset(cls.media[0].localPath)}
						<div
							class="aspect-[3/2] overflow-hidden rounded-lg mb-6 border"
							style="border-color: var(--map-zone);"
						>
							<img
								src={img.src}
								srcset={img.srcset}
								sizes="25vw"
								alt={cls.media[0].title ?? cls.name}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div
							class="aspect-[3/2] rounded-lg mb-6 flex items-center justify-center text-xs"
							style="background: var(--map-zone); color: var(--map-ink-soft);"
						>
							No photograph available
						</div>
					{/if}

					<!-- Specs comparison list -->
					<div class="space-y-4 flex-1">
						<div class="border-b pb-2" style="border-color: var(--map-zone);">
							<span
								class="block text-[10px] font-semibold uppercase tracking-wider"
								style="color: var(--map-ink-soft);">Builder</span
							>
							<span class="text-sm font-medium" style="color: var(--map-ink);"
								>{cls.builder ?? 'Unknown'}</span
							>
						</div>

						<div class="border-b pb-2" style="border-color: var(--map-zone);">
							<span
								class="block text-[10px] font-semibold uppercase tracking-wider"
								style="color: var(--map-ink-soft);">Era / Service Years</span
							>
							<span class="text-xs font-semibold tabular-nums" style="color: var(--map-ink);">
								{cls.buildStart ??
									'?'}{#if cls.buildEnd && cls.buildEnd !== cls.buildStart}–{cls.buildEnd}{:else if !cls.buildEnd}–present{/if}
							</span>
						</div>

						<div class="border-b pb-2" style="border-color: var(--map-zone);">
							<span
								class="block text-[10px] font-semibold uppercase tracking-wider"
								style="color: var(--map-ink-soft);">Power Type Classification</span
							>
							{#if cls.powerType}
								<span
									class="inline-block rounded-full bg-[var(--map-zone)] px-2.5 py-0.5 text-[10px] font-bold mt-1"
									style="color: var(--map-ink-soft);"
								>
									{cls.powerType.replace('TYPE_', 'Type ')}
								</span>
							{:else}
								<span class="text-xs italic" style="color: var(--map-ink-soft);">None</span>
							{/if}
						</div>

						<div class="border-b pb-2" style="border-color: var(--map-zone);">
							<span
								class="block text-[10px] font-semibold uppercase tracking-wider"
								style="color: var(--map-ink-soft);">Total Built</span
							>
							<span class="text-sm font-semibold tabular-nums" style="color: var(--map-ink);"
								>{cls.totalBuilt?.toLocaleString('en-GB') ?? 'Unknown'}</span
							>
						</div>

						{#each specKeys as key (key)}
							{#if key !== 'Total Built' && key !== 'Manufacturer' && key !== 'Introduction'}
								{@const spec = cls.specMap[key]}
								<div class="border-b pb-2" style="border-color: var(--map-zone);">
									<span
										class="block text-[10px] font-semibold uppercase tracking-wider"
										style="color: var(--map-ink-soft);">{key}</span
									>
									{#if spec && spec.numeric !== null}
										<span class="text-sm font-semibold tabular-nums" style="color: var(--map-ink);">
											{spec.numeric.toLocaleString('en-GB')}{#if spec.unit}
												{spec.unit}{/if}
										</span>
									{:else if spec}
										<span class="text-sm font-medium" style="color: var(--map-ink);"
											>{spec.value}</span
										>
									{:else}
										<span class="text-xs italic" style="color: var(--map-ink-soft);">—</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
