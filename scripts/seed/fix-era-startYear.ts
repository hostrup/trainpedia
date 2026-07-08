// scripts/seed/fix-era-startYear.ts — F9.5: Fix br-transition startYear to 1948
// After 04-reclassify.ts moves all diesel classes from 1948+ into br-transition,
// the era's startYear (1968) no longer matches its content. Fix it.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Update br-transition startYear to match earliest class
	await prisma.era.update({
		where: { slug: 'br-transition' },
		data: { startYear: 1948 }
	});
	console.log('Updated br-transition startYear to 1948');

	// Report final era distribution
	const eras = await prisma.era.findMany({ orderBy: { sortIndex: 'asc' } });
	for (const e of eras) {
		const count = await prisma.locomotiveClass.count({ where: { eraId: e.id } });
		console.log(`  ${e.name} (${e.startYear}–${e.endYear ?? 'present'}): ${count} classes`);
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
