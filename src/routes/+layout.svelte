<script lang="ts">
	import '@fontsource-variable/inter/index.css';
	import '@fontsource-variable/fraunces/index.css';
	import '@fontsource/hammersmith-one/index.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import {
		NAME_SCHEMES,
		NAME_SCHEME_LABELS,
		resolveDisplayName,
		type NameScheme
	} from '$lib/nameScheme.js';
	import { tractionColor } from '$lib/loco.js';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const navItems = [
		{ href: resolve('/'), label: 'Home' },
		{ href: resolve('/browse'), label: 'Browse' },
		{ href: resolve('/browse') + '?lens=timeline', label: 'Timeline' },
		{ href: resolve('/records'), label: 'Records' },
		{ href: resolve('/survivors'), label: 'Survivors' },
		{ href: resolve('/about'), label: 'About' }
	];

	function isActive(href: string): boolean {
		if (href === resolve('/') || href === '/')
			return page.url.pathname === '/' || page.url.pathname === resolve('/');
		if (href.includes('?')) return page.url.pathname + page.url.search === href;
		return page.url.pathname.startsWith(href);
	}

	async function handleNameSchemeChange(e: Event) {
		const scheme = (e.currentTarget as HTMLSelectElement).value as NameScheme;
		await fetch('/api/name-scheme', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ scheme })
		});
		await invalidateAll();
	}

	// --- Typeahead Search ---
	import { goto } from '$app/navigation';
	let searchQuery = $state('');
	let showDropdown = $state(false);
	let activeIndex = $state(-1);
	let searchResults = $state<{
		classes: Array<{
			qid: string;
			name: string;
			nickname: string | null;
			regions: string[];
			buildStart: number | null;
			buildEnd: number | null;
			matchSource: string | null;
		}>;
		individuals: Array<{
			currentNumber: string;
			currentName: string | null;
			status: string;
			className: string;
			classQid: string;
			matchSource: string | null;
		}>;
	}>({ classes: [], individuals: [] });

	let searchTimeout: ReturnType<typeof setTimeout>;
	const totalItems = $derived(searchResults.classes.length + searchResults.individuals.length);

	async function performSearch(query: string) {
		if (!query.trim()) {
			searchResults = { classes: [], individuals: [] };
			return;
		}
		const res = await fetch(`${resolve('/api/search')}?q=${encodeURIComponent(query)}`);
		if (res.ok) {
			searchResults = await res.json();
		}
	}

	function handleInput(e: Event) {
		const val = (e.currentTarget as HTMLInputElement).value;
		searchQuery = val;
		clearTimeout(searchTimeout);
		activeIndex = -1;
		if (val.trim()) {
			showDropdown = true;
			searchTimeout = setTimeout(() => {
				performSearch(val);
			}, 150);
		} else {
			showDropdown = false;
			searchResults = { classes: [], individuals: [] };
		}
	}

	function handleFocus() {
		if (searchQuery.trim()) {
			showDropdown = true;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showDropdown = false;
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (totalItems > 0) {
				activeIndex = (activeIndex + 1) % totalItems;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (totalItems > 0) {
				activeIndex = (activeIndex - 1 + totalItems) % totalItems;
			}
		} else if (e.key === 'Enter') {
			if (activeIndex >= 0 && activeIndex < totalItems) {
				e.preventDefault();
				if (activeIndex < searchResults.classes.length) {
					const cls = searchResults.classes[activeIndex];
					goto(resolve('/class/[qid]', { qid: cls.qid }));
				} else {
					const ind = searchResults.individuals[activeIndex - searchResults.classes.length];
					goto(resolve('/loco/[number]', { number: ind.currentNumber }));
				}
				showDropdown = false;
			} else {
				const trimmed = searchQuery.trim();
				const exactLoco = searchResults.individuals.find(
					(ind) => ind.currentNumber.toLowerCase() === trimmed.toLowerCase()
				);
				if (exactLoco) {
					e.preventDefault();
					goto(resolve('/loco/[number]', { number: exactLoco.currentNumber }));
					showDropdown = false;
				}
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen flex-col" style="background: var(--map-bg);">
	<header
		class="z-50 flex h-14 flex-shrink-0 items-center gap-6 px-4 sm:px-6"
		style="background: var(--map-bg); border-bottom: 1px solid var(--map-zone);"
	>
		<a href={resolve('/')} class="flex items-baseline gap-2 select-none">
			<span
				class="text-lg font-semibold tracking-tight"
				style="font-family: var(--font-map); color: var(--map-ink);">Trainpedia</span
			>
			<span
				class="hidden text-[10px] tracking-widest uppercase sm:inline"
				style="color: var(--map-ink-soft);">British Railway Chronicle</span
			>
		</a>

		<!-- eslint-disable svelte/no-navigation-without-resolve -- navItems are pre-resolved -->
		<nav class="flex items-center gap-1">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors"
					style={isActive(item.href)
						? 'background: var(--tfl-blue); color: white;'
						: 'color: var(--map-ink-soft);'}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-1.5">
			<label
				for="name-scheme"
				class="hidden text-[10px] tracking-widest uppercase sm:inline"
				style="color: var(--map-ink-soft);">Show names as:</label
			>
			<select
				id="name-scheme"
				value={data.nameScheme}
				onchange={handleNameSchemeChange}
				class="rounded-full border px-2.5 py-1 text-xs outline-none transition-all"
				style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
			>
				{#each NAME_SCHEMES as scheme (scheme)}
					<option value={scheme}>{NAME_SCHEME_LABELS[scheme]}</option>
				{/each}
			</select>

			<a
				href="/api/random"
				class="flex h-7 w-7 items-center justify-center rounded-full border transition-all hover:scale-105 text-sm"
				style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
				title="Explore a random class"
				aria-label="Redirect to a random locomotive class chronicle"
			>
				🎲
			</a>
		</div>

		<div class="search-container relative flex items-center">
			<form
				action={resolve('/browse')}
				method="GET"
				class="flex items-center"
				role="search"
				onsubmit={() => (showDropdown = false)}
			>
				<input
					type="search"
					name="q"
					value={searchQuery}
					oninput={handleInput}
					onfocus={handleFocus}
					onkeydown={handleKeydown}
					placeholder="Find a class… e.g. Class 37"
					aria-label="Search locomotive classes"
					class="w-40 rounded-full border px-4 py-1.5 text-sm transition-all outline-none focus:w-64"
					style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
					autocomplete="off"
				/>
			</form>

			{#if showDropdown && totalItems > 0}
				<div
					class="absolute top-full right-0 mt-1.5 w-80 rounded-xl border p-2 shadow-xl z-50 max-h-[400px] overflow-y-auto"
					style="background: var(--map-bg); border-color: var(--map-zone);"
				>
					{#if searchResults.classes.length > 0}
						<div class="mb-2">
							<h3
								class="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
								style="color: var(--map-ink-soft);"
							>
								Classes
							</h3>
							<ul class="space-y-0.5">
								{#each searchResults.classes as cls, idx (cls.qid)}
									{@const color = tractionColor(cls.regions)}
									{@const globalIdx = idx}
									<li>
										<a
											href={resolve('/class/[qid]', { qid: cls.qid })}
											onclick={() => (showDropdown = false)}
											class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
											style="color: var(--map-ink); background: {activeIndex === globalIdx
												? 'var(--map-zone)'
												: 'transparent'};"
										>
											<span
												class="inline-block h-2.5 w-2.5 rounded-full"
												style="background: {color};"
											></span>
											<span class="flex-1 truncate"
												>{resolveDisplayName(cls.name, [], data.nameScheme)}</span
											>
											<span class="text-[10px] tabular-nums" style="color: var(--map-ink-soft);">
												{cls.buildStart ??
													'?'}{#if cls.buildEnd && cls.buildEnd !== cls.buildStart}–{cls.buildEnd}{:else if !cls.buildEnd}–present{/if}
											</span>
										</a>
										{#if cls.matchSource}
											<div class="px-7 pb-1 text-[10px] italic" style="color: var(--map-ink-soft);">
												{cls.matchSource}
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if searchResults.individuals.length > 0}
						<div>
							<h3
								class="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
								style="color: var(--map-ink-soft);"
							>
								Locomotives
							</h3>
							<ul class="space-y-0.5">
								{#each searchResults.individuals as ind, idx (ind.currentNumber)}
									{@const globalIdx = searchResults.classes.length + idx}
									<li>
										<a
											href={resolve('/loco/[number]', { number: ind.currentNumber })}
											onclick={() => (showDropdown = false)}
											class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
											style="color: var(--map-ink); background: {activeIndex === globalIdx
												? 'var(--map-zone)'
												: 'transparent'};"
										>
											<span class="font-bold tabular-nums" style="color: var(--tfl-blue);"
												>{ind.currentNumber}</span
											>
											<span class="flex-1 truncate font-serif italic">{ind.currentName ?? '—'}</span
											>
											<span
												class="inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
												style="background: var(--map-zone); color: var(--map-ink-soft);"
											>
												{ind.status}
											</span>
										</a>
										{#if ind.matchSource}
											<div class="px-3 pb-1 text-[10px] italic" style="color: var(--map-ink-soft);">
												{ind.matchSource}
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto" style="background: var(--map-bg);">
		{@render children()}
	</main>
</div>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.search-container')) {
			showDropdown = false;
		}
	}}
/>
