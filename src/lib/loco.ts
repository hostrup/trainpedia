// Delte helpers for lokomotivklasse-præsentation (badges, farver, srcset).
// Region-farver og -navne (indlejret fra pensioneret tubemap/colors.ts).

type Region = 'WESTERN' | 'EASTERN' | 'MIDLAND' | 'SOUTHERN' | 'SCOTTISH';

const REGION_COLORS: Record<Region, string> = {
	WESTERN: 'var(--color-western)',
	EASTERN: 'var(--color-eastern)',
	MIDLAND: 'var(--color-midland)',
	SOUTHERN: 'var(--color-southern)',
	SCOTTISH: 'var(--color-scottish)'
};

const REGION_SHORT_NAMES: Record<Region, string> = {
	WESTERN: 'Western Region',
	EASTERN: 'Eastern Region',
	MIDLAND: 'Midland Region',
	SOUTHERN: 'Southern Region',
	SCOTTISH: 'Scottish Region'
};

function isRegion(value: string): value is Region {
	return ['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'].includes(value);
}

// Farvekilde for regionsbaserede badges. `regions` er DB-felt.
export function tractionColor(regions: string[]): string {
	const primary = regions[0];
	return primary && isRegion(primary) ? REGION_COLORS[primary] : 'var(--tfl-blue)';
}

export function tractionLabel(regions: string[]): string {
	const primary = regions[0];
	if (!primary || !isRegion(primary)) return 'Unclassified';
	return regions.length > 1
		? `${REGION_SHORT_NAMES[primary]} (interchange)`
		: REGION_SHORT_NAMES[primary];
}

// localPath peger på 960px-varianten; 480/1920 ligger ved siden af med samme hash.
export function mediaSrcset(localPath: string): { src: string; srcset: string } {
	const src = `/${localPath}`;
	if (!localPath.endsWith('-960.webp')) return { src, srcset: src };
	const base = `/${localPath.slice(0, -'-960.webp'.length)}`;
	return {
		src,
		srcset: `${base}-480.webp 480w, ${base}-960.webp 960w, ${base}-1920.webp 1920w`
	};
}

export function buildPeriod(buildStart: number | null, buildEnd: number | null): string {
	if (buildStart === null) return '—';
	return buildEnd && buildEnd !== buildStart ? `${buildStart}–${buildEnd}` : `${buildStart}`;
}

export const MUSEUM_DARLINGS = new Set([
	'Q796898', // Class 55
	'Q3306037', // Class 37
	'Q3246420', // Class 47
	'Q4970826', // Class 50
	'Q12053618', // Class 52
	'Q12053606', // Class 08
	'Q4970812', // Class 43
	'Q3306004', // Class 28
	'Q4970734', // Class 14
	'Q4970775' // Class 35
]);

export function isMuseumDarling(qid: string): boolean {
	return MUSEUM_DARLINGS.has(qid);
}
