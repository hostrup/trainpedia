<script lang="ts">
	import type { PageData } from './$types.js';
	import { resolve } from '$app/paths';
	import { resolveDisplayName } from '$lib/nameScheme.js';
	import { tractionColor, tractionLabel, mediaSrcset, buildPeriod } from '$lib/loco.js';

	let { data } = $props<{ data: PageData }>();
	const tour = $derived(data.tour);
	const steps = $derived(tour.steps);

	let activeStepIdx = $state(0);
	const currentStep = $derived(steps[activeStepIdx]);
	const cls = $derived(currentStep?.class);
	const lineColor = $derived(cls ? tractionColor(cls.regions) : 'var(--tfl-blue)');
	const heroMedia = $derived(cls?.media[0] ?? null);
	const img = $derived(heroMedia ? mediaSrcset(heroMedia.localPath) : null);
</script>

<svelte:head>
	<title>{tour.title} — Curated Exhibition</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
	<!-- Navigation Header -->
	<div
		class="mb-8 flex items-center justify-between border-b pb-4"
		style="border-color: var(--map-zone);"
	>
		<a
			href={resolve('/')}
			class="text-xs font-semibold hover:underline"
			style="color: var(--map-ink-soft);"
		>
			✕ Close Exhibition
		</a>
		<span class="text-xs font-mono font-semibold" style="color: var(--map-ink-soft);">
			Exhibition {activeStepIdx + 1} of {steps.length}
		</span>
	</div>

	<!-- Progress Track -->
	<div class="mb-8 flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-zinc-200">
		{#each steps as step, idx (step.id)}
			<div
				class="h-full flex-1 transition-all duration-300"
				style="background: {idx <= activeStepIdx ? lineColor : 'transparent'};"
			></div>
		{/each}
	</div>

	<!-- Exhibition Title Block -->
	<header class="mb-8">
		<span
			class="rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase font-mono"
			style="background: color-mix(in srgb, {lineColor} 12%, white); color: {lineColor};"
		>
			Curated Story
		</span>
		<h1
			class="text-3xl font-bold mt-2"
			style="font-family: var(--font-map); color: var(--map-ink);"
		>
			{tour.title}
		</h1>
	</header>

	{#if currentStep}
		<!-- Main Story Split Layout -->
		<div class="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
			<!-- Narrative (Storytelling Column) -->
			<div class="md:col-span-3 space-y-6">
				<div
					class="border-l-4 pl-5 py-2 font-serif text-lg leading-relaxed italic"
					style="border-color: {lineColor}; color: var(--map-ink);"
				>
					"{currentStep.narrative}"
				</div>
			</div>

			<!-- Locomotive Card Showcase -->
			<div class="md:col-span-2">
				<div
					class="overflow-hidden rounded-xl border p-4 space-y-4"
					style="background: var(--map-zone); border-color: var(--map-zone);"
				>
					{#if img}
						<div class="aspect-[3/2] overflow-hidden rounded-lg relative">
							<img
								src={img.src}
								srcset={img.srcset}
								sizes="(min-width: 768px) 30vw, 90vw"
								alt={cls.name}
								class="h-full w-full object-cover"
							/>
						</div>
					{/if}

					<div class="space-y-2">
						<h2
							class="text-xl font-bold"
							style="font-family: var(--font-map); color: var(--map-ink);"
						>
							{resolveDisplayName(cls.name, cls.aliases, data.nameScheme)}
						</h2>
						{#if cls.nickname}
							<p class="font-serif text-sm italic" style="color: {lineColor};">
								“{cls.nickname}”
							</p>
						{/if}

						<!-- Naming aliases list -->
						<div
							class="flex flex-wrap gap-1 text-[9px] font-mono"
							style="color: var(--map-ink-soft);"
						>
							{#if resolveDisplayName(cls.name, cls.aliases, data.nameScheme) !== cls.name}
								<span class="rounded bg-zinc-200/50 px-1 py-0.5" title="TOPS name">
									TOPS: {cls.name}
								</span>
							{/if}
							{#each cls.aliases as alias (alias.alias + '-' + alias.scheme)}
								{#if alias.alias !== resolveDisplayName(cls.name, cls.aliases, data.nameScheme) && alias.alias !== cls.nickname}
									<span class="rounded bg-zinc-200/50 px-1 py-0.5" title="{alias.scheme} name">
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
					</div>

					<div
						class="pt-2 border-t text-[11px] space-y-1.5"
						style="border-color: var(--map-zone); color: var(--map-ink-soft);"
					>
						<div class="flex justify-between">
							<span>Build Period:</span>
							<span class="font-semibold tabular-nums text-right"
								>{buildPeriod(cls.buildStart, cls.buildEnd)}</span
							>
						</div>
						{#if cls.totalBuilt}
							<div class="flex justify-between">
								<span>Total Built:</span>
								<span class="font-semibold tabular-nums text-right">{cls.totalBuilt}</span>
							</div>
						{/if}
						<div class="flex justify-between items-center">
							<span>Region:</span>
							<span class="font-semibold text-right flex items-center gap-1">
								<span class="h-1.5 w-1.5 rounded-full" style="background-color: {lineColor};"
								></span>
								{tractionLabel(cls.regions)}
							</span>
						</div>
					</div>

					<a
						href={resolve('/class/[qid]', { qid: cls.wikidataQid })}
						class="block text-center rounded-lg border py-2.5 text-xs font-semibold hover:bg-white/40 transition-colors"
						style="border-color: var(--map-zone); color: var(--map-ink);"
					>
						Explore Full Chronicle ➔
					</a>
				</div>
			</div>
		</div>

		<!-- Tour Pagination Controls -->
		<div
			class="mt-12 flex justify-between items-center border-t pt-6"
			style="border-color: var(--map-zone);"
		>
			<button
				disabled={activeStepIdx === 0}
				onclick={() => activeStepIdx--}
				class="rounded-lg border px-5 py-2.5 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
				style="border-color: var(--map-zone); color: var(--map-ink);"
			>
				◀ Previous Step
			</button>

			{#if activeStepIdx < steps.length - 1}
				<button
					onclick={() => activeStepIdx++}
					class="rounded-lg border px-5 py-2.5 text-xs font-semibold hover:bg-zinc-100 transition-colors cursor-pointer"
					style="border-color: var(--map-zone); color: var(--map-ink);"
				>
					Next Step ▶
				</button>
			{:else}
				<a
					href={resolve('/')}
					class="rounded-lg px-5 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
					style="background: {lineColor};"
				>
					Finish Exhibition ✔
				</a>
			{/if}
		</div>
	{/if}
</div>
