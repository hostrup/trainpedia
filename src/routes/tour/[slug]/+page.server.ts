import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const tour = await db.curatedTour.findUnique({
		where: { slug: params.slug },
		include: {
			steps: {
				orderBy: { sortIndex: 'asc' },
				include: {
					class: {
						include: {
							media: {
								orderBy: { sortIndex: 'asc' },
								take: 1
							},
							aliases: true,
							era: true
						}
					}
				}
			}
		}
	});

	if (!tour) {
		throw error(404, 'Curated tour not found');
	}

	const rawNameScheme = cookies.get('name_scheme');
	const nameScheme =
		rawNameScheme === 'HISTORICAL' || rawNameScheme === 'BUILDER' ? rawNameScheme : 'TOPS';

	return {
		tour,
		nameScheme
	};
};
