// 04-reclassify.ts — datatriage af traction og æra-tildeling.
// Wikidata-discovery efterlod 334/488 klasser som traction=OTHER, og æraer blev
// tildelt rent efter årstal (så Class 37 landede i "BR Steam Era"). Dette script
// udleder traction fra hjularrangement (Whyte-notation = damp) og BR TOPS-
// klassenummerserier, og genplacerer derefter klasserne i æraer efter
// traction + introduktionsår, jf. den kreative brief ("the Diesel Era surfaces
// Class 37, Class 47, Class 55"). Idempotent — kan køres efter hver seed.
import { PrismaClient, Traction } from '@prisma/client';

const prisma = new PrismaClient();

function classNumber(name: string, wikipediaTitle: string | null): number | null {
	const m =
		name.match(/class\s+(\d{1,3})\b/i) ?? (wikipediaTitle ?? '').match(/Class_(\d{1,3})\b/i);
	return m ? parseInt(m[1], 10) : null;
}

// Whyte-notation (fx "4-6-2", "0-6-0ST") bruges kun om damplokomotiver.
function isWhyte(wheelArrangement: string | null): boolean {
	return wheelArrangement !== null && /^\d+-\d+(-\d+)+\s*[A-Z]{0,3}$/.test(wheelArrangement.trim());
}

interface ClassRow {
	id: number;
	name: string;
	wikipediaTitle: string | null;
	wheelArrangement: string | null;
	traction: Traction;
	buildStart: number | null;
	serviceEntry: Date | null;
	narrative: string | null;
}

function inferTraction(c: ClassRow): Traction | null {
	if (isWhyte(c.wheelArrangement)) return 'STEAM';

	// BR TOPS-nummerserier: 01–70+97 diesel, 71–96 elektrisk (inkl. electro-diesel),
	// 98 damp, 1xx/2xx DMU/DEMU, 3xx–5xx EMU, 6xx batteri/brint, 7xx–9xx el/bi-mode.
	const n = classNumber(c.name, c.wikipediaTitle);
	if (n !== null) {
		if (n === 98) return 'STEAM';
		if ((n >= 1 && n <= 70) || n === 97) return 'DIESEL';
		if (n >= 71 && n <= 96) return 'ELECTRIC';
		if (n >= 100 && n <= 299) return 'DIESEL';
		if (n >= 300 && n <= 599) return 'ELECTRIC';
		if (n >= 600 && n <= 699) return 'OTHER';
		if (n >= 700 && n <= 999) return 'ELECTRIC';
	}

	const text = `${c.name} ${c.narrative ?? ''}`.toLowerCase();
	if (text.includes('steam locomotive') || text.includes('tank locomotive')) return 'STEAM';
	if (text.includes('electro-diesel')) return 'ELECTRIC';
	if (text.includes('electric multiple unit') || text.includes('electric locomotive'))
		return 'ELECTRIC';
	if (text.includes('diesel')) return 'DIESEL';
	if (text.includes('electric')) return 'ELECTRIC';
	return null;
}

function introYear(c: ClassRow): number | null {
	if (c.buildStart !== null) return c.buildStart;
	if (c.serviceEntry) return c.serviceEntry.getUTCFullYear();
	return null;
}

// Damp følger de klassiske dato-æraer; diesel/el hører til overgangs- og moderne
// æraer uanset at fx Class 37 (1960) tidsmæssigt overlapper BR-dampæraen.
function targetEraSlug(traction: Traction, year: number): string {
	if (year <= 1922) return 'pre-grouping';
	if (year <= 1947) return 'big-four';
	if (traction === 'STEAM') return 'br-steam';
	if (year <= 1981) return 'br-transition';
	if (year <= 1993) return 'sectorisation';
	return 'modern';
}

async function main() {
	const eras = await prisma.era.findMany();
	const eraBySlug = new Map(eras.map((e) => [e.slug, e]));
	const eraById = new Map(eras.map((e) => [e.id, e]));

	const classes: (ClassRow & { eraId: number })[] = await prisma.locomotiveClass.findMany({
		select: {
			id: true,
			name: true,
			wikipediaTitle: true,
			wheelArrangement: true,
			traction: true,
			buildStart: true,
			serviceEntry: true,
			narrative: true,
			eraId: true
		}
	});

	let tractionUpdates = 0;
	let eraUpdates = 0;

	for (const c of classes) {
		const inferred = inferTraction(c);

		// Konservativ opdatering: OTHER overskrives af enhver udledning; en
		// eksisterende specifik traction overskrives kun af det stærke
		// Whyte-signal (damp), da Wikidata-værdier ellers får lov at stå.
		let newTraction = c.traction;
		if (inferred !== null) {
			if (c.traction === 'OTHER') newTraction = inferred;
			else if (inferred === 'STEAM' && isWhyte(c.wheelArrangement)) newTraction = 'STEAM';
		}

		const year = introYear(c);
		let newEraId = c.eraId;
		if (year !== null) {
			const slug = targetEraSlug(newTraction, year);
			const era = eraBySlug.get(slug);
			if (era && era.id !== c.eraId) newEraId = era.id;
		}

		if (newTraction !== c.traction || newEraId !== c.eraId) {
			await prisma.locomotiveClass.update({
				where: { id: c.id },
				data: { traction: newTraction, eraId: newEraId }
			});
			if (newTraction !== c.traction) tractionUpdates++;
			if (newEraId !== c.eraId) {
				eraUpdates++;
				console.log(
					`  ${c.name}: ${eraById.get(c.eraId)?.slug} -> ${eraById.get(newEraId)?.slug}` +
						(newTraction !== c.traction ? ` (traction ${c.traction} -> ${newTraction})` : '')
				);
			}
		}
	}

	console.log(`\nTraction opdateret: ${tractionUpdates}, æra opdateret: ${eraUpdates}`);

	const summary = await prisma.locomotiveClass.groupBy({
		by: ['eraId', 'traction'],
		_count: true
	});
	const byEra = new Map<number, string[]>();
	for (const row of summary) {
		const list = byEra.get(row.eraId) ?? [];
		list.push(`${row.traction}=${row._count}`);
		byEra.set(row.eraId, list);
	}
	console.log('\nFordeling efter triage:');
	for (const era of eras.sort((a, b) => a.sortIndex - b.sortIndex)) {
		console.log(`  ${era.name}: ${(byEra.get(era.id) ?? ['tom']).join(', ')}`);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running reclassify script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
