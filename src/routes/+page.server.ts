import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import type { Era, LocomotiveClass } from '$lib/types.js';

export const load: PageServerLoad = async () => {
	try {
		// Fetch all eras sorted by sortIndex
		const dbEras = await db.era.findMany({
			orderBy: { sortIndex: 'asc' }
		});

		// Fetch all locomotive classes with specs and media assets
		const dbClasses = await db.locomotiveClass.findMany({
			include: {
				specs: {
					orderBy: { sortIndex: 'asc' }
				},
				media: {
					orderBy: { sortIndex: 'asc' }
				},
				aliases: {
					select: { alias: true, scheme: true }
				}
			}
		});

		const eras: Era[] = dbEras.map((e) => ({
			id: e.id,
			slug: e.slug,
			name: e.name,
			startYear: e.startYear,
			endYear: e.endYear,
			sortIndex: e.sortIndex,
			narrative: e.narrative
		}));

		const classes: LocomotiveClass[] = dbClasses.map((c) => ({
			id: c.id,
			wikidataQid: c.wikidataQid,
			name: c.name,
			nickname: c.nickname,
			traction: c.traction,
			wheelArrangement: c.wheelArrangement,
			serviceEntry: c.serviceEntry ? c.serviceEntry.toISOString() : null,
			serviceExit: c.serviceExit ? c.serviceExit.toISOString() : null,
			buildStart: c.buildStart,
			buildEnd: c.buildEnd,
			totalBuilt: c.totalBuilt,
			eraId: c.eraId,
			narrative: c.narrative,
			isLandmark: c.isLandmark,
			aliases: c.aliases,
			specs: c.specs.map((s) => ({
				id: s.id,
				key: s.key,
				value: s.value,
				unit: s.unit,
				sortIndex: s.sortIndex
			})),
			media: c.media.map((m) => ({
				id: m.id,
				kind: m.kind,
				localPath: m.localPath,
				width: m.width,
				height: m.height,
				title: m.title,
				year: m.year,
				locoNumber: m.locoNumber,
				anecdote: m.anecdote,
				commonsUrl: m.commonsUrl,
				license: m.license,
				attribution: m.attribution,
				sortIndex: m.sortIndex
			}))
		}));

		return {
			eras,
			classes
		};
	} catch (err) {
		console.error('Database connection failed in server load:', err);
		throw error(503, 'Database connection failed. Please try again later.');
	}
};
