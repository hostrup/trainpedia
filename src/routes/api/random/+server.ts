import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db.js';

export const GET: RequestHandler = async () => {
	const classes = await db.locomotiveClass.findMany({
		select: { wikidataQid: true }
	});

	if (classes.length === 0) {
		throw redirect(307, '/browse');
	}

	const randomClass = classes[Math.floor(Math.random() * classes.length)];
	throw redirect(307, `/class/${randomClass.wikidataQid}`);
};
