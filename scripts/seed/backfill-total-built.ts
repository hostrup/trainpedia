// scripts/seed/backfill-total-built.ts — F9.2: Copy "Total Built" from Specification.valueNumeric
// to LocomotiveClass.totalBuilt for all classes where the spec exists but the field is NULL.
// Run after backfill-value-numeric.ts (F9.15).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Find all "Total Built" specs with a numeric value
	const totalBuiltSpecs = await prisma.specification.findMany({
		where: {
			key: 'Total Built',
			valueNumeric: { not: null }
		},
		select: {
			classId: true,
			valueNumeric: true,
			value: true
		}
	});

	console.log(`Found ${totalBuiltSpecs.length} classes with "Total Built" spec`);

	let updated = 0;
	let skipped = 0;

	for (const spec of totalBuiltSpecs) {
		if (spec.valueNumeric === null) continue;

		const cls = await prisma.locomotiveClass.findUnique({
			where: { id: spec.classId },
			select: { id: true, name: true, totalBuilt: true }
		});

		if (!cls) continue;

		const totalBuilt = Math.round(spec.valueNumeric);

		if (cls.totalBuilt === totalBuilt) {
			skipped++;
			continue;
		}

		await prisma.locomotiveClass.update({
			where: { id: spec.classId },
			data: { totalBuilt }
		});

		console.log(`  ${cls.name}: totalBuilt = ${totalBuilt} (was ${cls.totalBuilt ?? 'NULL'})`);
		updated++;
	}

	// Report
	const totalClasses = await prisma.locomotiveClass.count();
	const withTotalBuilt = await prisma.locomotiveClass.count({
		where: { totalBuilt: { not: null } }
	});
	const stillNull = totalClasses - withTotalBuilt;

	console.log(`\n=== totalBuilt BACKFILL ===`);
	console.log(`Updated: ${updated}`);
	console.log(`Skipped (already correct): ${skipped}`);
	console.log(`Classes with totalBuilt: ${withTotalBuilt}/${totalClasses}`);
	console.log(`Remaining NULL: ${stillNull}`);
}

main()
	.catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
