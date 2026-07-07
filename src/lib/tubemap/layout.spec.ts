import { describe, it, expect } from 'vitest';
import { computeLayout, GEOMETRY, LINE_ORDER, type StationInput } from './layout';

function station(overrides: Partial<StationInput> & { id: string }): StationInput {
	return {
		name: overrides.id,
		traction: 'DIESEL',
		introYear: 1960,
		retiredYear: null,
		isLandmark: false,
		eraSlug: 'br-transition',
		interchangeWith: null,
		...overrides
	};
}

describe('computeLayout — regel 1: linjespor', () => {
	it('placerer linjer i rækkefølgen Steam, Diesel, Electric, Other', () => {
		const result = computeLayout([
			station({ id: 'e1', traction: 'ELECTRIC', introYear: 1980 }),
			station({ id: 's1', traction: 'STEAM', introYear: 1930 }),
			station({ id: 'o1', traction: 'OTHER', introYear: 2000 }),
			station({ id: 'd1', traction: 'DIESEL', introYear: 1960 })
		]);

		const yByTraction = new Map(result.paths.map((p) => [p.traction, p.y]));
		const order = LINE_ORDER.filter((t) => yByTraction.has(t));
		expect(order).toEqual(['STEAM', 'DIESEL', 'ELECTRIC', 'OTHER']);

		const ys = order.map((t) => yByTraction.get(t)!);
		for (let i = 1; i < ys.length; i++) {
			expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(GEOMETRY.lineGap);
		}
	});

	it('respekterer minimum lineGap på 80px selv hvis en mindre værdi angives', () => {
		const result = computeLayout(
			[station({ id: 's1', traction: 'STEAM' }), station({ id: 'd1', traction: 'DIESEL' })],
			{ lineGap: 10 }
		);
		const ys = result.paths.map((p) => p.y).sort((a, b) => a - b);
		expect(ys[1] - ys[0]).toBe(GEOMETRY.lineGap);
	});

	it('alle stationer på samme linje deler nøjagtig samme y', () => {
		const result = computeLayout([
			station({ id: 'd1', introYear: 1960 }),
			station({ id: 'd2', introYear: 1970 }),
			station({ id: 'd3', introYear: 1980 })
		]);
		const ys = new Set(result.stations.map((s) => s.y));
		expect(ys.size).toBe(1);
	});
});

describe('computeLayout — regel 3: ordinal x-placering', () => {
	it('placerer stationer med fast STATION_GAP uanset faktisk årstalsafstand', () => {
		const result = computeLayout([
			station({ id: 'd1', introYear: 1960 }),
			station({ id: 'd2', introYear: 1961 }), // 1 år efter
			station({ id: 'd3', introYear: 2020 }) // 59 år efter
		]);
		const byId = new Map(result.stations.map((s) => [s.id, s.x]));
		const x1 = byId.get('d1')!;
		const x2 = byId.get('d2')!;
		const x3 = byId.get('d3')!;
		expect(x2 - x1).toBe(GEOMETRY.stationGap);
		expect(x3 - x2).toBe(GEOMETRY.stationGap); // IKKE 59× større end x2-x1
	});

	it('sorterer efter introYear, ikke efter inputrækkefølge', () => {
		const result = computeLayout([
			station({ id: 'later', introYear: 1980 }),
			station({ id: 'earlier', introYear: 1960 })
		]);
		const byId = new Map(result.stations.map((s) => [s.id, s.x]));
		expect(byId.get('earlier')!).toBeLessThan(byId.get('later')!);
	});

	it('linjer indekserer uafhængigt af hinanden (hver linje starter ved marginX)', () => {
		const result = computeLayout([
			station({ id: 'd1', traction: 'DIESEL', introYear: 1960 }),
			station({ id: 'e1', traction: 'ELECTRIC', introYear: 1990 })
		]);
		const d1 = result.stations.find((s) => s.id === 'd1')!;
		const e1 = result.stations.find((s) => s.id === 'e1')!;
		expect(d1.x).toBe(GEOMETRY.marginX);
		expect(e1.x).toBe(GEOMETRY.marginX);
	});
});

describe('computeLayout — regel 3: æra-zoner beregnes efter placering', () => {
	it('zonens x-udstrækning følger de placerede stationer, ikke reelle årstal', () => {
		const result = computeLayout([
			station({ id: 'd1', eraSlug: 'era-a', introYear: 1960 }),
			station({ id: 'd2', eraSlug: 'era-a', introYear: 1965 }),
			station({ id: 'd3', eraSlug: 'era-b', introYear: 1990 })
		]);
		const zoneA = result.zones.find((z) => z.eraSlug === 'era-a')!;
		const d1x = result.stations.find((s) => s.id === 'd1')!.x;
		const d2x = result.stations.find((s) => s.id === 'd2')!.x;
		expect(zoneA.xStart).toBe(d1x - GEOMETRY.zoneMargin);
		expect(zoneA.xEnd).toBe(d2x + GEOMETRY.zoneMargin);
	});

	it('bruger eksplicit eraOrder, hvis angivet, frem for laveste introYear', () => {
		const result = computeLayout(
			[
				station({ id: 'd1', eraSlug: 'era-b', introYear: 1960 }),
				station({ id: 'd2', eraSlug: 'era-a', introYear: 1990 })
			],
			{ eraOrder: ['era-a', 'era-b'] }
		);
		expect(result.zones.map((z) => z.eraSlug)).toEqual(['era-a', 'era-b']);
	});

	it('udelader æraer uden stationer i det filtrerede input', () => {
		const result = computeLayout([station({ id: 'd1', eraSlug: 'era-a' })], {
			eraOrder: ['era-a', 'era-b-tom']
		});
		expect(result.zones.map((z) => z.eraSlug)).toEqual(['era-a']);
	});
});

describe('computeLayout — regel 4: vandrette labels', () => {
	it('alternerer label-side over/under pr. station-index på linjen', () => {
		const result = computeLayout([
			station({ id: 'd1', introYear: 1960 }),
			station({ id: 'd2', introYear: 1970 }),
			station({ id: 'd3', introYear: 1980 })
		]);
		const byId = new Map(result.stations.map((s) => [s.id, s.labelSide]));
		expect(byId.get('d1')).toBe('above');
		expect(byId.get('d2')).toBe('below');
		expect(byId.get('d3')).toBe('above');
	});
});

describe('computeLayout — regel 5/6: stationstyper', () => {
	it('klassificerer almindelig klasse som tick', () => {
		const result = computeLayout([station({ id: 'd1' })]);
		expect(result.stations[0].stationType).toBe('tick');
	});

	it('klassificerer landmark-klasse som landmark', () => {
		const result = computeLayout([station({ id: 'd1', isLandmark: true })]);
		expect(result.stations[0].stationType).toBe('landmark');
	});

	it('klassificerer bi-mode-klasse som interchange og udleder interchangeY fra den anden linje', () => {
		const result = computeLayout([
			station({ id: 'd1', traction: 'DIESEL', interchangeWith: 'ELECTRIC', introYear: 1975 }),
			station({ id: 'e1', traction: 'ELECTRIC', introYear: 1980 })
		]);
		const interchangeStation = result.stations.find((s) => s.id === 'd1')!;
		expect(interchangeStation.stationType).toBe('interchange');
		const electricY = result.paths.find((p) => p.traction === 'ELECTRIC')!.y;
		expect(interchangeStation.interchangeY).toBe(electricY);
		expect(result.interchanges).toHaveLength(1);
		expect(result.interchanges[0]).toMatchObject({
			id: 'd1',
			tractionA: 'DIESEL',
			tractionB: 'ELECTRIC'
		});
	});

	it('interchangeY er null hvis den anden linje ikke findes i det filtrerede input', () => {
		const result = computeLayout([
			station({ id: 'd1', traction: 'DIESEL', interchangeWith: 'ELECTRIC' })
		]);
		expect(result.stations[0].interchangeY).toBeNull();
		expect(result.interchanges).toHaveLength(0);
	});

	it('udfaset klasse klassificeres som terminus, selv hvis den også er landmark', () => {
		const result = computeLayout([station({ id: 'd1', isLandmark: true, retiredYear: 1968 })]);
		expect(result.stations[0].stationType).toBe('terminus');
	});
});

describe('computeLayout — 1D-mode (F5.7 LineDiagram genbrug)', () => {
	it('lægger alle stationer på samme y uanset traktion, når kun én linje er til stede', () => {
		const result = computeLayout(
			[
				station({ id: 'e1', traction: 'ELECTRIC', introYear: 1980 }),
				station({ id: 'e2', traction: 'ELECTRIC', introYear: 1990 })
			],
			{ mode: '1d' }
		);
		const ys = new Set(result.stations.map((s) => s.y));
		expect(ys.size).toBe(1);
	});
});

describe('GEOMETRY — konstanter matcher spec §2/§3/§6 præcist', () => {
	it('har de aftalte værdier', () => {
		expect(GEOMETRY.stationGap).toBe(140);
		expect(GEOMETRY.lineGap).toBe(80);
		expect(GEOMETRY.lineWidthMap).toBe(7);
		expect(GEOMETRY.lineWidthDiagram).toBe(5);
		expect(GEOMETRY.cornerRadiusFactor).toBe(1.5);
		expect(GEOMETRY.landmarkRingRadius).toBe(8);
		expect(GEOMETRY.landmarkRingStroke).toBe(3.5);
		expect(GEOMETRY.tickLength).toBe(12);
		expect(GEOMETRY.terminusBarWidth).toBe(8);
		expect(GEOMETRY.terminusBarHeight).toBe(28);
	});
});
