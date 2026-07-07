import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { NAME_SCHEME_COOKIE, isNameScheme } from '$lib/nameScheme.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	const scheme = body?.scheme;

	if (!isNameScheme(scheme)) {
		return json({ error: 'Invalid name scheme' }, { status: 400 });
	}

	cookies.set(NAME_SCHEME_COOKIE, scheme, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax'
	});

	return json({ ok: true });
};
