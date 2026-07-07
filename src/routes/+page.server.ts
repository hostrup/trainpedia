import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import { mapLocomotiveClass } from '$lib/server/mapLocomotiveClass.js';
import type { Era } from '$lib/types.js';

export const load: PageServerLoad = async () => {
	try {
		const dbEras = await db.era.findMany({
			orderBy: { sortIndex: 'asc' }
		});

		const dbClasses = await db.locomotiveClass.findMany({
			include: {
				specs: { orderBy: { sortIndex: 'asc' } },
				media: { orderBy: { sortIndex: 'asc' } },
				aliases: { select: { alias: true, scheme: true } }
			}
		});

		const eras: Era[] = dbEras.map((e) => ({
			id: e.id,
			slug: e.slug,
			name: e.name,
			startYear: e.startYear,
			endYear: e.endYear,
			sortIndex: e.sortIndex,
			narrative: e.narrative
		}));

		return {
			eras,
			classes: dbClasses.map(mapLocomotiveClass)
		};
	} catch (err) {
		console.error('Database connection failed in server load:', err);
		throw error(503, 'Database connection failed. Please try again later.');
	}
};
