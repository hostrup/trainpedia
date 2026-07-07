<script lang="ts">
	import { dev } from '$app/environment';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Era, LocomotiveClass, TractionType } from '$lib/types.js';
	import { select } from 'd3-selection';
	import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { computeLayout, GEOMETRY } from './layout.js';
	import { mapClassesToStations, type MappableClass } from './mapClasses.js';
	import { lineColorVar, LINE_NAMES } from './colors.js';
	import ZoneBands from './ZoneBands.svelte';
	import StationIcon from './StationIcon.svelte';
	import InterchangeCapsule from './InterchangeCapsule.svelte';
	import Minimap from './Minimap.svelte';

	let {
		classes,
		eras,
		selectedClass = $bindable(null),
		selectedTraction = null,
		selectedEraId = null,
		selectedWheelArrangement = null,
		displayName
	}: {
		classes: LocomotiveClass[];
		eras: Era[];
		selectedClass: LocomotiveClass | null;
		selectedTraction: TractionType | null;
		selectedEraId: number | null;
		selectedWheelArrangement: string | null;
		/** F5.6: navnevalg pr. brugerens navneskema-præference. LocomotiveClass opfylder MappableClass strukturelt. */
		displayName?: (c: MappableClass) => string;
	} = $props();

	let zoomContainer = $state<HTMLDivElement | null>(null);
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);
	let transform = $state({ x: 20, y: 20, k: 0.5 });
	let zoomBehavior = $state<ZoomBehavior<HTMLDivElement, unknown> | null>(null);

	const filteredClasses = $derived(
		classes.filter((c: LocomotiveClass) => {
			if (selectedEraId !== null && c.eraId !== selectedEraId) return false;
			if (selectedTraction !== null && c.traction !== selectedTraction) return false;
			if (selectedWheelArrangement !== null && c.wheelArrangement !== selectedWheelArrangement)
				return false;
			return true;
		})
	);

	const eraNames = $derived(Object.fromEntries(eras.map((e) => [e.slug, e.name])));
	const eraOrder = $derived([...eras].sort((a, b) => a.sortIndex - b.sortIndex).map((e) => e.slug));

	const layout = $derived.by(() => {
		const stations = mapClassesToStations(filteredClasses, eras, displayName ?? ((c) => c.name));
		return computeLayout(stations, { eraOrder });
	});

	const classById = $derived(new Map(classes.map((c) => [String(c.id), c])));

	function selectStation(id: string) {
		const c = classById.get(id);
		if (c) selectedClass = c;
	}

	// d3-zoom sættes op ÉN gang ved mount (undgår at re-attache og nulstille pan/zoom
	// hver gang filtrering ændrer layoutets dimensioner — se effekten nedenfor).
	$effect(() => {
		if (!zoomContainer) return;
		const container = zoomContainer;

		const z = d3Zoom<HTMLDivElement, unknown>()
			.scaleExtent([0.15, 4])
			.on('zoom', (event) => {
				transform = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
			});

		select(container).call(z);
		zoomBehavior = z;

		const initialK = untrack(() =>
			Math.max(0.15, Math.min(1, (container.clientWidth || 800) / (layout.width || 1)))
		);
		select(container).call(z.transform, zoomIdentity.translate(20, 20).scale(initialK));

		return () => {
			select(container).on('.zoom', null);
			zoomBehavior = null;
		};
	});

	// Opdaterer kun pan-grænserne når layoutets udstrækning ændrer sig (fx ved filtrering)
	// — nulstiller IKKE brugerens aktuelle pan/zoom-position.
	$effect(() => {
		if (!zoomContainer || !zoomBehavior) return;
		zoomBehavior.translateExtent([
			[-200, -200],
			[layout.width + 200, layout.height + 200]
		]);
	});

	const lod = $derived<'out' | 'mid' | 'in'>(
		transform.k < 0.5 ? 'out' : transform.k < 2 ? 'mid' : 'in'
	);

	// Virtualisering: kun stationer/interchanges inden for viewport (+margin) renderes.
	const viewMargin = 200;
	const viewBounds = $derived.by(() => {
		const k = transform.k || 1;
		return {
			left: -transform.x / k - viewMargin,
			right: (viewportWidth - transform.x) / k + viewMargin,
			top: -transform.y / k - viewMargin,
			bottom: (viewportHeight - transform.y) / k + viewMargin
		};
	});

	const visibleStations = $derived(
		layout.stations.filter(
			(s) =>
				s.x >= viewBounds.left &&
				s.x <= viewBounds.right &&
				s.y >= viewBounds.top &&
				s.y <= viewBounds.bottom
		)
	);
	const visibleInterchanges = $derived(
		layout.interchanges.filter((ic) => ic.x >= viewBounds.left && ic.x <= viewBounds.right)
	);

	function handleMinimapNavigate(layoutX: number, layoutY: number) {
		if (!zoomContainer || !zoomBehavior) return;
		const k = transform.k;
		const newX = viewportWidth / 2 - layoutX * k;
		const newY = viewportHeight / 2 - layoutY * k;
		select(zoomContainer).call(zoomBehavior.transform, zoomIdentity.translate(newX, newY).scale(k));
	}

	const minimapViewport = $derived({
		x: viewBounds.left + viewMargin,
		y: viewBounds.top + viewMargin,
		w: viewBounds.right - viewBounds.left - 2 * viewMargin,
		h: viewBounds.bottom - viewBounds.top - 2 * viewMargin
	});

	const lineList = Object.keys(LINE_NAMES) as TractionType[];

	// FPS-instrumentering (kun dev) — genbruger mønstret fra den tidligere TimelineCanvas.
	let fps = $state(0);
	let frameTimes: number[] = [];
	let lastFrameTime = typeof window !== 'undefined' ? performance.now() : 0;
	$effect(() => {
		if (!dev) return;
		let active = true;
		let lastUpdate = performance.now();
		function tick() {
			if (!active) return;
			const now = performance.now();
			frameTimes.push(now - lastFrameTime);
			lastFrameTime = now;
			if (frameTimes.length > 60) frameTimes.shift();
			if (now - lastUpdate > 500) {
				const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
				fps = Math.round(1000 / avg);
				lastUpdate = now;
			}
			requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
		return () => {
			active = false;
		};
	});
</script>

<div
	bind:this={zoomContainer}
	bind:clientWidth={viewportWidth}
	bind:clientHeight={viewportHeight}
	class="relative h-full w-full overflow-hidden select-none"
	style="background: var(--map-bg);"
>
	<div
		class="absolute origin-top-left will-change-transform"
		style="transform: translate3d({transform.x}px, {transform.y}px, 0) scale({transform.k}); width: {layout.width}px; height: {layout.height}px;"
	>
		<svg width={layout.width} height={layout.height} class="absolute inset-0">
			<ZoneBands zones={layout.zones} {eraNames} top={0} height={layout.height} />

			{#each layout.paths as path (path.traction)}
				<path
					d={path.d}
					stroke={lineColorVar(path.traction)}
					stroke-width={GEOMETRY.lineWidthMap}
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
				/>
			{/each}

			{#each visibleInterchanges as ic (ic.id)}
				{@const station = layout.stations.find((s) => s.id === ic.id)}
				<InterchangeCapsule
					interchange={ic}
					name={station?.name ?? ''}
					labelSide={station?.labelSide ?? 'above'}
					isSelected={selectedClass !== null && String(selectedClass.id) === ic.id}
					onSelect={() => selectStation(ic.id)}
				/>
			{/each}

			{#each visibleStations as station (station.id)}
				{#if station.stationType !== 'interchange'}
					<StationIcon
						{station}
						{lod}
						isSelected={selectedClass !== null && String(selectedClass.id) === station.id}
						onSelect={() => selectStation(station.id)}
					/>
				{/if}
			{/each}
		</svg>
	</div>

	<!-- Legende — linjefarver + navne (altid synlig, kort er ellers ulæseligt) -->
	<div
		class="absolute top-4 left-4 z-20 flex flex-col gap-1.5 rounded-lg px-4 py-3 shadow-md"
		style="background: var(--map-bg); border: 1px solid var(--map-zone); font-family: var(--font-ui);"
	>
		{#each lineList as traction (traction)}
			<a
				href={resolve('/line/[slug]', { slug: traction.toLowerCase() })}
				class="flex items-center gap-2 hover:opacity-70"
				title="Open the {LINE_NAMES[traction]} line diagram"
			>
				<span class="h-1 w-6 rounded-full" style="background: {lineColorVar(traction)};"></span>
				<span class="text-xs font-semibold" style="color: var(--map-ink);"
					>{LINE_NAMES[traction]}</span
				>
			</a>
		{/each}
	</div>

	<!-- Minimap -->
	<div class="absolute bottom-4 right-4 z-20 shadow-md">
		<Minimap
			width={layout.width}
			height={layout.height}
			paths={layout.paths}
			viewport={minimapViewport}
			onNavigate={handleMinimapNavigate}
		/>
	</div>

	{#if dev}
		<div
			class="absolute top-4 right-4 z-20 flex flex-col gap-1 rounded-md px-3 py-2 font-mono text-[10px] tracking-wide shadow-md"
			style="background: var(--map-bg); border: 1px solid var(--map-zone); color: var(--map-ink-soft);"
		>
			<div class="flex justify-between gap-4">
				<span>FPS:</span>
				<span class="font-semibold tabular-nums" style="color: {fps < 50 ? '#c0152f' : '#007d32'};"
					>{fps}</span
				>
			</div>
			<div class="flex justify-between gap-4">
				<span>Zoom:</span>
				<span class="font-semibold tabular-nums">{transform.k.toFixed(2)}x ({lod})</span>
			</div>
			<div class="flex justify-between gap-4">
				<span>Stationer:</span>
				<span class="font-semibold tabular-nums"
					>{visibleStations.length} / {layout.stations.length}</span
				>
			</div>
		</div>
	{/if}
</div>
