import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import type { Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const eraSlug = url.searchParams.get('era') ?? '';

	const where: Prisma.LocomotiveClassWhereInput = {};
	if (q) {
		// Søgning matcher navn, kaldenavn OG alle aliasser (D6700, "Tractor", English Electric
		// Type 3 osv.) — F5.2/U3-kravet om at kunne finde en klasse uanset hvilket navn man kender.
		where.OR = [
			{ name: { contains: q, mode: 'insensitive' } },
			{ nickname: { contains: q, mode: 'insensitive' } },
			{ aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } }
		];
	}
	if (eraSlug) where.era = { slug: eraSlug };

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
					regions: true,
					wheelArrangement: true,
					buildStart: true,
					buildEnd: true,
					totalBuilt: true,
					era: { select: { slug: true, name: true } },
					media: {
						orderBy: { sortIndex: 'asc' },
						take: 1,
						select: { localPath: true, title: true }
					},
					aliases: { select: { alias: true, scheme: true } }
				}
			})
		]);

		// F9.3: Also search for individual locomotives by number/name
		let individuals: {
			currentNumber: string;
			currentName: string | null;
			status: string;
			className: string;
		}[] = [];

		if (q) {
			const locos = await db.locomotive.findMany({
				where: {
					OR: [
						{ currentNumber: { contains: q, mode: 'insensitive' } },
						{ currentName: { contains: q, mode: 'insensitive' } },
						{ identities: { some: { number: { contains: q, mode: 'insensitive' } } } }
					]
				},
				take: 20,
				select: {
					currentNumber: true,
					currentName: true,
					status: true,
					class: { select: { name: true } }
				}
			});
			individuals = locos.map((l) => ({
				currentNumber: l.currentNumber,
				currentName: l.currentName,
				status: l.status,
				className: l.class.name
			}));
		}

		return {
			classes,
			individuals,
			eras: eras.map((e) => ({ slug: e.slug, name: e.name })),
			total,
			filters: { q, era: eraSlug }
		};
	} catch (err) {
		console.error('Database query failed on /classes:', err);
		throw error(503, 'Database unavailable. Please try again later.');
	}
};

