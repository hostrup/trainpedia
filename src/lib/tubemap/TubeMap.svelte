<script lang="ts">
	import { dev } from '$app/environment';
	import { untrack } from 'svelte';
	import type { Era, LocomotiveClass } from '$lib/types.js';
	import { select } from 'd3-selection';
	import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { computeLayout, GEOMETRY, type LayoutStation, type Traction } from './layout.js';
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
	// Time Machine er FRA som standard (Ronnis feedback 2026-07-07: sliderens
	// formål var ikke til at gennemskue, og den dæmpede oveni æra/hjul-filtrenes
	// egen dæmpning — to samtidige tidskontroller). Kun når brugeren aktivt slår
	// den til, filtreres der på årstal; ellers styres synlighed KUN af
	// FilterOverlay (æra/hjul).
	let timeMachineOn = $state(false);

	let zoomContainer = $state<HTMLDivElement | null>(null);
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);
	let transform = $state({ x: 20, y: 20, k: 0.5 });
	let zoomBehavior = $state<ZoomBehavior<HTMLDivElement, unknown> | null>(null);

	const CENTER_X = 600;
	const CENTER_Y = 500;

	const eraOrder = $derived([...eras].sort((a, b) => a.sortIndex - b.sortIndex).map((e) => e.slug));

	// Layoutet beregnes ALTID ud fra det FULDE datasæt — æra/hjul-filtre dæmper
	// (opacity) i stedet for at fjerne stationer, så man aldrig rammer et tomt
	// kort ved en snæver kombination (fx "Privatisation"-æraen). Genbruger samme
	// dæmpnings-mekanik som tidslinje-slideren nedenfor (isStationVisible).
	const layout = $derived.by(() => {
		const stations = mapClassesToStations(classes, eras, displayName ?? ((c) => c.name));
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

		// Zoom-to-fit: vis HELE netværket (bredde OG højde, centreret) ved indlæsning
		// i stedet for et tilfældigt udsnit i øverste venstre hjørne — Ronnis feedback
		// 2026-07-07 var at kortet var svært at finde rundt i; at se hele billedet
		// først er det mest grundlæggende skridt mod at gøre det begribeligt.
		const { initialK, initialX, initialY } = untrack(() => {
			const cw = container.clientWidth || 800;
			const ch = container.clientHeight || 600;
			const k = Math.max(
				0.15,
				Math.min(1, Math.min(cw / (layout.width || 1), ch / (layout.height || 1)) * 0.92)
			);
			return {
				initialK: k,
				initialX: (cw - layout.width * k) / 2,
				initialY: (ch - layout.height * k) / 2
			};
		});
		select(container).call(z.transform, zoomIdentity.translate(initialX, initialY).scale(initialK));

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

	// Datadrevne æra-ringe: radius for hver æra = den største afstand fra centrum
	// blandt alle stationer introduceret i denne æra ELLER en tidligere æra
	// (kumulativt, så ringene altid vokser monotont udad i kronologisk rækkefølge).
	// Erstatter de tidligere hardcodede cirkler, hvis danske labels og årstal ikke
	// matchede databasens reelle æra-grænser. Æraer uden nogen station (fx
	// Pre-Grouping på et rent diesel-site) udelades helt.
	const zoneRings = $derived.by(() => {
		const sorted = [...eras].sort((a, b) => a.sortIndex - b.sortIndex);
		let cumulativeRadius = 0;
		const rings: { era: Era; radius: number }[] = [];
		for (const era of sorted) {
			const radii = layout.stations
				.filter((s) => s.eraSlug === era.slug)
				.map((s) => Math.hypot(s.x - CENTER_X, s.y - CENTER_Y));
			if (radii.length === 0) continue;
			cumulativeRadius = Math.max(cumulativeRadius, ...radii) + 45;
			rings.push({ era, radius: cumulativeRadius });
		}
		return rings;
	});

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

	// Kombineret synligheds-tjek: en station er kun "fuldt synlig" (fuld opacity)
	// hvis den matcher BÅDE FilterOverlay's æra/hjul-filtre OG tidslinje-sliderens
	// aktive år. De to filtertyper holdes bevidst adskilt (matchesFieldFilters vs.
	// isStationActive), så et snævert årstal ikke fejlagtigt tæller med i
	// FilterOverlay's "N af M klasser matcher"-optælling.
	function matchesFieldFilters(station: LayoutStation): boolean {
		const cls = classById.get(station.id);
		if (!cls) return false;
		if (selectedEraId !== null && cls.eraId !== selectedEraId) return false;
		if (selectedWheelArrangement !== null && cls.wheelArrangement !== selectedWheelArrangement)
			return false;
		return true;
	}

	function isStationActive(
		station: { introYear: number; retiredYear: number | null },
		year: number
	) {
		return (
			year >= station.introYear && (station.retiredYear === null || year <= station.retiredYear)
		);
	}

	function isStationVisible(station: LayoutStation, year: number): boolean {
		if (!matchesFieldFilters(station)) return false;
		if (!timeMachineOn) return true;
		return isStationActive(station, year);
	}

	function isPathVisible(traction: Traction, year: number) {
		return layout.stations.some((s) => s.traction === traction && isStationVisible(s, year));
	}

	// Scatterplot Helper: Parse Spec Values. Spec-tekster indeholder ofte FLERE tal
	// (fx "90 mph (145 km/h)" eller "Engine: 2,500 bhp (1,864 kW) At rail: 2,000 hp
	// (1,491 kW)") — at strippe alt undtagen cifre/punktum og parse hele resten
	// concatenerer tallene til meningsløse størrelser (fx "90 mph (145 km/h)" blev
	// til 90145). Match i stedet det FØRSTE tal der reelt står lige før enheden.
	function getSpecValue(c: LocomotiveClass, key: string): number | null {
		const spec = c.specs.find((s) => s.key === key);
		if (!spec) return null;
		const unit = key === 'Top Speed' ? 'mph' : 'b?hp';
		const match = spec.value.match(new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*${unit}\\b`, 'i'));
		if (!match) return null;
		const parsed = parseFloat(match[1].replace(/,/g, ''));
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
		e: MouseEvent | FocusEvent,
		item: { class: LocomotiveClass; hp: number; speed: number }
	) {
		const rect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
		const clientX = 'clientX' in e ? e.clientX : rect ? rect.left + rect.width / 2 : 0;
		const clientY = 'clientY' in e ? e.clientY : rect ? rect.top : 0;
		if (!rect) return;
		tooltipData = {
			name: item.class.name,
			hp: item.hp,
			speed: item.speed,
			x: clientX - rect.left + 15,
			y: clientY - rect.top - 15
		};
	}
	function handleMouseOut() {
		tooltipData = null;
	}
</script>

<!-- View Selector Header inside component container -->
<div
	class="flex items-center justify-between border-b px-6 py-3"
	style="border-color: var(--map-zone); background: var(--map-bg);"
>
	<div class="flex gap-2">
		<button
			class="rounded-md px-4 py-2 text-xs font-semibold transition-all {activeTab === 'map'
				? 'text-white'
				: ''}"
			style={activeTab === 'map'
				? 'background: var(--tfl-blue);'
				: 'background: var(--map-zone); color: var(--map-ink-soft);'}
			onclick={() => (activeTab = 'map')}
		>
			🚇 Regional Metro Map
		</button>
		<button
			class="rounded-md px-4 py-2 text-xs font-semibold transition-all {activeTab === 'chart'
				? 'text-white'
				: ''}"
			style={activeTab === 'chart'
				? 'background: var(--tfl-blue);'
				: 'background: var(--map-zone); color: var(--map-ink-soft);'}
			onclick={() => (activeTab = 'chart')}
		>
			📊 Power vs. Speed
		</button>
	</div>
</div>

<div class="relative flex flex-1 flex-col">
	{#if activeTab === 'map'}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
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
					<!-- Æra-ringe: radius og label er beregnet ud fra de faktiske stationer -->
					{#each zoneRings as ring (ring.era.slug)}
						<circle
							cx={CENTER_X}
							cy={CENTER_Y}
							r={ring.radius}
							class="fill-none"
							stroke="var(--map-zone)"
							stroke-width="1.5"
							stroke-dasharray="4 6"
						/>
						<text
							x={CENTER_X}
							y={CENTER_Y - ring.radius - 10}
							class="pointer-events-none font-bold select-none"
							style="fill: var(--map-ink-soft); font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.04em;"
							text-anchor="middle"
							>{ring.era.name.toUpperCase()} ({ring.era.startYear}–{ring.era.endYear ??
								'present'})</text
						>
					{/each}

					<!-- Regional Lines paths -->
					{#each layout.paths as path (path.traction)}
						<path
							d={path.d}
							stroke={lineColorVar(path.traction)}
							stroke-width={GEOMETRY.lineWidthMap}
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
							class="transition-opacity duration-300 {isPathVisible(path.traction, selectedYear)
								? ''
								: 'opacity-15'}"
						/>
					{/each}

					<!-- Stations nodes -->
					{#each visibleStations as station (station.id)}
						<g
							class="transition-opacity duration-300 {isStationVisible(station, selectedYear)
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

			<!-- Onboarding hint: adresserer direkte "svært at se hvor man skal klikke" —
			     station-hover-halo (StationIcon.svelte) er det primære signal, denne
			     korte tekst er backup for dem der ikke opdager det ved et tilfælde. -->
			<div
				class="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium whitespace-nowrap shadow-sm"
				style="background: var(--map-bg); border-color: var(--map-zone); color: var(--map-ink-soft);"
			>
				👆 Click any station to explore that class · scroll to zoom · drag to pan
			</div>

			<!-- Legend -->
			<div
				class="absolute top-16 left-4 z-20 flex flex-col gap-3 rounded-lg border px-4 py-3 shadow-md"
				style="font-family: var(--font-ui); background: var(--map-bg); border-color: var(--map-zone);"
			>
				<div class="flex flex-col gap-1.5">
					{#each lineList as traction (traction)}
						<div class="flex items-center gap-2">
							<span class="h-1 w-6 rounded-full" style="background: {lineColorVar(traction)};"
							></span>
							<span class="text-xs font-semibold" style="color: var(--map-ink);"
								>{LINE_NAMES[traction]}</span
							>
						</div>
					{/each}
				</div>

				<!-- Station-ikonnøgle: forklarer de 4 stationstyper, som ellers ikke er
				     selvforklarende (Ronnis feedback 2026-07-07). -->
				<div class="flex flex-col gap-1.5 border-t pt-2.5" style="border-color: var(--map-zone);">
					<div class="flex items-center gap-2.5">
						<svg width="16" height="16" viewBox="-8 -8 16 16" class="flex-shrink-0">
							<line x1="0" y1="-6" x2="0" y2="6" stroke="var(--map-ink-soft)" stroke-width="3" />
						</svg>
						<span class="text-[11px]" style="color: var(--map-ink-soft);">Class</span>
					</div>
					<div class="flex items-center gap-2.5">
						<svg width="16" height="16" viewBox="-8 -8 16 16" class="flex-shrink-0">
							<circle r="6" fill="var(--map-bg)" stroke="var(--map-ink)" stroke-width="2" />
							<circle
								r="3.5"
								fill="var(--map-bg)"
								stroke="var(--map-ink-soft)"
								stroke-width="1.5"
							/>
						</svg>
						<span class="text-[11px]" style="color: var(--map-ink-soft);">Landmark class</span>
					</div>
					<div class="flex items-center gap-2.5">
						<svg width="16" height="16" viewBox="-8 -8 16 16" class="flex-shrink-0">
							<circle r="6" fill="var(--map-bg)" stroke="var(--map-ink)" stroke-width="2" />
							<circle r="2" fill="var(--map-ink)" />
						</svg>
						<span class="text-[11px]" style="color: var(--map-ink-soft);">Multi-region class</span>
					</div>
					<div class="flex items-center gap-2.5">
						<svg width="16" height="16" viewBox="-8 -8 16 16" class="flex-shrink-0">
							<rect x="-2" y="-6" width="4" height="12" fill="var(--map-ink-soft)" />
						</svg>
						<span class="text-[11px]" style="color: var(--map-ink-soft);"
							>Withdrawn (year shown)</span
						>
					</div>
				</div>
			</div>

			<!-- Minimap -->
			<div class="absolute right-4 bottom-4 z-20 shadow-md">
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
					class="absolute top-4 right-4 z-20 flex flex-col gap-1 rounded-md border px-3 py-2 font-mono text-[10px] tracking-wide shadow-md"
					style="background: var(--map-bg); border-color: var(--map-zone); color: var(--map-ink-soft);"
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
						<span>Stations:</span>
						<span class="font-semibold tabular-nums"
							>{visibleStations.length} / {layout.stations.length}</span
						>
					</div>
				</div>
			{/if}
		</div>

		<!-- Time Machine: FRA som standard (opt-in), så kortets standardtilstand kun
		     har ÉN dæmpnings-kilde (æra/hjul-filtre). Ronnis feedback 2026-07-07: den
		     tidligere altid-synlige "Active year"-slider var ikke til at gennemskue
		     formålet med, og dæmpede oveni filtrenes egen dæmpning.
		     Z-lagdelingsorden: kort-overlays z-10/z-20 < backdrop z-30 < placard z-40.
		     Baren skal KUN ligge over SVG'en, aldrig over draweren (F9.0a-fix). -->
		<div
			class="z-10 border-t px-6 py-3"
			style="border-color: var(--map-zone); background: var(--map-bg);"
		>
			<button
				class="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
				style={timeMachineOn
					? 'background: var(--tfl-blue); border-color: var(--tfl-blue); color: white;'
					: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
				onclick={() => (timeMachineOn = !timeMachineOn)}
				aria-pressed={timeMachineOn}
			>
				🕐 Time Machine {timeMachineOn ? 'on' : 'off'}
			</button>

			{#if timeMachineOn}
				<div class="mt-3 flex items-center gap-6">
					<p class="max-w-[220px] text-xs leading-snug" style="color: var(--map-ink-soft);">
						Showing the network as it looked in
						<span class="text-base font-bold" style="color: var(--tfl-blue);">{selectedYear}</span> —
						classes not yet introduced or already withdrawn are faded out.
					</p>
					<div class="relative flex flex-1 flex-col">
						<input
							type="range"
							min="1948"
							max="2026"
							bind:value={selectedYear}
							class="h-1.5 w-full cursor-pointer rounded-full outline-none"
							style="background: var(--map-zone); accent-color: var(--tfl-blue);"
						/>
						<div
							class="mt-2 flex w-full justify-between text-[10px] font-semibold"
							style="color: var(--map-ink-soft);"
						>
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
				<p class="mt-1.5 text-[11px]" style="color: var(--map-ink-soft);">
					See which classes existed in any given year.
				</p>
			{/if}
		</div>
	{:else}
		<!-- Scatterplot Panel -->
		<div class="flex flex-1 flex-col overflow-y-auto p-8" style="background: var(--map-zone);">
			<div class="mb-6">
				<h2 class="text-xl font-bold" style="color: var(--map-ink);">Power vs. Top Speed</h2>
				<p class="mt-1 text-xs" style="color: var(--map-ink-soft);">
					Compare specifications across the {classes.length} British diesel classes in the database.
				</p>
			</div>
			<div
				class="relative min-h-[400px] flex-1 rounded-xl border p-6 shadow-sm"
				style="background: var(--map-bg); border-color: var(--map-zone);"
			>
				<!-- Chart Tooltip -->
				{#if tooltipData}
					<div
						class="pointer-events-none absolute z-[100] rounded-md border px-3 py-2 text-xs text-white shadow-md"
						style="left: {tooltipData.x}px; top: {tooltipData.y}px; background: var(--map-ink); border-color: var(--map-ink);"
					>
						<strong>{tooltipData.name}</strong><br />
						Power: {tooltipData.hp} hp<br />
						Speed: {tooltipData.speed} mph
					</div>
				{/if}

				<!-- Scatterplot SVG -->
				<svg class="h-full w-full" viewBox="0 0 800 400">
					<!-- Grid lines -->
					<line x1="80" y1="350" x2="750" y2="350" stroke="var(--map-zone)" stroke-width="1" />
					<line x1="80" y1="50" x2="80" y2="350" stroke="var(--map-zone)" stroke-width="1" />

					<!-- X Axis Labels (0 to 150 mph) -->
					{#each [0, 25, 50, 75, 100, 125, 150] as speed (speed)}
						{@const cx = 80 + (speed / 150) * 670}
						<text
							x={cx}
							y="370"
							style="font-size: 10px; font-weight: 600; fill: var(--map-ink-soft);"
							text-anchor="middle">{speed} mph</text
						>
					{/each}
					<text
						x="415"
						y="390"
						style="font-size: 12px; font-weight: 700; fill: var(--map-ink-soft);"
						text-anchor="middle">TOP SPEED (MPH)</text
					>

					<!-- Y Axis Labels (0 to 3500 hp) -->
					{#each [0, 500, 1000, 1500, 2000, 2500, 3000, 3500] as hp (hp)}
						{@const cy = 350 - (hp / 3500) * 300}
						<text
							x="70"
							y={cy + 4}
							style="font-size: 10px; font-weight: 600; fill: var(--map-ink-soft);"
							text-anchor="end">{hp} hp</text
						>
					{/each}
					<text
						x="25"
						y="200"
						style="font-size: 12px; font-weight: 700; fill: var(--map-ink-soft);"
						text-anchor="middle"
						transform="rotate(-90 25 200)">POWER OUTPUT (HP)</text
					>

					<!-- Dots for each class -->
					{#each scatterplotData as item (item.class.id)}
						{@const cx = 80 + (Math.min(150, item.speed) / 150) * 670}
						{@const cy = 350 - (Math.min(3500, item.hp) / 3500) * 300}
						{@const layoutItem = dieselLayout.find((li) => li.qid === item.class.wikidataQid)}
						{@const primaryRegion = (item.class.regions[0] ??
							(layoutItem ? layoutItem.regions[0] : 'MIDLAND')) as Traction}

						<circle
							{cx}
							{cy}
							r={item.class.isLandmark ? 8 : 6}
							fill={lineColorVar(primaryRegion)}
							class="cursor-pointer fill-opacity-80 transition-all hover:fill-opacity-100"
							style="stroke: var(--map-ink); stroke-width: 1.5px;"
							role="button"
							tabindex="0"
							aria-label="{item.class.name} — {item.hp} hp, {item.speed} mph"
							onmouseover={(e) => handleMouseOver(e, item)}
							onmouseout={handleMouseOut}
							onfocus={(e) => handleMouseOver(e, item)}
							onblur={handleMouseOut}
							onclick={() => {
								selectStation(String(item.class.id));
								activeTab = 'map';
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selectStation(String(item.class.id));
									activeTab = 'map';
								}
							}}
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>
