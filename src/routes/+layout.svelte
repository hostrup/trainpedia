<script lang="ts">
	import '@fontsource-variable/inter/index.css';
	import '@fontsource-variable/fraunces/index.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();

	const navItems = [
		{ href: resolve('/'), label: 'Timeline' },
		{ href: resolve('/classes'), label: 'Explore' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen flex-col">
	<header
		class="z-50 flex h-14 flex-shrink-0 items-center gap-6 border-b border-white/10 bg-[var(--color-bg-surface)]/80 px-4 backdrop-blur-md sm:px-6"
	>
		<a href={resolve('/')} class="flex items-baseline gap-2 select-none">
			<span class="font-display text-lg font-semibold tracking-tight text-white">Trainpedia</span>
			<span
				class="hidden text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase sm:inline"
				>British Railway Chronicle</span
			>
		</a>

		<nav class="flex items-center gap-1">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors
					{isActive(item.href)
						? 'bg-white/10 text-white'
						: 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<form action="/classes" method="GET" class="ml-auto flex items-center" role="search">
			<input
				type="search"
				name="q"
				placeholder="Find a class… e.g. Class 37"
				aria-label="Search locomotive classes"
				class="w-40 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-sm text-white placeholder-[var(--color-text-muted)] transition-all outline-none focus:w-64 focus:border-white/30 sm:w-56"
			/>
		</form>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>
