import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ params }) => {
	let loco;
	try {
		loco = await db.locomotive.findFirst({
			where: {
				OR: [{ currentNumber: params.number }, { identities: { some: { number: params.number } } }]
			},
			include: {
				class: { select: { wikidataQid: true, name: true, traction: true, regions: true } },
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

	const allNumbers = [loco.currentNumber, ...loco.identities.map((i) => i.number)];
	const media = await db.mediaAsset.findMany({
		where: { classId: loco.classId, locoNumber: { in: allNumbers } },
		orderBy: { sortIndex: 'asc' }
	});

	// Siblings navigation
	const siblings = await db.locomotive.findMany({
		where: { classId: loco.classId },
		orderBy: { currentNumber: 'asc' },
		select: { currentNumber: true }
	});

	const currentIndex = siblings.findIndex((s) => s.currentNumber === loco.currentNumber);
	const prevLoco = currentIndex > 0 ? siblings[currentIndex - 1].currentNumber : null;
	const nextLoco =
		currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].currentNumber : null;

	// Fallback media if no individual media exists
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let fallbackMedia: any[] = [];
	const hasIndividualMedia = media.length > 0;
	if (!hasIndividualMedia) {
		fallbackMedia = await db.mediaAsset.findMany({
			where: { classId: loco.classId },
			orderBy: { sortIndex: 'asc' },
			take: 6
		});
	}

	return {
		loco: {
			...loco,
			retrievedAt: loco.retrievedAt ? loco.retrievedAt.toISOString() : null,
			identities: loco.identities.map((i) => ({ ...i, retrievedAt: null }))
		},
		media: media.map((m) => ({ ...m, retrievedAt: null })),
		fallbackMedia: fallbackMedia.map((m) => ({ ...m, retrievedAt: null })),
		hasIndividualMedia,
		prevLoco,
		nextLoco
	};
};
