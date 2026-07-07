// fix-era-boundaries.ts — engangsoprydning af den LIVE database (ikke del af
// seed-pipelinen, samme princip som clean-non-diesel.ts), så den matcher de
// rettede æra-definitioner i 01-discover.ts/04-reclassify.ts uden en fuld reseed.
// Baggrund: "Privatisation"-æraen (1994-1997) indeholdt kun ÉT lokomotiv, og det
// var et norsk (NSB Di 8) der er lækket ind ved en discovery-fejl — de rigtige
// privatiseringsdrevne dieselklasser (Class 66/68/70/800...) ligger alle i 1998+
// og landede derfor i "Modern" i stedet. Idempotent — sikker at køre flere gange.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// 1) Fjern klasser uden for scope ("British diesel locomotives" — strict factuality).
	const outOfScope = await prisma.locomotiveClass.deleteMany({
		where: { wikidataQid: { in: ['Q1213765', 'Q139989800'] } } // NSB Di 8 (norsk); New Enterprise Trains (ukildet, årstal 2030)
	});
	console.log(`Fjernede ${outOfScope.count} klasse(r) uden for scope.`);

	// 2) Merge 'privatisation' (1994-1997) ind i 'modern' (nu 1994-present).
	const privatisation = await prisma.era.findUnique({ where: { slug: 'privatisation' } });
	if (privatisation) {
		const remaining = await prisma.locomotiveClass.count({ where: { eraId: privatisation.id } });
		if (remaining > 0) {
			console.log(
				`ADVARSEL: 'privatisation' har stadig ${remaining} klasse(r) — springer merge over, ret manuelt.`
			);
		} else {
			await prisma.era.delete({ where: { id: privatisation.id } });
			console.log("Slettede den nu-tomme 'privatisation'-æra.");
		}
	}

	await prisma.era.update({
		where: { slug: 'modern' },
		data: { name: 'Privatisation & the Modern Era', startYear: 1994, sortIndex: 6 }
	});

	// 3) Rettede navne (ikke længere misvisende på et rent diesel-site).
	await prisma.era.update({
		where: { slug: 'br-steam' },
		data: { name: 'The Pilot Scheme' }
	});
	await prisma.era.update({
		where: { slug: 'br-transition' },
		data: { name: 'The Diesel & Electric Transition Era' }
	});

	console.log('\nÆra-tabel efter oprydning:');
	const eras = await prisma.era.findMany({ orderBy: { sortIndex: 'asc' } });
	for (const e of eras) {
		const count = await prisma.locomotiveClass.count({ where: { eraId: e.id } });
		console.log(
			`  [${e.sortIndex}] ${e.slug} — "${e.name}" (${e.startYear}–${e.endYear ?? 'present'}): ${count} klasser`
		);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running era cleanup:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
