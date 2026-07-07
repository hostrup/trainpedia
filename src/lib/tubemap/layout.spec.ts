import { describe, it, expect } from 'vitest';
import { computeLayout, GEOMETRY, type StationInput } from './layout.js';

function testStation(overrides: Partial<StationInput> & { id: string }): StationInput {
	return {
		name: overrides.id,
		wikidataQid: overrides.wikidataQid || 'Q_UNKNOWN',
		traction: 'DIESEL',
		introYear: 1960,
		retiredYear: null,
		isLandmark: false,
		eraSlug: 'br-transition',
		interchangeWith: null,
		...overrides
	};
}

describe('computeLayout — 2D-mode (Region Metrokort)', () => {
	it('slår koordinater op i dieselLayout ud fra Wikidata QID', () => {
		// Class 55 (Q796898) findes i dieselLayout.ts
		const result = computeLayout([
			testStation({ id: '1', wikidataQid: 'Q796898', name: 'Class 55' })
		]);
		expect(result.stations).toHaveLength(1);
		expect(result.stations[0].x).toBeDefined();
		expect(result.stations[0].y).toBeDefined();
		expect(result.stations[0].x).not.toBe(600); // det er ikke midter-fallback
	});

	it('placerer ukendte stationer på fallback position', () => {
		const result = computeLayout([
			testStation({ id: '1', wikidataQid: 'Q_UNKNOWN_TEST', name: 'Unknown' })
		]);
		expect(result.stations).toHaveLength(1);
		expect(result.stations[0].x).toBe(600);
		expect(result.stations[0].y).toBe(500);
	});

	it('genererer altid stier for alle 5 regioner', () => {
		const result = computeLayout([testStation({ id: '1', wikidataQid: 'Q1131502' })]);
		expect(result.paths).toHaveLength(5);
		const tractions = result.paths.map((p) => p.traction);
		expect(tractions).toContain('WESTERN');
		expect(tractions).toContain('EASTERN');
		expect(tractions).toContain('MIDLAND');
		expect(tractions).toContain('SOUTHERN');
		expect(tractions).toContain('SCOTTISH');
	});

	it('klassificerer stationstyper korrekt', () => {
		// Landmark
		const resultLandmark = computeLayout([
			testStation({ id: '1', wikidataQid: 'Q796898', isLandmark: true })
		]);
		expect(resultLandmark.stations[0].stationType).toBe('landmark');

		// Terminus (retired)
		const resultTerminus = computeLayout([
			testStation({ id: '2', wikidataQid: 'Q796898', retiredYear: 1982 })
		]);
		expect(resultTerminus.stations[0].stationType).toBe('terminus');
	});
});

describe('computeLayout — 1D-mode (Stribekort til Linjediagram)', () => {
	it('placerer alle stationer på en lige vandret linje sorteret kronologisk', () => {
		const result = computeLayout(
			[
				testStation({ id: 'later', introYear: 1980 }),
				testStation({ id: 'earlier', introYear: 1960 })
			],
			{ mode: '1d' }
		);

		expect(result.stations).toHaveLength(2);
		expect(result.stations[0].y).toBe(result.stations[1].y);

		// Sorteret kronologisk, så earlier (1960) kommer først på x
		const earlier = result.stations.find((s) => s.id === 'earlier')!;
		const later = result.stations.find((s) => s.id === 'later')!;
		expect(earlier.x).toBeLessThan(later.x);
		expect(later.x - earlier.x).toBe(GEOMETRY.stationGap);
	});

	it('beregner era-zoner til zone-bånd i 1D', () => {
		const result = computeLayout(
			[
				testStation({ id: '1', eraSlug: 'era-a', introYear: 1960 }),
				testStation({ id: '2', eraSlug: 'era-b', introYear: 1970 })
			],
			{ mode: '1d' }
		);

		expect(result.zones).toHaveLength(2);
		expect(result.zones[0].eraSlug).toBe('era-a');
		expect(result.zones[1].eraSlug).toBe('era-b');
	});
});

describe('Beck-geometri — 45-graders path interpolation', () => {
	it('genererer 45-graders segmenter i stier', () => {
		const result = computeLayout([testStation({ id: '1', wikidataQid: 'Q1131502' })]);

		// For stier der har knæk, vil d-strengen indeholde M og L kommandoer
		for (const path of result.paths) {
			if (path.d) {
				expect(path.d.startsWith('M')).toBe(true);
				expect(path.d).toContain('L');
			}
		}
	});
});
