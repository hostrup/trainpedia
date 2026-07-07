import fs from 'fs';
import path from 'path';
import { type CandidateClass } from './seed/types.js';

interface LayoutItem {
	qid: string;
	name: string;
	introYear: number;
	zone: number;
	regions: string[];
	x: number;
	y: number;
	labelSide: 'above' | 'below' | 'left' | 'right';
	isLandmark: boolean;
	retiredYear: number | null;
}

function determineRegions(item: CandidateClass): string[] {
	const text =
		`${item.name} ${item.nickname || ''} ${item.manufacturer || ''} ${item.designer || ''} ${item.wikipediaTitle || ''}`.toLowerCase();
	const regions: string[] = [];

	if (
		text.includes('western') ||
		text.includes('swindon') ||
		text.includes('hydraulic') ||
		['q509748', 'q4970802', 'q18752'].some((q) => item.wikidataQid.includes(q))
	) {
		regions.push('WESTERN');
	}
	if (
		text.includes('southern') ||
		text.includes('ashford') ||
		text.includes('eastleigh') ||
		text.includes('crompton') ||
		text.includes('bi-mode') ||
		text.includes('third rail')
	) {
		regions.push('SOUTHERN');
	}
	if (
		text.includes('eastern') ||
		text.includes('deltic') ||
		text.includes('doncaster') ||
		text.includes('darlington') ||
		text.includes('lner')
	) {
		regions.push('EASTERN');
	}
	if (
		text.includes('scottish') ||
		text.includes('highland') ||
		text.includes('barclay') ||
		text.includes('inverness')
	) {
		regions.push('SCOTTISH');
	}

	// Universal Workhorses (Class 08, 37, 47, 66) exist in multiple regions
	if (item.name.includes('Class 08') || item.wikidataQid === 'Q12053606') {
		return ['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH'];
	}
	if (item.name.includes('Class 37') || item.wikidataQid === 'Q3306037') {
		return ['WESTERN', 'EASTERN', 'SCOTTISH', 'MIDLAND'];
	}
	if (item.name.includes('Class 47') || item.wikidataQid === 'Q849801') {
		return ['WESTERN', 'EASTERN', 'MIDLAND', 'SCOTTISH', 'SOUTHERN'];
	}
	if (item.name.includes('Class 66') || item.wikidataQid === 'Q182103') {
		return ['WESTERN', 'EASTERN', 'MIDLAND', 'SCOTTISH'];
	}

	if (regions.length === 0) {
		regions.push('MIDLAND'); // Default region
	}

	return regions;
}

function determineZone(year: number): number {
	if (year <= 1954) return 1; // Pioneers (1948-1954)
	if (year <= 1967) return 2; // Modernisation Plan (1955-1967)
	if (year <= 1981) return 3; // TOPS transition (1968-1981)
	if (year <= 1988) return 4; // Sectorisation (1982-1988)
	if (year <= 1994) return 5; // Sene BR (1989-1994)
	return 6; // Privatisation (1995+)
}

async function main() {
	const candidatesPath = path.resolve('data/candidates.json');
	const rawData = fs.readFileSync(candidatesPath, 'utf8');
	const candidates = JSON.parse(rawData) as CandidateClass[];

	// Sort candidates chronologically
	candidates.sort((a, b) => {
		const yearA = a.buildStart || 9999;
		const yearB = b.buildStart || 9999;
		return yearA - yearB;
	});

	console.log(`Processing ${candidates.length} diesel candidates...`);

	const assignedRegions = new Map<string, string[]>();
	const regionCounts: Record<string, number> = {
		WESTERN: 0,
		EASTERN: 0,
		MIDLAND: 0,
		SOUTHERN: 0,
		SCOTTISH: 0
	};

	// 1. First pass: Assign explicit regions and detect universals
	candidates.forEach((item) => {
		let regs = determineRegions(item);
		const isUniversal = regs.length > 1;

		if (!isUniversal) {
			// Focus on a single line for regular classes
			regs = [regs[0]];
		}

		assignedRegions.set(item.wikidataQid, regs);
		if (!isUniversal) {
			regionCounts[regs[0]]++;
		}
	});

	// 2. Second pass: Balance non-explicitly-regioned default classes to prevent Midland crowding
	candidates.forEach((item) => {
		const regs = assignedRegions.get(item.wikidataQid)!;
		const text =
			`${item.name} ${item.nickname || ''} ${item.manufacturer || ''} ${item.designer || ''} ${item.wikipediaTitle || ''}`.toLowerCase();

		const hasExplicitKeyword =
			text.includes('western') ||
			text.includes('swindon') ||
			text.includes('hydraulic') ||
			text.includes('southern') ||
			text.includes('ashford') ||
			text.includes('eastleigh') ||
			text.includes('crompton') ||
			text.includes('eastern') ||
			text.includes('deltic') ||
			text.includes('doncaster') ||
			text.includes('darlington') ||
			text.includes('lner') ||
			text.includes('scottish') ||
			text.includes('highland') ||
			text.includes('barclay') ||
			text.includes('inverness');

		const isUniversal = regs.length > 1;

		if (!hasExplicitKeyword && !isUniversal) {
			// Find the region with the lowest station count
			let minRegion = 'MIDLAND';
			let minCount = Infinity;
			for (const r in regionCounts) {
				if (regionCounts[r] < minCount) {
					minCount = regionCounts[r];
					minRegion = r;
				}
			}
			// Reassign to balance the map branches
			regionCounts[regs[0]]--;
			regs[0] = minRegion;
			regionCounts[minRegion]++;
			assignedRegions.set(item.wikidataQid, regs);
		}
	});

	// 3. Group and sort candidates chronologically per region
	const regionSortedLists: Record<string, string[]> = {
		WESTERN: [],
		EASTERN: [],
		MIDLAND: [],
		SOUTHERN: [],
		SCOTTISH: []
	};

	candidates.forEach((item) => {
		const regs = assignedRegions.get(item.wikidataQid)!;
		const primary = regs[0];
		regionSortedLists[primary].push(item.wikidataQid);
	});

	const candidateByQid = new Map(candidates.map((c) => [c.wikidataQid, c]));
	for (const r in regionSortedLists) {
		regionSortedLists[r].sort((a, b) => {
			const yearA = candidateByQid.get(a)!.buildStart || 1960;
			const yearB = candidateByQid.get(b)!.buildStart || 1960;
			return yearA - yearB;
		});
	}

	const layout: LayoutItem[] = [];
	const finalCounters: Record<string, number> = {
		WESTERN: 0,
		EASTERN: 0,
		MIDLAND: 0,
		SOUTHERN: 0,
		SCOTTISH: 0
	};

	// 4. Calculate coordinates along 5 distinct 45-degree rays (no stagger offset for straight paths)
	candidates.forEach((item) => {
		const introYear = item.buildStart || 1960;
		const zone = determineZone(introYear);
		const regs = assignedRegions.get(item.wikidataQid)!;
		const primaryRegion = regs[0];
		const regionIdx = regionSortedLists[primaryRegion].indexOf(item.wikidataQid);

		// Landmarks list
		const isLandmark = [
			'Q3306037',
			'Q796898',
			'Q18752',
			'Q12053606',
			'Q849801',
			'Q509748'
		].includes(item.wikidataQid);

		const isUniversal = regs.length > 1;

		let x: number;
		let y: number;

		if (isUniversal) {
			// Place in a clean central cross/ring inside the interchange hub
			if (item.wikidataQid === 'Q12053606' || item.name.includes('Class 08')) {
				x = 600;
				y = 500; // Center
			} else if (item.wikidataQid === 'Q3306037' || item.name.includes('Class 37')) {
				x = 640;
				y = 500; // Right
			} else if (item.wikidataQid === 'Q849801' || item.name.includes('Class 47')) {
				x = 560;
				y = 500; // Left
			} else if (item.wikidataQid === 'Q182103' || item.name.includes('Class 66')) {
				x = 600;
				y = 460; // Top
			} else {
				x = 600;
				y = 540; // Bottom
			}
		} else {
			// Regular class: place along its region ray
			let angle = 0;
			if (primaryRegion === 'EASTERN')
				angle = 0; // Right
			else if (primaryRegion === 'SCOTTISH')
				angle = Math.PI / 4; // Down-right
			else if (primaryRegion === 'MIDLAND')
				angle = (3 * Math.PI) / 2; // Up
			else if (primaryRegion === 'SOUTHERN')
				angle = Math.PI; // Left
			else if (primaryRegion === 'WESTERN') angle = (5 * Math.PI) / 4; // Down-left

			const startRadius = 100; // Keep the center hub clear
			const stationGap = 45; // Generous gap to prevent overlap along the line
			const distance = startRadius + regionIdx * stationGap;

			const centerX = 600;
			const centerY = 500;
			x = Math.round(centerX + distance * Math.cos(angle));
			y = Math.round(centerY + distance * Math.sin(angle));
		}

		// Snap to a 20px grid
		x = Math.round(x / 20) * 20;
		y = Math.round(y / 20) * 20;

		regs.forEach((r) => finalCounters[r]++);

		// Alternating labelSide to prevent overlap along straight lines
		let labelSide: 'above' | 'below' | 'left' | 'right';
		if (primaryRegion === 'EASTERN' || primaryRegion === 'SOUTHERN') {
			labelSide = regionIdx % 2 === 0 ? 'above' : 'below';
		} else {
			labelSide = regionIdx % 2 === 0 ? 'left' : 'right';
		}

		layout.push({
			qid: item.wikidataQid,
			name: item.name,
			introYear,
			zone,
			regions: regs,
			x,
			y,
			labelSide,
			isLandmark,
			retiredYear: item.buildEnd || null
		});
	});

	const outputPath = path.resolve('src/lib/tubemap/dieselLayout.ts');
	fs.writeFileSync(
		outputPath,
		`export const dieselLayout = ${JSON.stringify(layout, null, 2)} as const;`
	);

	console.log(
		`Successfully generated balanced double-track layout config for ${layout.length} classes.`
	);
	console.log('Final region distribution:', finalCounters);
}

main().catch(console.error);
