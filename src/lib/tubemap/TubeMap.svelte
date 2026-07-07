<script lang="ts">
	import { dev } from '$app/environment';
	import { untrack } from 'svelte';
	import type { Era, LocomotiveClass } from '$lib/types.js';
	import { select } from 'd3-selection';
	import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { computeLayout, GEOMETRY, type Traction } from './layout.js';
	import { mapClassesToStations, type MappableClass } from './mapClasses.js';
	import { lineColorVar, LINE_NAMES } from './colors.js';
	import StationIcon from './StationIcon.svelte';
	import Minimap from './Minimap.svelte';
	import { dieselLayout } from './dieselLayout.js';

	let {
		classes,
		eras,
		selectedClass = $bindable(null),
		selectedEraId = null,
		selectedWheelArrangement = null,
		displayName
	}: {
		classes: LocomotiveClass[];
		eras: Era[];
		selectedClass: LocomotiveClass | null;
		selectedEraId: number | null;
		selectedWheelArrangement: string | null;
		displayName?: (c: MappableClass) => string;
	} = $props();

	// Tab and Timeline Slider States
	let activeTab = $state<'map' | 'chart'>('map');
	let selectedYear = $state(1975);

	let zoomContainer = $state<HTMLDivElement | null>(null);
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);
	let transform = $state({ x: 20, y: 20, k: 0.5 });
	let zoomBehavior = $state<ZoomBehavior<HTMLDivElement, unknown> | null>(null);

	const filteredClasses = $derived(
		classes.filter((c: LocomotiveClass) => {
			if (selectedEraId !== null && c.eraId !== selectedEraId) return false;
			if (selectedWheelArrangement !== null && c.wheelArrangement !== selectedWheelArrangement)
				return false;
			return true;
		})
	);

	const eraOrder = $derived([...eras].sort((a, b) => a.sortIndex - b.sortIndex).map((e) => e.slug));

	// Compute Layout (maps Wikidata QIDs dynamically to static coords)
	const layout = $derived.by(() => {
		const stations = mapClassesToStations(filteredClasses, eras, displayName ?? ((c) => c.name));
		return computeLayout(stations, { eraOrder });
	});

	const classById = $derived(new Map(classes.map((c) => [String(c.id), c])));

	function selectStation(id: string) {
		const c = classById.get(id);
		if (c) selectedClass = c;
	}

	// d3-zoom setup
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

	// Virtualization bounds
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

	const lineList = ['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'] as Traction[];

	function handleFocusStation(x: number, y: number) {
		if (!zoomContainer || !zoomBehavior) return;
		const k = transform.k;
		const vx = x * k + transform.x;
		const vy = y * k + transform.y;
		const margin = 100;
		if (vx < margin || vx > viewportWidth - margin || vy < margin || vy > viewportHeight - margin) {
			const newX = viewportWidth / 2 - x * k;
			const newY = viewportHeight / 2 - y * k;
			select(zoomContainer).call(
				zoomBehavior.transform,
				zoomIdentity.translate(newX, newY).scale(k)
			);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!zoomContainer || !zoomBehavior) return;

		const panStep = 50 / transform.k;
		let dx = 0;
		let dy = 0;
		let dz = 0;

		switch (e.key) {
			case 'ArrowLeft':
				dx = panStep;
				break;
			case 'ArrowRight':
				dx = -panStep;
				break;
			case 'ArrowUp':
				dy = panStep;
				break;
			case 'ArrowDown':
				dy = -panStep;
				break;
			case '+':
			case '=':
				dz = 0.15;
				break;
			case '-':
				dz = -0.15;
				break;
			default:
				return;
		}

		e.preventDefault();

		if (dz !== 0) {
			const nextK = Math.max(0.15, Math.min(4, transform.k * (1 + dz)));
			const cx = viewportWidth / 2;
			const cy = viewportHeight / 2;
			const lx = (cx - transform.x) / transform.k;
			const ly = (cy - transform.y) / transform.k;
			const nextX = cx - lx * nextK;
			const nextY = cy - ly * nextK;

			select(zoomContainer).call(
				zoomBehavior.transform,
				zoomIdentity.translate(nextX, nextY).scale(nextK)
			);
		} else {
			const nextX = transform.x + dx * transform.k;
			const nextY = transform.y + dy * transform.k;
			select(zoomContainer).call(
				zoomBehavior.transform,
				zoomIdentity.translate(nextX, nextY).scale(transform.k)
			);
		}
	}

	// FPS HUD
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

	// Timeline Highlight checking
	function isStationActive(
		station: { introYear: number; retiredYear: number | null },
		year: number
	) {
		return (
			year >= station.introYear && (station.retiredYear === null || year <= station.retiredYear)
		);
	}

	function isPathActive(traction: Traction, year: number) {
		return layout.stations.some((s) => s.traction === traction && isStationActive(s, year));
	}

	// Scatterplot Helper: Parse Spec Values
	function getSpecValue(c: LocomotiveClass, key: string): number | null {
		const spec = c.specs.find((s) => s.key === key);
		if (!spec) return null;
		const parsed = parseFloat(spec.value.replace(/[^0-9.]/g, ''));
		return Number.isNaN(parsed) ? null : parsed;
	}

	const scatterplotData = $derived.by(() => {
		return classes
			.map((c) => {
				const hp = getSpecValue(c, 'Power Output');
				const speed = getSpecValue(c, 'Top Speed');
				if (hp === null || speed === null) return null;
				return {
					class: c,
					hp,
					speed
				};
			})
			.filter((d): d is { class: LocomotiveClass; hp: number; speed: number } => d !== null);
	});

	// Scatterplot Tooltip logic
	let tooltipData = $state<{
		name: string;
		hp: number;
		speed: number;
		x: number;
		y: number;
	} | null>(null);
	function handleMouseOver(
		e: MouseEvent,
		item: { class: LocomotiveClass; hp: number; speed: number }
	) {
		const rect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
		if (!rect) return;
		tooltipData = {
			name: item.class.name,
			hp: item.hp,
			speed: item.speed,
			x: e.clientX - rect.left + 15,
			y: e.clientY - rect.top - 15
		};
	}
	function handleMouseOut() {
		tooltipData = null;
	}
</script>

<!-- View Selector Header inside component container -->
<div
	class="flex justify-between items-center border-b border-[var(--border-color)] px-6 py-3 bg-white"
>
	<div class="flex gap-2">
		<button
			class="px-4 py-2 text-xs font-semibold rounded-md transition-all {activeTab === 'map'
				? 'bg-[var(--tfl-blue)] text-white'
				: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
			onclick={() => (activeTab = 'map')}
		>
			🚇 Regionalt Metrokort
		</button>
		<button
			class="px-4 py-2 text-xs font-semibold rounded-md transition-all {activeTab === 'chart'
				? 'bg-[var(--tfl-blue)] text-white'
				: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
			onclick={() => (activeTab = 'chart')}
		>
			📊 Hestekræfter vs. Fart
		</button>
	</div>
</div>

<div class="relative flex-1 flex flex-col min-h-0">
	{#if activeTab === 'map'}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={zoomContainer}
			bind:clientWidth={viewportWidth}
			bind:clientHeight={viewportHeight}
			class="relative flex-1 overflow-hidden select-none outline-none"
			style="background: var(--map-bg);"
			tabindex="0"
			onkeydown={handleKeydown}
			role="application"
			aria-label="Interactive train map"
		>
			<div
				class="absolute origin-top-left will-change-transform"
				style="transform: translate3d({transform.x}px, {transform.y}px, 0) scale({transform.k}); width: {layout.width}px; height: {layout.height}px;"
			>
				<svg width={layout.width} height={layout.height} class="absolute inset-0">
					<!-- Concentric Circles/Zones -->
					<circle
						cx="600"
						cy="500"
						r="100"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="4 6"
					/>
					<text
						x="600"
						y="390"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 1: PIONERERNE (1948-1954)</text
					>

					<circle
						cx="600"
						cy="500"
						r="200"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="4 6"
					/>
					<text
						x="600"
						y="290"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 2: MODERNISERINGSPLANEN (1955-1967)</text
					>

					<circle
						cx="600"
						cy="500"
						r="290"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="4 6"
					/>
					<text
						x="600"
						y="200"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 3: TOPS-TRANSITIONEN (1968-1981)</text
					>

					<circle
						cx="600"
						cy="500"
						r="370"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="4 6"
					/>
					<text
						x="600"
						y="120"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 4: SEKTORISERINGEN (1982-1988)</text
					>

					<circle
						cx="600"
						cy="500"
						r="440"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="4 6"
					/>
					<text
						x="600"
						y="50"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 5: SENE BR-DAGE (1989-1994)</text
					>

					<circle
						cx="600"
						cy="500"
						r="510"
						class="fill-none stroke-gray-300 stroke-[1.5px]"
						stroke-dasharray="2 4"
					/>
					<text
						x="600"
						y="-20"
						class="pointer-events-none select-none text-[12px] font-bold fill-gray-400"
						text-anchor="middle">ZONE 6: PRIVATISERING & NUTID (1995+)</text
					>

					<!-- Regional Lines paths -->
					{#each layout.paths as path (path.traction)}
						<path
							d={path.d}
							stroke={lineColorVar(path.traction)}
							stroke-width={GEOMETRY.lineWidthMap}
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
							class="transition-opacity duration-300 {isPathActive(path.traction, selectedYear)
								? ''
								: 'opacity-15'}"
						/>
					{/each}

					<!-- Stations nodes -->
					{#each visibleStations as station (station.id)}
						<g
							class="transition-opacity duration-300 {isStationActive(station, selectedYear)
								? ''
								: 'opacity-15'}"
						>
							<StationIcon
								{station}
								{lod}
								isSelected={selectedClass !== null && String(selectedClass.id) === station.id}
								onSelect={() => selectStation(station.id)}
								onFocus={() => handleFocusStation(station.x, station.y)}
							/>
						</g>
					{/each}
				</svg>
			</div>

			<!-- Legend -->
			<div
				class="absolute top-4 left-4 z-20 flex flex-col gap-1.5 rounded-lg px-4 py-3 shadow-md bg-white border border-gray-200"
				style="font-family: var(--font-ui);"
			>
				{#each lineList as traction (traction)}
					<div class="flex items-center gap-2">
						<span class="h-1 w-6 rounded-full" style="background: {lineColorVar(traction)};"></span>
						<span class="text-xs font-semibold text-gray-800">{LINE_NAMES[traction]}</span>
					</div>
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
					class="absolute top-4 right-4 z-20 flex flex-col gap-1 rounded-md px-3 py-2 font-mono text-[10px] tracking-wide shadow-md bg-white border border-gray-200 text-gray-400"
				>
					<div class="flex justify-between gap-4">
						<span>FPS:</span>
						<span
							class="font-semibold tabular-nums"
							style="color: {fps < 50 ? '#c0152f' : '#007d32'};">{fps}</span
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

		<!-- Time slider control bar -->
		<div
			class="flex items-center gap-6 border-t border-[var(--border-color)] px-6 py-4 bg-white z-50"
		>
			<div class="font-bold text-lg min-w-[140px] text-gray-800">
				Aktivt år: <span class="text-[var(--tfl-blue)]">{selectedYear}</span>
			</div>
			<div class="flex-1 flex flex-col relative">
				<input
					type="range"
					min="1948"
					max="2026"
					bind:value={selectedYear}
					class="w-full h-1.5 rounded-full bg-gray-200 accent-[var(--tfl-blue)] outline-none cursor-pointer"
				/>
				<div class="flex justify-between w-full mt-2 text-[10px] font-semibold text-gray-400">
					<span>1948</span>
					<span>1955</span>
					<span>1968</span>
					<span>1982</span>
					<span>1995</span>
					<span>2026</span>
				</div>
			</div>
		</div>
	{:else}
		<!-- Scatterplot Panel -->
		<div class="flex-1 flex flex-col bg-gray-50 p-8 overflow-y-auto">
			<div class="mb-6">
				<h2 class="text-xl font-bold text-gray-800">Hestekræfter vs. Tophastighed</h2>
				<p class="text-xs text-gray-500 mt-1">
					Sammenlign specifikationer på tværs af de 100 britiske dieselklasser i databasen.
				</p>
			</div>
			<div
				class="relative flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[400px]"
			>
				<!-- Chart Tooltip -->
				{#if tooltipData}
					<div
						class="absolute bg-gray-900 text-white px-3 py-2 rounded-md text-xs pointer-events-none shadow-md z-[100] border border-gray-700"
						style="left: {tooltipData.x}px; top: {tooltipData.y}px;"
					>
						<strong>{tooltipData.name}</strong><br />
						Effekt: {tooltipData.hp} hp<br />
						Fart: {tooltipData.speed} mph
					</div>
				{/if}

				<!-- Scatterplot SVG -->
				<svg class="w-full h-full" viewBox="0 0 800 400">
					<!-- Grid lines -->
					<line x1="80" y1="350" x2="750" y2="350" class="stroke-gray-300 stroke-[1px]" />
					<line x1="80" y1="50" x2="80" y2="350" class="stroke-gray-300 stroke-[1px]" />

					<!-- X Axis Labels (0 to 150 mph) -->
					{#each [0, 25, 50, 75, 100, 125, 150] as speed (speed)}
						{@const cx = 80 + (speed / 150) * 670}
						<text
							x={cx}
							y="370"
							class="text-[10px] font-semibold fill-gray-400"
							text-anchor="middle">{speed} mph</text
						>
					{/each}
					<text x="415" y="390" class="text-xs font-bold fill-gray-500" text-anchor="middle"
						>TOP HASTIGHED (MPH)</text
					>

					<!-- Y Axis Labels (0 to 3500 hp) -->
					{#each [0, 500, 1000, 1500, 2000, 2500, 3000, 3500] as hp (hp)}
						{@const cy = 350 - (hp / 3500) * 300}
						<text
							x="70"
							y={cy + 4}
							class="text-[10px] font-semibold fill-gray-400"
							text-anchor="end">{hp} hp</text
						>
					{/each}
					<text
						x="25"
						y="200"
						class="text-xs font-bold fill-gray-500"
						text-anchor="middle"
						transform="rotate(-90 25 200)">HESTEKRÆFTER (HP)</text
					>

					<!-- Dots for each class -->
					{#each scatterplotData as item (item.class.id)}
						{@const cx = 80 + (Math.min(150, item.speed) / 150) * 670}
						{@const cy = 350 - (Math.min(3500, item.hp) / 3500) * 300}
						<!-- Find primary region color -->
						{@const layoutItem = dieselLayout.find((li) => li.qid === item.class.wikidataQid)}
						{@const primaryRegion = layoutItem ? (layoutItem.regions[0] as Traction) : 'MIDLAND'}

						<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events a11y_mouse_events_have_key_events -->
						<circle
							{cx}
							{cy}
							r={item.class.isLandmark ? 8 : 6}
							fill={lineColorVar(primaryRegion)}
							class="stroke-gray-900 stroke-[1.5px] cursor-pointer fill-opacity-80 transition-all hover:r-[10px] hover:fill-opacity-100"
							onmouseover={(e) => handleMouseOver(e, item)}
							onmouseout={handleMouseOut}
							onclick={() => {
								selectStation(String(item.class.id));
								activeTab = 'map';
							}}
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>
