import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { CandidateClassSchema, type CandidateClass } from './types.js';
import { QID_BLOCKLIST } from './blocklist.js';

const prisma = new PrismaClient();

const eras = [
	{
		slug: 'pre-grouping',
		name: 'Pre-Grouping',
		startYear: 1830,
		endYear: 1922,
		sortIndex: 1
	},
	{
		slug: 'big-four',
		name: 'The Big Four',
		startYear: 1923,
		endYear: 1947,
		sortIndex: 2
	},
	{
		slug: 'br-steam',
		name: 'Pilot Scheme & Modernisation',
		startYear: 1948,
		endYear: 1967,
		sortIndex: 3
	},
	{
		slug: 'br-transition',
		name: 'Transition',
		startYear: 1968,
		endYear: 1981,
		sortIndex: 4
	},
	{
		slug: 'sectorisation',
		name: 'Sectorisation',
		startYear: 1982,
		endYear: 1993,
		sortIndex: 5
	},
	{
		slug: 'modern',
		name: 'Privatisation & the Modern Era',
		startYear: 1994,
		endYear: null,
		sortIndex: 6
	}
];

const missingServiceEntryDates: Record<string, string> = {
	Q849834: '1995-11-01T00:00:00Z', // British Rail Class 92 (Privatisation)
	Q2975732: '1999-12-01T00:00:00Z', // British Rail Class 67 (Modern)
	Q3306530: '1973-06-01T00:00:00Z', // British Rail Class 87 (BR Transition)
	Q23070990: '2017-05-01T00:00:00Z', // British Rail Class 88 (Modern)
	Q3306650: '2023-01-01T00:00:00Z', // British Rail Class 93 (Modern)
	Q112030191: '2024-01-01T00:00:00Z', // British Rail Class 99 (Modern)
	Q4970877: '2024-01-01T00:00:00Z', // British Rail Class 99 (duplicate entry / alt QID)
	Q65074647: '2021-01-01T00:00:00Z', // British Rail Class 69 (Modern)
	Q12053606: '1952-05-01T00:00:00Z', // British Rail Class 08 (BR Steam)
	Q4970692: '1959-01-01T00:00:00Z', // British Rail Class 09 (BR Steam)
	Q4970694: '1955-01-01T00:00:00Z', // British Rail Class 10 (BR Steam)
	Q4970709: '1945-01-01T00:00:00Z', // British Rail Class 11 (Big Four)
	Q1065400: '1934-03-01T00:00:00Z', // LMS Jubilee Class (Big Four)
	Q4970860: '1986-01-01T00:00:00Z', // British Rail Class 89 (Sectorisation)
	Q4970802: '1958-01-01T00:00:00Z' // British Rail Class 41 (BR Steam)
};

const sparqlQuery = `
SELECT DISTINCT 
  ?item ?itemLabel ?serviceEntry ?serviceExit ?subclass ?subclassLabel 
  ?powerSource ?powerSourceLabel ?wheelArrangement ?wheelArrangementLabel 
  ?designer ?designerLabel ?manufacturer ?manufacturerLabel 
  ?totalBuilt ?commonsCategory ?wikipediaUrl ?nickname
WHERE {
  ?item wdt:P31 ?classType.
  VALUES ?classType { wd:Q19832486 wd:Q811704 }
  {
    ?item wdt:P17 wd:Q145.
  } UNION {
    ?item wdt:P137 ?operator.
    VALUES ?operator { wd:Q206384 wd:Q631174 wd:Q672618 wd:Q745347 wd:Q1195655 }
  }


  OPTIONAL { ?item wdt:P729 ?serviceEntry. }
  OPTIONAL { ?item wdt:P730 ?serviceExit. }
  OPTIONAL { ?item wdt:P279 ?subclass. }
  OPTIONAL { ?item wdt:P516 ?powerSource. }
  OPTIONAL { ?item wdt:P2978 ?wheelArrangement. }
  OPTIONAL { ?item wdt:P287 ?designer. }
  OPTIONAL { ?item wdt:P176 ?manufacturer. }
  OPTIONAL { ?item wdt:P2560 ?totalBuilt. }
  OPTIONAL { ?item wdt:P373 ?commonsCategory. }
  OPTIONAL { ?item wdt:P1449 ?nickname. }
  OPTIONAL {
    ?wikipediaUrl schema:about ?item;
                  schema:isPartOf <https://en.wikipedia.org/>.
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;

function determineTraction(
	subclasses: Set<string>,
	powerSources: Set<string>,
	name: string
): 'STEAM' | 'DIESEL' | 'ELECTRIC' | 'OTHER' {
	const allInfo = [...Array.from(subclasses), ...Array.from(powerSources), name.toLowerCase()].join(
		' '
	);

	if (
		allInfo.includes('steam locomotive') ||
		allInfo.includes('steam engine') ||
		allInfo.includes('steam power') ||
		allInfo.includes('steam')
	) {
		return 'STEAM';
	}

	if (
		allInfo.includes('diesel-electric') ||
		allInfo.includes('diesel-hydraulic') ||
		allInfo.includes('diesel mechanical') ||
		allInfo.includes('diesel locomotive') ||
		allInfo.includes('diesel engine') ||
		allInfo.includes('diesel')
	) {
		return 'DIESEL';
	}

	if (
		allInfo.includes('electric locomotive') ||
		allInfo.includes('overhead line') ||
		allInfo.includes('third rail') ||
		allInfo.includes('traction motor') ||
		allInfo.includes('electric motor') ||
		allInfo.includes('electric')
	) {
		return 'ELECTRIC';
	}

	if (
		allInfo.includes('gas turbine') ||
		allInfo.includes('battery') ||
		allInfo.includes('hybrid') ||
		allInfo.includes('turbine')
	) {
		return 'OTHER';
	}

	return 'OTHER';
}

function getEra(year: number): string {
	if (year >= 1830 && year <= 1922) return 'pre-grouping';
	if (year >= 1923 && year <= 1947) return 'big-four';
	if (year >= 1948 && year <= 1967) return 'br-steam';
	if (year >= 1968 && year <= 1981) return 'br-transition';
	if (year >= 1982 && year <= 1993) return 'sectorisation';
	if (year >= 1994) return 'modern';
	return '';
}

async function seedEras() {
	console.log('Seeding Era table in PostgreSQL...');
	for (const era of eras) {
		await prisma.era.upsert({
			where: { slug: era.slug },
			update: {
				name: era.name,
				startYear: era.startYear,
				endYear: era.endYear,
				sortIndex: era.sortIndex
			},
			create: {
				slug: era.slug,
				name: era.name,
				startYear: era.startYear,
				endYear: era.endYear,
				sortIndex: era.sortIndex
			}
		});
	}
	console.log('Era table seeded successfully.');
}

interface WikidataBinding {
	item: { value: string };
	itemLabel: { value: string };
	wikipediaUrl?: { value: string };
	serviceEntry?: { value: string };
	serviceExit?: { value: string };
	totalBuilt?: { value: string };
	nickname?: { value: string };
	wheelArrangementLabel?: { value: string };
	designerLabel?: { value: string };
	manufacturerLabel?: { value: string };
	subclassLabel?: { value: string };
	powerSourceLabel?: { value: string };
}

interface WikidataResponse {
	results: {
		bindings: WikidataBinding[];
	};
}

interface MapItem {
	wikidataQid: string;
	name: string;
	wikipediaTitle: string | null;
	serviceEntry: string | null;
	serviceExit: string | null;
	buildStart: number | null;
	buildEnd: number | null;
	totalBuilt: number | null;
	nickname: string | null;
	wheelArrangement: string | null;
	designer: string | null;
	manufacturer: string | null;
	subclasses: Set<string>;
	powerSources: Set<string>;
	commonsCategory: string | null;
	sourceUrl: string | null;
}

async function fetchSPARQLWithRetry(
	url: string,
	retries = 5,
	initialDelay = 2000
): Promise<Response> {
	let delay = initialDelay;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/sparql-results+json',
					'User-Agent':
						'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)'
				}
			});
			if (response.ok) {
				return response;
			}
			if (response.status === 429 || response.status >= 500) {
				console.warn(
					`    - Wikidata SPARQL returned HTTP ${response.status}. Retrying in ${delay}ms (attempt ${attempt}/${retries})...`
				);
				await new Promise((res) => setTimeout(res, delay));
				delay *= 2; // exponential backoff
				continue;
			}
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		} catch (err) {
			if (attempt === retries) throw err;
			console.warn(
				`    - Wikidata SPARQL attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}. Retrying in ${delay}ms...`
			);
			await new Promise((res) => setTimeout(res, delay));
			delay *= 2;
		}
	}
	throw new Error(`Failed to fetch Wikidata SPARQL after ${retries} attempts`);
}

async function main() {
	// 1. Seed Era table
	await seedEras();

	// 2. Discover candidates
	console.log('Querying Wikidata SPARQL endpoint...');
	const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparqlQuery);
	const response = await fetchSPARQLWithRetry(url);

	const data = (await response.json()) as WikidataResponse;
	const bindings = data.results.bindings;
	console.log(`Processing ${bindings.length} row bindings from Wikidata...`);

	const candidatesMap = new Map<string, MapItem>();
	for (const binding of bindings) {
		const qid = binding.item.value.split('/').pop()!;
		if (!candidatesMap.has(qid)) {
			candidatesMap.set(qid, {
				wikidataQid: qid,
				name: binding.itemLabel.value,
				wikipediaTitle: binding.wikipediaUrl
					? decodeURIComponent(binding.wikipediaUrl.value.split('/wiki/').pop()!)
					: null,
				serviceEntry: binding.serviceEntry?.value || null,
				serviceExit: binding.serviceExit?.value || null,
				buildStart: null,
				buildEnd: null,
				totalBuilt: binding.totalBuilt ? parseInt(binding.totalBuilt.value, 10) : null,
				nickname: binding.nickname?.value || null,
				wheelArrangement: binding.wheelArrangementLabel?.value || null,
				designer: binding.designerLabel?.value || null,
				manufacturer: binding.manufacturerLabel?.value || null,
				subclasses: new Set<string>(),
				powerSources: new Set<string>(),
				commonsCategory: binding.commonsCategory?.value || null,
				sourceUrl: binding.wikipediaUrl?.value || null
			});
		}

		const item = candidatesMap.get(qid)!;
		if (binding.subclassLabel) item.subclasses.add(binding.subclassLabel.value.toLowerCase());
		if (binding.powerSourceLabel)
			item.powerSources.add(binding.powerSourceLabel.value.toLowerCase());
		if (binding.manufacturerLabel && !item.manufacturer)
			item.manufacturer = binding.manufacturerLabel.value;
		if (binding.designerLabel && !item.designer) item.designer = binding.designerLabel.value;
		if (binding.wheelArrangementLabel && !item.wheelArrangement)
			item.wheelArrangement = binding.wheelArrangementLabel.value;
		if (binding.nickname && !item.nickname) item.nickname = binding.nickname.value;
		if (binding.commonsCategory && !item.commonsCategory)
			item.commonsCategory = binding.commonsCategory.value;
		if (binding.totalBuilt && item.totalBuilt === null)
			item.totalBuilt = parseInt(binding.totalBuilt.value, 10);
	}

	const validCandidates: CandidateClass[] = [];
	const eraStats: Record<string, number> = {};

	for (const item of candidatesMap.values()) {
		if (QID_BLOCKLIST.some((b) => b.qid === item.wikidataQid)) {
			console.log(`  - Skipping blocklisted QID: ${item.wikidataQid} (${item.name})`);
			continue;
		}
		const traction = determineTraction(item.subclasses, item.powerSources, item.name);
		let serviceEntry = item.serviceEntry;
		if (!serviceEntry && missingServiceEntryDates[item.wikidataQid]) {
			serviceEntry = missingServiceEntryDates[item.wikidataQid];
		}

		let eraSlug = '';
		let year: number | null = null;
		if (serviceEntry) {
			const match = serviceEntry.match(/^(\d{4})/);
			if (match) {
				year = parseInt(match[1], 10);
				eraSlug = getEra(year);
			}
		}

		const candidateRaw = {
			wikidataQid: item.wikidataQid,
			wikipediaTitle: item.wikipediaTitle,
			name: item.name,
			nickname: item.nickname,
			traction,
			wheelArrangement: item.wheelArrangement,
			serviceEntry,
			serviceExit: item.serviceExit,
			buildStart: year,
			buildEnd: item.serviceExit ? parseInt(item.serviceExit.substring(0, 4), 10) || null : null,
			totalBuilt: item.totalBuilt,
			eraSlug,
			designer: item.designer,
			manufacturer: item.manufacturer,
			commonsCategory: item.commonsCategory,
			sourceUrl: item.sourceUrl
		};

		if (eraSlug && traction === 'DIESEL') {
			const result = CandidateClassSchema.safeParse(candidateRaw);
			if (result.success) {
				validCandidates.push(result.data);
				eraStats[eraSlug] = (eraStats[eraSlug] || 0) + 1;
			} else {
				console.warn(
					`Validation failed for ${item.name} (${item.wikidataQid}):`,
					result.error.format()
				);
			}
		}
	}

	console.log('\nDiscovery stats per era:');
	for (const era of eras) {
		const count = eraStats[era.slug] || 0;
		console.log(`- ${era.slug}: ${count} candidates`);
	}

	// Ensure data directory exists
	const dataDir = path.resolve('data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const outputPath = path.join(dataDir, 'candidates.json');
	fs.writeFileSync(outputPath, JSON.stringify(validCandidates, null, 2));
	console.log(`\nSuccessfully wrote ${validCandidates.length} valid candidates to ${outputPath}`);
}

main()
	.catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
