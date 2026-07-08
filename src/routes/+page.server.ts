import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

/**
 * F11.3: The Great Hall — the museum's foyer.
 * Loads stat-tiles, featured exhibits, era overview, mini-leaderboards, and daily photo.
 */
export const load: PageServerLoad = async () => {
	// Stats
	const [classCount, locomotiveCount, mediaCount] = await Promise.all([
		db.locomotiveClass.count(),
		db.locomotive.count(),
		db.mediaAsset.count()
	]);
	const preservedCount = await db.locomotive.count({
		where: { status: { in: ['PRESERVED', 'IN_SERVICE'] } }
	});
	const classesWithFleet = await db.locomotiveClass.count({
		where: { locomotives: { some: {} } }
	});

	// Featured exhibits (landmarks with media)
	const featured = await db.locomotiveClass.findMany({
		where: { isLandmark: true, media: { some: {} } },
		take: 4,
		orderBy: { buildStart: 'asc' },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			narrative: true,
			regions: true,
			buildStart: true,
			totalBuilt: true,
			media: {
				orderBy: { sortIndex: 'asc' },
				take: 1,
				select: { localPath: true, title: true }
			},
			aliases: { select: { alias: true, scheme: true } }
		}
	});

	// Compute stats per era across the entire database
	const rawStats = await db.locomotiveClass.findMany({
		select: {
			eraId: true,
			totalBuilt: true,
			_count: {
				select: {
					locomotives: {
						where: { status: { in: ['PRESERVED', 'IN_SERVICE'] } }
					}
				}
			}
		}
	});

	const statsByEra = new Map<
		number,
		{ classesCount: number; builtCount: number; preservedCount: number }
	>();
	for (const c of rawStats) {
		const curr = statsByEra.get(c.eraId) ?? { classesCount: 0, builtCount: 0, preservedCount: 0 };
		curr.classesCount += 1;
		curr.builtCount += c.totalBuilt ?? 0;
		curr.preservedCount += c._count.locomotives;
		statsByEra.set(c.eraId, curr);
	}

	// Eras (non-empty only)
	const eras = await db.era.findMany({
		orderBy: { sortIndex: 'asc' },
		select: {
			id: true,
			slug: true,
			name: true,
			startYear: true,
			endYear: true,
			narrative: true,
			sourceUrl: true,
			sourceRevision: true,
			_count: { select: { classes: true } }
		}
	});
	const visibleEras = eras
		.filter((e) => e._count.classes > 0)
		.map((e) => ({
			id: e.id,
			slug: e.slug,
			name: e.name,
			startYear: e.startYear,
			endYear: e.endYear,
			narrative: e.narrative,
			sourceUrl: e.sourceUrl,
			sourceRevision: e.sourceRevision,
			classCount: e._count.classes
		}));

	// Mini-leaderboards: Fastest, Most numerous, Longest lived
	const fastest = await db.locomotiveClass.findMany({
		where: { specs: { some: { key: 'Top Speed', valueNumeric: { not: null } } } },
		orderBy: { specs: { _count: 'desc' } }, // We'll sort client-side by valueNumeric
		take: 98, // Get all, sort client-side
		select: {
			wikidataQid: true,
			name: true,
			specs: {
				where: { key: 'Top Speed' },
				select: { valueNumeric: true, value: true }
			},
			aliases: { select: { alias: true, scheme: true } }
		}
	});
	const fastestSorted = fastest
		.filter((c) => c.specs[0]?.valueNumeric)
		.sort((a, b) => (b.specs[0]?.valueNumeric ?? 0) - (a.specs[0]?.valueNumeric ?? 0))
		.slice(0, 3);

	const mostNumerous = await db.locomotiveClass.findMany({
		where: { totalBuilt: { not: null } },
		orderBy: { totalBuilt: 'desc' },
		take: 3,
		select: {
			wikidataQid: true,
			name: true,
			totalBuilt: true,
			aliases: { select: { alias: true, scheme: true } }
		}
	});

	// Longest lived: classes with biggest serviceExit - serviceEntry span
	const longestLived = await db.locomotiveClass.findMany({
		where: { serviceEntry: { not: null }, serviceExit: { not: null } },
		take: 98,
		select: {
			wikidataQid: true,
			name: true,
			serviceEntry: true,
			serviceExit: true,
			aliases: { select: { alias: true, scheme: true } }
		}
	});
	const longestSorted = longestLived
		.map((c) => ({
			...c,
			years:
				c.serviceExit && c.serviceEntry
					? new Date(c.serviceExit).getFullYear() - new Date(c.serviceEntry).getFullYear()
					: 0
		}))
		.sort((a, b) => b.years - a.years)
		.slice(0, 3);

	// Daily photo (deterministic by date)
	const allPhotos = await db.mediaAsset.findMany({
		where: { title: { not: null } },
		take: 100,
		orderBy: { sortIndex: 'asc' },
		select: {
			localPath: true,
			title: true,
			year: true,
			attribution: true,
			license: true,
			class: { select: { name: true, wikidataQid: true } }
		}
	});
	const dayOfYear = Math.floor(
		(Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
	);
	const dailyPhoto = allPhotos.length > 0 ? allPhotos[dayOfYear % allPhotos.length] : null;

	return {
		stats: {
			classCount,
			locomotiveCount,
			preservedCount,
			mediaCount,
			classesWithFleet
		},
		featured,
		eras: visibleEras,
		eraStats: Object.fromEntries(statsByEra),
		leaderboards: {
			fastest: fastestSorted.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				value: c.specs[0]?.value ?? '',
				aliases: c.aliases
			})),
			mostNumerous: mostNumerous.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				value: `${c.totalBuilt} built`,
				aliases: c.aliases
			})),
			longestLived: longestSorted.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				value: `${c.years} years`,
				aliases: c.aliases
			}))
		},
		dailyPhoto
	};
};
