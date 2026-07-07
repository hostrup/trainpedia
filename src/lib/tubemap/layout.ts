import { dieselLayout } from './dieselLayout.js';

export const LINE_ORDER = ['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'] as const;
export type Traction = (typeof LINE_ORDER)[number];

export const GEOMETRY = {
	stationGap: 140,
	lineGap: 80,
	lineWidthMap: 7,
	lineWidthDiagram: 5,
	cornerRadiusFactor: 1.5,
	landmarkRingRadius: 8,
	landmarkRingStroke: 3.5,
	interchangeCapsuleStroke: 3,
	tickLength: 12,
	terminusBarWidth: 8,
	terminusBarHeight: 28,
	marginX: 60,
	marginY: 60,
	zoneMargin: 40,
	levelStep: 20,
	levelPattern: [0, 1, 0, -1] as const
} as const;

export interface StationInput {
	id: string;
	wikidataQid?: string;
	name: string;
	traction: string; // Database traction er altid DIESEL
	introYear: number;
	retiredYear: number | null;
	isLandmark: boolean;
	regions: string[]; // BR-region(er) — DB-felt, eneste kilde til linje-tilhørsforhold
	eraSlug: string;
	interchangeWith: string | null;
}

export interface LayoutOptions {
	stationGap?: number;
	lineGap?: number;
	marginX?: number;
	marginY?: number;
	zoneMargin?: number;
	mode?: '2d' | '1d';
	eraOrder?: string[];
}

export type StationType = 'tick' | 'landmark' | 'interchange' | 'terminus';

export interface LayoutStation {
	id: string;
	wikidataQid?: string;
	name: string;
	traction: Traction;
	x: number;
	y: number;
	introYear: number;
	retiredYear: number | null;
	isLandmark: boolean;
	stationType: StationType;
	labelSide: 'above' | 'below' | 'left' | 'right';
	eraSlug: string;
	interchangeWith: Traction | null;
	interchangeY: number | null;
}

export interface LayoutPath {
	traction: Traction;
	y: number;
	x0: number;
	x1: number;
	d: string;
}

export interface LayoutZone {
	eraSlug: string;
	xStart: number;
	xEnd: number;
}

export interface LayoutInterchange {
	id: string;
	x: number;
	yA: number;
	yB: number;
	tractionA: Traction;
	tractionB: Traction;
}

export interface LayoutResult {
	stations: LayoutStation[];
	paths: LayoutPath[];
	zones: LayoutZone[];
	interchanges: LayoutInterchange[];
	width: number;
	height: number;
}

function buildBeckPath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return '';
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length; i++) {
		const A = points[i - 1];
		const B = points[i];
		const dx = B.x - A.x;
		const dy = B.y - A.y;
		if (dx === 0 && dy === 0) continue;

		if (Math.abs(dx) === Math.abs(dy)) {
			d += ` L ${B.x} ${B.y}`;
		} else if (Math.abs(dx) > Math.abs(dy)) {
			const cx = A.x + (dx - dy * Math.sign(dx) * Math.sign(dy));
			d += ` L ${cx} ${A.y} L ${B.x} ${B.y}`;
		} else {
			const cy = A.y + (dy - dx * Math.sign(dx) * Math.sign(dy));
			d += ` L ${A.x} ${cy} L ${B.x} ${B.y}`;
		}
	}
	return d;
}

function resolveEraOrder(input: StationInput[], explicitOrder?: string[]): string[] {
	if (explicitOrder) return explicitOrder;

	const eraMinIntro = new Map<string, number>();
	for (const s of input) {
		const current = eraMinIntro.get(s.eraSlug);
		if (current === undefined || s.introYear < current) eraMinIntro.set(s.eraSlug, s.introYear);
	}
	return [...eraMinIntro.keys()].sort((a, b) => eraMinIntro.get(a)! - eraMinIntro.get(b)!);
}

export function computeLayout(input: StationInput[], options: LayoutOptions = {}): LayoutResult {
	const stations: LayoutStation[] = [];
	const paths: LayoutPath[] = [];
	const mode = options.mode ?? '2d';

	if (mode === '1d') {
		const sorted = [...input].sort((a, b) => a.introYear - b.introYear);
		const stationGap = options.stationGap ?? GEOMETRY.stationGap;
		const marginX = options.marginX ?? GEOMETRY.marginX;
		const marginY = options.marginY ?? GEOMETRY.marginY;
		const points: { x: number; y: number }[] = [];

		sorted.forEach((s, index) => {
			const x = marginX + index * stationGap;
			const y = marginY;
			points.push({ x, y });

			stations.push({
				id: s.id,
				wikidataQid: s.wikidataQid,
				name: s.name,
				traction: s.traction as Traction,
				x,
				y,
				introYear: s.introYear,
				retiredYear: s.retiredYear,
				isLandmark: s.isLandmark,
				stationType: s.retiredYear !== null ? 'terminus' : s.isLandmark ? 'landmark' : 'tick',
				labelSide: index % 2 === 0 ? 'above' : 'below',
				eraSlug: s.eraSlug,
				interchangeWith: null,
				interchangeY: null
			});
		});

		const d =
			points.length > 0
				? `M ${points[0].x} ${points[0].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`
				: '';
		const primaryTraction = (input.length > 0 ? input[0].traction : 'MIDLAND') as Traction;

		paths.push({
			traction: primaryTraction,
			y: marginY,
			x0: marginX,
			x1: marginX + Math.max(0, input.length - 1) * stationGap,
			d
		});

		const eraSlugsSorted = resolveEraOrder(input, options.eraOrder);
		const zoneMargin = options.zoneMargin ?? GEOMETRY.zoneMargin;
		const zones = eraSlugsSorted
			.map((eraSlug) => {
				const xs = stations.filter((s) => s.eraSlug === eraSlug).map((s) => s.x);
				if (xs.length === 0) return null;
				return {
					eraSlug,
					xStart: Math.min(...xs) - zoneMargin,
					xEnd: Math.max(...xs) + zoneMargin
				};
			})
			.filter((z): z is LayoutZone => z !== null);

		return {
			stations,
			paths,
			zones,
			interchanges: [],
			width: marginX * 2 + Math.max(0, input.length - 1) * stationGap,
			height: marginY * 2 + 60
		};
	}

	const CENTER_X = 600;
	const CENTER_Y = 500;

	// Faste retninger pr. region (grader, skærm-konvention: 0=højre, 90=ned, 180=venstre,
	// 270=op) — matcher den overordnede retning de hånd-placerede punkter i dieselLayout.ts
	// allerede bevæger sig i. Bruges KUN som fallback for klasser uden håndplaceret punkt
	// (fremtidig databerigelse), så de aldrig kollapser oven i centrum/Class 08 (var buggen:
	// alt uden match endte på den faste konstant x:600,y:500).
	const REGION_FALLBACK_ANGLE: Record<Traction, number> = {
		MIDLAND: 270,
		WESTERN: 225,
		SOUTHERN: 180,
		SCOTTISH: 45,
		EASTERN: 0
	};

	function fallbackPosition(region: Traction, year: number): { x: number; y: number } {
		const radius = 150 + Math.max(0, year - 1948) * 8;
		const rad = (REGION_FALLBACK_ANGLE[region] * Math.PI) / 180;
		return { x: CENTER_X + radius * Math.cos(rad), y: CENTER_Y + radius * Math.sin(rad) };
	}

	// 2D-mode: x/y/labelSide/isLandmark-override er rene layout-hints slået op i det
	// hånd-tegnede dieselLayout.ts; region-tilhørsforhold kommer UDELUKKENDE fra DB-feltet
	// (s.regions) — eneste kilde efter regions-migrationen (se backfill-regions.ts).
	const stationMeta: { x: number; y: number; regions: string[] }[] = [];

	for (const s of input) {
		const layoutItem = dieselLayout.find((item) => item.qid === s.wikidataQid);
		const regions = s.regions.length > 0 ? s.regions : ['MIDLAND'];
		const primaryRegion = regions[0] as Traction;

		const fallback = fallbackPosition(primaryRegion, s.introYear);
		const x = layoutItem ? layoutItem.x : fallback.x;
		const y = layoutItem ? layoutItem.y : fallback.y;
		const isLandmark = layoutItem ? layoutItem.isLandmark : s.isLandmark;
		const labelSide = layoutItem && layoutItem.labelSide === 'below' ? 'below' : 'above';

		let stationType: StationType = 'tick';
		if (s.retiredYear !== null) stationType = 'terminus';
		else if (regions.length > 1) stationType = 'interchange';
		else if (isLandmark) stationType = 'landmark';

		stations.push({
			id: s.id,
			wikidataQid: s.wikidataQid,
			name: s.name,
			traction: primaryRegion,
			x,
			y,
			introYear: s.introYear,
			retiredYear: s.retiredYear,
			isLandmark,
			stationType,
			labelSide,
			eraSlug: s.eraSlug,
			interchangeWith: regions.length > 1 ? (regions[1] as Traction) : null,
			interchangeY: null
		});
		stationMeta.push({ x, y, regions });
	}

	// Linjer tegnes ud fra de FAKTISK placerede stationer ovenfor (samme kilde som ikonerne),
	// så en klasse uden håndplaceret punkt i dieselLayout.ts stadig indgår i sin linjes forløb.
	// Alle 5 linjer emittes altid (selv uden matchende stationer) — kortets legende viser
	// konstant 5 linjer, og filtrering må aldrig få en linje til at forsvinde helt.
	for (const traction of LINE_ORDER) {
		const regionStations = stationMeta
			.filter((m) => m.regions.includes(traction))
			.map((m) => ({ x: m.x, y: m.y }));

		// Sort by distance from center to ensure paths run straight outwards
		regionStations.sort((a, b) => {
			const distA = Math.hypot(a.x - CENTER_X, a.y - CENTER_Y);
			const distB = Math.hypot(b.x - CENTER_X, b.y - CENTER_Y);
			return distA - distB;
		});

		paths.push({
			traction,
			y: CENTER_Y,
			x0: 100,
			x1: 1100,
			d: buildBeckPath(regionStations)
		});
	}

	return {
		stations,
		paths,
		zones: [],
		interchanges: [],
		width: 1200,
		height: 1000
	};
}
