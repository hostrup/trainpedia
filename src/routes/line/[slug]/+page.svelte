<script lang="ts">
	import type { PageData } from './$types.js';
	import type { LocomotiveClass } from '$lib/types.js';
	import type { Traction } from '$lib/tubemap/layout.js';
	import LineDiagram from '$lib/tubemap/LineDiagram.svelte';
	import MuseumPlacard from '$lib/components/MuseumPlacard.svelte';
	import { resolveDisplayName, type NameScheme } from '$lib/nameScheme.js';
	import { LINE_NAMES, lineColorVar } from '$lib/tubemap/colors.js';
	import { resolve } from '$app/paths';

	// NB: svelte-check 4.7.1 + TypeScript 6.0 løser p.t. IKKE PageData korrekt for denne
	// dynamiske rute (data ender som `any`) — bekræftet med isolerede reproduktionstests,
	// også på helt nye/ubeslægtede ruter, så det er en værktøjsbegrænsning, ikke en fejl i
	// selve datamodellen. Eksplicitte typer her genopretter typesikkerheden i resten af filen.
	let { data } = $props<{ data: PageData }>();
	const traction = $derived(data.traction as Traction);
	const classes = $derived(data.classes as LocomotiveClass[]);
	const eras = $derived(data.eras as import('$lib/types.js').Era[]);
	const nameScheme = $derived(data.nameScheme as NameScheme);

	let selectedClass = $state<LocomotiveClass | null>(null);
</script>

<svelte:head>
	<title>{LINE_NAMES[traction]} Line — Trainpedia</title>
</svelte:head>

<div class="relative flex h-full w-full flex-col" style="background: var(--map-bg);">
	<header
		class="flex flex-shrink-0 items-center gap-3 px-4 py-3"
		style="border-bottom: 1px solid var(--map-zone);"
	>
		<a
			href={resolve('/')}
			class="text-xs font-semibold whitespace-nowrap"
			style="color: var(--map-ink-soft);">&larr; Full map</a
		>
		<span class="h-2 w-6 rounded-full" style="background: {lineColorVar(traction)};"></span>
		<h1 class="text-lg font-semibold" style="color: var(--map-ink); font-family: var(--font-map);">
			{LINE_NAMES[traction]} Line
		</h1>
		<span class="text-xs" style="color: var(--map-ink-soft);">{classes.length} classes</span>
	</header>

	<div class="min-h-0 flex-1">
		<LineDiagram
			{classes}
			{eras}
			bind:selectedClass
			displayName={(c) => resolveDisplayName(c.name, c.aliases ?? [], nameScheme)}
		/>
	</div>

	<MuseumPlacard classData={selectedClass} onClose={() => (selectedClass = null)} />
</div>
