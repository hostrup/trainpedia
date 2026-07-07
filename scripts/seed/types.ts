import { z } from 'zod';

export const TractionSchema = z.enum(['STEAM', 'DIESEL', 'ELECTRIC', 'OTHER']);
export type Traction = z.infer<typeof TractionSchema>;

export const MediaKindSchema = z.enum(['PHOTO', 'BLUEPRINT', 'DIAGRAM', 'DOCUMENT']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const AliasSchemeSchema = z.enum(['TOPS', 'PRE_TOPS', 'BUILDER', 'NICKNAME', 'ORIGINAL']);
export type AliasScheme = z.infer<typeof AliasSchemeSchema>;

// Class alias contract (F5.2/U3) — alternative navne/numre for en klasse
export const ClassAliasCandidateSchema = z.object({
	classId: z.number().int(),
	alias: z.string().min(1),
	scheme: AliasSchemeSchema,
	sourceUrl: z.string().nullable()
});
export type ClassAliasCandidate = z.infer<typeof ClassAliasCandidateSchema>;

// Specification contract
export const SpecificationSchema = z.object({
	key: z.string(),
	value: z.string(),
	unit: z.string().nullable(),
	sourceUrl: z.string().nullable()
});
export type Specification = z.infer<typeof SpecificationSchema>;

// Media Asset contract
export const MediaAssetSchema = z.object({
	commonsUrl: z.string().url(),
	kind: MediaKindSchema,
	localPath: z.string(), // relative to data/media/<class-slug>/, e.g. "image-960.webp"
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	title: z.string().nullable(),
	year: z.number().int().nullable(),
	locoNumber: z.string().nullable(),
	anecdote: z.string().nullable(),
	license: z.string(),
	attribution: z.string().nullable(),
	sortIndex: z.number().int().default(0)
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

// Candidate class from discovery step
export const CandidateClassSchema = z.object({
	wikidataQid: z.string().regex(/^Q\d+$/),
	wikipediaTitle: z.string().nullable(),
	name: z.string(),
	nickname: z.string().nullable(),
	traction: TractionSchema,
	wheelArrangement: z.string().nullable(),
	serviceEntry: z.string().nullable(), // ISO Date string (e.g. 1961-06-12T00:00:00.000Z) or year string (e.g. 1961)
	serviceExit: z.string().nullable(),
	buildStart: z.number().int().nullable(),
	buildEnd: z.number().int().nullable(),
	totalBuilt: z.number().int().nullable(),
	eraSlug: z.string(),
	designer: z.string().nullable(),
	manufacturer: z.string().nullable(),
	commonsCategory: z.string().nullable(),
	sourceUrl: z.string().nullable()
});
export type CandidateClass = z.infer<typeof CandidateClassSchema>;

// Enriched class from enrichment step
export const EnrichedClassSchema = CandidateClassSchema.extend({
	narrative: z.string().nullable(),
	sourceRevision: z.string().nullable(),
	commonsCategory: z.string().nullable(), // Wikimedia Commons category (P373)
	specs: z.array(SpecificationSchema),
	media: z.array(MediaAssetSchema).default([])
});
export type EnrichedClass = z.infer<typeof EnrichedClassSchema>;
