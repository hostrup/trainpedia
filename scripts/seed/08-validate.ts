// 08-validate.ts — Automatiseret kvalitetsgate.
// Læser hele databasen og tjekker invarianter.
// HARD fejl giver exit-kode 1 (blokerer deploy.sh).
// SOFT fejl rapporteres som advarsler i DATA-QUALITY.md.
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function getAllFiles(dirPath: string, fileList: string[] = []): string[] {
	if (!fs.existsSync(dirPath)) return fileList;
	const files = fs.readdirSync(dirPath);
	for (const file of files) {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			getAllFiles(filePath, fileList);
		} else {
			fileList.push(filePath);
		}
	}
	return fileList;
}

async function main() {
	console.log('Starter kvalitetsgate (validation checks)...');

	const hardErrors: string[] = [];
	const softWarnings: string[] = [];

	// Hent data fra DB
	const classes = await prisma.locomotiveClass.findMany({
		include: {
			era: true,
			media: true,
			specs: true,
			aliases: true,
			_count: { select: { locomotives: true } }
		}
	});
	const locomotives = await prisma.locomotive.findMany({
		include: { identities: true }
	});

	// ----------------------------------------------------
	// HARD RULES (Exit 1 if violated)
	// ----------------------------------------------------

	// (1) Alle MediaAssets med CC-BY/CC-BY-SA licens SKAL have attribution
	const mediaAssets = await prisma.mediaAsset.findMany();
	for (const asset of mediaAssets) {
		const licenseLower = asset.license.toLowerCase();
		const isCC =
			licenseLower.includes('cc-by') ||
			licenseLower.includes('cc by') ||
			licenseLower.includes('creative commons');
		if (isCC && (!asset.attribution || asset.attribution.trim() === '')) {
			hardErrors.push(
				`MediaAsset ID ${asset.id} (class ${asset.classId}, ${asset.commonsUrl}): CC-licens kræver attribution, men feltet er tomt.`
			);
		}
	}

	// (2) Fysisk fil-eksistens for localPath + forældreløse filer
	const mediaDir = path.join(process.cwd(), 'data', 'media');
	const dbPaths = new Set(mediaAssets.map((a) => a.localPath));

	// Tjek at alle DB stier findes fysisk
	for (const pathStr of dbPaths) {
		const fullPath = path.join(process.cwd(), pathStr);
		if (!fs.existsSync(fullPath)) {
			hardErrors.push(`Fildisk-mangel: DB-filen '${pathStr}' findes ikke fysisk på disken.`);
		}
	}

	// Tjek for forældreløse filer (filer på disken som ikke er i DB)
	if (fs.existsSync(mediaDir)) {
		const physicalFiles = getAllFiles(mediaDir).map((p) => path.relative(process.cwd(), p));
		for (const file of physicalFiles) {
			if (
				file.endsWith('.DS_Store') ||
				file.endsWith('.gitkeep') ||
				file.endsWith('-lqip.webp') ||
				file.endsWith('-lqip.txt')
			) {
				continue;
			}

			// Mappe-struktur: data/media/Qxxxxx/filename.webp
			// srcset varianter slutter med -480.webp eller -1920.webp, tjek mod -960.webp
			let dbPathToCheck = file;
			if (file.endsWith('-480.webp')) {
				dbPathToCheck = file.slice(0, -'-480.webp'.length) + '-960.webp';
			} else if (file.endsWith('-1920.webp')) {
				dbPathToCheck = file.slice(0, -'-1920.webp'.length) + '-960.webp';
			}

			if (!dbPaths.has(dbPathToCheck)) {
				hardErrors.push(
					`Forældreløs fil: Fysisk fil '${file}' findes på disken, men har ingen reference i databasen.`
				);
			}
		}
	}

	// (3) Tidslogik
	// serviceEntry <= serviceExit
	// buildStart <= buildEnd
	// identiteters fromYear <= toYear
	for (const cls of classes) {
		if (cls.serviceEntry && cls.serviceExit && cls.serviceEntry > cls.serviceExit) {
			hardErrors.push(
				`Tidsfejl: Klasse ${cls.name} (${cls.wikidataQid}) har serviceEntry (${cls.serviceEntry.toISOString()}) efter serviceExit (${cls.serviceExit.toISOString()}).`
			);
		}
		if (cls.buildStart && cls.buildEnd && cls.buildStart > cls.buildEnd) {
			hardErrors.push(
				`Tidsfejl: Klasse ${cls.name} (${cls.wikidataQid}) har buildStart (${cls.buildStart}) efter buildEnd (${cls.buildEnd}).`
			);
		}
	}

	for (const loco of locomotives) {
		for (const id of loco.identities) {
			if (id.fromYear && id.toYear && id.fromYear > id.toYear) {
				hardErrors.push(
					`Tidsfejl: Lokomotiv ${loco.currentNumber} Identity ${id.number} har fra-år (${id.fromYear}) efter til-år (${id.toYear}).`
				);
			}
		}
	}

	// ----------------------------------------------------
	// SOFT RULES (Warnings, non-blocking)
	// ----------------------------------------------------

	// (0) Ingen dublet-numre i samme individs identitetskæde
	for (const loco of locomotives) {
		const numbersSeen = new Set<string>();
		for (const id of loco.identities) {
			if (numbersSeen.has(id.number)) {
				softWarnings.push(
					`Dublet-identitet: Lokomotiv ID ${loco.id} har dublet-nummeret '${id.number}' i sin identitetskæde.`
				);
			}
			numbersSeen.add(id.number);
		}
	}

	// (1) Klasser uden narrativ, media eller specs
	for (const cls of classes) {
		if (!cls.narrative || cls.narrative.trim() === '') {
			softWarnings.push(`Klasse uden narrativ: ${cls.name} (${cls.wikidataQid})`);
		}
		if (cls.media.length === 0) {
			softWarnings.push(`Klasse uden media assets: ${cls.name} (${cls.wikidataQid})`);
		}
		if (cls.specs.length === 0) {
			softWarnings.push(`Klasse uden specifikationer: ${cls.name} (${cls.wikidataQid})`);
		}
	}

	// (2) Individtal > totalBuilt (fejl eller manglende data)
	for (const cls of classes) {
		if (cls.totalBuilt !== null && cls._count.locomotives > cls.totalBuilt) {
			softWarnings.push(
				`Individfejl: Klasse ${cls.name} (${cls.wikidataQid}) har flere registrerede individer i DB (${cls._count.locomotives}) end totalBuilt (${cls.totalBuilt}).`
			);
		}
	}

	// (3) Klasser med introduktionsår uden for æraens grænser
	for (const cls of classes) {
		const intro = cls.buildStart ?? (cls.serviceEntry ? cls.serviceEntry.getFullYear() : null);
		if (intro !== null) {
			const start = cls.era.startYear;
			const end = cls.era.endYear;
			if (intro < start || (end !== null && intro > end)) {
				softWarnings.push(
					`Æra-grænsebrud: Klasse ${cls.name} (${cls.wikidataQid}) introduceret i ${intro}, men dens æra '${cls.era.name}' dækker ${start}–${end ?? 'present'}.`
				);
			}
		}
	}

	// (4) Regioner uden for det gyldige sæt
	const VALID_REGIONS = new Set(['WESTERN', 'EASTERN', 'MIDLAND', 'SOUTHERN', 'SCOTTISH']);
	for (const cls of classes) {
		for (const reg of cls.regions) {
			if (!VALID_REGIONS.has(reg)) {
				softWarnings.push(
					`Ugyldig region: Klasse ${cls.name} (${cls.wikidataQid}) har ukendt region '${reg}'.`
				);
			}
		}
	}

	// (5) Aliasser der er identiske med klassens eget navn
	for (const cls of classes) {
		for (const alias of cls.aliases) {
			if (alias.alias.trim().toLowerCase() === cls.name.trim().toLowerCase()) {
				softWarnings.push(
					`Alias-støj: Klasse ${cls.name} (${cls.wikidataQid}) har alias '${alias.alias}' identisk med klassens eget navn.`
				);
			}
		}
	}

	// ----------------------------------------------------
	// SKRIV DATA-QUALITY.md
	// ----------------------------------------------------
	const docContent = `# Data Quality Report

Genereret: ${new Date().toISOString()}
Database status: ${locomotives.length} individer · ${classes.length} klasser · ${mediaAssets.length} media assets

## Hard Errors (Blokerende)
${
	hardErrors.length === 0
		? '*Ingen kritiske fejl fundet.* ✅'
		: hardErrors.map((e) => `- ❌ ${e}`).join('\n')
}

## Soft Warnings (Advarsler)
${
	softWarnings.length === 0
		? '*Ingen advarsler.* ✅'
		: softWarnings.map((w) => `- ⚠️ ${w}`).join('\n')
}
`;

	fs.writeFileSync(path.join(process.cwd(), 'DATA-QUALITY.md'), docContent);
	console.log('DATA-QUALITY.md opdateret.');

	// ----------------------------------------------------
	// EXIT STRATEGY
	// ----------------------------------------------------
	if (hardErrors.length > 0) {
		console.error(`\n❌ Validation fejlede med ${hardErrors.length} kritiske fejl!`);
		process.exit(1);
	}

	console.log('\n✅ Validation fuldført uden kritiske fejl!');
	process.exit(0);
}

main()
	.catch((err) => {
		console.error('Fatal fejl i validate scriptet:', err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
