<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';

	interface Era {
		slug: string;
		name: string;
		startYear: number;
		endYear: number | null;
		narrative: string | null;
		sourceUrl?: string | null;
		sourceRevision?: string | null;
	}

	interface Stats {
		classesCount: number;
		builtCount: number;
		preservedCount: number;
	}

	import type { Snippet } from 'svelte';

	let {
		era,
		eras = [],
		size = 'full',
		stats = null as Stats | null,
		children
	} = $props<{
		era: Era;
		eras?: Era[];
		size?: 'full' | 'compact' | 'panel';
		stats?: Stats | null;
		children?: Snippet;
	}>();

	// Calculate era accent color based on index
	const eraColor = $derived.by(() => {
		const idx = eras.findIndex((e: Era) => e.slug === era.slug);
		const defaultIdx = idx !== -1 ? idx : 0;
		const percent = Math.max(5, 25 - defaultIdx * 4);
		return `color-mix(in srgb, var(--tfl-blue) ${percent}%, var(--map-zone))`;
	});

	let expanded = $state(false);

	const paragraphs = $derived(era.narrative ? era.narrative.split('\n\n') : []);
	const firstParagraph = $derived(paragraphs[0] ?? '');
	const remainingParagraphs = $derived(paragraphs.slice(1));
	const retrievedDate = '7 Jul 2026';
</script>

{#if size === 'full'}
	<div
		class="era-room-card full border-l-4 rounded-lg p-6 my-6 shadow-sm flex flex-col gap-4"
		style="border-color: {eraColor}; background: var(--map-bg); border-left-width: 4px; border-left-style: solid; border-top: 1px solid var(--map-zone); border-right: 1px solid var(--map-zone); border-bottom: 1px solid var(--map-zone);"
	>
		<div
			class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-3 border-[var(--map-zone)]"
		>
			<div>
				<h2
					class="text-3xl font-semibold tracking-tight text-[var(--map-ink)]"
					style="font-family: var(--font-map);"
				>
					{era.name}
				</h2>
				<p class="text-xs text-[var(--map-ink-soft)] font-mono uppercase tracking-wider mt-1">
					{era.startYear} – {era.endYear ?? 'Present'}
				</p>
			</div>

			{#if stats}
				<div class="flex items-center gap-4 text-sm text-[var(--map-ink)]">
					<a
						href={resolve('/browse') + '?era=' + era.slug}
						class="flex flex-col items-center hover:text-[var(--tfl-blue)] transition-colors"
					>
						<span class="font-bold font-mono text-base">{stats.classesCount}</span>
						<span class="text-[10px] uppercase tracking-wider text-[var(--map-ink-soft)]"
							>classes</span
						>
					</a>
					<span class="text-[var(--map-zone)]">|</span>
					<div class="flex flex-col items-center">
						<span class="font-bold font-mono text-base">{stats.builtCount.toLocaleString()}</span>
						<span class="text-[10px] uppercase tracking-wider text-[var(--map-ink-soft)]"
							>built</span
						>
					</div>
					<span class="text-[var(--map-zone)]">|</span>
					<a
						href={resolve('/browse') + '?era=' + era.slug + '&surviving=yes'}
						class="flex flex-col items-center hover:text-[var(--tfl-blue)] transition-colors"
					>
						<span class="font-bold font-mono text-base text-green-700">{stats.preservedCount}</span>
						<span class="text-[10px] uppercase tracking-wider text-[var(--map-ink-soft)]"
							>preserved</span
						>
					</a>
				</div>
			{/if}
		</div>

		{#if firstParagraph}
			<div
				class="narrative-content text-[var(--map-ink)] text-lg leading-relaxed max-w-3xl"
				style="font-family: var(--font-narrative);"
			>
				<p>{firstParagraph}</p>

				{#if expanded && remainingParagraphs.length > 0}
					<div transition:slide class="mt-4 flex flex-col gap-4">
						{#each remainingParagraphs as p, idx (idx)}
							<p>{p}</p>
						{/each}
					</div>
				{/if}

				{#if remainingParagraphs.length > 0}
					<button
						onclick={() => (expanded = !expanded)}
						class="text-sm font-sans text-[var(--tfl-blue)] hover:underline mt-2 block font-semibold focus:outline-none"
					>
						{expanded ? 'Read less ↑' : 'Read more ↓'}
					</button>
				{/if}
			</div>
		{/if}

		{#if era.sourceUrl}
			<div
				class="border-t pt-3 border-[var(--map-zone)] flex justify-between items-center text-[10px] text-[var(--map-ink-soft)] font-mono"
			>
				<span>
					Source:
					<a
						href={era.sourceUrl + (era.sourceRevision ? `?oldid=${era.sourceRevision}` : '')}
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-[var(--map-ink)]"
					>
						Wikipedia
					</a>
					{#if era.sourceRevision}
						· oldid: <span>{era.sourceRevision}</span>
					{/if}
					· retrieved {retrievedDate}
				</span>
			</div>
		{/if}
	</div>
{:else if size === 'compact'}
	<div
		class="era-room-card compact border-l-4 rounded-lg p-4 my-2 flex flex-col gap-2 shadow-sm"
		style="border-color: {eraColor}; background: var(--map-bg); border-left-width: 4px; border-left-style: solid; border-top: 1px solid var(--map-zone); border-right: 1px solid var(--map-zone); border-bottom: 1px solid var(--map-zone);"
	>
		<div class="flex justify-between items-baseline gap-2">
			<h3 class="text-xl font-semibold text-[var(--map-ink)]" style="font-family: var(--font-map);">
				{era.name}
			</h3>
			<span class="text-xs text-[var(--map-ink-soft)] font-mono whitespace-nowrap"
				>{era.startYear}–{era.endYear ?? 'Present'}</span
			>
		</div>
		{#if firstParagraph}
			<p
				class="text-sm italic text-[var(--map-ink-soft)] leading-relaxed line-clamp-2"
				style="font-family: var(--font-narrative);"
			>
				{firstParagraph}
			</p>
		{/if}
		{@render children?.()}
	</div>
{:else if size === 'panel'}
	<div
		class="era-room-card panel border-l-4 rounded-lg p-4 max-w-sm flex flex-col gap-2 shadow-md border"
		style="border-color: {eraColor}; background: var(--map-bg); border-left-width: 4px; border-left-style: solid; border-top-color: var(--map-zone); border-right-color: var(--map-zone); border-bottom-color: var(--map-zone);"
	>
		<div class="flex justify-between items-baseline gap-2">
			<h4
				class="text-base font-semibold text-[var(--map-ink)]"
				style="font-family: var(--font-map);"
			>
				{era.name}
			</h4>
			<span class="text-[10px] text-[var(--map-ink-soft)] font-mono whitespace-nowrap"
				>{era.startYear}–{era.endYear ?? 'Present'}</span
			>
		</div>
		{#if firstParagraph}
			<p
				class="text-xs text-[var(--map-ink)] leading-relaxed line-clamp-3"
				style="font-family: var(--font-narrative);"
			>
				{firstParagraph}
			</p>
		{/if}
		{#if stats}
			<div
				class="flex items-center justify-between text-[10px] border-t pt-2 border-[var(--map-zone)] text-[var(--map-ink-soft)] font-mono"
			>
				<span>{stats.classesCount} classes</span>
				<span>{stats.builtCount.toLocaleString()} built</span>
				<span class="text-green-700">{stats.preservedCount} preserved</span>
			</div>
		{/if}
	</div>
{/if}
