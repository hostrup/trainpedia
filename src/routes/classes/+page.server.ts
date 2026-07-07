import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import type { Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const eraSlug = url.searchParams.get('era') ?? '';
	const traction = url.searchParams.get('traction') ?? '';

	const where: Prisma.LocomotiveClassWhereInput = {};
	if (q) {
		where.OR = [
			{ name: { contains: q, mode: 'insensitive' } },
			{ nickname: { contains: q, mode: 'insensitive' } }
		];
	}
	if (eraSlug) where.era = { slug: eraSlug };
	if (
		traction === 'STEAM' ||
		traction === 'DIESEL' ||
		traction === 'ELECTRIC' ||
		traction === 'OTHER'
	) {
		where.traction = traction;
	}

	try {
		const [eras, total, classes] = await Promise.all([
			db.era.findMany({ orderBy: { sortIndex: 'asc' } }),
			db.locomotiveClass.count(),
			db.locomotiveClass.findMany({
				where,
				orderBy: [{ buildStart: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
				select: {
					wikidataQid: true,
					name: true,
					nickname: true,
					traction: true,
					wheelArrangement: true,
					buildStart: true,
					buildEnd: true,
					totalBuilt: true,
					era: { select: { slug: true, name: true } },
					media: {
						orderBy: { sortIndex: 'asc' },
						take: 1,
						select: { localPath: true, title: true }
					}
				}
			})
		]);

		return {
			classes,
			eras: eras.map((e) => ({ slug: e.slug, name: e.name })),
			total,
			filters: { q, era: eraSlug, traction }
		};
	} catch (err) {
		console.error('Database query failed on /classes:', err);
		throw error(503, 'Database unavailable. Please try again later.');
	}
};
