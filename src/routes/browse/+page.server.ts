import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import type { Prisma } from '@prisma/client';

/**
 * F11.1: /browse — "The Roster". One dataset, four lenses.
 * All filter/sort/view state lives in the URL for shareability and SSR.
 */
export const load: PageServerLoad = async ({ url }) => {
	const lens = url.searchParams.get('lens') ?? 'grid';
	const q = url.searchParams.get('q')?.trim() ?? '';
	const era = url.searchParams.get('era') ?? '';
	const region = url.searchParams.get('region') ?? '';
	const type = url.searchParams.get('type') ?? '';
	const wheel = url.searchParams.get('wheel') ?? '';
	const builder = url.searchParams.get('builder') ?? '';
	const decade = url.searchParams.get('decade') ?? '';
	const surviving = url.searchParams.get('surviving') ?? '';
	const group = url.searchParams.get('group') ?? 'none';
	const sort = url.searchParams.get('sort') ?? 'year';
	const dir = (url.searchParams.get('dir') ?? 'asc') as 'asc' | 'desc';
	const sel = url.searchParams.get('sel') ?? '';
	const x = url.searchParams.get('x') ?? 'speed';
	const y = url.searchParams.get('y') ?? 'power';

	// Build Prisma where clause
	const where: Prisma.LocomotiveClassWhereInput = {};
	const conditions: Prisma.LocomotiveClassWhereInput[] = [];

	if (q) {
		conditions.push({
			OR: [
				{ name: { contains: q, mode: 'insensitive' } },
				{ nickname: { contains: q, mode: 'insensitive' } },
				{ aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } }
			]
		});
	}
	if (era) conditions.push({ era: { slug: era } });
	if (region) conditions.push({ regions: { has: region } });
	if (type) {
		const typeValue = type === 'shunter' ? 'SHUNTER' : `TYPE_${type}`;
		conditions.push({ powerType: typeValue });
	}
	if (wheel) conditions.push({ wheelArrangement: wheel });
	if (builder) conditions.push({ builder: { contains: builder, mode: 'insensitive' } });
	if (decade) {
		const decadeStart = parseInt(decade, 10);
		if (!isNaN(decadeStart)) {
			conditions.push({
				buildStart: { gte: decadeStart, lt: decadeStart + 10 }
			});
		}
	}
	if (surviving === 'yes') {
		conditions.push({
			locomotives: { some: { status: { in: ['PRESERVED', 'IN_SERVICE'] } } }
		});
	}

	if (conditions.length > 0) where.AND = conditions;

	// Build orderBy
	type OrderSpec = Prisma.LocomotiveClassOrderByWithRelationInput;
	const nullsPos = dir === 'asc' ? 'last' : 'first';
	let orderBy: OrderSpec[];

	switch (sort) {
		case 'year':
			orderBy = [{ buildStart: { sort: dir, nulls: nullsPos } }, { name: 'asc' }];
			break;
		case 'name':
			orderBy = [{ name: dir }];
			break;
		case 'built':
			orderBy = [{ totalBuilt: { sort: dir, nulls: nullsPos } }, { name: 'asc' }];
			break;
		case 'number': {
			// Sort by TOPS number extracted from class name — handled client-side
			orderBy = [{ name: dir }];
			break;
		}
		default:
			// power, speed, te — need to sort by spec values, handled client-side
			orderBy = [{ buildStart: { sort: dir, nulls: nullsPos } }, { name: 'asc' }];
	}

	const [allEras, total, classes] = await Promise.all([
		db.era.findMany({
			orderBy: { sortIndex: 'asc' },
			select: {
				id: true,
				slug: true,
				name: true,
				startYear: true,
				endYear: true,
				narrative: true,
				sourceUrl: true,
				sourceRevision: true
			}
		}),
		db.locomotiveClass.count(),
		db.locomotiveClass.findMany({
			where,
			orderBy,
			select: {
				id: true,
				wikidataQid: true,
				name: true,
				nickname: true,
				traction: true,
				regions: true,
				wheelArrangement: true,
				buildStart: true,
				buildEnd: true,
				serviceEntry: true,
				serviceExit: true,
				totalBuilt: true,
				powerType: true,
				builder: true,
				isLandmark: true,
				era: { select: { slug: true, name: true, startYear: true, endYear: true } },
				media: {
					orderBy: { sortIndex: 'asc' },
					take: 1,
					select: { localPath: true, title: true, attribution: true }
				},
				aliases: { select: { alias: true, scheme: true } },
				specs: {
					where: { key: { in: ['Power Output', 'Top Speed', 'Tractive Effort'] } },
					select: { key: true, value: true, valueNumeric: true, unit: true }
				},
				_count: {
					select: {
						locomotives: {
							where: { status: { in: ['PRESERVED', 'IN_SERVICE'] } }
						}
					}
				}
			}
		})
	]);

	// Compute facet counts for filter dropdowns
	const allRegions = [...new Set(classes.flatMap((c) => c.regions))].sort();
	const allPowerTypes = [...new Set(classes.map((c) => c.powerType).filter(Boolean))].sort();
	const allWheelArr = [...new Set(classes.map((c) => c.wheelArrangement).filter(Boolean))].sort();
	const allBuilders = [...new Set(classes.map((c) => c.builder).filter(Boolean))].sort();
	const allDecades = [
		...new Set(
			classes.map((c) => (c.buildStart ? Math.floor(c.buildStart / 10) * 10 : null)).filter(Boolean)
		)
	].sort();

	// Compute stats per era across the entire database (unfiltered)
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

	const eraIdsWithClasses = new Set(rawStats.map((e) => e.eraId));
	const visibleEras = allEras
		.filter((e) => eraIdsWithClasses.has(e.id))
		.map((e) => ({
			id: e.id,
			slug: e.slug,
			name: e.name,
			startYear: e.startYear,
			endYear: e.endYear,
			narrative: e.narrative,
			sourceUrl: e.sourceUrl,
			sourceRevision: e.sourceRevision
		}));

	// Selected class for quick-view
	let selectedClass = null;
	if (sel) {
		selectedClass = await db.locomotiveClass.findUnique({
			where: { wikidataQid: sel },
			select: {
				id: true,
				wikidataQid: true,
				name: true,
				nickname: true,
				traction: true,
				regions: true,
				wheelArrangement: true,
				buildStart: true,
				buildEnd: true,
				serviceEntry: true,
				serviceExit: true,
				totalBuilt: true,
				powerType: true,
				builder: true,
				narrative: true,
				isLandmark: true,
				sourceUrl: true,
				era: { select: { slug: true, name: true } },
				media: {
					orderBy: { sortIndex: 'asc' },
					take: 8,
					select: { localPath: true, title: true, year: true, attribution: true }
				},
				specs: {
					orderBy: { sortIndex: 'asc' },
					select: { key: true, value: true, unit: true, valueNumeric: true }
				},
				aliases: { select: { alias: true, scheme: true } },
				_count: { select: { locomotives: true } }
			}
		});
	}

	return {
		lens,
		classes: classes.map((c) => ({
			...c,
			survivingCount: c._count.locomotives,
			specs: c.specs.reduce(
				(acc, s) => {
					acc[s.key] = { value: s.value, numeric: s.valueNumeric, unit: s.unit };
					return acc;
				},
				{} as Record<string, { value: string; numeric: number | null; unit: string | null }>
			)
		})),
		selectedClass,
		eras: visibleEras,
		eraStats: Object.fromEntries(statsByEra),
		total,
		facets: {
			regions: allRegions,
			powerTypes: allPowerTypes as string[],
			wheelArrangements: allWheelArr as string[],
			builders: allBuilders as string[],
			decades: allDecades as number[]
		},
		filters: {
			q,
			era,
			region,
			type,
			wheel,
			builder,
			decade,
			surviving,
			group,
			sort,
			dir,
			sel,
			x,
			y
		}
	};
};
