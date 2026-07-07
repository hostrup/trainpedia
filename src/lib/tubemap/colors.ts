import type { Traction } from './layout.js';

/** Linjenavne til legende/UI (F5.4 legende, F5.7 sidetitel). */
export const LINE_NAMES: Record<Traction, string> = {
	STEAM: 'Steam',
	DIESEL: 'Diesel',
	ELECTRIC: 'Electric',
	OTHER: 'Experimental'
};

/** TfL-homage bag hver linjefarve (U4 Option A) — kun til tooltip/kontekst. */
export const LINE_TFL_HOMAGE: Record<Traction, string> = {
	STEAM: 'Metropolitan',
	DIESEL: 'District',
	ELECTRIC: 'Victoria',
	OTHER: 'Jubilee'
};

export function lineColorVar(traction: Traction): string {
	switch (traction) {
		case 'STEAM':
			return 'var(--line-steam)';
		case 'DIESEL':
			return 'var(--line-diesel)';
		case 'ELECTRIC':
			return 'var(--line-electric)';
		default:
			return 'var(--line-other)';
	}
}
