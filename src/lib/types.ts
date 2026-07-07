export type TractionType = 'STEAM' | 'DIESEL' | 'ELECTRIC' | 'OTHER';
export type MediaKind = 'PHOTO' | 'SCHEMATIC' | 'BLUEPRINT' | 'DIAGRAM' | 'DOCUMENT';
export type AliasSchemeType = 'TOPS' | 'PRE_TOPS' | 'BUILDER' | 'NICKNAME' | 'ORIGINAL';

export interface ClassAlias {
	alias: string;
	scheme: AliasSchemeType;
}

export interface Era {
	id: number;
	slug: string;
	name: string;
	startYear: number;
	endYear: number | null;
	sortIndex: number;
	narrative: string | null;
}

export interface Specification {
	id: number;
	key: string;
	value: string;
	unit: string | null;
	sortIndex: number;
}

export interface MediaAsset {
	id: number;
	kind: MediaKind;
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
}

export interface LocomotiveClass {
	id: number;
	wikidataQid: string;
	name: string;
	nickname: string | null;
	traction: TractionType;
	wheelArrangement: string | null;
	serviceEntry: string | null; // ISO Date String
	serviceExit: string | null; // ISO Date String
	buildStart: number | null;
	buildEnd: number | null;
	totalBuilt: number | null;
	eraId: number;
	narrative: string | null;
	isLandmark: boolean;
	specs: Specification[];
	media: MediaAsset[];
	aliases: ClassAlias[];
}
