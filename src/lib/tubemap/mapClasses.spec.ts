import { describe, it, expect } from 'vitest';
import { mapClassesToStations, type MappableClass, type MappableEra } from './mapClasses';

const ERAS: MappableEra[] = [
	{ id: 1, slug: 'br-transition' },
	{ id: 2, slug: 'modern' }
];

function loco(overrides: Partial<MappableClass> & { id: number }): MappableClass {
	return {
		name: `Class ${overrides.id}`,
		narrative: null,
		traction: 'DIESEL',
		buildStart: 1960,
		serviceEntry: null,
		serviceExit: null,
		isLandmark: false,
		eraId: 1,
		...overrides
	};
}

describe('mapClassesToStations', () => {
	it('udelader klasser uden noget årstal (kan ikke placeres ordinalt)', () => {
		const result = mapClassesToStations(
			[loco({ id: 1, buildStart: null, serviceEntry: null })],
			ERAS
		);
		expect(result).toHaveLength(0);
	});

	it('falder tilbage til serviceEntry-år hvis buildStart mangler', () => {
		const result = mapClassesToStations(
			[loco({ id: 1, buildStart: null, serviceEntry: '1975-06-01T00:00:00.000Z' })],
			ERAS
		);
		expect(result[0].introYear).toBe(1975);
	});

	it('udelader klasser hvis eraId ikke matcher nogen kendt æra', () => {
		const result = mapClassesToStations([loco({ id: 1, eraId: 999 })], ERAS);
		expect(result).toHaveLength(0);
	});

	it('sætter retiredYear fra serviceExit-år', () => {
		const result = mapClassesToStations(
			[loco({ id: 1, serviceExit: '1968-12-31T00:00:00.000Z' })],
			ERAS
		);
		expect(result[0].retiredYear).toBe(1968);
	});

	it('bruger displayName-callback til navnevalg (F5.6 navneskema)', () => {
		const result = mapClassesToStations(
			[loco({ id: 1, name: 'British Rail Class 37' })],
			ERAS,
			(c) => c.name.toUpperCase()
		);
		expect(result[0].name).toBe('BRITISH RAIL CLASS 37');
	});

	it('udleder interchangeWith for kendte bi-mode-klassenumre', () => {
		const result = mapClassesToStations(
			[loco({ id: 73, name: 'British Rail Class 73', traction: 'ELECTRIC' })],
			ERAS
		);
		expect(result[0].interchangeWith).toBe('DIESEL');
	});

	it('udleder interchangeWith fra narrativ-tekst ("electro-diesel")', () => {
		const result = mapClassesToStations(
			[
				loco({
					id: 1,
					name: 'British Rail Class 99',
					traction: 'DIESEL',
					narrative: 'An electro-diesel locomotive used for shunting.'
				})
			],
			ERAS
		);
		expect(result[0].interchangeWith).toBe('ELECTRIC');
	});

	it('lader interchangeWith være null for almindelige klasser', () => {
		const result = mapClassesToStations([loco({ id: 1, name: 'British Rail Class 37' })], ERAS);
		expect(result[0].interchangeWith).toBeNull();
	});
});
