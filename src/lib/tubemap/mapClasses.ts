// mapClasses.ts — ren mapping-funktion: DB-formede klasser+æraer → StationInput[]
// (layout.ts's inputkontrakt). Ingen Svelte-afhængighed; unit-testes isoleret.
import type { StationInput } from './layout.js';

export interface MappableClass {
	id: number;
	wikidataQid: string;
	name: string;
	narrative: string | null;
	traction: string;
	buildStart: number | null;
	serviceEntry: string | null; // ISO-dato eller null
	serviceExit: string | null; // ISO-dato eller null
	isLandmark: boolean;
	eraId: number;
	/** Ikke brugt af selve layoutet — kun til stede så en displayName-callback (F5.6) kan læse aliasser. */
	aliases?: { alias: string; scheme: string }[];
}

export interface MappableEra {
	id: number;
	slug: string;
}

function introYear(c: MappableClass): number | null {
	if (c.buildStart !== null) return c.buildStart;
	if (c.serviceEntry) {
		const y = new Date(c.serviceEntry).getUTCFullYear();
		if (!Number.isNaN(y)) return y;
	}
	return null;
}

function retiredYear(c: MappableClass): number | null {
	if (!c.serviceExit) return null;
	const y = new Date(c.serviceExit).getUTCFullYear();
	return Number.isNaN(y) ? null : y;
}

/**
 * @param displayName Navnevalg pr. brugerens navneskema-præference (F5.6). Default:
 *   klassens TOPS-navn (LocomotiveClass.name).
 */
export function mapClassesToStations(
	classes: MappableClass[],
	eras: MappableEra[],
	displayName: (c: MappableClass) => string = (c) => c.name
): StationInput[] {
	const eraSlugById = new Map(eras.map((e) => [e.id, e.slug]));

	const stations: StationInput[] = [];
	for (const c of classes) {
		const year = introYear(c);
		if (year === null) continue; // uden årstal kan klassen ikke placeres ordinalt på kortet
		const eraSlug = eraSlugById.get(c.eraId);
		if (!eraSlug) continue;

		stations.push({
			id: String(c.id),
			wikidataQid: c.wikidataQid,
			name: displayName(c),
			traction: c.traction,
			introYear: year,
			retiredYear: retiredYear(c),
			isLandmark: c.isLandmark,
			eraSlug,
			interchangeWith: null
		});
	}
	return stations;
}
