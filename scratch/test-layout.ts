import { PrismaClient } from '@prisma/client';
import { mapLocomotiveClass } from '../src/lib/server/mapLocomotiveClass.js';
import { mapClassesToStations } from '../src/lib/tubemap/mapClasses.js';
import { computeLayout } from '../src/lib/tubemap/layout.js';

const prisma = new PrismaClient();

async function main() {
	const dbEras = await prisma.era.findMany({ orderBy: { sortIndex: 'asc' } });
	const dbClasses = await prisma.locomotiveClass.findMany({
		include: {
			specs: { orderBy: { sortIndex: 'asc' } },
			media: { orderBy: { sortIndex: 'asc' } },
			aliases: { select: { alias: true, scheme: true } }
		}
	});

	const eras = dbEras.map((e) => ({ id: e.id, slug: e.slug }));
	const classes = dbClasses.map(mapLocomotiveClass);
	const stations = mapClassesToStations(classes, eras);
	const layout = computeLayout(stations);

	console.log(`Total stations in layout: ${layout.stations.length}`);
	const fallbacks = layout.stations.filter((s) => s.x === 600 && s.y === 500);
	console.log(`Stations falling back to (600, 500): ${fallbacks.length}`);
	for (const s of fallbacks.slice(0, 10)) {
		console.log(`  - ${s.name} (${s.wikidataQid})`);
	}

	const active1975 = layout.stations.filter(
		(s) => s.introYear <= 1975 && (s.retiredYear === null || s.retiredYear >= 1975)
	);
	console.log(`Active in 1975: ${active1975.length}`);
	for (const s of active1975) {
		console.log(`  - ${s.name}: (${s.x}, ${s.y})`);
	}
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
