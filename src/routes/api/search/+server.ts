import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) {
		return json({ classes: [], individuals: [] });
	}

	// 1. Search Classes (max 5)
	const classes = await db.locomotiveClass.findMany({
		where: {
			OR: [
				{ name: { contains: q, mode: 'insensitive' } },
				{ nickname: { contains: q, mode: 'insensitive' } },
				{ aliases: { some: { alias: { contains: q, mode: 'insensitive' } } } }
			]
		},
		take: 5,
		orderBy: { name: 'asc' },
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			regions: true,
			buildStart: true,
			buildEnd: true,
			aliases: {
				where: { alias: { contains: q, mode: 'insensitive' } },
				select: { alias: true, scheme: true }
			}
		}
	});

	const mappedClasses = classes.map((c) => {
		let matchSource = null;
		if (c.aliases.length > 0) {
			const matchingAlias = c.aliases[0];
			const schemeLabel = matchingAlias.scheme.replace('_', ' ');
			matchSource = `${matchingAlias.alias} — ${schemeLabel.toLowerCase()} label`;
		}
		return {
			qid: c.wikidataQid,
			name: c.name,
			nickname: c.nickname,
			regions: c.regions,
			buildStart: c.buildStart,
			buildEnd: c.buildEnd,
			matchSource
		};
	});

	// 2. Search Individuals (max 5)
	const individuals = await db.locomotive.findMany({
		where: {
			OR: [
				{ currentNumber: { contains: q, mode: 'insensitive' } },
				{ currentName: { contains: q, mode: 'insensitive' } },
				{
					identities: {
						some: {
							OR: [
								{ number: { contains: q, mode: 'insensitive' } },
								{ name: { contains: q, mode: 'insensitive' } }
							]
						}
					}
				}
			]
		},
		take: 5,
		orderBy: { currentNumber: 'asc' },
		select: {
			currentNumber: true,
			currentName: true,
			status: true,
			class: {
				select: {
					name: true,
					wikidataQid: true
				}
			},
			identities: {
				where: {
					OR: [
						{ number: { contains: q, mode: 'insensitive' } },
						{ name: { contains: q, mode: 'insensitive' } }
					]
				},
				select: { number: true, name: true }
			}
		}
	});

	const mappedIndividuals = individuals.map((i) => {
		let matchSource = null;
		if (i.identities.length > 0) {
			const matched = i.identities[0];
			matchSource = `Formerly ${matched.number}${matched.name ? ` "${matched.name}"` : ''}`;
		}
		return {
			currentNumber: i.currentNumber,
			currentName: i.currentName,
			status: i.status,
			className: i.class.name,
			classQid: i.class.wikidataQid,
			matchSource
		};
	});

	return json({
		classes: mappedClasses,
		individuals: mappedIndividuals
	});
};
