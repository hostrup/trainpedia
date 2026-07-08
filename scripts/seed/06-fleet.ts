// 06-fleet.ts — F6.2: individniveau-seed.
// Henter individliste fra Wikipedias dedikerede "List of British Rail Class X locomotives"
// eller direkte fra klassens hovedartikel som fallback.
import { PrismaClient } from '@prisma/client';
import { load, type CheerioAPI } from 'cheerio';
import { FleetLocoCandidateSchema, type FleetLocoCandidate } from './types.js';

const prisma = new PrismaClient();
const USER_AGENT = 'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)';

function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripCitations($: CheerioAPI, cell: any): string {
	const clone = $(cell).clone();
	clone.find('sup.reference').remove();
	return cleanText(clone.text());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNames($: CheerioAPI, cell: any): string[] {
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

async function wikipediaPageExists(title: string): Promise<boolean> {
	const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		if (!res.ok) return false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data = (await res.json()) as any;
		const pages = data.query?.pages ?? {};
		const pageId = Object.keys(pages)[0];
		return pageId !== undefined && pageId !== '-1';
	} catch {
		return false;
	}
}

async function fetchFleetTable(
	wikipediaPageTitle: string
): Promise<{ candidates: FleetLocoCandidate[]; sourceUrl: string; sourceRevision: string } | null> {
	const apiUrl =
		'https://en.wikipedia.org/w/api.php?action=parse&page=' +
		encodeURIComponent(wikipediaPageTitle) +
		'&prop=text%7Crevid&format=json';
	const res = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) return null;
	const data = (await res.json()) as {
		parse?: { text: { '*': string }; revid: number };
		error?: { info: string };
	};
	if (!data || !data.parse) return null;

	const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaPageTitle.replace(/ /g, '_'))}`;
	const sourceRevision = String(data.parse.revid);
	const $ = load(data.parse.text['*']);

	let bestCandidates: FleetLocoCandidate[] = [];

	$('table.wikitable').each((_, tableEl) => {
		const table = $(tableEl);
		const rows = table.find('tbody > tr').toArray();
		const candidates: FleetLocoCandidate[] = [];

		for (const row of rows) {
			const cells = $(row).find('td').toArray();
			if (cells.length < 5) continue;

			if (cells.length >= 8) {
				const numberChain = [0, 1, 2, 3, 4, 5]
					.map((i) => (cells[i] ? cleanText($(cells[i]).text()) : ''))
					.filter((n) => n.length > 0 && /^[a-zA-Z0-9/-\s]+$/.test(n));
				if (numberChain.length === 0) continue;

				const names = cells[6] ? parseNames($, cells[6]) : [];
				const status = cells[7] ? parseStatus(stripCitations($, cells[7])) : 'UNKNOWN';
				const history = cells[8] ? stripCitations($, cells[8]) : null;

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
			} else {
				const numberChain = [0, 1]
					.map((i) => (cells[i] ? cleanText($(cells[i]).text()) : ''))
					.filter((n) => n.length > 0 && /^[a-zA-Z0-9/-\s]+$/.test(n));
				if (numberChain.length === 0) continue;

				let status: FleetLocoCandidate['status'] = 'UNKNOWN';
				let names: string[] = [];
				let history: string | null = null;

				for (let i = 2; i < cells.length; i++) {
					const cellText = stripCitations($, cells[i]);
					const cellTextLower = cellText.toLowerCase();
					if (
						cellTextLower.includes('preserved') ||
						cellTextLower.includes('scrapped') ||
						cellTextLower.includes('in service')
					) {
						status = parseStatus(cellText);
					} else if (i === 2 && cellText && !/^\d+$/.test(cellText)) {
						names = parseNames($, cells[i]);
					} else if (i === cells.length - 1) {
						history = cellText;
					}
				}

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
			}
		}

		if (candidates.length > bestCandidates.length) {
			bestCandidates = candidates;
		}
	});

	if (bestCandidates.length === 0) return null;
	return { candidates: bestCandidates, sourceUrl, sourceRevision };
}

async function main() {
	const classes = await prisma.locomotiveClass.findMany({
		orderBy: { name: 'asc' }
	});

	console.log(`Auto-discovering fleet tables for ${classes.length} classes...`);

	for (const dbClass of classes) {
		let foundSource: {
			pageTitle: string;
			candidates: FleetLocoCandidate[];
			sourceUrl: string;
			sourceRevision: string;
		} | null = null;

		// 1. Check for dedicated "List of British Rail Class NN locomotives"
		const nn = dbClass.name.replace('Class ', '').trim();
		const listTitle = `List of British Rail Class ${nn} locomotives`;

		const exists = await wikipediaPageExists(listTitle);
		if (exists) {
			const res = await fetchFleetTable(listTitle);
			if (res && res.candidates.length > 0) {
				foundSource = { pageTitle: listTitle, ...res };
			}
		}

		// 2. Fallback: Check main class article
		if (!foundSource && dbClass.wikipediaTitle) {
			const res = await fetchFleetTable(dbClass.wikipediaTitle);
			if (res && res.candidates.length > 0) {
				foundSource = { pageTitle: dbClass.wikipediaTitle, ...res };
			}
		}

		if (!foundSource) {
			continue;
		}

		console.log(
			`=== Seeding ${dbClass.name} from "${foundSource.pageTitle}" (${foundSource.candidates.length} locos) ===`
		);

		let created = 0;
		let updated = 0;

		for (const c of foundSource.candidates) {
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

		console.log(`  Created: ${created}, updated: ${updated}`);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error running fleet script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
