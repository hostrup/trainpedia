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

## 4. `04-reclassify.ts` — datatriage

- Udleder traction fra Whyte-notation + BR TOPS-nummerserier og genplacerer æra efter traction+år. Idempotent — **køres efter ENHVER seed-kørsel**, da upserts i 03-media.ts kan overskrive traction/æra-felterne.

## 5. `05-aliases.ts` — Wikidata-aliasser (F5.2/U3)

- Per klasse: `skos:altLabel` (en) fra Wikidata + det eksisterende `nickname`-felt → `ClassAlias`-rækker klassificeret til `AliasScheme` (PRE_TOPS/BUILDER/NICKNAME/ORIGINAL) ud fra mønstre (selskabsprefiks = ORIGINAL, "British Rail(ways) class …" = PRE_TOPS, "D6700"-stil = PRE_TOPS, "X Type N" = BUILDER, ellers NICKNAME). TOPS-navnet i sig selv duplikeres ikke — det er allerede `LocomotiveClass.name`.
- Idempotent (upsert på `[classId, alias]`) — genkør efter enhver ny klasse-seed.

## 6. `07-landmarks.ts` — landmark-flag (F5.5/F5.9c)

- Sætter `isLandmark=true` på de klasser, der er eksplicit nævnt som landmark i AGENT-BRIEF/BACKLOG/den kreative brief (A4 som A3-substitut, Deltic, Class 37, Class 47, APT). Redaktionel kuratering, ikke en kildebåret faktapåstand — ingen provenance-felter. Idempotent, kør efter enhver klasse-seed.

## Rapport (udestår)

- `seed-report.md`: klasser/æra, assets/klasse-fordeling, specs-dækning, licens-fordeling, fejlliste → fremlægges for Ronni (ikke implementeret som separat script endnu, se BACKLOG)

## Kørsel

```bash
npm run seed          # alle trin
npm run seed:media    # kun media (genoptagelig)
```

Upsert-nøgler: `wikidataQid` (klasser), `commonsUrl` (media) — genkørsel opdaterer uden dubletter.
