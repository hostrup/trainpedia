import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const toursData = [
	{
		slug: 'the-deltic-story',
		title: 'The Deltics: Masters of the East Coast',
		description:
			'Follow the rise of the iconic twin-engined English Electric giants, from experimental prototypes to the legendary Class 55 fleet that dominated express travel on the East Coast Main Line.',
		sortIndex: 1,
		steps: [
			{
				classQid: 'Q4970925', // English Electric DP2
				sortIndex: 1,
				narrative:
					'Before committing to the Deltic fleet, British Railways and English Electric tested the single-engined prototype DP2 starting in 1962. DP2 proved exceptionally successful, logging over 360,000 miles of express passenger service on the East Coast Main Line before a tragic collision at speed ended its career in 1967. Its reliability proved the viability of high-power diesel locomotives for express passenger trains.'
			},
			{
				classQid: 'Q796898', // Class 55
				sortIndex: 2,
				narrative:
					'Following successful prototype trials, the production Class 55 "Deltic" fleet of 22 locomotives entered service in 1961. Powered by twin marine-derived Napier Deltic engines, they became absolute legends of speed, sound, and presence. For twenty years, they dominated express passenger schedules between London King\'s Cross and Edinburgh, capturing the hearts of rail enthusiasts before being replaced by the High Speed Train.'
			}
		]
	},
	{
		slug: 'pilot-scheme-failures',
		title: 'The Modernisation Plan Failures',
		description:
			'The rush to eliminate steam under the 1955 Modernisation Plan led to ordering unproven diesel designs directly off the drawing board. Explore three of the most notorious mechanical disasters in BR history.',
		sortIndex: 2,
		steps: [
			{
				classQid: 'Q4970753', // Class 21
				sortIndex: 1,
				narrative:
					'Constructed by the North British Locomotive Company, the 58 Class 21 locomotives entered service from 1958. They were plagued by severe unreliability, including frequent engine cooling failures and manifold fires. Their mechanical record was so poor that many were withdrawn within less than ten years of service, leading to huge financial losses for British Railways.'
			},
			{
				classQid: 'Q3306004', // Class 28
				sortIndex: 2,
				narrative:
					'The 20 Metropolitan-Vickers Class 28 locomotives were built in 1958 with a unique asymmetric Co-Bo wheel arrangement and a two-stroke Crossley diesel engine. They suffered from intense exhaust smoke, excessive vibration that caused cab windows to fall out, and frequent engine seizures, making them a costly embarrassment that was retired prematurely.'
			},
			{
				classQid: 'Q4970761', // Class 23
				sortIndex: 3,
				narrative:
					'The 10 "Baby Deltics" were built in 1959 by English Electric, powered by a single 9-cylinder version of the Deltic engine. They suffered from constant cylinder head fractures and cooling failures. Despite a complete engine refurbishment program in the mid-1960s, they remained troublesome and were all withdrawn by 1971.'
			}
		]
	},
	{
		slug: 'high-speed-revolution',
		title: 'The High Speed Revolution',
		description:
			'How British Rail achieved high-speed travel at 125 mph using diesel power, reviving passenger numbers and setting world records.',
		sortIndex: 3,
		steps: [
			{
				classQid: 'Q4970802', // Class 41 (HST prototype)
				sortIndex: 1,
				narrative:
					'Built in 1972, the prototype High Speed Train consisted of two Class 41 power cars framing a set of new Mark 3 passenger carriages. This experimental set reached a record-breaking speed of 143 mph in 1973, proving the capability of diesel-powered high-speed rail and laying the groundwork for the production fleet.'
			},
			{
				classQid: 'Q1080162', // Class 43 (HST)
				sortIndex: 2,
				narrative:
					'The production InterCity 125 fleet (Class 43 power cars) entered service in 1976. Operating at a regular speed of 125 mph, they transformed travel times between London and major cities, saved the railway network from decline, and became the most successful high-speed diesel train in world history, remaining in service for over 45 years.'
			}
		]
	}
];

async function main() {
	console.log('Seeding curated tours (U9)...');

	for (const t of toursData) {
		const tour = await prisma.curatedTour.upsert({
			where: { slug: t.slug },
			update: {
				title: t.title,
				description: t.description,
				sortIndex: t.sortIndex
			},
			create: {
				slug: t.slug,
				title: t.title,
				description: t.description,
				sortIndex: t.sortIndex
			}
		});

		// Clear existing steps for this tour to remain idempotent
		await prisma.curatedTourStep.deleteMany({
			where: { tourId: tour.id }
		});

		for (const step of t.steps) {
			const cls = await prisma.locomotiveClass.findUnique({
				where: { wikidataQid: step.classQid }
			});

			if (!cls) {
				console.warn(`  ⚠ LocomotiveClass not found for QID: ${step.classQid}. Skipping step.`);
				continue;
			}

			await prisma.curatedTourStep.create({
				data: {
					tourId: tour.id,
					classId: cls.id,
					sortIndex: step.sortIndex,
					narrative: step.narrative
				}
			});
		}
		console.log(`  Seeded tour: ${t.slug}`);
	}

	console.log('Curated tours seed complete.');
}

main()
	.catch((err) => {
		console.error('Fatal error seeding curated tours:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
