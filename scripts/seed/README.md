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

## 6. `06-fleet.ts` — individniveau-seed (F6.2, pilot Class 37/U6)

- Henter Wikipedias "List of British Rail Class X locomotives" (én regelmæssig tabel: BTC/TOPS(1-3)/Post-TOPS(1-2)-omlitreringskæde, Names, Status, Notes) og seeder `Locomotive` + `LocomotiveIdentity`.
- Navn↔nummer-korrespondance er IKKE 1:1 i kilden (navneskift sker uafhængigt af omlitreringer) — kun SIDSTE navn gemmes som `currentName`, øvrige lægges i `nicknames` uden gæt på hvilket nummer de hørte til. `LocomotiveIdentity` bærer udelukkende den verificerbare NUMMER-kæde.
- Idempotent: `Locomotive` upsertes på `[classId, currentNumber]`; `LocomotiveIdentity`-rækker slettes og genskabes pr. individ (ingen separat unik-nøgle nødvendig).
- Pilot-resultat (2026-07-07): 309/309 individer (dækning 100 %, matcher "Total Built"-specen), statusfordeling IN_SERVICE=40/STORED=21/PRESERVED=39/SCRAPPED=209. Eksempel: 37403 "Isle of Mull", identities D6607→37307→37403.

## 7. `07-landmarks.ts` — landmark-flag (F5.5/F5.9c)

- Sætter `isLandmark=true` på de klasser, der er eksplicit nævnt som landmark i AGENT-BRIEF/BACKLOG/den kreative brief (A4 som A3-substitut, Deltic, Class 37, Class 47, APT). Redaktionel kuratering, ikke en kildebåret faktapåstand — ingen provenance-felter. Idempotent, kør efter enhver klasse-seed.

## Rapport (udestår)

- `seed-report.md`: klasser/æra, assets/klasse-fordeling, specs-dækning, licens-fordeling, fejlliste → fremlægges for Ronni (ikke implementeret som separat script endnu, se BACKLOG)

## Backfill- og hjælpescripts (runde 3 tilføjelser)

- **`backfill-value-numeric.ts`** — Udvinder numeriske værdier (fx HK, vægt, hastighed, brændstofkapacitet) fra fritekst-specs ved hjælp af regex-enheds-parsing og gemmer dem i `valueNumeric`.
- **`backfill-total-built.ts`** — Kopierer det numeriske `Total Built` spec-felt over på `LocomotiveClass.totalBuilt`-kolonnen for at sikre, at kildebåret metadata er direkte tilgængelig til ledertavler og søgninger.
- **`backfill-regions.ts`** — Udfylder `LocomotiveClass.regions`-listen ud fra kendte britiske driftsregioner beskrevet i Wikipedia-artikler.

## Den fulde Seed-rækkefølge og rørledning

For at sikre korrekt referentiel integritet og undgå, at data overskrives uhensigtsmæssigt, skal scripts afvikles i denne præcise rækkefølge (som defineret i `npm run seed`):

1. **`01-discover.ts`** (Wikidata indledende tjek)
2. **`02-enrich.ts`** (Wikipedia REST narrative sektioner & rå infobox)
3. **`03-media.ts`** (Wikimedia Commons downloader og video-crawler)
4. **`backfill-value-numeric.ts`** (Konverterer specs til talværdier)
5. **`backfill-total-built.ts`** (Fremmer spec-værdier til klasserne)
6. **`backfill-regions.ts`** (Regioner og linjefarver til kortet)
7. **`04-reclassify.ts`** (Triage: retter æraer og powerType)
8. **`05-aliases.ts`** (Aggregerer pre-TOPS og klasse-aliasser)
9. **`06-fleet.ts`** (Individ-tabelopbygning fra omlitreringslister)
10. **`07-landmarks.ts`** (Opsætning af landmark-flag)
11. **`09-eras.ts`** (Synkroniserer æra-slugs og narrativer)
12. **`08-validate.ts`** (Kørselskontrol og generering af `DATA-QUALITY.md`)

### Forventet varighed og driftskrav

- **Hurtig kørsel (uden nye medier):** ~30-60 sekunder. Hvis filerne allerede eksisterer på disken under `data/media/`, springer `03-media.ts` filoverførslen over.
- **Fuld kørsel (første gang eller tom database):** 10-30 minutter. Tidsforbruget drives primært af ratelimiteret netværkshastighed ved download af billeder/videoer (5-12 medier pr. normal klasse, op til 40 for landmarks).
- **Ratelimits og User-Agent:** Alle kald til Wikipedia/Wikimedia Commons API'er er forsynet med en global rate limit (200ms spacing) og identificeres via en dedikeret User-Agent i `03-media.ts`.

### Idempotens- og integritetsgarantier

- **Klasser:** Unik-nøgle på `wikidataQid`. Genkørsel opdaterer eksisterende klasser i stedet for at duplikere.
- **Medier:** Unik-nøgle på `commonsUrl`. Mediefiler genkendes på deres MD5-hashværdi, og scriptet verificerer fil-eksistens på disken før eventuel download for at undgå unødig API-belastning.
- **Specifikationer:** Unik-nøgle på `[classId, key]`.
- **Historik for individer:** `06-fleet.ts` sletter tidligere oprettede `LocomotiveIdentity`-kæder for et individ før genindsættelse, hvilket sikrer, at omlitreringskæderne forbliver konsistente og fri for dubletter, uanset hvor mange gange seed-pipelinen køres.
- **Kvalitetsgate:** `08-validate.ts` forhindrer deploy, hvis kritiske fact-checks (fx Class 47's totalBuilt) eller blocklisten overtrædes.

## Kørsel

```bash
npm run seed          # Kører alle trin i pipelinen
npm run seed:media    # Kun mediedownloader (resumable)
```
