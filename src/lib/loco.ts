// Delte helpers for lokomotivklasse-præsentation (badges, farver, srcset).
import { lineColorVar } from './tubemap/colors.js';
import type { Traction } from './tubemap/layout.js';

// Samme farvekilde som kortet (U4 Option A) — ingen parallel palet.
export function tractionColor(traction: string): string {
	if (['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'].includes(traction)) {
		return lineColorVar(traction as Traction);
	}
	return 'var(--color-midland)';
}

export function tractionLabel(traction: string): string {
	switch (traction) {
		case 'STEAM':
			return 'Steam';
		case 'DIESEL':
			return 'Diesel';
		case 'ELECTRIC':
			return 'Electric';
		default:
			return 'Other';
	}
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
