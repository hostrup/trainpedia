import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import { mapLocomotiveClass } from '$lib/server/mapLocomotiveClass.js';
import type { Era } from '$lib/types.js';
import { dieselLayout } from '$lib/tubemap/dieselLayout.js';

const REGION_SLUGS = ['western', 'eastern', 'midland', 'southern', 'scottish'] as const;
type RegionSlug = (typeof REGION_SLUGS)[number];

function isRegionSlug(value: string): value is RegionSlug {
	return (REGION_SLUGS as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug.toLowerCase();
	if (!isRegionSlug(slug)) {
		throw error(404, `Unknown region line: ${params.slug}`);
	}

	const regionUpper = slug.toUpperCase();
	// Find all wikidataQids matching this region in our layout
	const matchingQids = dieselLayout
		.filter((item) => (item.regions as readonly string[]).includes(regionUpper))
		.map((item) => item.qid);

	let dbEras;
	let dbClasses;
	try {
		[dbEras, dbClasses] = await Promise.all([
			db.era.findMany({ orderBy: { sortIndex: 'asc' } }),
			db.locomotiveClass.findMany({
				where: {
					wikidataQid: {
						in: matchingQids
					}
				},
				include: {
					specs: { orderBy: { sortIndex: 'asc' } },
					media: { orderBy: { sortIndex: 'asc' } },
					aliases: { select: { alias: true, scheme: true } }
				}
			})
		]);
	} catch (err) {
		console.error(`Database query failed on /line/${params.slug}:`, err);
		throw error(503, 'Database unavailable. Please try again later.');
	}

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
		traction: regionUpper as 'WESTERN' | 'EASTERN' | 'MIDLAND' | 'SOUTHERN' | 'SCOTTISH',
		eras,
		classes: dbClasses.map(mapLocomotiveClass)
	};
};
