# Seed-pipeline — spec (Fase 1)

Idempotente TypeScript-scripts (`tsx`), køres i rækkefølge. Al output valideres med Zod FØR upsert. Strict factuality: intet felt udfyldes uden kilde — huller er OK, opdigtning er forbudt.

## 1. `01-discover.ts` — Wikidata SPARQL

- Query: instanser/underklasser af "locomotive class" med country=UK (P17/Q145) eller operatør i britiske jernbaneselskaber; hent QID, label, P729 (service entry), traction (P516/klasse-hierarki), P1030/wheel arrangement (via P31-kæder), fabrikant (P176), designer (P287)
- Output: `out/candidates.json` — grupperet i de 7 æraer efter serviceEntry-dato
- Kvalitetsmål: ≥20 klasser/æra; log dækning per æra

## 2. `02-enrich.ts` — Wikipedia REST

- Per kandidat: `/api/rest_v1/page/summary/{title}` + sections; gem `extract` som narrativ (ordret citat, IKKE omskrevet), revisions-id som sourceRevision
- Infobox-parsing (specs) kun som supplement til Wikidata — hver spec-værdi får sourceUrl

## 3. `03-media.ts` — Wikimedia Commons

- Per klasse: Commons-kategori (fra Wikidata P373) → filliste → filtrér licenser til PD/CC-BY/CC-BY-SA
- Download original → sharp → 480/960/1920 webp + LQIP-blurhash → `data/media/<class-slug>/`
- Metadata: titel, år (fra `DateTimeOriginal`/beskrivelse hvis parsebar), loco-nummer (regex på beskrivelse, fx \b\d{5}\b eller klassepræfiks), fotograf-attribution, licens — manglende felter = NULL
- Mål: ≥20 assets/klasse; rate-limit venligt (maxlag-param, User-Agent med kontakt)

## 4. `04-report.ts`

- Genererer `seed-report.md`: klasser/æra, assets/klasse-fordeling, specs-dækning, licens-fordeling, fejlliste → fremlægges for Ronni

## Kørsel

```bash
npm run seed          # alle trin
npm run seed:media    # kun media (genoptagelig)
```

Upsert-nøgler: `wikidataQid` (klasser), `commonsUrl` (media) — genkørsel opdaterer uden dubletter.
