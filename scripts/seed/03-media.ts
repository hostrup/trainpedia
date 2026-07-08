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

async function fetchCategoryMembers(categoryTitle: string): Promise<string[]> {
	try {
		const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(categoryTitle)}&cmtype=file&cmlimit=40&format=json`;
		const res = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } });
		if (!res.ok) return [];
		const data = (await res.json()) as any;
		const members = data.query?.categorymembers || [];
		return members.map((m: any) => m.title);
	} catch {
		return [];
	}
}

async function fetchSubcategories(categoryTitle: string): Promise<string[]> {
	try {
		const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(categoryTitle)}&cmtype=subcat&cmlimit=10&format=json`;
		const res = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } });
		if (!res.ok) return [];
		const data = (await res.json()) as any;
		const members = data.query?.categorymembers || [];
		return members.map((m: any) => m.title);
	} catch {
		return [];
	}
}

async function fetchBatchDetails(filenames: string[]): Promise<any[]> {
	if (filenames.length === 0) return [];
	const titlesParam = filenames.map((f) => (f.startsWith('File:') ? f : `File:${f}`)).join('|');
	try {
		const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titlesParam)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`;
		const res = await fetchWithRetry(url, { headers: { 'User-Agent': USER_AGENT } });
		if (!res.ok) return [];
		const data = (await res.json()) as any;
		return Object.values(data.query?.pages || {});
	} catch (err) {
		console.warn(`    - Warning: Failed to fetch batch details:`, err);
		return [];
	}
}

function scoreCandidate(
	page: any,
	wikiMainFile: string | null,
	classKeywords: string[],
	preservedLocoNumbers: string[]
): number {
	const info = page.imageinfo?.[0];
	if (!info) return -100;

	const extmetadata = info.extmetadata || {};
	if (!isLicenseCompatible(extmetadata)) return -1000;

	let score = 0;

	const title = page.title || '';
	if (wikiMainFile && title.toLowerCase() === wikiMainFile.toLowerCase()) {
		score += 1000;
	}

	const width = info.width || 0;
	const height = info.height || 0;
	const megapixels = (width * height) / 1000000;
	score += Math.min(megapixels * 2, 20);

	if (width > 0 && height > 0) {
		const ratio = width / height;
		if (ratio >= 1.3 && ratio <= 1.8) {
			score += 15;
		} else if (ratio > 1.0) {
			score += 5;
		} else {
			score -= 10;
		}
	}

	const desc = extmetadata.ImageDescription?.value || '';
	const combinedText = `${title} ${desc}`.toLowerCase();

	for (const num of preservedLocoNumbers) {
		if (combinedText.includes(num.toLowerCase())) {
			score += 30;
		}
	}

	for (const kw of classKeywords) {
		if (combinedText.includes(kw.toLowerCase())) {
			score += 10;
		}
	}

	const bytes = info.size || 0;
	if (bytes > 500000) score += 5;
	if (bytes > 1500000) score += 5;

	return score;
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
				parseResult.error
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

			// 3. Upsert Narrative Sections (F12.3)
			if (cls.narratives && cls.narratives.length > 0) {
				const narrativePromises = cls.narratives.map((ns) =>
					prisma.narrativeSection.upsert({
						where: {
							classId_title: {
								classId: dbClass.id,
								title: ns.title
							}
						},
						update: {
							content: ns.content,
							sortIndex: ns.sortIndex,
							sourceUrl: ns.sourceUrl,
							retrievedAt: new Date()
						},
						create: {
							classId: dbClass.id,
							title: ns.title,
							content: ns.content,
							sortIndex: ns.sortIndex,
							sourceUrl: ns.sourceUrl,
							retrievedAt: new Date()
						}
					})
				);
				await prisma.$transaction(narrativePromises);
				console.log(`  - Upserted ${cls.narratives.length} narrative sections`);
			}

			// 3. Determine media limit
			const isFeatured = dbClass.isLandmark || FEATURED_QIDS.has(cls.wikidataQid);
			const maxImages = isFeatured ? 40 : 12;
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

			// Try to get the main image from the Wikipedia Page Summary API as the absolute best candidate
			let wikiMainFile: string | null = null;
			if (cls.wikipediaTitle) {
				try {
					const summaryApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cls.wikipediaTitle)}`;
					const summaryRes = await fetchWithRetry(summaryApiUrl, {
						headers: { 'User-Agent': USER_AGENT }
					});
					if (summaryRes.ok) {
						const summaryData = (await summaryRes.json()) as any;
						const originalSource = summaryData.originalimage?.source;
						if (originalSource && originalSource.includes('/wikipedia/commons/')) {
							let filenamePart = '';
							if (originalSource.includes('/wikipedia/commons/thumb/')) {
								const parts = originalSource.split('/');
								filenamePart = decodeURIComponent(parts[parts.length - 2]);
							} else {
								filenamePart = decodeURIComponent(
									originalSource.substring(originalSource.lastIndexOf('/') + 1)
								);
							}
							wikiMainFile = `File:${filenamePart}`;
							console.log(`  - Wikipedia Page Summary Main Image found: "${wikiMainFile}"`);
						}
					}
				} catch (err) {
					console.warn(
						`  - Warning: Failed to fetch page summary for main image: ${err instanceof Error ? err.message : String(err)}`
					);
				}
			}

			// 4. Fetch list of candidates
			let fileCandidates: string[] = [];
			const candidateToLocoNumber = new Map<string, string>();

			// direct category and subcategories crawl
			if (cls.commonsCategory) {
				try {
					const directFiles = await fetchCategoryMembers(`Category:${cls.commonsCategory}`);
					fileCandidates.push(...directFiles);
					console.log(
						`  - Commons Category "${cls.commonsCategory}": Found ${directFiles.length} direct files`
					);

					const subcats = await fetchSubcategories(cls.commonsCategory);
					if (subcats.length > 0) {
						console.log(
							`  - Category "${cls.commonsCategory}" has ${subcats.length} subcategories. Crawling...`
						);
						for (const subcat of subcats.slice(0, 5)) {
							const subFiles = await fetchCategoryMembers(subcat);
							fileCandidates.push(...subFiles);
							console.log(`    - Subcat "${subcat}": Found ${subFiles.length} files`);
						}
					}
				} catch (err) {
					console.warn(`  - Warning: Category API fetch error:`, err);
				}
			}

			// standard intitle search
			const searchQuery = cls.wikipediaTitle ? cls.wikipediaTitle.replace(/_/g, ' ') : cls.name;
			try {
				const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`intitle:"${searchQuery}"`)}&srnamespace=6&srlimit=50&format=json`;
				const searchRes = await fetchWithRetry(searchUrl, {
					headers: { 'User-Agent': USER_AGENT }
				});
				if (searchRes.ok) {
					const searchData = (await searchRes.json()) as any;
					const results = searchData.query?.search || [];
					console.log(`  - Search API (intitle): Found ${results.length} files`);
					for (const r of results) {
						if (!fileCandidates.includes(r.title)) {
							fileCandidates.push(r.title);
						}
					}
				}
			} catch (err) {
				console.warn(`  - Warning: Search API (intitle) failed:`, err);
			}

			// Geograph / Flickr Search
			try {
				const queryStr = `"${searchQuery}" (Geograph OR Flickr)`;
				const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryStr)}&srnamespace=6&srlimit=30&format=json`;
				const searchRes = await fetchWithRetry(searchUrl, {
					headers: { 'User-Agent': USER_AGENT }
				});
				if (searchRes.ok) {
					const searchData = (await searchRes.json()) as any;
					const results = searchData.query?.search || [];
					console.log(`  - Geograph/Flickr search: Found ${results.length} files`);
					for (const r of results) {
						if (!fileCandidates.includes(r.title)) {
							fileCandidates.push(r.title);
						}
					}
				}
			} catch (err) {
				console.warn(`  - Warning: Geograph/Flickr search failed:`, err);
			}

			// Video Commons Search
			try {
				const videoUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${searchQuery}" filetype:video`)}&srnamespace=6&srlimit=10&format=json`;
				const videoRes = await fetchWithRetry(videoUrl, {
					headers: { 'User-Agent': USER_AGENT }
				});
				if (videoRes.ok) {
					const videoData = (await videoRes.json()) as any;
					const results = videoData.query?.search || [];
					console.log(`  - Video search: Found ${results.length} files`);
					for (const r of results) {
						if (!fileCandidates.includes(r.title)) {
							fileCandidates.push(r.title);
						}
					}
				}
			} catch (err) {
				console.warn(`  - Warning: Video search failed:`, err);
			}

			// Prepend wiki summary image if available
			if (wikiMainFile) {
				fileCandidates = fileCandidates.filter(
					(f) => f.toLowerCase() !== wikiMainFile!.toLowerCase()
				);
				fileCandidates.unshift(wikiMainFile);
			}

			// Individual Locomotive search
			const locos = await prisma.locomotive.findMany({
				where: { classId: dbClass.id, status: { in: ['PRESERVED', 'IN_SERVICE'] } },
				include: { identities: true }
			});
			if (locos.length > 0) {
				console.log(
					`  - Searching Commons for ${locos.length} preserved locomotives & their identities...`
				);
				for (const loco of locos) {
					const locoNumbers = new Set<string>();
					locoNumbers.add(loco.currentNumber);
					for (const ident of loco.identities) {
						locoNumbers.add(ident.number);
					}

					for (const num of locoNumbers) {
						const queryStr = `"${cls.wikipediaTitle || cls.name}" "${num}"`;
						try {
							const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryStr)}&srnamespace=6&srlimit=5&format=json`;
							const searchRes = await fetchWithRetry(searchUrl, {
								headers: { 'User-Agent': USER_AGENT }
							});
							if (searchRes.ok) {
								const searchData = (await searchRes.json()) as any;
								const results = searchData.query?.search || [];
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
							console.warn(`    - Warning: Search failed for loco number ${num}:`, err);
						}
					}
				}
			}

			// De-duplicate fileCandidates (case-insensitive)
			const uniqueCandidates = new Array<string>();
			const seenTitles = new Set<string>();
			for (const title of fileCandidates) {
				const low = title.toLowerCase();
				if (!seenTitles.has(low)) {
					seenTitles.add(low);
					uniqueCandidates.push(title);
				}
			}
			console.log(`  - Total unique file candidates collected: ${uniqueCandidates.length}`);

			// Batch details query (in chunks of 50)
			const candidatePages: any[] = [];
			for (let i = 0; i < uniqueCandidates.length; i += 50) {
				const chunk = uniqueCandidates.slice(i, i + 50);
				const pages = await fetchBatchDetails(chunk);
				candidatePages.push(...pages);
			}

			const classKeywords = [cls.name, cls.nickname || ''].filter(Boolean);
			const preservedLocoNumbers = locos.map((l) => l.currentNumber);
			for (const l of locos) {
				for (const ident of l.identities) {
					preservedLocoNumbers.push(ident.number);
				}
			}

			// Score and sort candidates
			const scoredCandidates = candidatePages
				.map((page) => {
					const score = scoreCandidate(page, wikiMainFile, classKeywords, preservedLocoNumbers);
					return { page, score };
				})
				.filter((c) => c.score > -500)
				.sort((a, b) => b.score - a.score);

			console.log(`  - Scored and sorted ${scoredCandidates.length} eligible candidates`);

			// 5. Download and process candidates up to maxImages
			let savedCount = existingMediaCount;
			for (const scored of scoredCandidates) {
				if (savedCount >= maxImages) {
					break;
				}

				const page = scored.page;
				const candidateTitle = page.title || '';

				try {
					let filename = candidateTitle;
					if (filename.startsWith('File:')) {
						filename = filename.substring(5);
					}

					const ext = path.extname(filename).toLowerCase();
					const allowedExtensions = [
						'.jpg',
						'.jpeg',
						'.png',
						'.webp',
						'.svg',
						'.gif',
						'.webm',
						'.ogv',
						'.ogg',
						'.mp4'
					];
					if (!allowedExtensions.includes(ext)) {
						continue;
					}

					const isVideo = ['.webm', '.ogv', '.ogg', '.mp4'].includes(ext);

					const info = page.imageinfo?.[0];
					if (!info) continue;
					const extmetadata = info.extmetadata || {};

					const commonsUrl =
						info.descriptionurl ||
						info.url ||
						`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`;

					// Resumable check: see if this asset is already in DB and files exist on disk
					const existingAsset = await prisma.mediaAsset.findUnique({
						where: { commonsUrl }
					});
					if (existingAsset) {
						if (isVideo) {
							if (fs.existsSync(existingAsset.localPath)) {
								console.log(`    - Video "${filename}" already exists. Skipping.`);
								savedCount++;
								continue;
							}
						} else {
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
					}

					const imageUrl = info.url;
					if (!imageUrl) {
						continue;
					}

					console.log(`    - Downloading media: "${filename}" (Score: ${scored.score})`);
					const imgRes = await fetchWithRetry(imageUrl, {
						headers: { 'User-Agent': USER_AGENT }
					});
					if (!imgRes.ok) {
						continue;
					}

					const buffer = Buffer.from(await imgRes.arrayBuffer());
					const md5 = crypto.createHash('md5').update(buffer).digest('hex');

					const targetDir = path.join('data', 'media', cls.wikidataQid);
					fs.mkdirSync(targetDir, { recursive: true });

					let localPath = '';
					let width = 0;
					let height = 0;

					if (isVideo) {
						localPath = `data/media/${cls.wikidataQid}/${md5}${ext}`;
						fs.writeFileSync(path.join(targetDir, `${md5}${ext}`), buffer);
						width = info.width || 0;
						height = info.height || 0;
					} else {
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

						localPath = `data/media/${cls.wikidataQid}/${md5}-960.webp`;
						width = info960.width;
						height = info960.height;
					}

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

					// Upsert into MediaAsset
					await prisma.mediaAsset.upsert({
						where: { commonsUrl: commonsUrl },
						update: {
							classId: dbClass.id,
							kind: isVideo ? 'VIDEO' : 'PHOTO',
							localPath: localPath,
							width: width,
							height: height,
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
							kind: isVideo ? 'VIDEO' : 'PHOTO',
							localPath: localPath,
							width: width,
							height: height,
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
