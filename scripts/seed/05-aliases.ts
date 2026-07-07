// 05-aliases.ts — henter alternative navne/numre pr. klasse (F5.2/U3):
// Wikidata skos:altLabel (en) + det eksisterende nickname-felt fra 01-discover.
// Klassificerer hver alias til et AliasScheme (PRE_TOPS/BUILDER/NICKNAME) ud fra
// mønstre; usikre tilfælde falder til NICKNAME. TOPS-navnet er allerede
// LocomotiveClass.name og duplikeres ikke som alias. Idempotent (upsert på
// [classId, alias]) — kan genkøres efter enhver ny seed-kørsel.
import { PrismaClient } from '@prisma/client';
import { ClassAliasCandidateSchema, type ClassAliasCandidate, type AliasScheme } from './types.js';

const prisma = new PrismaClient();
const USER_AGENT = 'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AltLabelBinding {
	item: { value: string };
	altLabel: { value: string };
}

interface WikidataResponse {
	results: { bindings: AltLabelBinding[] };
}

// Pre-grouping/Big Four selskabsforkortelser — labels der starter hermed er
// selskabets EGET klassenavn fra før nationaliseringen 1948.
const PRE_NATIONALISATION_PREFIX =
	/^(GWR|LMS|LMSR|LNER|LNWR|LSWR|LBSCR|SECR|LCDR|SER|GER|GNR|GCR|NER|NBR|GSWR|CR|HR|MR|MGWR|SDJR|MSWJR|SDR|SR|Met)\b/i;

// BR's egen (pre-TOPS) magtklassifikation, fx "British Railways Class 20/4",
// "British Rail class D12/4" — bruges 1948-~1973, forskellig fra TOPS-nummeret.
const BR_PRE_TOPS_CLASS = /british\s+rail(way)?s?\s+class/i;

function classifyAlias(alias: string): AliasScheme {
	const trimmed = alias.trim();
	if (PRE_NATIONALISATION_PREFIX.test(trimmed)) return 'ORIGINAL';
	if (BR_PRE_TOPS_CLASS.test(trimmed)) return 'PRE_TOPS';
	// Bar pre-TOPS lokonummer: "D6700", "E3001"
	if (/^[DE]\d{2,5}[A-Z]?$/i.test(trimmed)) return 'PRE_TOPS';
	// Bygger/fabrikant-typebetegnelser: "English Electric Type 3", "BRCW Type 2"
	if (/\btype\s*\d+\b/i.test(trimmed)) return 'BUILDER';
	return 'NICKNAME';
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

async function fetchAltLabels(qids: string[], attempt = 1): Promise<Map<string, Set<string>>> {
	const values = qids.map((q) => `wd:${q}`).join(' ');
	const sparqlQuery = `
    SELECT ?item ?altLabel WHERE {
      VALUES ?item { ${values} }
      ?item skos:altLabel ?altLabel.
      FILTER(lang(?altLabel) = "en")
    }
  `;
	const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparqlQuery);

	const response = await fetch(url, {
		headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT }
	});

	if (!response.ok) {
		if ((response.status === 429 || response.status >= 500) && attempt <= 3) {
			const backoff = attempt * 2000;
			console.warn(`  HTTP ${response.status}, retry ${attempt}/3 efter ${backoff}ms...`);
			await delay(backoff);
			return fetchAltLabels(qids, attempt + 1);
		}
		throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as WikidataResponse;
	const byQid = new Map<string, Set<string>>();
	for (const binding of data.results.bindings) {
		const qid = binding.item.value.split('/').pop()!;
		if (!byQid.has(qid)) byQid.set(qid, new Set());
		byQid.get(qid)!.add(binding.altLabel.value);
	}
	return byQid;
}

async function main() {
	const classes = await prisma.locomotiveClass.findMany({
		select: { id: true, wikidataQid: true, name: true, nickname: true, sourceUrl: true }
	});
	console.log(`Henter aliasser for ${classes.length} klasser...`);

	const byQid = new Map<string, (typeof classes)[number]>();
	for (const c of classes) byQid.set(c.wikidataQid, c);

	const qids = classes.map((c) => c.wikidataQid);
	const altLabelsByQid = new Map<string, Set<string>>();

	for (const batch of chunk(qids, 50)) {
		const result = await fetchAltLabels(batch);
		for (const [qid, labels] of result) altLabelsByQid.set(qid, labels);
		await delay(500); // rate-limit-venligt mod query.wikidata.org
	}

	const candidates: ClassAliasCandidate[] = [];
	const schemeStats: Record<string, number> = {};

	for (const c of classes) {
		const seen = new Set<string>([c.name.toLowerCase()]);
		const wikidataUrl = `https://www.wikidata.org/wiki/${c.wikidataQid}`;

		// Kaldenavn fra discovery-trinnet (P1449) — allerede på LocomotiveClass.
		if (c.nickname && !seen.has(c.nickname.toLowerCase())) {
			seen.add(c.nickname.toLowerCase());
			const raw = {
				classId: c.id,
				alias: c.nickname,
				scheme: 'NICKNAME' as const,
				sourceUrl: c.sourceUrl
			};
			const parsed = ClassAliasCandidateSchema.safeParse(raw);
			if (parsed.success) candidates.push(parsed.data);
		}

		// Wikidata skos:altLabel — klassificeret heuristisk.
		const altLabels = altLabelsByQid.get(c.wikidataQid) ?? new Set();
		for (const label of altLabels) {
			const key = label.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			const raw = {
				classId: c.id,
				alias: label,
				scheme: classifyAlias(label),
				sourceUrl: wikidataUrl
			};
			const parsed = ClassAliasCandidateSchema.safeParse(raw);
			if (parsed.success) candidates.push(parsed.data);
			else
				console.warn(
					`Validering fejlede for alias "${label}" (${c.wikidataQid}):`,
					parsed.error.format()
				);
		}
	}

	console.log(`\nUpserter ${candidates.length} aliasser...`);
	for (const alias of candidates) {
		await prisma.classAlias.upsert({
			where: { classId_alias: { classId: alias.classId, alias: alias.alias } },
			update: { scheme: alias.scheme, sourceUrl: alias.sourceUrl, retrievedAt: new Date() },
			create: {
				classId: alias.classId,
				alias: alias.alias,
				scheme: alias.scheme,
				sourceUrl: alias.sourceUrl,
				retrievedAt: new Date()
			}
		});
		schemeStats[alias.scheme] = (schemeStats[alias.scheme] || 0) + 1;
	}

	console.log('\nAliasser pr. skema:');
	for (const [scheme, count] of Object.entries(schemeStats)) {
		console.log(`  ${scheme}: ${count}`);
	}
	console.log(
		`\n${altLabelsByQid.size}/${classes.length} klasser havde mindst én Wikidata altLabel.`
	);
}

main()
	.catch((err) => {
		console.error('Fatal error running aliases script:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
