import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ params }) => {
	let cls;
	try {
		cls = await db.locomotiveClass.findUnique({
			where: { wikidataQid: params.qid },
			include: {
				era: true,
				specs: { orderBy: { sortIndex: 'asc' } },
				media: { orderBy: { sortIndex: 'asc' } },
				aliases: {
					select: {
						alias: true,
						scheme: true,
						fromYear: true,
						toYear: true,
						sourceUrl: true
					}
				},
				narratives: { orderBy: { sortIndex: 'asc' } },
				videos: { orderBy: { sortIndex: 'asc' } }
			}
		});
	} catch (err) {
		console.error(`Database query failed on /class/${params.qid}:`, err);
		throw error(503, 'Database unavailable. Please try again later.');
	}

	if (!cls) {
		throw error(404, `No locomotive class found for ${params.qid}`);
	}

	// Related classes v2: same powerType OR same builder
	const related = await db.locomotiveClass.findMany({
		where: {
			NOT: { id: cls.id },
			OR: [
				...(cls.powerType ? [{ powerType: cls.powerType }] : []),
				...(cls.builder ? [{ builder: cls.builder }] : [])
			]
		},
		orderBy: [{ buildStart: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
		take: 4,
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			traction: true,
			regions: true,
			buildStart: true,
			buildEnd: true,
			media: { orderBy: { sortIndex: 'asc' }, take: 1, select: { localPath: true, title: true } }
		}
	});

	// Fetch the fleet (preserves/in service etc)
	const fleet = await db.locomotive.findMany({
		where: { classId: cls.id },
		orderBy: { currentNumber: 'asc' },
		select: { currentNumber: true, currentName: true, status: true, location: true }
	});

	// Fetch all eras for lifespan-strip background
	const eras = await db.era.findMany({
		orderBy: { sortIndex: 'asc' }
	});

	// --- Calculate Records Held (top 3 in each leaderboard) ---
	const recordsHeld: Array<{ rank: number; label: string }> = [];

	// 1. Fastest
	const fastestRaw = await db.locomotiveClass.findMany({
		where: { specs: { some: { key: 'Top Speed', valueNumeric: { not: null } } } },
		select: {
			wikidataQid: true,
			specs: {
				where: { key: 'Top Speed' },
				select: { valueNumeric: true }
			}
		}
	});
	const fastestSorted = fastestRaw
		.filter((c) => c.specs[0]?.valueNumeric !== null)
		.sort((a, b) => (b.specs[0]?.valueNumeric ?? 0) - (a.specs[0]?.valueNumeric ?? 0));
	const fastestIdx = fastestSorted.findIndex((c) => c.wikidataQid === cls.wikidataQid);
	if (fastestIdx >= 0 && fastestIdx < 3) {
		recordsHeld.push({ rank: fastestIdx + 1, label: 'fastest diesel/electric class' });
	}

	// 2. Most Numerous
	const mostNumerousRaw = await db.locomotiveClass.findMany({
		where: { totalBuilt: { not: null } },
		orderBy: { totalBuilt: 'desc' },
		select: { wikidataQid: true }
	});
	const mostNumerousIdx = mostNumerousRaw.findIndex((c) => c.wikidataQid === cls.wikidataQid);
	if (mostNumerousIdx >= 0 && mostNumerousIdx < 3) {
		recordsHeld.push({ rank: mostNumerousIdx + 1, label: 'most numerous class built' });
	}

	// 3. Longest Lived
	const longestLivedRaw = await db.locomotiveClass.findMany({
		where: { serviceEntry: { not: null } },
		select: { wikidataQid: true, serviceEntry: true, serviceExit: true }
	});
	const longestLivedSorted = longestLivedRaw
		.map((c) => {
			const entry = new Date(c.serviceEntry!).getFullYear();
			const exit = c.serviceExit ? new Date(c.serviceExit).getFullYear() : new Date().getFullYear();
			return { qid: c.wikidataQid, years: Math.max(0, exit - entry) };
		})
		.sort((a, b) => b.years - a.years);
	const longestLivedIdx = longestLivedSorted.findIndex((c) => c.qid === cls.wikidataQid);
	if (longestLivedIdx >= 0 && longestLivedIdx < 3) {
		recordsHeld.push({ rank: longestLivedIdx + 1, label: 'longest-lived class in service' });
	}

	// 4. Most Survivors
	const survivorsRaw = await db.locomotiveClass.findMany({
		where: { locomotives: { some: { status: { in: ['PRESERVED', 'IN_SERVICE'] } } } },
		select: {
			wikidataQid: true,
			_count: {
				select: {
					locomotives: {
						where: { status: { in: ['PRESERVED', 'IN_SERVICE'] } }
					}
				}
			}
		}
	});
	const survivorsSorted = survivorsRaw
		.map((c) => ({ qid: c.wikidataQid, count: c._count.locomotives }))
		.sort((a, b) => b.count - a.count);
	const survivorsIdx = survivorsSorted.findIndex((c) => c.qid === cls.wikidataQid);
	if (survivorsIdx >= 0 && survivorsIdx < 3) {
		recordsHeld.push({ rank: survivorsIdx + 1, label: 'most preserved survivors' });
	}

	// 5. One-off
	if (cls.totalBuilt === 1) {
		recordsHeld.push({ rank: 1, label: 'one-off unique class' });
	}

	return {
		cls: {
			...cls,
			serviceEntry: cls.serviceEntry ? cls.serviceEntry.toISOString() : null,
			serviceExit: cls.serviceExit ? cls.serviceExit.toISOString() : null,
			retrievedAt: cls.retrievedAt ? cls.retrievedAt.toISOString() : null,
			era: { ...cls.era, retrievedAt: null },
			specs: cls.specs.map((s) => ({ ...s, retrievedAt: null })),
			media: cls.media.map((m) => ({ ...m, retrievedAt: null })),
			aliases: cls.aliases,
			narratives: cls.narratives.map((n) => ({ ...n, retrievedAt: null })),
			videos: cls.videos.map((v) => ({ ...v, retrievedAt: null }))
		},
		related,
		fleet,
		eras: eras.map((e) => ({ ...e, retrievedAt: null })),
		recordsHeld
	};
};
