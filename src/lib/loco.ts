// Delte helpers for lokomotivklasse-præsentation (badges, farver, srcset).
import { lineColorVar, REGION_SHORT_NAMES } from './tubemap/colors.js';
import type { Traction } from './tubemap/layout.js';

function isRegion(value: string): value is Traction {
	return ['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'].includes(value);
}

// Samme farvekilde som kortet (U4 Option A) — ingen parallel palet. `regions`
// kommer fra LocomotiveClass.regions (DB); klassens `traction`-felt er altid
// DIESEL siden F6.5-scope-pivoten og bærer ingen linje-betydning.
export function tractionColor(regions: string[]): string {
	const primary = regions[0];
	return primary && isRegion(primary) ? lineColorVar(primary) : 'var(--tfl-blue)';
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
