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

// F11-D1: BTC (British Transport Commission) power type classification.
// Historically, main-line diesel locomotives were classified by brake horsepower:
//   Type 1: <1,000 hp · Type 2: 1,000–1,499 · Type 3: 1,500–1,999
//   Type 4: 2,000–2,999 · Type 5: ≥3,000
// Shunters are identified by wheel arrangement (0-6-0) or low max speed (<40 mph).
// Without a sourced hp value, powerType remains null (strict factuality).
function btcPowerType(
	hpValue: number | null,
	wheelArrangement: string | null,
	maxSpeedMph: number | null
): string | null {
	// Detect shunters: typically 0-6-0 wheel arrangement or very low max speed
	const isShunterWheel =
		wheelArrangement !== null &&
		/^0-[46]-0/i.test(wheelArrangement.trim());
	if (isShunterWheel && (hpValue === null || hpValue < 1000)) return 'SHUNTER';
	if (maxSpeedMph !== null && maxSpeedMph <= 30 && (hpValue === null || hpValue < 1000))
		return 'SHUNTER';

	if (hpValue === null) return null;
	if (hpValue < 1000) return 'TYPE_1';
	if (hpValue < 1500) return 'TYPE_2';
	if (hpValue < 2000) return 'TYPE_3';
	if (hpValue < 3000) return 'TYPE_4';
	return 'TYPE_5';
}

// F11-D2: Builder/manufacturer normalization alias table.
// Raw string is preserved in Specification; this maps common variants to a canonical key.
const BUILDER_ALIASES: Record<string, string> = {
	'brel': 'BREL',
	'british rail engineering limited': 'BREL',
	'british rail engineering': 'BREL',
	'br workshops': 'BREL',
	'english electric': 'English Electric',
	'english electric co': 'English Electric',
	'the english electric company': 'English Electric',
	'brush traction': 'Brush',
	'brush electrical engineering': 'Brush',
	'brush electrical machines': 'Brush',
	'beyer, peacock and company': 'Beyer Peacock',
	'beyer peacock': 'Beyer Peacock',
	'north british locomotive company': 'North British',
	'north british': 'North British',
	'robert stephenson and hawthorns': 'RSH',
	'rshl': 'RSH',
	'rsh': 'RSH',
	'general electric': 'GE',
	'ge transportation': 'GE',
	'general motors': 'GM/EMD',
	'emd': 'GM/EMD',
	'electro-motive division': 'GM/EMD',
	'general motors electro-motive division': 'GM/EMD',
	'metropolitan-vickers': 'Metrovick',
	'metropolitan vickers': 'Metrovick',
	'metrovick': 'Metrovick',
	'vulcan foundry': 'Vulcan Foundry',
	'hunslet engine company': 'Hunslet',
	'hunslet': 'Hunslet',
	'hunslet-barclay': 'Hunslet',
	'andrew barclay sons and company': 'Andrew Barclay',
	'andrew barclay': 'Andrew Barclay',
	'yorkshire engine company': 'Yorkshire Engine Co',
	'yorkshire engine': 'Yorkshire Engine Co',
	'ruston and hornsby': 'Ruston & Hornsby',
	'ruston & hornsby': 'Ruston & Hornsby',
	'clayton equipment': 'Clayton',
	'clayton': 'Clayton',
	'birmingham rc&w': 'Birmingham RCW',
	'birmingham railway carriage and wagon company': 'Birmingham RCW',
	'swindon works': 'BR Swindon',
	'derby works': 'BR Derby',
	'crewe works': 'BR Crewe',
	'doncaster works': 'BR Doncaster',
	'darlington works': 'BR Darlington',
	'lms derby': 'BR Derby',
	'horwich works': 'BR Horwich',
	'vossloh': 'Stadler/Vossloh',
	'stadler': 'Stadler/Vossloh',
	'stadler rail': 'Stadler/Vossloh',
	'bombardier': 'Bombardier',
	'bombardier transportation': 'Bombardier',
	'alstom': 'Alstom',
	'hitachi': 'Hitachi',
	'caf': 'CAF',
};

function normalizeBuilder(raw: string): string {
	const trimmed = raw.trim();
	const key = trimmed.toLowerCase().replace(/[.,]+$/, '').trim();
	return BUILDER_ALIASES[key] ?? trimmed;
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

	// Pre-fetch specs for powerType and builder
	const allSpecs = await prisma.specification.findMany({
		where: {
			key: { in: ['Power Output', 'Top Speed', 'Manufacturer'] }
		},
		select: { classId: true, key: true, value: true, valueNumeric: true, unit: true }
	});

	// Index specs by classId
	const specsByClass = new Map<number, typeof allSpecs>();
	for (const spec of allSpecs) {
		const list = specsByClass.get(spec.classId) ?? [];
		list.push(spec);
		specsByClass.set(spec.classId, list);
	}

	let tractionUpdates = 0;
	let eraUpdates = 0;
	let powerTypeUpdates = 0;
	let builderUpdates = 0;

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

		// F11-D1: Compute powerType from sourced hp value
		const classSpecs = specsByClass.get(c.id) ?? [];
		const powerSpec = classSpecs.find((s) => s.key === 'Power Output');
		const speedSpec = classSpecs.find((s) => s.key === 'Top Speed');
		const hpValue = powerSpec?.valueNumeric ?? null;
		const speedMph =
			speedSpec?.unit === 'mph' ? speedSpec.valueNumeric : null;
		const powerType = btcPowerType(hpValue, c.wheelArrangement, speedMph);

		// F11-D2: Normalize builder from Manufacturer spec
		const mfrSpec = classSpecs.find((s) => s.key === 'Manufacturer');
		const builder = mfrSpec ? normalizeBuilder(mfrSpec.value) : null;

		const data: Record<string, unknown> = {};
		if (newTraction !== c.traction) data.traction = newTraction;
		if (newEraId !== c.eraId) data.eraId = newEraId;
		data.powerType = powerType; // always set (may be null)
		data.builder = builder; // always set (may be null)

		await prisma.locomotiveClass.update({
			where: { id: c.id },
			data
		});

		if (newTraction !== c.traction) tractionUpdates++;
		if (newEraId !== c.eraId) {
			eraUpdates++;
			console.log(
				`  ${c.name}: ${eraById.get(c.eraId)?.slug} -> ${eraById.get(newEraId)?.slug}` +
					(newTraction !== c.traction ? ` (traction ${c.traction} -> ${newTraction})` : '')
			);
		}
		if (powerType !== null) powerTypeUpdates++;
		if (builder !== null) builderUpdates++;
	}

	console.log(`\nTraction opdateret: ${tractionUpdates}, æra opdateret: ${eraUpdates}`);
	console.log(`PowerType sat: ${powerTypeUpdates}/${classes.length}`);
	console.log(`Builder sat: ${builderUpdates}/${classes.length}`);

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

	// Report powerType distribution
	const ptSummary = await prisma.locomotiveClass.groupBy({
		by: ['powerType'],
		_count: true
	});
	console.log('\nPowerType fordeling:');
	for (const row of ptSummary) {
		console.log(`  ${row.powerType ?? 'null'}: ${row._count}`);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running reclassify script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());

