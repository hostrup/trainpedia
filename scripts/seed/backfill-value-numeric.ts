// scripts/seed/backfill-value-numeric.ts — F9.15: Parse valueNumeric + unit for all Specifications.
// Parses the first meaningful number from the value string, paired with the detected unit.
// Handles formats like "1,750 hp (1,300 kW)", "90 mph (145 km/h)", "200 kN (45,000 lbf)",
// "2,580 hp", "Class 37", etc. Only the FIRST number before the first unit is extracted.
// Run after 02-enrich.ts or standalone: tsx scripts/seed/backfill-value-numeric.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Spec keys that should have numeric values
const NUMERIC_KEYS = new Set([
	'Power Output',
	'Tractive Effort',
	'Top Speed',
	'Total Built',
	'Fuel capacity'
]);

/**
 * Parse the first meaningful numeric value from a spec string.
 * Handles: "1,750 hp (1,300 kW)", "90 mph", "200 kN (45,000 lbf)",
 * "56,000 lb (250 kN)", etc.
 *
 * Returns the number BEFORE the first unit match (the primary value).
 * Ignores parenthesized alternate-unit values.
 */
function parseNumericValue(value: string, key: string): { numeric: number; unit: string } | null {
	if (!value || !NUMERIC_KEYS.has(key)) return null;

	// For "Total Built" — just extract the first integer
	if (key === 'Total Built') {
		const m = value.match(/(\d[\d,]*)/);
		if (m) {
			const n = parseInt(m[1].replace(/,/g, ''), 10);
			if (!isNaN(n) && n > 0) return { numeric: n, unit: 'units' };
		}
		return null;
	}

	// Heuristic: If the string contains "Total: <number> <unit>" or "total <number> <unit>", prioritize it!
	if (key === 'Power Output' || key === 'Tractive Effort') {
		const totalMatch = value.match(
			/(?:total|aggregate|sum|combined)\s*:?\s*(\d[\d,.']*)\s*(mph|km\/h|hp|bhp|kW|MW|lbf|kN)/i
		);
		if (totalMatch) {
			let numStr = totalMatch[1].replace(/,/g, '');
			if (numStr.includes('.')) {
				const parts = numStr.split('.');
				if (parts.length === 2 && parts[1].length === 3) {
					numStr = parts.join('');
				}
			}
			const n = parseFloat(numStr);
			if (!isNaN(n) && n > 0) {
				let unit = totalMatch[2].toLowerCase();
				if (unit === 'kw') unit = 'kW';
				else if (unit === 'mw') unit = 'MW';
				else if (unit === 'kn') unit = 'kN';
				else if (unit === 'bhp') unit = 'hp';
				return { numeric: n, unit };
			}
		}
	}

	// For other numeric specs: find the FIRST number followed by a known unit
	// Pattern: optional leading text, then digits (with commas/dots), then optional space, then unit
	const unitPattern =
		/(\d[\d,.']*)\s*(mph|km\/h|hp|bhp|kW|MW|lbf|kN|kg|lb|tons?|tonnes?|gal|l|litres?|liters?)/i;
	const m = value.match(unitPattern);
	if (!m) return null;

	// Parse the number: remove commas, handle European decimal notation
	let numStr = m[1].replace(/,/g, '');
	// Handle cases like "1.750" which in British context means 1750 (thousands separator)
	// But "3.5" means 3.5. Heuristic: if exactly 3 digits after dot, it's a thousands separator
	if (numStr.includes('.')) {
		const parts = numStr.split('.');
		if (parts.length === 2 && parts[1].length === 3) {
			numStr = parts.join(''); // "1.750" → "1750"
		}
	}

	const n = parseFloat(numStr);
	if (isNaN(n) || n <= 0) return null;

	// Normalize unit
	let unit = m[2].toLowerCase();
	if (unit === 'kw') unit = 'kW';
	else if (unit === 'mw') unit = 'MW';
	else if (unit === 'kn') unit = 'kN';
	else if (unit === 'bhp')
		unit = 'hp'; // treat bhp as hp
	else if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre')) unit = 'l';
	else if (unit === 'gal') unit = 'gal';

	return { numeric: n, unit };
}

async function main() {
	const specs = await prisma.specification.findMany({
		where: { key: { in: Array.from(NUMERIC_KEYS) } },
		select: { id: true, key: true, value: true, unit: true, valueNumeric: true }
	});

	console.log(`Found ${specs.length} specifications with numeric keys`);

	let updated = 0;
	let skipped = 0;
	let failed = 0;

	for (const spec of specs) {
		const result = parseNumericValue(spec.value, spec.key);
		if (result) {
			if (spec.valueNumeric === result.numeric && spec.unit === result.unit) {
				skipped++;
				continue;
			}
			await prisma.specification.update({
				where: { id: spec.id },
				data: { valueNumeric: result.numeric, unit: result.unit }
			});
			updated++;
		} else {
			failed++;
			if (spec.key !== 'Total Built') {
				console.log(`  ⚠ Could not parse "${spec.key}": "${spec.value}"`);
			}
		}
	}

	console.log(`\n=== valueNumeric BACKFILL ===`);
	console.log(`Updated: ${updated}`);
	console.log(`Skipped (already correct): ${skipped}`);
	console.log(`Unparseable: ${failed}`);

	// Report coverage per key
	for (const key of NUMERIC_KEYS) {
		const total = await prisma.specification.count({ where: { key } });
		const withNumeric = await prisma.specification.count({
			where: { key, valueNumeric: { not: null } }
		});
		console.log(`  ${key}: ${withNumeric}/${total} have valueNumeric`);
	}
}

main()
	.catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
