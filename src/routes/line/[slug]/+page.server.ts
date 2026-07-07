import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import { mapLocomotiveClass } from '$lib/server/mapLocomotiveClass.js';
import type { Era, TractionType } from '$lib/types.js';

const TRACTION_SLUGS = ['steam', 'diesel', 'electric', 'other'] as const;
type TractionSlug = (typeof TRACTION_SLUGS)[number];

function isTractionSlug(value: string): value is TractionSlug {
	return (TRACTION_SLUGS as readonly string[]).includes(value);
}

const SLUG_TO_TRACTION: Record<TractionSlug, TractionType> = {
	steam: 'STEAM',
	diesel: 'DIESEL',
	electric: 'ELECTRIC',
	other: 'OTHER'
};

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug.toLowerCase();
	if (!isTractionSlug(slug)) {
		throw error(404, `Unknown line: ${params.slug}`);
	}
	const traction: TractionType = SLUG_TO_TRACTION[slug];

	let dbEras;
	let dbClasses;
	try {
		[dbEras, dbClasses] = await Promise.all([
			db.era.findMany({ orderBy: { sortIndex: 'asc' } }),
			db.locomotiveClass.findMany({
				where: { traction },
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
		traction,
		eras,
		classes: dbClasses.map(mapLocomotiveClass)
	};
};
