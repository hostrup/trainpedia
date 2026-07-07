// nameScheme.ts — navneskema-vælgeren (F5.6/U3): global præference for hvilket
// alias-skema klassenavne vises i. Ren logik + en tynd cookie-læser til server-load.
import type { Cookies } from '@sveltejs/kit';

export const NAME_SCHEMES = ['TOPS', 'HISTORICAL', 'BUILDER'] as const;
export type NameScheme = (typeof NAME_SCHEMES)[number];

export const NAME_SCHEME_LABELS: Record<NameScheme, string> = {
	TOPS: 'TOPS',
	HISTORICAL: 'Historical',
	BUILDER: 'Builder names'
};

export const NAME_SCHEME_COOKIE = 'name_scheme';

export function isNameScheme(value: unknown): value is NameScheme {
	return typeof value === 'string' && (NAME_SCHEMES as readonly string[]).includes(value);
}

export interface AliasLike {
	alias: string;
	scheme: string;
}

/**
 * Vælger visningsnavn ud fra brugerens navneskema-præference. TOPS-navnet
 * (LocomotiveClass.name) er altid fallback, hvis der ikke findes en matchende alias.
 * HISTORICAL foretrækker PRE_TOPS (BR-interne pre-TOPS-koder/D-numre) frem for
 * ORIGINAL (selskabsnavne før nationalisering) — begge er "historiske" for brugeren.
 */
export function resolveDisplayName(
	topsName: string,
	aliases: AliasLike[],
	scheme: NameScheme
): string {
	if (scheme === 'BUILDER') {
		return aliases.find((a) => a.scheme === 'BUILDER')?.alias ?? topsName;
	}
	if (scheme === 'HISTORICAL') {
		const preTops = aliases.find((a) => a.scheme === 'PRE_TOPS');
		if (preTops) return preTops.alias;
		const original = aliases.find((a) => a.scheme === 'ORIGINAL');
		if (original) return original.alias;
		return topsName;
	}
	return topsName;
}

export function readNameSchemeCookie(cookies: Cookies): NameScheme {
	const raw = cookies.get(NAME_SCHEME_COOKIE);
	return isNameScheme(raw) ? raw : 'TOPS';
}
