import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ url }) => {
	const locationFilter = url.searchParams.get('location') ?? '';
	const locomotives = await db.locomotive.findMany({
		where: {
			status: { in: ['PRESERVED', 'IN_SERVICE'] },
			...(locationFilter ? { location: { contains: locationFilter, mode: 'insensitive' } } : {})
		},
		orderBy: [{ class: { name: 'asc' } }, { currentNumber: 'asc' }],
		select: {
			id: true,
			currentNumber: true,
			currentName: true,
			status: true,
			location: true,
			class: {
				select: {
					wikidataQid: true,
					name: true,
					regions: true,
					aliases: { select: { alias: true, scheme: true } }
				}
			}
		}
	});

	return {
		locomotives,
		locationFilter
	};
};
