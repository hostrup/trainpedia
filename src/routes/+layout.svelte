<script lang="ts">
	import '@fontsource-variable/inter/index.css';
	import '@fontsource-variable/fraunces/index.css';
	import '@fontsource/hammersmith-one/index.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { NAME_SCHEMES, NAME_SCHEME_LABELS, type NameScheme } from '$lib/nameScheme.js';
	import type { LayoutData } from './$types.js';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const navItems = [
		{ href: resolve('/'), label: 'Home' },
		{ href: resolve('/browse'), label: 'Browse' },
		{ href: resolve('/browse') + '?lens=timeline', label: 'Timeline' },
		{ href: resolve('/records'), label: 'Records' },
		{ href: resolve('/survivors'), label: 'Survivors' }
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
		</div>

		<form action={resolve('/browse')} method="GET" class="flex items-center" role="search">
			<input
				type="search"
				name="q"
				placeholder="Find a class… e.g. Class 37"
				aria-label="Search locomotive classes"
				class="w-40 rounded-full border px-4 py-1.5 text-sm transition-all outline-none focus:w-64"
				style="background: var(--map-zone); color: var(--map-ink); border-color: var(--map-zone);"
			/>
		</form>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto" style="background: var(--map-bg);">
		{@render children()}
	</main>
</div>
