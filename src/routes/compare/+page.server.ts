import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ url }) => {
	const idsParam = url.searchParams.get('ids') ?? '';
	const qids = idsParam
		? idsParam
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean)
		: [];

	// Fetch selected classes
	const selectedClasses =
		qids.length > 0
			? await db.locomotiveClass.findMany({
					where: { wikidataQid: { in: qids } },
					select: {
						id: true,
						wikidataQid: true,
						name: true,
						nickname: true,
						regions: true,
						buildStart: true,
						buildEnd: true,
						totalBuilt: true,
						powerType: true,
						builder: true,
						media: {
							orderBy: { sortIndex: 'asc' },
							take: 1,
							select: { localPath: true, title: true }
						},
						aliases: { select: { alias: true, scheme: true } },
						specs: {
							select: { key: true, value: true, valueNumeric: true, unit: true }
						}
					}
				})
			: [];

	// Fetch all classes for picker
	const allSelectorClasses = await db.locomotiveClass.findMany({
		orderBy: { name: 'asc' },
		select: {
			wikidataQid: true,
			name: true,
			aliases: { select: { alias: true } }
		}
	});

	const formattedClasses = selectedClasses.map((c) => {
		const specMap = c.specs.reduce(
			(acc, s) => {
				acc[s.key] = { value: s.value, numeric: s.valueNumeric, unit: s.unit };
				return acc;
			},
			{} as Record<string, { value: string; numeric: number | null; unit: string | null }>
		);
		return {
			...c,
			specMap
		};
	});

	return {
		selectedClasses: formattedClasses,
		allSelectorClasses: allSelectorClasses.map((c) => ({
			qid: c.wikidataQid,
			name: c.name,
			aliases: c.aliases.map((a) => a.alias)
		})),
		qids
	};
};
