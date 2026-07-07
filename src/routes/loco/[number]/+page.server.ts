import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ params }) => {
	let loco;
	try {
		// Søgning finder individet på nuværende ELLER ethvert historisk nummer
		// (D6607 finder samme individ som 37403) — samme princip som alias-søgning i F5.2.
		loco = await db.locomotive.findFirst({
			where: {
				OR: [{ currentNumber: params.number }, { identities: { some: { number: params.number } } }]
			},
			include: {
				class: { select: { wikidataQid: true, name: true, traction: true } },
				identities: { orderBy: { sortIndex: 'asc' } }
			}
		});
	} catch (err) {
		console.error(`Database query failed on /loco/${params.number}:`, err);
		throw error(503, 'Database unavailable. Please try again later.');
	}

	if (!loco) {
		throw error(404, `No locomotive found for number ${params.number}`);
	}

	// F6.4: kobler eksisterende MediaAsset-rækker (allerede downloadet klasse-medie) til
	// individet, hvis Commons-metadata (03-media.ts) fangede et loco-nummer der matcher.
	const allNumbers = [loco.currentNumber, ...loco.identities.map((i) => i.number)];
	const media = await db.mediaAsset.findMany({
		where: { classId: loco.classId, locoNumber: { in: allNumbers } },
		orderBy: { sortIndex: 'asc' }
	});

	return {
		loco: {
			...loco,
			retrievedAt: loco.retrievedAt ? loco.retrievedAt.toISOString() : null,
			identities: loco.identities.map((i) => ({ ...i, retrievedAt: null }))
		},
		media: media.map((m) => ({ ...m, retrievedAt: null }))
	};
};
