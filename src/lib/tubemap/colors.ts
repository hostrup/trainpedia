import type { Traction } from './layout.js';

/** Linjenavne til legende/UI (F5.4 legende, F5.7 sidetitel). */
export const LINE_NAMES: Record<Traction, string> = {
	WESTERN: 'Western Region (Diesel-Hydraulic)',
	EASTERN: 'Eastern Region (Express Passenger)',
	MIDLAND: 'London Midland Region (Heavy Mainline)',
	SOUTHERN: 'Southern Region (Electro-Diesel / Shunters)',
	SCOTTISH: 'Scottish Region (Mixed / Highlands)'
};

/** Kort label til badges (klassesider, kort). */
export const REGION_SHORT_NAMES: Record<Traction, string> = {
	WESTERN: 'Western Region',
	EASTERN: 'Eastern Region',
	MIDLAND: 'Midland Region',
	SOUTHERN: 'Southern Region',
	SCOTTISH: 'Scottish Region'
};

/** TfL-homage bag hver linjefarve. */
export const LINE_TFL_HOMAGE: Record<Traction, string> = {
	WESTERN: 'District',
	EASTERN: 'Central',
	MIDLAND: 'Piccadilly',
	SOUTHERN: 'Victoria',
	SCOTTISH: 'Orange'
};

export function lineColorVar(traction: Traction): string {
	switch (traction) {
		case 'WESTERN':
			return 'var(--color-western)';
		case 'EASTERN':
			return 'var(--color-eastern)';
		case 'MIDLAND':
			return 'var(--color-midland)';
		case 'SOUTHERN':
			return 'var(--color-southern)';
		case 'SCOTTISH':
			return 'var(--color-scottish)';
	}
}
