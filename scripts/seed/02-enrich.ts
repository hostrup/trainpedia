import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import {
	EnrichedClassSchema,
	type EnrichedClass,
	type Specification,
	type CandidateClass
} from './types.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Promise-based request queue for strict global rate-limiting
let requestQueue: Promise<unknown> = Promise.resolve();

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
	const result = requestQueue.then(async () => {
		await delay(150); // 150ms space between requests
		return fetch(url, options);
	});
	requestQueue = result.catch(() => {});
	return result;
}

// Fetch helper with retry and back-off for 429 (Too Many Requests)
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		const res = await rateLimitedFetch(url, options);
		if (res.status === 429) {
			const retryAfterHeader = res.headers.get('Retry-After');
			let retryAfterMs = 3000 * attempt; // Default fallback: 3s, 6s, 9s...
			if (retryAfterHeader) {
				const parsedSeconds = parseInt(retryAfterHeader, 10);
				if (!isNaN(parsedSeconds)) {
					retryAfterMs = parsedSeconds * 1000;
				}
			}
			console.warn(
				`    - Warning: Received HTTP 429 (Too Many Requests). Backing off for ${retryAfterMs}ms before retry ${attempt}/${retries}...`
			);
			await delay(retryAfterMs);
			continue;
		}
		return res;
	}
	throw new Error(`HTTP 429: Rate limited continuously after ${retries} attempts`);
}

const USER_AGENT = 'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)';

function mapKeyToLabel(key: string): string | null {
	const normalized = key
		.toLowerCase()
		.replace(/[•\s\r\n\t:]+/g, ' ')
		.trim();

	if (normalized === 'manufacturer' || normalized === 'builder' || normalized === 'built by') {
		return 'Manufacturer';
	}
	if (normalized === 'designer') {
		return 'Designer';
	}
	if (
		normalized === 'wheel arrangement' ||
		normalized.includes('uic class') ||
		normalized.includes('uic classification') ||
		normalized.includes('aar wheel arr') ||
		normalized === 'uic' ||
		normalized === 'aar'
	) {
		return 'Wheel Arrangement';
	}
	if (normalized === 'power output' || normalized === 'power' || normalized === 'power rating') {
		return 'Power Output';
	}
	if (normalized === 'tractive effort' || normalized === 'max tractive effort') {
		return 'Tractive Effort';
	}
	if (normalized === 'top speed' || normalized === 'maximum speed' || normalized === 'speed') {
		return 'Top Speed';
	}
	if (
		normalized === 'total built' ||
		normalized === 'number built' ||
		normalized === 'built' ||
		normalized === 'total produced'
	) {
		return 'Total Built';
	}
	return null;
}

function parseUnit(value: string): string | null {
	const match = value.match(/\b(mph|km\/h|hp|kW|bhp|MW|lbf|kN)\b/i);
	if (match) {
		const u = match[1].toLowerCase();
		if (u === 'kw') return 'kW';
		if (u === 'mw') return 'MW';
		if (u === 'kn') return 'kN';
		return u;
	}
	return null;
}

async function main() {
	const candidatesPath = path.resolve('data/candidates.json');
	const enrichedPath = path.resolve('data/enriched.json');

	if (!fs.existsSync(candidatesPath)) {
		console.error(`Error: candidates file not found at ${candidatesPath}`);
		process.exit(1);
	}

	const candidates: CandidateClass[] = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
	console.log(`Loaded ${candidates.length} candidate classes from candidates.json.`);

	const enrichedList: EnrichedClass[] = [];

	let totalWithWikiTitle = 0;
	let summarySuccessCount = 0;
	let htmlSuccessCount = 0;
	let hasSpecsCount = 0;
	let totalSpecsParsed = 0;

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i];
		const wikiTitle = candidate.wikipediaTitle;
		const progress = `[${i + 1}/${candidates.length}]`;

		if (!wikiTitle) {
			console.log(`${progress} Skipping "${candidate.name}" (no wikipediaTitle)`);
			const enriched: EnrichedClass = {
				...candidate,
				narrative: null,
				sourceRevision: null,
				specs: [],
				media: []
			};
			// Validate schema
			const parseResult = EnrichedClassSchema.safeParse(enriched);
			if (!parseResult.success) {
				console.error(`Validation failed for "${candidate.name}":`, parseResult.error.errors);
			}
			enrichedList.push(enriched);
			continue;
		}

		totalWithWikiTitle++;
		console.log(`${progress} Processing "${candidate.name}" (Wiki: "${wikiTitle}")...`);

		let narrative: string | null = null;
		let sourceRevision: string | null = null;
		const specs: Specification[] = [];
		const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;

		// 1. Fetch Summary
		try {
			const summaryApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
			const summaryRes = await fetchWithRetry(summaryApiUrl, {
				headers: { 'User-Agent': USER_AGENT }
			});

			if (summaryRes.ok) {
				const summaryData = await summaryRes.json();
				narrative = summaryData.extract || null;
				sourceRevision = summaryData.revision ? String(summaryData.revision) : null;
				summarySuccessCount++;
				console.log(`  - Narrative: Success (Revision: ${sourceRevision})`);
			} else {
				console.log(`  - Narrative: Failed (${summaryRes.status} ${summaryRes.statusText})`);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`  - Narrative: Error fetching summary: ${msg}`);
		}

		// 2. Fetch HTML and Parse Infobox
		try {
			const htmlApiUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(wikiTitle)}`;
			const htmlRes = await fetchWithRetry(htmlApiUrl, {
				headers: { 'User-Agent': USER_AGENT }
			});

			if (htmlRes.ok) {
				const html = await htmlRes.text();
				const $ = load(html);
				const infoboxes = $('table.infobox');

				const specsMap = new Map<string, Specification>();

				infoboxes.each((_, table) => {
					$(table)
						.find('tr')
						.each((_, tr) => {
							const th = $(tr).find('th');
							const td = $(tr).find('td');

							if (th.length && td.length) {
								const tdClone = td.clone();
								tdClone.find('style').remove();
								tdClone.find('script').remove();
								tdClone.find('sup').remove();

								// Clean up spacing for block elements
								tdClone.find('br').replaceWith(' ');
								tdClone.find('div, p, li, dt, dd').each((_, el) => {
									$(el).prepend(' ').append(' ');
								});

								const key = th.text().trim();
								const value = tdClone.text().replace(/\s+/g, ' ').trim();

								if (key && value) {
									const mappedLabel = mapKeyToLabel(key);
									if (mappedLabel) {
										const unit = parseUnit(value);
										const specKey = `${mappedLabel}::${value}`;
										if (!specsMap.has(specKey)) {
											specsMap.set(specKey, {
												key: mappedLabel,
												value,
												unit,
												sourceUrl: wikiUrl
											});
										}
									}
								}
							}
						});
				});

				const parsedSpecs = Array.from(specsMap.values());
				specs.push(...parsedSpecs);
				htmlSuccessCount++;
				if (parsedSpecs.length > 0) {
					hasSpecsCount++;
					totalSpecsParsed += parsedSpecs.length;
				}
				console.log(`  - Specs: Found ${parsedSpecs.length} specification(s)`);
			} else {
				console.log(`  - Specs: Failed (${htmlRes.status} ${htmlRes.statusText})`);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.log(`  - Specs: Error parsing infobox: ${msg}`);
		}

		const enriched: EnrichedClass = {
			...candidate,
			narrative,
			sourceRevision,
			specs,
			media: []
		};

		// Validate schema
		const parseResult = EnrichedClassSchema.safeParse(enriched);
		if (!parseResult.success) {
			console.error(`Validation failed for "${candidate.name}":`, parseResult.error.errors);
		}

		enrichedList.push(enriched);
	}

	// Write output
	fs.writeFileSync(enrichedPath, JSON.stringify(enrichedList, null, 2), 'utf8');
	console.log(`\nWritten enriched classes to ${enrichedPath}`);

	// Print summary statistics
	const enrichmentRate =
		totalWithWikiTitle > 0 ? ((summarySuccessCount / totalWithWikiTitle) * 100).toFixed(1) : '0';
	const specsCoverage =
		totalWithWikiTitle > 0 ? ((hasSpecsCount / totalWithWikiTitle) * 100).toFixed(1) : '0';

	console.log(`\n=== ENRICHMENT STATISTICS ===`);
	console.log(`Total candidate classes: ${candidates.length}`);
	console.log(`Candidates with wikipediaTitle: ${totalWithWikiTitle}`);
	console.log(
		`Successful narrative fetches: ${summarySuccessCount} / ${totalWithWikiTitle} (${enrichmentRate}%)`
	);
	console.log(`Successful HTML/Specs parses: ${htmlSuccessCount} / ${totalWithWikiTitle}`);
	console.log(`Classes with at least one spec: ${hasSpecsCount} (${specsCoverage}%)`);
	console.log(`Total specifications parsed: ${totalSpecsParsed}`);
}

main().catch((err) => {
	console.error('Fatal error running enrichment script:', err);
	process.exit(1);
});
