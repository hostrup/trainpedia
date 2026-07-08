import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async () => {
	// 1. Fastest (Top Speed)
	const fastestRaw = await db.locomotiveClass.findMany({
		where: { specs: { some: { key: 'Top Speed', valueNumeric: { not: null } } } },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			specs: {
				where: { key: 'Top Speed' },
				select: { valueNumeric: true, value: true }
			},
			aliases: { select: { alias: true, scheme: true } }
		}
	});
	const fastest = fastestRaw
		.filter((c) => c.specs[0]?.valueNumeric !== null)
		.sort((a, b) => (b.specs[0]?.valueNumeric ?? 0) - (a.specs[0]?.valueNumeric ?? 0))
		.slice(0, 10);

	// 2. Most Numerous (Total Built)
	const mostNumerous = await db.locomotiveClass.findMany({
		where: { totalBuilt: { not: null } },
		orderBy: { totalBuilt: 'desc' },
		take: 10,
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			totalBuilt: true,
			aliases: { select: { alias: true, scheme: true } }
		}
	});

	// 3. Longest Lived (service exit - service entry span)
	const longestLivedRaw = await db.locomotiveClass.findMany({
		where: { serviceEntry: { not: null } },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			serviceEntry: true,
			serviceExit: true,
			aliases: { select: { alias: true, scheme: true } }
		}
	});
	const longestLived = longestLivedRaw
		.map((c) => {
			const entry = new Date(c.serviceEntry!).getFullYear();
			const exit = c.serviceExit ? new Date(c.serviceExit).getFullYear() : new Date().getFullYear();
			return {
				...c,
				years: Math.max(0, exit - entry),
				isStillInService: !c.serviceExit
			};
		})
		.sort((a, b) => b.years - a.years)
		.slice(0, 10);

	// 4. Most Survivors (count of locomotives with status PRESERVED or IN_SERVICE)
	const survivorsRaw = await db.locomotiveClass.findMany({
		where: { locomotives: { some: { status: { in: ['PRESERVED', 'IN_SERVICE'] } } } },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			aliases: { select: { alias: true, scheme: true } },
			_count: {
				select: {
					locomotives: {
						where: { status: { in: ['PRESERVED', 'IN_SERVICE'] } }
					}
				}
			}
		}
	});
	const survivors = survivorsRaw
		.map((c) => ({
			...c,
			count: c._count.locomotives
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	// 5. One-offs (totalBuilt == 1)
	const oneOffs = await db.locomotiveClass.findMany({
		where: { totalBuilt: 1 },
		orderBy: { buildStart: 'asc' },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			buildStart: true,
			aliases: { select: { alias: true, scheme: true } }
		}
	});

	return {
		records: {
			fastest: fastest.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				nickname: c.nickname,
				regions: c.regions,
				value: c.specs[0]?.value ?? '',
				aliases: c.aliases
			})),
			mostNumerous: mostNumerous.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				nickname: c.nickname,
				regions: c.regions,
				value: `${c.totalBuilt} built`,
				aliases: c.aliases
			})),
			longestLived: longestLived.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				nickname: c.nickname,
				regions: c.regions,
				value: `${c.years} years${c.isStillInService ? ' (active)' : ''}`,
				aliases: c.aliases
			})),
			survivors: survivors.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				nickname: c.nickname,
				regions: c.regions,
				value: `${c.count} preserved`,
				aliases: c.aliases
			})),
			oneOffs: oneOffs.map((c) => ({
				qid: c.wikidataQid,
				name: c.name,
				nickname: c.nickname,
				regions: c.regions,
				value: `Built ${c.buildStart ?? '—'}`, // Wait: string interpolation should be corrected
				aliases: c.aliases
			}))
		}
	};
};
