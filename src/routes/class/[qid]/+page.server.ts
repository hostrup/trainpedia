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
				aliases: { select: { alias: true, scheme: true } }
			}
		});
	} catch (err) {
		console.error(`Database query failed on /class/${params.qid}:`, err);
		throw error(503, 'Database unavailable. Please try again later.');
	}

	if (!cls) {
		throw error(404, `No locomotive class found for ${params.qid}`);
	}

	const related = await db.locomotiveClass.findMany({
		where: {
			eraId: cls.eraId,
			traction: cls.traction,
			NOT: { id: cls.id }
		},
		orderBy: [{ buildStart: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
		take: 4,
		select: {
			wikidataQid: true,
			name: true,
			nickname: true,
			traction: true,
			buildStart: true,
			buildEnd: true,
			media: { orderBy: { sortIndex: 'asc' }, take: 1, select: { localPath: true, title: true } }
		}
	});

	return {
		cls: {
			...cls,
			serviceEntry: cls.serviceEntry ? cls.serviceEntry.toISOString() : null,
			serviceExit: cls.serviceExit ? cls.serviceExit.toISOString() : null,
			retrievedAt: cls.retrievedAt ? cls.retrievedAt.toISOString() : null,
			era: { ...cls.era, retrievedAt: null },
			specs: cls.specs.map((s) => ({ ...s, retrievedAt: null })),
			media: cls.media.map((m) => ({ ...m, retrievedAt: null }))
		},
		related
	};
};
