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

	// 2D-mode: matches coordinates to static dieselLayout.ts config
	for (const s of input) {
		const layoutItem = dieselLayout.find((item) => item.qid === s.wikidataQid);

		const x = layoutItem ? layoutItem.x : 600;
		const y = layoutItem ? layoutItem.y : 500;
		const isLandmark = layoutItem ? layoutItem.isLandmark : s.isLandmark;
		const labelSide = layoutItem && layoutItem.labelSide === 'below' ? 'below' : 'above';
		const regions = layoutItem ? layoutItem.regions : ['MIDLAND'];
		const primaryRegion = regions[0] as Traction;

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
	}

	// Generate lines (paths) based on dieselLayout
	for (const traction of LINE_ORDER) {
		const regionStations = dieselLayout
			.filter((item) => (item.regions as readonly string[]).includes(traction))
			.map((item) => ({ x: item.x, y: item.y }));

		// Sort by distance from center (600, 500) to ensure paths run straight outwards
		regionStations.sort((a, b) => {
			const distA = Math.hypot(a.x - 600, a.y - 500);
			const distB = Math.hypot(b.x - 600, b.y - 500);
			return distA - distB;
		});

		const d = buildBeckPath(regionStations);

		paths.push({
			traction,
			y: 500, // Dummy baseY
			x0: 100,
			x1: 1100,
			d
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
