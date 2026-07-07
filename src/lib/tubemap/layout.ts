// layout.ts — ren Beck-geometrimotor (INGEN Svelte-afhængighed, unit-testes isoleret).
// Implementerer geometri-reglerne fra docs/DESIGN-F5-TUBEMAP.md §3:
// 1) fast y pr. linje, rækkefølge Steam→Diesel→Electric→Other, min. indbyrdes afstand
// 2) kun 0/45°-knæk med fast hjørneradius (eksponeret som konstant til rendering-laget)
// 3) ordinal x-placering pr. linje (introår afgør RÆKKEFØLGE, ikke afstand); æra-zoner
//    beregnes EFTER placering ud fra de faktisk placerede stationer
// 4) labels er altid vandrette; standard-alternering over/under (reel kollisionsmåling
//    med tekstbredde sker i TubeMap.svelte, som kender skriftens faktiske metrics)
// 5) interchange-kapsel mellem to linjer på stationens x
// 6) landmark-ring / tick / endestation som distinkte stationstyper

export const LINE_ORDER = ['STEAM', 'DIESEL', 'ELECTRIC', 'OTHER'] as const;
export type Traction = (typeof LINE_ORDER)[number];

/** Geometri-konstanter fra spec §2/§3/§6 — eneste kilde til sandhed for rendering-laget. */
export const GEOMETRY = {
	stationGap: 140, // STATION_GAP ved zoom 1
	lineGap: 80, // mindste indbyrdes afstand mellem linjespor
	lineWidthMap: 7, // px — kortet
	lineWidthDiagram: 5, // px — linjediagram (F5.7)
	cornerRadiusFactor: 1.5, // × linjebredde
	landmarkRingRadius: 8,
	landmarkRingStroke: 3.5,
	interchangeCapsuleStroke: 3,
	tickLength: 12,
	terminusBarWidth: 8,
	terminusBarHeight: 28,
	marginX: 60,
	marginY: 60,
	zoneMargin: 40
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
	/** y-position for den tilstødende linje, til kapsel-tegning (null hvis ikke interchange, eller den anden linje ikke er til stede i inputtet). */
	interchangeY: number | null;
}

export interface LayoutPath {
	traction: Traction;
	y: number;
	x0: number;
	x1: number;
	/** Simpelt SVG path — hovedsporet er altid en ren vandret linje (fast y pr. linje). */
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

export function computeLayout(input: StationInput[], options: LayoutOptions = {}): LayoutResult {
	const stationGap = options.stationGap ?? GEOMETRY.stationGap;
	const lineGap = Math.max(options.lineGap ?? GEOMETRY.lineGap, GEOMETRY.lineGap);
	const marginX = options.marginX ?? GEOMETRY.marginX;
	const marginY = options.marginY ?? GEOMETRY.marginY;
	const zoneMargin = options.zoneMargin ?? GEOMETRY.zoneMargin;
	const mode = options.mode ?? '2d';

	const byTraction = new Map<Traction, StationInput[]>();
	for (const s of input) {
		if (!byTraction.has(s.traction)) byTraction.set(s.traction, []);
		byTraction.get(s.traction)!.push(s);
	}

	const presentLines = LINE_ORDER.filter((t) => byTraction.has(t));

	const yByTraction = new Map<Traction, number>();
	if (mode === '1d') {
		// Linjediagram: kun ét spor på skærmen — altid samme baseline uanset traktion.
		for (const t of presentLines) yByTraction.set(t, marginY);
	} else {
		presentLines.forEach((t, i) => yByTraction.set(t, marginY + i * lineGap));
	}

	const stations: LayoutStation[] = [];
	const paths: LayoutPath[] = [];
	let maxX = marginX;

	for (const traction of presentLines) {
		const list = [...byTraction.get(traction)!].sort((a, b) => {
			if (a.introYear !== b.introYear) return a.introYear - b.introYear;
			return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		});

		const y = yByTraction.get(traction)!;

		list.forEach((s, index) => {
			const x = marginX + index * stationGap;
			maxX = Math.max(maxX, x);

			const interchangeY =
				s.interchangeWith !== null && yByTraction.has(s.interchangeWith)
					? yByTraction.get(s.interchangeWith)!
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
		paths.push({ traction, y, x0, x1, d: `M ${x0} ${y} L ${x1} ${y}` });
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

	const height =
		mode === '1d' ? marginY * 2 : marginY * 2 + Math.max(0, presentLines.length - 1) * lineGap;

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
