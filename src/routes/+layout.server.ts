import type { LayoutServerLoad } from './$types.js';
import { readNameSchemeCookie } from '$lib/nameScheme.js';

export const load: LayoutServerLoad = ({ cookies }) => {
	return { nameScheme: readNameSchemeCookie(cookies) };
};
