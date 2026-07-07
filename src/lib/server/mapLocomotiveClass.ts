// mapLocomotiveClass.ts — Prisma-række → app-formet LocomotiveClass (Date → ISO-streng).
// Delt mellem / (TubeMap) og /line/[traction] (LineDiagram), som begge fetcher hele
// klasser inkl. specs/media/aliases.
import type { LocomotiveClass } from '$lib/types.js';

export interface DbLocomotiveClassRow {
	id: number;
	wikidataQid: string;
	name: string;
	nickname: string | null;
	traction: LocomotiveClass['traction'];
	wheelArrangement: string | null;
	serviceEntry: Date | null;
	serviceExit: Date | null;
	buildStart: number | null;
	buildEnd: number | null;
	totalBuilt: number | null;
	eraId: number;
	narrative: string | null;
	isLandmark: boolean;
	specs: { id: number; key: string; value: string; unit: string | null; sortIndex: number }[];
	media: {
		id: number;
		kind: string;
		localPath: string;
		width: number;
		height: number;
		title: string | null;
		year: number | null;
		locoNumber: string | null;
		anecdote: string | null;
		commonsUrl: string;
		license: string;
		attribution: string | null;
		sortIndex: number;
	}[];
	aliases: { alias: string; scheme: string }[];
}

export function mapLocomotiveClass(c: DbLocomotiveClassRow): LocomotiveClass {
	return {
		id: c.id,
		wikidataQid: c.wikidataQid,
		name: c.name,
		nickname: c.nickname,
		traction: c.traction,
		wheelArrangement: c.wheelArrangement,
		serviceEntry: c.serviceEntry ? c.serviceEntry.toISOString() : null,
		serviceExit: c.serviceExit ? c.serviceExit.toISOString() : null,
		buildStart: c.buildStart,
		buildEnd: c.buildEnd,
		totalBuilt: c.totalBuilt,
		eraId: c.eraId,
		narrative: c.narrative,
		isLandmark: c.isLandmark,
		aliases: c.aliases as LocomotiveClass['aliases'],
		specs: c.specs.map((s) => ({
			id: s.id,
			key: s.key,
			value: s.value,
			unit: s.unit,
			sortIndex: s.sortIndex
		})),
		media: c.media.map((m) => ({
			id: m.id,
			kind: m.kind as LocomotiveClass['media'][number]['kind'],
			localPath: m.localPath,
			width: m.width,
			height: m.height,
			title: m.title,
			year: m.year,
			locoNumber: m.locoNumber,
			anecdote: m.anecdote,
			commonsUrl: m.commonsUrl,
			license: m.license,
			attribution: m.attribution,
			sortIndex: m.sortIndex
		}))
	};
}
