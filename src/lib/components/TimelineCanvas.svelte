<script lang="ts">
	import { dev } from '$app/environment';
	import type { Era, LocomotiveClass, TractionType } from '$lib/types.js';
	import { select } from 'd3-selection';
	import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
	import { gsap } from 'gsap';
	import { Flip } from 'gsap/Flip';

	if (typeof window !== 'undefined') {
		gsap.registerPlugin(Flip);
	}

	let {
		classes,
		eras,
		selectedClass = $bindable(null),
		selectedTraction = null,
		selectedEraId = null,
		selectedWheelArrangement = null
	} = $props<{
		classes: LocomotiveClass[];
		eras: Era[];
		selectedClass: LocomotiveClass | null;
		selectedTraction: TractionType | null;
		selectedEraId: number | null;
		selectedWheelArrangement: string | null;
	}>();

	// Timeline constants
	const START_YEAR = 1825;
	const END_YEAR = 2030;
	const CANVAS_WIDTH = 8000;
	const SUB_TRACK_HEIGHT = 110;
	const TRACK_GAP = 50;
	const NODE_CANVAS_WIDTH = 270;

	// Elements and layout state
	let zoomContainer = $state<HTMLDivElement | null>(null);
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);
	let transform = $state({ x: 0, y: 0, k: 0.8 });

	// FPS stats overlay
	let fps = $state(0);
	let frameTimes: number[] = [];
	let lastFrameTime = typeof window !== 'undefined' ? performance.now() : 0;

	$effect(() => {
		let active = true;
		let lastUpdate = performance.now();
		function tickFps() {
			if (!active) return;
			const now = performance.now();
			const dt = now - lastFrameTime;
			lastFrameTime = now;
			frameTimes.push(dt);
			if (frameTimes.length > 60) {
				frameTimes.shift();
			}
			if (now - lastUpdate > 500) {
				const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
				fps = Math.round(1000 / avg);
				lastUpdate = now;
			}
			requestAnimationFrame(tickFps);
		}
		requestAnimationFrame(tickFps);
		return () => {
			active = false;
		};
	});

	// Setup D3 Zoom
	$effect(() => {
		if (!zoomContainer) return;
		const container = zoomContainer;

		const z = d3Zoom<HTMLDivElement, unknown>()
			.scaleExtent([0.15, 4.0])
			.translateExtent([
				[-1000, -500],
				[CANVAS_WIDTH + 1000, 4000]
			])
			.on('zoom', (event) => {
				transform = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k
				};
			});

		select(container).call(z);

		// Initial transform: åbn på et tæt befolket årti (1870'erne) frem for det
		// næsten tomme 1825-hjørne, så første indtryk viser faktisk indhold.
		const initialK = container.clientWidth && container.clientWidth > 800 ? 0.7 : 0.4;
		const initialX = 60 - yearToX(1868) * initialK;

		select(container).call(z.transform, zoomIdentity.translate(initialX, 60).scale(initialK));
	});

	// Helper: Determine year for sorting and plotting
	function getLocoYear(loco: LocomotiveClass): number {
		if (loco.buildStart !== null) return loco.buildStart;
		if (loco.serviceEntry) {
			const d = new Date(loco.serviceEntry);
			if (!isNaN(d.getTime())) {
				return d.getFullYear();
			}
		}
		return START_YEAR;
	}

	// Helper: Interpolate year to X coordinate
	function yearToX(year: number): number {
		const clamped = Math.max(START_YEAR, Math.min(END_YEAR, year));
		return ((clamped - START_YEAR) / (END_YEAR - START_YEAR)) * CANVAS_WIDTH;
	}

	// Helper: Get color code for traction type
	function getTractionColor(traction: string): string {
		switch (traction) {
			case 'STEAM':
				return 'var(--color-accent-steam)';
			case 'DIESEL':
				return 'var(--color-accent-diesel)';
			case 'ELECTRIC':
				return 'var(--color-accent-electric)';
			default:
				return 'var(--color-accent-other)';
		}
	}

	// Helper: Check if a class is an electro-diesel / dual traction
	function isDualTraction(loco: LocomotiveClass): boolean {
		const text = (loco.narrative || '').toLowerCase();
		const name = (loco.name || '').toLowerCase();
		return (
			text.includes('electro-diesel') ||
			text.includes('bi-mode') ||
			name.includes('class 73') ||
			name.includes('class 74') ||
			name.includes('class 88')
		);
	}

	// Helper: Classic London Underground Harry Beck style line rendering (45 degree bends)
	function getTubePath(x1: number, y1: number, x2: number, y2: number): string {
		const dx = x2 - x1;
		const dy = y2 - y1;
		if (dy === 0) {
			return `L ${x2} ${y2}`;
		}
		const absDy = Math.abs(dy);
		if (dx > absDy) {
			const xMid = x1 + (dx - absDy) / 2;
			const xBendEnd = xMid + absDy;
			return `L ${xMid} ${y1} L ${xBendEnd} ${y2} L ${x2} ${y2}`;
		} else {
			const xMid = (x1 + x2) / 2;
			const halfDx = dx / 2;
			const yMid = y1 + Math.sign(dy) * halfDx;
			return `L ${xMid} ${yMid} L ${x2} ${y2}`;
		}
	}

	// Reactive derived list of filtered classes
	const filteredClasses = $derived.by(() => {
		return classes.filter((c: LocomotiveClass) => {
			if (selectedEraId !== null && c.eraId !== selectedEraId) return false;
			if (selectedTraction !== null && c.traction !== selectedTraction) return false;
			if (selectedWheelArrangement !== null && c.wheelArrangement !== selectedWheelArrangement)
				return false;
			return true;
		});
	});

	// Reactive layout calculation
	interface TimelineNode {
		classData: LocomotiveClass;
		x: number;
		y: number;
		trackIndex: number;
	}

	interface EraLayout {
		era: Era;
		startY: number;
		trackHeight: number;
		nodes: TimelineNode[];
		lines: { traction: TractionType; path: string; color: string }[];
		tractionBaseYs: Record<TractionType, number>;
	}

	const eraLayouts = $derived.by<EraLayout[]>(() => {
		let currentY = 180;
		return eras.map((era: Era) => {
			const eraClasses = filteredClasses.filter((c: LocomotiveClass) => c.eraId === era.id);
			const tractions: TractionType[] = ['STEAM', 'DIESEL', 'ELECTRIC', 'OTHER'];

			const nodes: TimelineNode[] = [];
			const lines: { traction: TractionType; path: string; color: string }[] = [];
			const tractionBaseYs: Record<TractionType, number> = {
				STEAM: 0,
				DIESEL: 0,
				ELECTRIC: 0,
				OTHER: 0
			};

			const eraStartY = currentY;

			tractions.forEach((traction: TractionType) => {
				const tClasses = eraClasses.filter((c: LocomotiveClass) => c.traction === traction);
				if (tClasses.length === 0) return;

				const sorted = [...tClasses].sort((a, b) => getLocoYear(a) - getLocoYear(b));
				const subTracks: number[] = [];

				tractionBaseYs[traction] = currentY;

				const tNodes = sorted.map((c: LocomotiveClass) => {
					const x = yearToX(getLocoYear(c));
					const left = x;
					const right = x + NODE_CANVAS_WIDTH;

					let trackIndex = 0;
					while (true) {
						if (trackIndex >= subTracks.length) {
							subTracks.push(right);
							break;
						} else if (subTracks[trackIndex] < left) {
							subTracks[trackIndex] = right;
							break;
						}
						trackIndex++;
					}

					return {
						classData: c,
						x,
						y: currentY + trackIndex * SUB_TRACK_HEIGHT,
						trackIndex
					};
				});

				// Create the London Underground route path
				let path = '';
				if (tNodes.length > 0) {
					path += `M ${tNodes[0].x} ${tNodes[0].y}`;
					for (let i = 1; i < tNodes.length; i++) {
						path += ' ' + getTubePath(tNodes[i - 1].x, tNodes[i - 1].y, tNodes[i].x, tNodes[i].y);
					}
				}

				lines.push({
					traction,
					path,
					color: getTractionColor(traction)
				});

				nodes.push(...tNodes);

				const tractionHeight = Math.max(1, subTracks.length) * SUB_TRACK_HEIGHT;
				currentY += tractionHeight + TRACK_GAP;
			});

			const trackHeight = currentY - eraStartY;
			// Separation gap between eras
			currentY += 120;

			return {
				era,
				startY: eraStartY,
				trackHeight,
				nodes,
				lines,
				tractionBaseYs
			};
		});
	});

	// Get dimensions and list of all items for virtual culling
	const allNodes = $derived(eraLayouts.flatMap((el) => el.nodes));
	const allLines = $derived(eraLayouts.flatMap((el) => el.lines));

	const CANVAS_HEIGHT = $derived(
		Math.max(...eraLayouts.map((el) => el.startY + el.trackHeight), 800) + 200
	);

	// Virtualization Culling: display nodes only when they are visible in the viewport (+ margin)
	const viewMargin = 300;
	const visibleNodes = $derived.by(() => {
		const k = transform.k;
		const left = -transform.x / k - viewMargin;
		const right = (viewportWidth - transform.x) / k + viewMargin;
		const top = -transform.y / k - viewMargin;
		const bottom = (viewportHeight - transform.y) / k + viewMargin;

		return allNodes.filter((n: TimelineNode) => {
			return (
				n.x >= left &&
				n.x <= right + NODE_CANVAS_WIDTH &&
				n.y >= top &&
				n.y <= bottom + SUB_TRACK_HEIGHT
			);
		});
	});

	// GSAP Flip animation setup for filters
	let flipState = $state<unknown>(null);
	const filterKey = $derived(JSON.stringify(filteredClasses.map((c: LocomotiveClass) => c.id)));
	let isInitial = $state(true);

	$effect.pre(() => {
		if (filterKey && typeof window !== 'undefined' && !isInitial) {
			flipState = Flip.getState('.timeline-node', { props: 'opacity' });
		}
	});

	$effect(() => {
		if (filterKey && typeof window !== 'undefined') {
			if (isInitial) {
				isInitial = false;
				return;
			}
			if (flipState) {
				const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				if (!prefersReduced) {
					Flip.from(flipState as Parameters<typeof Flip.from>[0], {
						duration: 0.6,
						ease: 'power2.out',
						stagger: 0.005
					});
				}
			}
		}
	});

	// Year ticks for background grid
	const yearTicks = $derived.by(() => {
		const ticks = [];
		for (let y = START_YEAR; y <= END_YEAR; y += 10) {
			ticks.push({
				year: y,
				x: yearToX(y)
			});
		}
		return ticks;
	});

	// Get other traction level for dual traction (interchange) linking
	function getInterchangeLink(node: TimelineNode, eraLayout: EraLayout) {
		if (!isDualTraction(node.classData)) return null;

		const currentTraction = node.classData.traction;
		const otherTraction =
			currentTraction === 'DIESEL' ? 'ELECTRIC' : currentTraction === 'ELECTRIC' ? 'DIESEL' : null;

		if (!otherTraction) return null;

		const otherBaseY = eraLayout.tractionBaseYs[otherTraction];
		if (!otherBaseY) return null;

		return {
			y1: node.y,
			y2: otherBaseY
		};
	}
</script>

<div
	bind:this={zoomContainer}
	bind:clientWidth={viewportWidth}
	bind:clientHeight={viewportHeight}
	class="relative w-full h-full overflow-hidden select-none bg-[var(--color-bg-base)]"
>
	<!-- Zoomable / Pannable Workspace -->
	<div
		class="absolute origin-top-left will-change-transform"
		style="transform: translate3d({transform.x}px, {transform.y}px, 0) scale({transform.k}); width: {CANVAS_WIDTH}px; height: {CANVAS_HEIGHT}px;"
	>
		<!-- SVG Background Graphics (Grid Lines, Era Bands, Tube Routes) -->
		<svg
			width={CANVAS_WIDTH}
			height={CANVAS_HEIGHT}
			class="absolute inset-0 pointer-events-none"
			style="stroke-linejoin: round;"
		>
			<defs>
				<!-- Tube Map Neon Glow Filter -->
				<filter id="tube-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="5" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<!-- Year Grid Lines -->
			{#each yearTicks as tick (tick.year)}
				<line
					x1={tick.x}
					y1={50}
					x2={tick.x}
					y2={CANVAS_HEIGHT - 50}
					stroke="var(--color-border-subtle)"
					stroke-width="1.5"
					stroke-dasharray="8 8"
				/>
				<text
					x={tick.x + 8}
					y={90}
					class="font-mono text-xs font-bold tracking-wider tabular-nums fill-current text-[var(--color-text-muted)] opacity-70"
				>
					{tick.year}
				</text>
			{/each}

			<!-- Era background stripes & visual markers -->
			{#each eraLayouts as layout (layout.era.id)}
				{@const endYr = layout.era.endYear ?? 2030}
				{@const eraX = yearToX(layout.era.startYear)}
				{@const eraW = yearToX(endYr) - eraX}
				<rect
					x={eraX}
					y={layout.startY - 30}
					width={eraW}
					height={layout.trackHeight + 60}
					fill="rgba(22, 28, 34, 0.2)"
					stroke="var(--color-border-subtle)"
					stroke-width="1.5"
					rx="12"
				/>
				<!-- Era Large Floating Name Label -->
				<text
					x={eraX + 24}
					y={layout.startY + 15}
					class="font-display font-bold uppercase tracking-widest text-4xl fill-current text-[var(--color-text-secondary)] opacity-40 pointer-events-none"
				>
					{layout.era.name}
				</text>
				<text
					x={eraX + 24}
					y={layout.startY + 45}
					class="font-mono text-sm tracking-widest tabular-nums fill-current text-[var(--color-text-muted)] opacity-50 pointer-events-none"
				>
					{layout.era.startYear} — {layout.era.endYear ? layout.era.endYear : 'PRESENT'}
				</text>

				<!-- Interchange lines for electro-diesel and other multi-mode stations -->
				{#each layout.nodes as node (node.classData.id)}
					{@const link = getInterchangeLink(node, layout)}
					{#if link}
						<line
							x1={node.x}
							y1={link.y1}
							x2={node.x}
							y2={link.y2}
							stroke="var(--color-text-muted)"
							stroke-width="4"
							stroke-dasharray="6 6"
							opacity="0.6"
						/>
						<!-- Interchange ring capsule background -->
						<rect
							x={node.x - 10}
							y={Math.min(link.y1, link.y2)}
							width="20"
							height={Math.abs(link.y1 - link.y2)}
							rx="10"
							fill="none"
							stroke="var(--color-text-primary)"
							stroke-width="2.5"
							opacity="0.3"
						/>
					{/if}
				{/each}
			{/each}

			<!-- London Underground styled Tube Route Paths -->
			{#each allLines as line, index (line.traction + '-' + index)}
				<path
					d={line.path}
					stroke={line.color}
					stroke-width="7"
					fill="none"
					stroke-linecap="round"
					filter="url(#tube-glow)"
					opacity="0.8"
				/>
			{/each}
		</svg>

		<!-- HTML Interactive Stations Overlay (Level of Detail Rendered) -->
		<div class="absolute inset-0 pointer-events-none">
			{#each visibleNodes as node (node.classData.id)}
				{@const isSelected = selectedClass?.id === node.classData.id}
				{@const tractionColor = getTractionColor(node.classData.traction)}

				<!-- Level of Detail: 3 tiers based on zoom factor `transform.k` -->

				{#if transform.k < 0.6}
					<!-- 1. Miniature Dot mode (low zoom) -->
					<button
						onclick={() => (selectedClass = node.classData)}
						aria-label={node.classData.name}
						class="absolute timeline-node pointer-events-auto w-3 h-3 rounded-full hover:scale-150"
						style="
              left: {node.x - 6}px;
              top: {node.y - 6}px;
              background-color: {tractionColor};
              border: 1.5px solid var(--color-text-primary);
              box-shadow: 0 0 6px {tractionColor};
            "
					></button>
				{:else if transform.k >= 0.6 && transform.k < 1.5}
					<!-- 2. Medium Zoom Station Mode (Circle station + Angled London Underground text label) -->
					<div
						class="absolute timeline-node pointer-events-auto flex items-center"
						style="left: {node.x - 12}px; top: {node.y - 12}px;"
					>
						<button
							onclick={() => (selectedClass = node.classData)}
							class="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-125"
							style="
                background-color: var(--color-bg-surface);
                border: 3.5px solid {tractionColor};
                box-shadow: 0 0 8px {tractionColor}, {isSelected
								? '0 0 0 4px var(--color-text-primary)'
								: 'none'};
              "
						>
							{#if isDualTraction(node.classData)}
								<div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
							{/if}
						</button>

						<!-- Angled 45-degree labels -->
						<button
							onclick={() => (selectedClass = node.classData)}
							class="absolute whitespace-nowrap text-[11px] font-bold tracking-wide uppercase transition-all duration-200 text-left"
							style="
                left: 18px;
                top: -12px;
                transform: rotate(-35deg);
                transform-origin: left bottom;
                color: {isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};
                text-shadow: 0 2px 4px rgba(0,0,0,0.8);
              "
						>
							{node.classData.name}
						</button>
					</div>
				{:else}
					<!-- 3. High Zoom Rich Card Mode -->
					<button
						onclick={() => (selectedClass = node.classData)}
						class="absolute timeline-node pointer-events-auto flex flex-row items-stretch p-3.5 rounded-xl border text-left hover:scale-[1.03] group"
						style="
              left: {node.x}px;
              top: {node.y - 55}px;
              width: 250px;
              height: 110px;
              background: var(--glass-bg);
              backdrop-filter: var(--glass-blur);
              border-color: {isSelected
							? 'var(--color-text-primary)'
							: 'var(--color-border-subtle)'};
              border-left: 5px solid {tractionColor};
              box-shadow: {isSelected
							? `0 0 25px rgba(255, 255, 255, 0.2), var(--shadow-museum)`
							: `var(--shadow-subtle)`};
            "
					>
						<!-- Station Connection Ticks / Dot on the edge -->
						<div
							class="absolute w-3 h-3 rounded-full -left-[9px] top-[calc(50%-6px)] border-2 border-white"
							style="background-color: {tractionColor};"
						></div>

						<!-- Card text info -->
						<div class="flex-1 flex flex-col justify-between overflow-hidden pr-2">
							<div>
								<div class="flex items-center gap-1.5">
									<h4
										class="font-display text-sm font-bold truncate leading-tight group-hover:text-[var(--color-text-primary)] transition-colors"
										style="color: {isSelected
											? 'var(--color-text-primary)'
											: 'var(--color-text-secondary)'}"
									>
										{node.classData.name}
									</h4>
									{#if isDualTraction(node.classData)}
										<span
											class="text-[9px] font-bold font-sans px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded uppercase tracking-tighter"
											>Bi-mode</span
										>
									{/if}
								</div>
								{#if node.classData.nickname}
									<p class="text-[10px] font-mono text-[var(--color-text-muted)] italic truncate">
										"{node.classData.nickname}"
									</p>
								{/if}
							</div>

							<div class="text-[10px] font-mono leading-relaxed text-[var(--color-text-secondary)]">
								<div class="flex justify-between">
									<span>Built:</span>
									<span class="tabular-nums font-semibold">{node.classData.buildStart ?? '—'}</span>
								</div>
								<div class="flex justify-between">
									<span>Total:</span>
									<span class="tabular-nums font-semibold">{node.classData.totalBuilt ?? '—'}</span>
								</div>
							</div>
						</div>

						<!-- Small Image Thumbnail on Card side -->
						{#if node.classData.media && node.classData.media.length > 0}
							<div class="w-16 flex-shrink-0 relative overflow-hidden rounded-md bg-neutral-900/40">
								<img
									src="/{node.classData.media[0].localPath}"
									alt=""
									class="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
									loading="lazy"
								/>
							</div>
						{/if}
					</button>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Top right developer stats HUD panel (FPS & Stats Counter) — kun i dev-mode -->
	{#if dev}
		<div
			class="absolute top-4 right-4 z-10 font-mono text-[10px] tracking-wide text-[var(--color-text-secondary)] bg-slate-950/80 border border-white/10 px-3 py-2 rounded-md shadow-2xl flex flex-col gap-1 backdrop-blur-sm pointer-events-none"
		>
			<div class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span class="font-bold">DEV DIAGNOSTICS</span>
			</div>
			<div class="h-px bg-white/10 my-1"></div>
			<div class="flex justify-between gap-4">
				<span>Render Performance:</span>
				<span class="font-semibold tabular-nums {fps < 50 ? 'text-red-400' : 'text-emerald-400'}"
					>{fps} FPS</span
				>
			</div>
			<div class="flex justify-between gap-4">
				<span>Zoom Scale (k):</span>
				<span class="font-semibold tabular-nums text-cyan-400">{transform.k.toFixed(2)}x</span>
			</div>
			<div class="flex justify-between gap-4">
				<span>Visible Stations:</span>
				<span class="font-semibold tabular-nums text-amber-400"
					>{visibleNodes.length} / {allNodes.length}</span
				>
			</div>
		</div>
	{/if}
</div>
