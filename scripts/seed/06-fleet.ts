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

function isValidLocoNumber(num: string): boolean {
	const cleaned = num.trim();
	if (cleaned.length === 0 || cleaned.length > 15) return false;
	if (!/\d/.test(cleaned)) return false;

	const lowercase = cleaned.toLowerCase();
	const forbiddenWords = [
		'railway',
		'museum',
		'line',
		'centre',
		'center',
		'ltd',
		'trust',
		'preservation',
		'society',
		'station',
		'green',
		'blue',
		'livery'
	];
	for (const word of forbiddenWords) {
		if (lowercase.includes(word)) return false;
	}

	return /^[a-zA-Z0-9\s/-]+$/.test(cleaned);
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
		const rows = table.find('tr').toArray();
		const candidates: FleetLocoCandidate[] = [];

		// Find the preceding heading tag
		let prevHeading = '';
		let el = table.prev();
		while (el.length > 0) {
			const tagName = el.get(0)?.tagName?.toLowerCase() ?? '';
			if (/^h[1-6]$/.test(tagName)) {
				prevHeading = el.text().trim().toLowerCase();
				break;
			}
			const heading = el.find('h1, h2, h3, h4, h5, h6');
			if (heading.length > 0) {
				prevHeading = heading.first().text().trim().toLowerCase();
				break;
			}
			el = el.prev();
		}
		const isPreservedTable =
			prevHeading.includes('preserv') || wikipediaPageTitle.toLowerCase().includes('preserv');

		// Parse headers to find column indices
		const headers: string[] = [];
		table
			.find('tr')
			.first()
			.find('th, td')
			.each((_, headerEl) => {
				headers.push($(headerEl).text().trim().toLowerCase());
			});

		let nameColIdx = -1;
		let statusColIdx = -1;
		let liveryColIdx = -1;
		let notesColIdx = -1;

		for (let i = 0; i < headers.length; i++) {
			const h = headers[i];
			if (h.includes('name') || h.includes('named')) {
				nameColIdx = i;
			} else if (h.includes('status')) {
				statusColIdx = i;
			} else if (h.includes('livery')) {
				liveryColIdx = i;
			} else if (h.includes('notes') || h.includes('history') || h.includes('remarks')) {
				notesColIdx = i;
			}
		}

		for (const row of rows) {
			if ($(row).find('th').length > 0) continue; // Skip header row
			const cells = $(row).find('td').toArray();
			if (cells.length < 3) continue;

			const rawNumberChain: string[] = [];
			const maxNumCols = cells.length >= 8 ? Math.min(6, cells.length) : Math.min(3, cells.length);
			for (let i = 0; i < maxNumCols; i++) {
				if (i === nameColIdx || i === statusColIdx || i === liveryColIdx || i === notesColIdx)
					continue;
				const txt = cells[i] ? cleanText($(cells[i]).text()) : '';
				if (txt && isValidLocoNumber(txt)) {
					rawNumberChain.push(txt);
				}
			}
			if (rawNumberChain.length === 0) continue;

			const numberChain: string[] = [];
			for (const num of rawNumberChain) {
				if (!numberChain.includes(num)) {
					numberChain.push(num);
				}
			}

			// Determine status: check mapped column first, otherwise search all cells, default to PRESERVED if in preservation table
			let status: FleetLocoCandidate['status'] = isPreservedTable ? 'PRESERVED' : 'UNKNOWN';
			if (statusColIdx !== -1 && cells[statusColIdx]) {
				const cellText = stripCitations($, cells[statusColIdx]);
				const cellTextLower = cellText.toLowerCase();
				if (
					cellTextLower.includes('preserved') ||
					cellTextLower.includes('operational') ||
					cellTextLower.includes('active') ||
					cellTextLower.includes('overhaul') ||
					cellTextLower.includes('restoration') ||
					cellTextLower.includes('static')
				) {
					status = 'PRESERVED';
				} else if (
					cellTextLower.includes('scrapped') ||
					cellTextLower.includes('cut up') ||
					cellTextLower.includes('cut-up')
				) {
					status = 'SCRAPPED';
				} else if (cellTextLower.includes('in service')) {
					status = 'IN_SERVICE';
				} else if (cellTextLower.includes('stored')) {
					status = 'STORED';
				} else if (cellTextLower.includes('exported')) {
					status = 'EXPORTED';
				}
			} else {
				// Fallback: search cells for status keywords
				for (let i = 0; i < cells.length; i++) {
					if (i === nameColIdx || i === liveryColIdx) continue;
					const cellText = stripCitations($, cells[i]);
					const cellTextLower = cellText.toLowerCase();
					if (
						cellTextLower.includes('preserved') ||
						cellTextLower.includes('operational') ||
						cellTextLower.includes('active') ||
						cellTextLower.includes('overhaul') ||
						cellTextLower.includes('restoration')
					) {
						status = 'PRESERVED';
						break;
					} else if (
						cellTextLower.includes('scrapped') ||
						cellTextLower.includes('cut up') ||
						cellTextLower.includes('cut-up')
					) {
						status = 'SCRAPPED';
						break;
					} else if (cellTextLower.includes('in service')) {
						status = 'IN_SERVICE';
						break;
					} else if (cellTextLower.includes('stored')) {
						status = 'STORED';
						break;
					} else if (cellTextLower.includes('exported')) {
						status = 'EXPORTED';
						break;
					}
				}
			}

			// Names: use Name column index, otherwise fallback to column 2 if it's not livery
			let names: string[] = [];
			if (nameColIdx !== -1 && cells[nameColIdx]) {
				names = parseNames($, cells[nameColIdx]);
			} else if (nameColIdx === -1 && liveryColIdx !== 2 && cells[2]) {
				const cellText = stripCitations($, cells[2]);
				if (cellText && !/^\d+$/.test(cellText)) {
					names = parseNames($, cells[2]);
				}
			}

			// Notes/history
			let history: string | null = null;
			if (notesColIdx !== -1 && cells[notesColIdx]) {
				history = stripCitations($, cells[notesColIdx]);
			} else if (cells.length > 0) {
				history = stripCitations($, cells[cells.length - 1]);
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

		await prisma.locomotive.deleteMany({ where: { classId: dbClass.id } });

		for (const c of foundSource.candidates) {
			const existing = null;

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
