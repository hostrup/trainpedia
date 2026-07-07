/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { EnrichedClassSchema } from './types.js';

const prisma = new PrismaClient();
const USER_AGENT = 'TrainpediaBot/1.0 (https://github.com/hostrup/trainpedia; contact@hostrup.org)';

// Turn off sharp cache to conserve memory
sharp.cache(false);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FEATURED_QIDS = new Set([
	'Q796898', // Class 55
	'Q3306037', // Class 37
	'Q3246420', // Class 47
	'Q1065400', // LMS Jubilee
	'Q12053606' // Class 08
]);

// Promise-based request queue for strict global rate-limiting
let requestQueue: Promise<any> = Promise.resolve();

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
	const result = requestQueue.then(async () => {
		await delay(200); // 200ms space between requests
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

function cleanHtml(html: string | undefined | null): string {
	if (!html) return '';
	return html
		.replace(/<[^>]*>/g, '') // remove HTML tags
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

function parseYear(dateStr: string | undefined | null): number | null {
	if (!dateStr) return null;
	// Look for a 4-digit number starting with 18, 19, or 20
	const match = dateStr.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return null;
}

function parseLocoNumber(text: string | null): string | null {
	if (!text) return null;
	// standard British 5-digit number or D followed by 4 digits (e.g. D1015, D818)
	const match = text.match(/\b(\d{5})\b/);
	if (match) return match[1];
	const dMatch = text.match(/\b(D\d{4})\b/i);
	if (dMatch) return dMatch[1].toUpperCase();
	return null;
}

function isLicenseCompatible(extmetadata: any): boolean {
	if (!extmetadata) return false;

	const licenseShort = extmetadata.LicenseShortName?.value || '';
	const license = extmetadata.License?.value || '';
	const usageTerms = extmetadata.UsageTerms?.value || '';

	const combined = `${licenseShort} | ${license} | ${usageTerms}`.toLowerCase();

	// Reject non-commercial or restrictive licenses
	if (
		combined.includes('-nc') ||
		combined.includes('nc-') ||
		combined.includes('non-commercial') ||
		combined.includes('noncommercial') ||
		combined.includes('-nd') ||
		combined.includes('nd-') ||
		combined.includes('no-derivative') ||
		combined.includes('noderivative') ||
		combined.includes('all rights reserved') ||
		combined.includes('fair use')
	) {
		return false;
	}

	// Keep only compatible open licenses: "Public domain", "CC0", "CC BY", "CC BY-SA"
	const isCcBySa = combined.includes('cc-by-sa') || combined.includes('cc by-sa');
	const isCcBy = combined.includes('cc-by') || combined.includes('cc by');
	const isCc0 = combined.includes('cc0') || combined.includes('cc-zero');
	const isPd =
		combined.includes('public domain') || combined.includes('pd-') || /\bpd\b/.test(combined);

	return isCcBySa || isCcBy || isCc0 || isPd;
}

function parseDateTime(dateStr: string | null | undefined): Date | null {
	if (!dateStr) return null;
	if (/^\d{4}$/.test(dateStr)) {
		return new Date(`${dateStr}-01-01T00:00:00Z`);
	}
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return null;
	return date;
}

async function main() {
	const enrichedPath = path.resolve('data/enriched.json');
	if (!fs.existsSync(enrichedPath)) {
		console.error(`Error: Enriched JSON not found at ${enrichedPath}`);
		process.exit(1);
	}

	const enrichedData: any[] = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
	console.log(`Loaded ${enrichedData.length} enriched classes from enriched.json.`);

	// Pre-load all eras to map slugs to IDs
	const eras = await prisma.era.findMany();
	const eraSlugToId = new Map(eras.map((e) => [e.slug, e.id]));
	console.log(`Loaded ${eras.length} eras from the database.`);

	let totalClassesProcessed = 0;
	let totalImagesDownloaded = 0;
	let totalErrorsEncountered = 0;

	for (let idx = 0; idx < enrichedData.length; idx++) {
		const rawClass = enrichedData[idx];
		const progress = `[${idx + 1}/${enrichedData.length}]`;
		const parseResult = EnrichedClassSchema.safeParse(rawClass);
		if (!parseResult.success) {
			console.error(
				`${progress} Validation failed for enriched class "${rawClass.name || 'unknown'}":`,
				parseResult.error.errors
			);
			totalErrorsEncountered++;
			continue;
		}

		const cls = parseResult.data;
		console.log(`\n${progress} Processing class: "${cls.name}" (${cls.wikidataQid})`);

		const eraId = eraSlugToId.get(cls.eraSlug);
		if (!eraId) {
			console.error(
				`${progress} - Error: Era slug "${cls.eraSlug}" not found in database. Skipping class.`
			);
			totalErrorsEncountered++;
			continue;
		}

		try {
			// 1. Upsert LocomotiveClass
			const serviceEntryDate = parseDateTime(cls.serviceEntry);
			const serviceExitDate = parseDateTime(cls.serviceExit);

			const dbClass = await prisma.locomotiveClass.upsert({
				where: { wikidataQid: cls.wikidataQid },
				update: {
					wikipediaTitle: cls.wikipediaTitle,
					name: cls.name,
					nickname: cls.nickname,
					traction: cls.traction,
					wheelArrangement: cls.wheelArrangement,
					serviceEntry: serviceEntryDate,
					serviceExit: serviceExitDate,
					buildStart: cls.buildStart,
					buildEnd: cls.buildEnd,
					totalBuilt: cls.totalBuilt,
					narrative: cls.narrative,
					eraId: eraId,
					sourceUrl: cls.sourceUrl,
					sourceRevision: cls.sourceRevision,
					retrievedAt: new Date()
				},
				create: {
					wikidataQid: cls.wikidataQid,
					wikipediaTitle: cls.wikipediaTitle,
					name: cls.name,
					nickname: cls.nickname,
					traction: cls.traction,
					wheelArrangement: cls.wheelArrangement,
					serviceEntry: serviceEntryDate,
					serviceExit: serviceExitDate,
					buildStart: cls.buildStart,
					buildEnd: cls.buildEnd,
					totalBuilt: cls.totalBuilt,
					narrative: cls.narrative,
					eraId: eraId,
					sourceUrl: cls.sourceUrl,
					sourceRevision: cls.sourceRevision,
					retrievedAt: new Date()
				}
			});

			console.log(`  - Upserted LocomotiveClass (ID: ${dbClass.id})`);

			// 2. Upsert Specifications
			if (cls.specs.length > 0) {
				const specPromises = cls.specs.map((spec, sortIdx) =>
					prisma.specification.upsert({
						where: {
							classId_key: {
								classId: dbClass.id,
								key: spec.key
							}
						},
						update: {
							value: spec.value,
							unit: spec.unit,
							sourceUrl: spec.sourceUrl,
							sortIndex: sortIdx,
							retrievedAt: new Date()
						},
						create: {
							classId: dbClass.id,
							key: spec.key,
							value: spec.value,
							unit: spec.unit,
							sortIndex: sortIdx,
							sourceUrl: spec.sourceUrl,
							retrievedAt: new Date()
						}
					})
				);
				await prisma.$transaction(specPromises);
				console.log(`  - Upserted ${cls.specs.length} specifications`);
			}

			// 3. Determine media limit
			const isFeatured = dbClass.isLandmark || FEATURED_QIDS.has(cls.wikidataQid);
			const maxImages = isFeatured ? 40 : 5;
			console.log(
				`  - Media Limit: ${maxImages} images (${isFeatured ? 'Landmark/Featured' : 'Normal'} class)`
			);

			// Resumable check: if we already have enough media assets for this class, skip media download
			const existingMediaCount = await prisma.mediaAsset.count({
				where: { classId: dbClass.id }
			});
			if (existingMediaCount >= maxImages) {
				console.log(
					`  - Class "${cls.name}" already has ${existingMediaCount} media assets in database. Skipping media download.`
				);
				totalClassesProcessed++;
				continue;
			}

			// 4. Fetch list of candidates
			let fileCandidates: string[] = [];
			const candidateToLocoNumber = new Map<string, string>();

			if (cls.commonsCategory) {
				try {
					const categoryUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(cls.commonsCategory)}&cmtype=file&cmlimit=50&format=json`;
					const categoryRes = await fetchWithRetry(categoryUrl, {
						headers: { 'User-Agent': USER_AGENT }
					});
					if (categoryRes.ok) {
						const catData = (await categoryRes.json()) as any;
						const members = catData.query?.categorymembers || [];
						fileCandidates = members.map((m: any) => m.title);
						console.log(
							`  - Commons Category "${cls.commonsCategory}": Found ${fileCandidates.length} files`
						);
					} else {
						console.warn(
							`  - Warning: Category API returned HTTP ${categoryRes.status} for "${cls.commonsCategory}"`
						);
					}
				} catch (err) {
					console.warn(
						`  - Warning: Category API fetch error for "${cls.commonsCategory}": ${err instanceof Error ? err.message : String(err)}`
					);
				}
			}

			if (fileCandidates.length === 0) {
				const searchQuery = cls.wikipediaTitle ? cls.wikipediaTitle.replace(/_/g, ' ') : cls.name;
				console.log(`  - Category empty/missing. Searching Commons for "${searchQuery}"...`);
				try {
					// FA5/F5.9(a): en løs (unquoted) fritekst-søgning matcher ethvert dokument der
					// nævner de enkelte ord ("class" er ekstremt generisk og gav falske hits som
					// "The two Mr. Wetherbys; a middle-class comedy"). `intitle:"frase"` begrænser
					// til filer hvis TITEL indeholder den nøjagtige frase — langt mere præcist.
					const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`intitle:"${searchQuery}"`)}&srnamespace=6&srlimit=50&format=json`;
					const searchRes = await fetchWithRetry(searchUrl, {
						headers: { 'User-Agent': USER_AGENT }
					});
					if (searchRes.ok) {
						const searchData = (await searchRes.json()) as any;
						const results = searchData.query?.search || [];
						fileCandidates = results.map((r: any) => r.title);
						console.log(`  - Search API: Found ${fileCandidates.length} files`);
					} else {
						console.warn(
							`  - Warning: Search API returned HTTP ${searchRes.status} for "${searchQuery}"`
						);
					}
				} catch (err) {
					console.warn(
						`  - Warning: Search API fetch error for "${searchQuery}": ${err instanceof Error ? err.message : String(err)}`
					);
				}
			}

			// F6.4: Udvid med målrettet Commons-søgning pr. loco-nummer for kendte lokomotiver i DB
			const locos = await prisma.locomotive.findMany({
				where: { classId: dbClass.id, status: { in: ['PRESERVED', 'IN_SERVICE'] } }
			});
			if (locos.length > 0) {
				console.log(
					`  - Searching Commons for ${locos.length} individual locomotives (PRESERVED/IN_SERVICE)...`
				);
				for (const loco of locos) {
					const queryStr = `"${dbClass.wikipediaTitle || dbClass.name}" "${loco.currentNumber}"`;
					try {
						const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryStr)}&srnamespace=6&srlimit=5&format=json`;
						const searchRes = await fetchWithRetry(searchUrl, {
							headers: { 'User-Agent': USER_AGENT }
						});
						if (searchRes.ok) {
							const searchData = (await searchRes.json()) as any;
							const results = searchData.query?.search || [];
							console.log(`    - Loco ${loco.currentNumber}: Found ${results.length} files`);
							for (const r of results) {
								if (!fileCandidates.includes(r.title)) {
									fileCandidates.push(r.title);
								}
								let cleanFilename = r.title;
								if (cleanFilename.startsWith('File:')) {
									cleanFilename = cleanFilename.substring(5);
								}
								candidateToLocoNumber.set(cleanFilename, loco.currentNumber);
							}
						}
					} catch (err) {
						console.warn(`    - Warning: Individual search failed for ${loco.currentNumber}:`, err);
					}
				}
			}

			// 5. Download and process candidates up to maxImages
			let savedCount = existingMediaCount;
			for (const candidateTitle of fileCandidates) {
				if (savedCount >= maxImages) {
					break;
				}

				try {
					let filename = candidateTitle;
					if (filename.startsWith('File:')) {
						filename = filename.substring(5);
					}

					const ext = path.extname(filename).toLowerCase();
					const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
					if (!allowedExtensions.includes(ext)) {
						console.log(`    - Skipping irrelevant file type: ${filename}`);
						continue;
					}

					const detailsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;
					const detailsRes = await fetchWithRetry(detailsUrl, {
						headers: { 'User-Agent': USER_AGENT }
					});
					if (!detailsRes.ok) {
						console.warn(`    - Warning: Details API HTTP ${detailsRes.status} for "${filename}"`);
						continue;
					}

					const detailsData = (await detailsRes.json()) as any;
					const page = Object.values(detailsData.query?.pages || {})[0] as any;
					if (!page || !page.imageinfo || page.imageinfo.length === 0) {
						console.warn(`    - Warning: Details response missing imageinfo for "${filename}"`);
						continue;
					}

					const info = page.imageinfo[0];
					const extmetadata = info.extmetadata || {};

					if (!isLicenseCompatible(extmetadata)) {
						continue;
					}

					const commonsUrl =
						info.descriptionurl ||
						info.url ||
						`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;

					// Resumable check: see if this asset is already in DB and files exist on disk
					const existingAsset = await prisma.mediaAsset.findUnique({
						where: { commonsUrl }
					});
					if (existingAsset) {
						const pathsToCheck = [
							existingAsset.localPath,
							existingAsset.localPath.replace('-960.webp', '-1920.webp'),
							existingAsset.localPath.replace('-960.webp', '-480.webp'),
							existingAsset.localPath.replace('-960.webp', '-lqip.webp'),
							existingAsset.localPath.replace('-960.webp', '-lqip.txt')
						];
						const filesExist = pathsToCheck.every((p) => fs.existsSync(p));
						if (filesExist) {
							console.log(
								`    - Media "${filename}" already exists on disk and DB. Skipping download.`
							);
							savedCount++;
							continue;
						}
					}

					const imageUrl = info.url;
					if (!imageUrl) {
						console.warn(`    - Warning: Missing download URL for "${filename}"`);
						continue;
					}

					console.log(`    - Downloading media: "${filename}"`);
					const imgRes = await fetchWithRetry(imageUrl, { headers: { 'User-Agent': USER_AGENT } });
					if (!imgRes.ok) {
						console.warn(
							`      - Warning: Download failed (HTTP ${imgRes.status}) for ${imageUrl}`
						);
						continue;
					}

					const buffer = Buffer.from(await imgRes.arrayBuffer());
					const md5 = crypto.createHash('md5').update(buffer).digest('hex');

					const targetDir = path.join('data', 'media', cls.wikidataQid);
					fs.mkdirSync(targetDir, { recursive: true });

					// Resize with sharp
					const image = sharp(buffer);

					// Save the three versions:
					await image
						.clone()
						.resize(1920)
						.webp()
						.toFile(path.join(targetDir, `${md5}-1920.webp`));
					const info960 = await image
						.clone()
						.resize(960)
						.webp()
						.toFile(path.join(targetDir, `${md5}-960.webp`));
					await image
						.clone()
						.resize(480)
						.webp()
						.toFile(path.join(targetDir, `${md5}-480.webp`));

					// Save LQIP WebP (16x16) and base64 text
					const lqipBuffer = await image.clone().resize(16, 16).webp().toBuffer();
					const lqipBase64 = `data:image/webp;base64,${lqipBuffer.toString('base64')}`;
					fs.writeFileSync(path.join(targetDir, `${md5}-lqip.webp`), lqipBuffer);
					fs.writeFileSync(path.join(targetDir, `${md5}-lqip.txt`), lqipBase64, 'utf8');

					// Extract metadata fields
					const metadataTitle = cleanHtml(
						extmetadata.ObjectName?.value || extmetadata.Title?.value || filename
					);
					const attribution = cleanHtml(extmetadata.Artist?.value || null);
					const year = parseYear(extmetadata.DateTimeOriginal?.value || null);
					const anecdote = cleanHtml(extmetadata.ImageDescription?.value || null);

					const searchStr = `${metadataTitle} ${anecdote}`;
					let locoNumber = parseLocoNumber(searchStr);
					if (!locoNumber && candidateToLocoNumber.has(filename)) {
						locoNumber = candidateToLocoNumber.get(filename)!;
					}

					const licenseName =
						extmetadata.LicenseShortName?.value || extmetadata.License?.value || 'Open License';

					const localPath = `data/media/${cls.wikidataQid}/${md5}-960.webp`;

					// Upsert into MediaAsset
					await prisma.mediaAsset.upsert({
						where: { commonsUrl: commonsUrl },
						update: {
							classId: dbClass.id,
							kind: 'PHOTO',
							localPath: localPath,
							width: info960.width,
							height: info960.height,
							title: metadataTitle || null,
							year: year,
							locoNumber: locoNumber,
							anecdote: anecdote || null,
							license: licenseName,
							attribution: attribution || null,
							sortIndex: savedCount,
							retrievedAt: new Date()
						},
						create: {
							classId: dbClass.id,
							kind: 'PHOTO',
							localPath: localPath,
							width: info960.width,
							height: info960.height,
							title: metadataTitle || null,
							year: year,
							locoNumber: locoNumber,
							anecdote: anecdote || null,
							license: licenseName,
							attribution: attribution || null,
							sortIndex: savedCount,
							retrievedAt: new Date(),
							commonsUrl: commonsUrl
						}
					});

					savedCount++;
					totalImagesDownloaded++;
					console.log(`      - Saved successfully as asset ${savedCount}/${maxImages}`);
				} catch (err) {
					console.warn(
						`    - Warning: Failed to process candidate "${candidateTitle}": ${err instanceof Error ? err.message : String(err)}`
					);
					totalErrorsEncountered++;
				}
			}

			totalClassesProcessed++;
			console.log(`  - Class "${cls.name}" complete. Saved ${savedCount} assets.`);
		} catch (err) {
			console.error(`  - Error: Failed to process class "${cls.name}":`, err);
			totalErrorsEncountered++;
		}
	}

	console.log(`\n=== MEDIA AND DB SYNCHRONIZATION STATISTICS ===`);
	console.log(`Total classes successfully processed: ${totalClassesProcessed}`);
	console.log(`Total images downloaded & processed: ${totalImagesDownloaded}`);
	console.log(`Total errors/warnings logged: ${totalErrorsEncountered}`);

	// Query DB counts
	const classCount = await prisma.locomotiveClass.count();
	const specCount = await prisma.specification.count();
	const mediaCount = await prisma.mediaAsset.count();
	console.log(`\n=== DATABASE COUNTS ===`);
	console.log(`LocomotiveClass table rows: ${classCount}`);
	console.log(`Specification table rows: ${specCount}`);
	console.log(`MediaAsset table rows: ${mediaCount}`);
}

main()
	.catch((err) => {
		console.error('Fatal error running media and db sync script:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
