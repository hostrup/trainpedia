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

	// Universal Workhorses (Class 08, 37, 47, 66, 60) exist in multiple regions
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

	console.log(`Processes ${candidates.length} diesel candidates...`);

	const layout: LayoutItem[] = [];
	const regionCounters: Record<string, number> = {
		WESTERN: 0,
		EASTERN: 0,
		MIDLAND: 0,
		SOUTHERN: 0,
		SCOTTISH: 0
	};

	candidates.forEach((item) => {
		const introYear = item.buildStart || 1960;
		const zone = determineZone(introYear);
		const regions = determineRegions(item);

		// Landmark mapping
		const isLandmark = [
			'Q3306037',
			'Q796898',
			'Q18752',
			'Q12053606',
			'Q849801',
			'Q509748'
		].includes(item.wikidataQid);

		// Calculate semi-spiral coordinates based on zone and order
		// We distribute them around concentric rings
		const zoneRadii: Record<number, number> = {
			1: 100,
			2: 200,
			3: 290,
			4: 370,
			5: 440,
			6: 510
		};

		const radius = zoneRadii[zone] || 300;
		// Determine angle offset by index to distribute nodes evenly
		const zoneItems = candidates.filter((c) => determineZone(c.buildStart || 1960) === zone);
		const zoneIdx = zoneItems.findIndex((c) => c.wikidataQid === item.wikidataQid);
		const totalInZone = zoneItems.length;

		// Calculate angle in radians
		const angle = (zoneIdx / totalInZone) * 2 * Math.PI - Math.PI / 2;

		// Convert polar coordinates to grid coordinates (centered at 600, 500)
		const centerX = 600;
		const centerY = 500;
		let x = Math.round(centerX + radius * Math.cos(angle));
		let y = Math.round(centerY + radius * Math.sin(angle));

		// Snap to a 20px grid for cleaner lines
		x = Math.round(x / 20) * 20;
		y = Math.round(y / 20) * 20;

		regions.forEach((r) => regionCounters[r]++);

		layout.push({
			qid: item.wikidataQid,
			name: item.name,
			introYear,
			zone,
			regions,
			x,
			y,
			labelSide: angle > 0 ? 'below' : 'above',
			isLandmark,
			retiredYear: item.buildEnd || null
		});
	});

	const outputPath = path.resolve('src/lib/tubemap/dieselLayout.ts');
	fs.writeFileSync(
		outputPath,
		`export const dieselLayout = ${JSON.stringify(layout, null, 2)} as const;`
	);

	console.log(`Successfully generated layout config for ${layout.length} classes.`);
	console.log('Region distribution of stations:', regionCounters);
}

main().catch(console.error);
