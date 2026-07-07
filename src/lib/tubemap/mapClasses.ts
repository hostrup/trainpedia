// mapClasses.ts — ren mapping-funktion: DB-formede klasser+æraer → StationInput[]
// (layout.ts's inputkontrakt). Ingen Svelte-afhængighed; unit-testes isoleret.
import type { StationInput, Traction } from './layout.js';

export interface MappableClass {
	id: number;
	name: string;
	narrative: string | null;
	traction: Traction;
	buildStart: number | null;
	serviceEntry: string | null; // ISO-dato eller null
	serviceExit: string | null; // ISO-dato eller null
	isLandmark: boolean;
	eraId: number;
}

export interface MappableEra {
	id: number;
	slug: string;
}

// Electro-diesel/bi-mode er IKKE et DB-felt (schema har ét traction-felt pr. klasse) —
// dette er en præsentationsheuristik (klassenummer + narrativ-tekst), ikke en påstået
// kildefaktum. Samme mønster som den tidligere TimelineCanvas' isDualTraction().
const KNOWN_INTERCHANGE_CLASS_NUMBERS = new Set(['73', '74', '88', '93']);

function classNumber(name: string): string | null {
	const m = name.match(/class\s+(\d{1,3})\b/i);
	return m ? m[1] : null;
}

function deriveInterchange(c: MappableClass): Traction | null {
	const text = `${c.name} ${c.narrative ?? ''}`.toLowerCase();
	const num = classNumber(c.name);
	const looksInterchange =
		text.includes('electro-diesel') ||
		text.includes('bi-mode') ||
		(num !== null && KNOWN_INTERCHANGE_CLASS_NUMBERS.has(num));

	if (!looksInterchange) return null;
	if (c.traction === 'ELECTRIC') return 'DIESEL';
	if (c.traction === 'DIESEL') return 'ELECTRIC';
	return null;
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
			name: displayName(c),
			traction: c.traction,
			introYear: year,
			retiredYear: retiredYear(c),
			isLandmark: c.isLandmark,
			eraSlug,
			interchangeWith: deriveInterchange(c)
		});
	}
	return stations;
}
