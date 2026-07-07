// layout.ts — ren Beck-geometrimotor (INGEN Svelte-afhængighed, unit-testes isoleret).
// Implementerer geometri-reglerne fra docs/DESIGN-F5-TUBEMAP.md §3:
// 1) hvert linje-BÅND har en fast basis-y, rækkefølge Steam→Diesel→Electric→Other,
//    min. indbyrdes afstand. Linjen MEANDRER: skifter niveau (±1 trin) ved hvert
//    æra-skift i den kronologiske rækkefølge, tegnet med et 45°-knæk (AMENDMENT
//    2026-07-07 — rene vandrette linjer læste som et diagram, ikke et metrokort)
// 2) kun 0/45°-knæk; hjørner afrundes i rendering-laget (stroke-linejoin: round)
// 3) ordinal x-placering pr. linje (introår afgør RÆKKEFØLGE, ikke afstand); æra-zoner
//    beregnes EFTER placering ud fra de faktisk placerede stationer
// 4) labels er altid vandrette; standard-alternering over/under (reel kollisionsmåling
//    med tekstbredde sker i TubeMap.svelte, som kender skriftens faktiske metrics)
// 5) interchange-kapsel mellem to linjer på stationens x (forbinder til nabolinjens
//    BASIS-y, ikke dens niveau — to uafhængige meandre kan ikke forbindes meningsfuldt)
// 6) landmark-ring / tick / endestation som distinkte stationstyper

export const LINE_ORDER = ['STEAM', 'DIESEL', 'ELECTRIC', 'OTHER'] as const;
export type Traction = (typeof LINE_ORDER)[number];

/** Geometri-konstanter fra spec §2/§3/§6 — eneste kilde til sandhed for rendering-laget. */
export const GEOMETRY = {
	stationGap: 140, // STATION_GAP ved zoom 1
	lineGap: 80, // mindste indbyrdes afstand mellem linjebånd
	lineWidthMap: 7, // px — kortet
	lineWidthDiagram: 5, // px — linjediagram (F5.7)
	cornerRadiusFactor: 1.5, // × linjebredde (afrundes via stroke-linejoin i renderen)
	landmarkRingRadius: 8,
	landmarkRingStroke: 3.5,
	interchangeCapsuleStroke: 3,
	tickLength: 12,
	terminusBarWidth: 8,
	terminusBarHeight: 28,
	marginX: 60,
	marginY: 60,
	zoneMargin: 40,
	// Meander (amendment 2026-07-07): niveau-trin i px og det cykliske mønster linjen
	// bevæger sig igennem for hvert æra-skift den passerer.
	levelStep: 20,
	levelPattern: [0, 1, 0, -1] as const
} as const;

export interface StationInput {
	/** Stabil nøgle, fx LocomotiveClass.id som streng. */
	id: string;
	name: string;
	traction: Traction;
	/** Kronologisk sorteringsnøgle (buildStart ?? serviceEntry-år) — afgør RÆKKEFØLGE, ikke x-afstand. */
	introYear: number;
	/** Udfasningsår — sat = stationen tegnes som endestation. */
	retiredYear: number | null;
	isLandmark: boolean;
	eraSlug: string;
	/** Sat for bi-mode/electro-diesel-klasser: den anden linje stationen også hører til. */
	interchangeWith: Traction | null;
}

export interface LayoutOptions {
	stationGap?: number;
	lineGap?: number;
	marginX?: number;
	marginY?: number;
	zoneMargin?: number;
	/** '1d' bruges af LineDiagram (F5.7): alle stationer lægges på ét fælles spor. */
	mode?: '2d' | '1d';
	/** Eksplicit æra-rækkefølge (fx Era.sortIndex-slugs). Uden denne sorteres æraer efter laveste introYear blandt deres stationer. */
	eraOrder?: string[];
}

export type StationType = 'tick' | 'landmark' | 'interchange' | 'terminus';

export interface LayoutStation {
	id: string;
	name: string;
	traction: Traction;
	x: number;
	y: number;
	introYear: number;
	retiredYear: number | null;
	isLandmark: boolean;
	stationType: StationType;
	labelSide: 'above' | 'below';
	eraSlug: string;
	interchangeWith: Traction | null;
	/** y-position for den tilstødende linjes BASIS (til kapsel-tegning) — null hvis ikke interchange, eller den anden linje ikke er til stede i inputtet. */
	interchangeY: number | null;
}

export interface LayoutPath {
	traction: Traction;
	/** Linjens BASIS-y (uden meander) — bruges af Minimap som forenklet reference. */
	y: number;
	x0: number;
	x1: number;
	/** Fuldt SVG path inkl. 45°-meander-knæk ved æra-skift. */
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

/** Stationstype-prioritet ved samtidige flag: udfasning slår alt andet (fysisk endestation på linjen). */
function classifyStation(s: StationInput): StationType {
	if (s.retiredYear !== null) return 'terminus';
	if (s.interchangeWith !== null) return 'interchange';
	if (s.isLandmark) return 'landmark';
	return 'tick';
}

/** Bygger et polyline-path med et 45°-knæk midt i hvert gap hvor niveauet skifter. */
function buildMeanderPath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return '';
	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		if (prev.y === curr.y) {
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}
		const kinkRun = Math.abs(curr.y - prev.y); // 45° ⇒ vandret løb = lodret løb
		const gap = curr.x - prev.x;
		const flatEach = Math.max(0, (gap - kinkRun) / 2);
		const xA = prev.x + flatEach;
		const xB = xA + kinkRun;
		d += ` L ${xA} ${prev.y} L ${xB} ${curr.y} L ${curr.x} ${curr.y}`;
	}
	return d;
}

export function computeLayout(input: StationInput[], options: LayoutOptions = {}): LayoutResult {
	const stationGap = options.stationGap ?? GEOMETRY.stationGap;
	const lineGap = Math.max(options.lineGap ?? GEOMETRY.lineGap, GEOMETRY.lineGap);
	const marginX = options.marginX ?? GEOMETRY.marginX;
	const marginY = options.marginY ?? GEOMETRY.marginY;
	const zoneMargin = options.zoneMargin ?? GEOMETRY.zoneMargin;
	const mode = options.mode ?? '2d';
	const levelStep = GEOMETRY.levelStep;
	const levelPattern = GEOMETRY.levelPattern;

	const byTraction = new Map<Traction, StationInput[]>();
	for (const s of input) {
		if (!byTraction.has(s.traction)) byTraction.set(s.traction, []);
		byTraction.get(s.traction)!.push(s);
	}

	const presentLines = LINE_ORDER.filter((t) => byTraction.has(t));

	// Linjens BASIS-y (uden meander) — bruges til interchange-kapsler og Minimap.
	const baseYByTraction = new Map<Traction, number>();
	if (mode === '1d') {
		for (const t of presentLines) baseYByTraction.set(t, marginY);
	} else {
		presentLines.forEach((t, i) => baseYByTraction.set(t, marginY + i * lineGap));
	}

	const stations: LayoutStation[] = [];
	const paths: LayoutPath[] = [];
	let maxX = marginX;

	for (const traction of presentLines) {
		const list = [...byTraction.get(traction)!].sort((a, b) => {
			if (a.introYear !== b.introYear) return a.introYear - b.introYear;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		});

		const baseY = baseYByTraction.get(traction)!;

		let levelIndex = 0;
		let prevEraSlug: string | null = null;
		const points: { x: number; y: number }[] = [];

		list.forEach((s, index) => {
			const x = marginX + index * stationGap;
			maxX = Math.max(maxX, x);

			if (prevEraSlug !== null && s.eraSlug !== prevEraSlug) {
				levelIndex = (levelIndex + 1) % levelPattern.length;
			}
			prevEraSlug = s.eraSlug;
			const y = baseY + levelPattern[levelIndex] * levelStep;
			points.push({ x, y });

			const interchangeY =
				s.interchangeWith !== null && baseYByTraction.has(s.interchangeWith)
					? baseYByTraction.get(s.interchangeWith)!
					: null;

			stations.push({
				id: s.id,
				name: s.name,
				traction: s.traction,
				x,
				y,
				introYear: s.introYear,
				retiredYear: s.retiredYear,
				isLandmark: s.isLandmark,
				stationType: classifyStation(s),
				labelSide: index % 2 === 0 ? 'above' : 'below',
				eraSlug: s.eraSlug,
				interchangeWith: s.interchangeWith,
				interchangeY
			});
		});

		const x0 = marginX;
		const x1 = list.length > 0 ? marginX + (list.length - 1) * stationGap : marginX;
		paths.push({ traction, y: baseY, x0, x1, d: buildMeanderPath(points) });
	}

	const interchanges: LayoutInterchange[] = stations
		.filter((s) => s.stationType === 'interchange' && s.interchangeY !== null)
		.map((s) => ({
			id: s.id,
			x: s.x,
			yA: s.y,
			yB: s.interchangeY!,
			tractionA: s.traction,
			tractionB: s.interchangeWith!
		}));

	const eraSlugsSorted = resolveEraOrder(input, options.eraOrder);

	const zones: LayoutZone[] = eraSlugsSorted
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

	// Ekstra vertikal margin til meander-udsvinget (maks. niveau × levelStep på hver side).
	const maxLevelExcursion = Math.max(...levelPattern.map(Math.abs)) * levelStep;
	const height =
		mode === '1d'
			? marginY * 2 + 2 * maxLevelExcursion
			: marginY * 2 + Math.max(0, presentLines.length - 1) * lineGap + 2 * maxLevelExcursion;

	return {
		stations,
		paths,
		zones,
		interchanges,
		width: maxX + marginX,
		height
	};
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
