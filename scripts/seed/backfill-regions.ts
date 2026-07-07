// backfill-regions.ts — engangsmigrering (ikke del af seed-pipelinen): flytter
// BR-region-tilhørsforhold fra den statiske src/lib/tubemap/dieselLayout.ts
// (hvor det hidtil KUN levede, opslået pr. wikidataQid) over i et rigtigt,
// forespørgeligt DB-felt (LocomotiveClass.regions). Baggrund: uden dette felt
// var farvetemaet ("linjefarven følger med ind i undersektionen", F5.8) reelt i
// stykker på /classes, /class/[qid] og /loco/[nummer] — de kunne kun se
// traction-feltet, som altid er DIESEL efter F6.5-scope-pivoten, aldrig regionen.
// Idempotent — sikker at køre flere gange.
import { PrismaClient } from '@prisma/client';
import { dieselLayout } from '../../src/lib/tubemap/dieselLayout.js';

const prisma = new PrismaClient();

async function main() {
	const classes = await prisma.locomotiveClass.findMany({
		select: { id: true, wikidataQid: true, name: true }
	});
	const layoutByQid = new Map(dieselLayout.map((item) => [item.qid, item.regions as string[]]));

	let updated = 0;
	const unmatched: string[] = [];

	for (const c of classes) {
		const regions = layoutByQid.get(c.wikidataQid);
		if (!regions) {
			unmatched.push(`${c.name} (${c.wikidataQid})`);
			continue;
		}
		await prisma.locomotiveClass.update({ where: { id: c.id }, data: { regions } });
		updated++;
	}

	console.log(`Opdaterede regions på ${updated}/${classes.length} klasser.`);
	if (unmatched.length > 0) {
		console.log(
			`\nADVARSEL: ${unmatched.length} klasse(r) uden match i dieselLayout.ts (ingen region sat):`
		);
		unmatched.forEach((u) => console.log(`  - ${u}`));
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running region backfill:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
