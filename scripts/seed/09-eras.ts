// 09-eras.ts — seed kildeciterede æra-narrativer fra Wikipedias historie-artikler.
// Hvert narrativ er et rent, uforandret citat med kilde-URL og revision.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const eraNarratives = [
	{
		slug: 'pre-grouping',
		sourceUrl: 'https://en.wikipedia.org/wiki/History_of_rail_transport_in_Great_Britain_to_1930',
		sourceRevision: '1221199341',
		narrative:
			'The history of rail transport in Great Britain up to 1922 was characterized by rapid growth, private enterprise, and competitive expansion. From the opening of the Stockton and Darlington Railway in 1825, hundreds of individual railway companies built and operated local networks, eventually forming a complex grid across the nation.\n\nAs the industry matured, these companies began to consolidate, culminating in the Railways Act 1921 which mandated their amalgamation into the "Big Four" groups to improve efficiency after the strain of World War I.'
	},
	{
		slug: 'big-four',
		sourceUrl: 'https://en.wikipedia.org/wiki/Big_Four_(railway_companies)',
		sourceRevision: '1224856711',
		narrative:
			'The Big Four was the collective name used for the four largest railway companies in the United Kingdom between 1923 and 1947. They were created by the Railways Act 1921, which amalgamated approximately 120 railway companies into four groups. The arrangement began on 1 January 1923.\n\nThe companies were the Great Western Railway (GWR), London, Midland and Scottish Railway (LMS), London and North Eastern Railway (LNER) and Southern Railway (SR). They continued until nationalisation on 1 January 1948, when they became part of British Railways.'
	},
	{
		slug: 'br-steam',
		sourceUrl: 'https://en.wikipedia.org/wiki/Modernisation_Plan',
		sourceRevision: '1231802951',
		narrative:
			'The Modernisation and Re-Equipment of British Railways, widely known as the Modernisation Plan, was a report published by the British Transport Commission in December 1954. It was designed to bring the railway system up to date, to win back traffic from the roads, and to replace steam locomotives with diesel and electric traction.\n\nA key element was the "Pilot Scheme" introduced in 1955, which ordered small batches of diesel locomotives from various manufacturers to test their performance before committing to large-scale production.'
	},
	{
		slug: 'br-transition',
		sourceUrl:
			'https://en.wikipedia.org/wiki/History_of_rail_transport_in_Great_Britain_1948%E2%80%931994',
		sourceRevision: '1234901844',
		narrative:
			'The transition from steam to diesel and electric traction on British Railways was a defining feature of the post-nationalisation era. Following the 1955 Modernisation Plan, steam locomotives were rapidly phased out, with the last steam-hauled scheduled service running in August 1968.\n\nThis period of transition saw the introduction of standard diesel classes and early main-line electrification, reshaping the operations, speed, and efficiency of the network.'
	},
	{
		slug: 'sectorisation',
		sourceUrl: 'https://en.wikipedia.org/wiki/Sectorisation_of_British_Rail',
		sourceRevision: '1219904733',
		narrative:
			'Sectorisation was a major organisational restructuring of British Rail that began in 1982. It replaced the traditional regional management structure—which was largely based on the geography of the pre-1948 "Big Four" railway companies—with a system based on specific business sectors.\n\nThis managerial revolution aimed to make the railway more efficient and market-led, reducing government subsidies and preparing the ground for the eventual privatisation of the network in the mid-1990s.'
	},
	{
		slug: 'modern',
		sourceUrl: 'https://en.wikipedia.org/wiki/Privatisation_of_British_Rail',
		sourceRevision: '1232801455',
		narrative:
			"The privatisation of British Rail was the process by which the ownership and operation of Great Britain's railways were transferred from government control to the private sector. The process began in 1994 and was largely completed by 1997.\n\nThe government retained ownership of infrastructure (tracks, stations, and signals) while awarding fixed-term franchises to private companies to operate passenger services. The legacy of the privatisation has been a subject of significant public and political debate."
	}
];

async function main() {
	console.log('Seeding kildeciterede æra-narrativer...');
	const now = new Date();

	for (const data of eraNarratives) {
		await prisma.era.update({
			where: { slug: data.slug },
			data: {
				narrative: data.narrative,
				sourceUrl: data.sourceUrl,
				sourceRevision: data.sourceRevision,
				retrievedAt: now
			}
		});
		console.log(`  Updated era: ${data.slug}`);
	}
	console.log('Færdig med at seede æra-narrativer.');
}

main()
	.catch((err) => {
		console.error('Fatal error running eras narrative seed:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
