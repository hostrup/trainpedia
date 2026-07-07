// 06-fleet.ts — F6.2: individniveau-seed. Pilot (U6): Class 37-fleeten.
// Kilde: Wikipedias "List of British Rail Class X locomotives"-artikler — en enkelt,
// regelmæssig tabel med kolonnerne BTC/TOPS(1-3)/Post-TOPS(1-2) (omlitrerings-kæde),
// Names, Status, Notes. Strict factuality: kun det tabellen faktisk siger gemmes.
// Navn↔nummer-korrespondance er IKKE 1:1 i kilden (navneskift sker uafhængigt af
// omlitreringer), så kun SIDSTE navn gemmes som currentName; øvrige navne lægges i
// nicknames (historiske, uden dato) i stedet for at gætte hvilket nummer de hørte til.
// LocomotiveIdentity-rækker bærer udelukkende NUMMER-kæden (verificerbar, entydig).
import { PrismaClient } from '@prisma/client';
import { load, type CheerioAPI } from 'cheerio';
import { FleetLocoCandidateSchema, type FleetLocoCandidate } from './types.js';

const prisma = new PrismaClient();
const USER_AGENT = 'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)';

/** Pilot-fleet (U6-beslutning 2026-07-07). Udvid til flere klasser når mønsteret er bekræftet. */
const FLEETS = [
	{ classWikidataQid: 'Q3306037', wikipediaListTitle: 'List of British Rail Class 37 locomotives' }
];

function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function stripCitations($: CheerioAPI, cell: Element): string {
	const clone = $(cell).clone();
	clone.find('sup.reference').remove();
	return cleanText(clone.text());
}

function parseNames($: CheerioAPI, cell: Element): string[] {
	const clone = $(cell).clone();
	clone.find('sup.reference').remove();
	const html = clone.html() ?? '';
	const parts = html.split(/<br\s*\/?>/i);
	const names: string[] = [];
	for (const part of parts) {
		const text = cleanText(load(`<div>${part}</div>`)('div').text());
		const withoutIndex = text.replace(/^\d+\)\s*/, '').trim();
		if (withoutIndex) names.push(withoutIndex);
	}
	return names;
}

function parseStatus(raw: string): FleetLocoCandidate['status'] {
	const t = raw.toLowerCase();
	if (t.includes('in service')) return 'IN_SERVICE';
	if (t.includes('stored')) return 'STORED';
	if (t.includes('preserved')) return 'PRESERVED';
	if (t.includes('scrapped')) return 'SCRAPPED';
	if (t.includes('exported')) return 'EXPORTED';
	return 'UNKNOWN';
}

async function fetchFleetTable(
	wikipediaListTitle: string
): Promise<{ candidates: FleetLocoCandidate[]; sourceUrl: string }> {
	const apiUrl =
		'https://en.wikipedia.org/w/api.php?action=parse&page=' +
		encodeURIComponent(wikipediaListTitle) +
		'&prop=text%7Crevid&format=json';
	const res = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status} for "${wikipediaListTitle}"`);
	const data = (await res.json()) as {
		parse?: { text: { '*': string }; revid: number };
		error?: { info: string };
	};
	if (!data.parse)
		throw new Error(`Wikipedia API fejl for "${wikipediaListTitle}": ${data.error?.info}`);

	const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaListTitle.replace(/ /g, '_'))}`;
	const sourceRevision = String(data.parse.revid);
	const $ = load(data.parse.text['*']);
	const table = $('table.wikitable.sortable').first();
	const rows = table.find('tbody > tr').toArray();

	const candidates: FleetLocoCandidate[] = [];
	for (const row of rows) {
		const cells = $(row).find('td').toArray();
		if (cells.length < 9) continue; // header-rækker (<th>) har ikke 9 <td>

		const numberChain = [0, 1, 2, 3, 4, 5]
			.map((i) => cleanText($(cells[i]).text()))
			.filter((n) => n.length > 0);
		if (numberChain.length === 0) continue;

		const names = parseNames($, cells[6]);
		const status = parseStatus(stripCitations($, cells[7]));
		const history = stripCitations($, cells[8]) || null;

		const raw = {
			currentNumber: numberChain[numberChain.length - 1],
			currentName: names.length > 0 ? names[names.length - 1] : null,
			nicknames: names.slice(0, -1),
			status,
			history,
			numberChain,
			sourceUrl,
			sourceRevision
		};
		const parsed = FleetLocoCandidateSchema.safeParse(raw);
		if (parsed.success) candidates.push(parsed.data);
		else console.warn(`  Validering fejlede for ${raw.currentNumber}:`, parsed.error.format());
	}

	return { candidates, sourceUrl };
}

async function main() {
	for (const fleet of FLEETS) {
		const dbClass = await prisma.locomotiveClass.findUnique({
			where: { wikidataQid: fleet.classWikidataQid },
			include: { specs: { where: { key: 'Total Built' } } }
		});
		if (!dbClass) {
			console.error(
				`Klasse med QID ${fleet.classWikidataQid} findes ikke i DB — kør 01-discover/03-media først. Springer over.`
			);
			continue;
		}

		console.log(`\n=== ${dbClass.name} — henter "${fleet.wikipediaListTitle}" ===`);
		const { candidates } = await fetchFleetTable(fleet.wikipediaListTitle);
		console.log(`  Fandt ${candidates.length} individer i tabellen.`);

		let created = 0;
		let updated = 0;

		for (const c of candidates) {
			const existing = await prisma.locomotive.findUnique({
				where: { classId_currentNumber: { classId: dbClass.id, currentNumber: c.currentNumber } }
			});

			const loco = await prisma.locomotive.upsert({
				where: { classId_currentNumber: { classId: dbClass.id, currentNumber: c.currentNumber } },
				update: {
					currentName: c.currentName,
					nicknames: c.nicknames,
					status: c.status,
					history: c.history,
					sourceUrl: c.sourceUrl,
					sourceRevision: c.sourceRevision,
					retrievedAt: new Date()
				},
				create: {
					classId: dbClass.id,
					currentNumber: c.currentNumber,
					currentName: c.currentName,
					nicknames: c.nicknames,
					status: c.status,
					history: c.history,
					sourceUrl: c.sourceUrl,
					sourceRevision: c.sourceRevision,
					retrievedAt: new Date()
				}
			});
			if (existing) updated++;
			else created++;

			// Omlitrerings-kæde: erstat med den friskt hentede (idempotent uden separat unik-nøgle).
			await prisma.locomotiveIdentity.deleteMany({ where: { locoId: loco.id } });
			await prisma.locomotiveIdentity.createMany({
				data: c.numberChain.map((number, sortIndex) => ({
					locoId: loco.id,
					number,
					sortIndex,
					sourceUrl: c.sourceUrl,
					sourceRevision: c.sourceRevision,
					retrievedAt: new Date()
				}))
			});
		}

		console.log(`  Oprettet: ${created}, opdateret: ${updated}`);

		// Dæknings-rapport: enheder fundet vs. totalBuilt. LocomotiveClass.totalBuilt kan være
		// tom selvom Specification "Total Built" blev fanget af enrichment-fallback (02-enrich.ts).
		const totalInDb = await prisma.locomotive.count({ where: { classId: dbClass.id } });
		const totalBuiltSpec = dbClass.specs[0]?.value ? parseInt(dbClass.specs[0].value, 10) : null;
		const totalBuilt =
			dbClass.totalBuilt ?? (Number.isFinite(totalBuiltSpec) ? totalBuiltSpec : null);
		const coverage =
			totalBuilt !== null ? `${totalInDb}/${totalBuilt}` : `${totalInDb}/ukendt totalBuilt`;
		console.log(`  Dækning: ${coverage} individer i DB.`);

		const statusCounts = await prisma.locomotive.groupBy({
			by: ['status'],
			where: { classId: dbClass.id },
			_count: true
		});
		console.log(
			'  Statusfordeling:',
			statusCounts.map((s) => `${s.status}=${s._count}`).join(', ')
		);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running fleet script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
