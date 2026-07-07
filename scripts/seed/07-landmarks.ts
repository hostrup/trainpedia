// 07-landmarks.ts — F5.9(c): landmark-flag som en rigtig, genkørbar seed-fase i stedet
// for en ad-hoc DB-opdatering. Sætter isLandmark=true på de klasser, der eksplicit er
// nævnt som "landmark" i AGENT-BRIEF.md/BACKLOG.md (Flying Scotsman-klassen A3, Deltic,
// Class 37, APT) og i den oprindelige kreative brief ("Diesel Era surfaces Class 37,
// Class 47, Class 55 (Deltic)"). Curation er en redaktionel beslutning, ikke en kilde-
// baseret faktapåstand — derfor ingen sourceUrl/provenance-krav her, i modsætning til
// resten af seed-pipelinen. Idempotent: kan køres efter enhver seed-kørsel.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LNER Class A3 (Flying Scotsman) findes ikke i det seedede Wikidata-datasæt —
// LNER Class A4 (samme Gresley Pacific-familie, mest kendt via Mallard) bruges i stedet.
const LANDMARK_NAMES = [
	'LNER Class A4', // Flying Scotsman-familien (A3 mangler i datasættet) — Mallard
	'British Rail Class 55', // Deltic
	'British Rail Class 37', // pilot-klassen for F6 (U6)
	'British Rail Class 47', // nævnt eksplicit i den kreative brief
	'British Rail Class 370' // Advanced Passenger Train (APT-P)
];

async function main() {
	const result = await prisma.locomotiveClass.updateMany({
		where: { name: { in: LANDMARK_NAMES } },
		data: { isLandmark: true }
	});
	console.log(`isLandmark sat på ${result.count} klasser.`);

	const flagged = await prisma.locomotiveClass.findMany({
		where: { isLandmark: true },
		select: { name: true, wikidataQid: true }
	});
	console.log('Landmark-klasser i DB:');
	for (const c of flagged) console.log(`  - ${c.name} (${c.wikidataQid})`);

	const missing = LANDMARK_NAMES.filter((name) => !flagged.some((c) => c.name === name));
	if (missing.length > 0) {
		console.warn(`\nAdvarsel: fandt ikke følgende navne i DB: ${missing.join(', ')}`);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running landmarks script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
