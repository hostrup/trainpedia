# Backlog — trainpedia (review 2026-07-07)

Baseline (genverificeret 2026-07-08 morgen, Claude Opus 4.6): lint 0 fejl · check/tsc
0 fejl, 0 warnings (F9.8 lukket) · 23 unit-tests grønne (F9.9: 2 demo-tests fjernet)
· working tree ren på main.
DB-fakta: 98 klasser (100% DIESEL) · 309 individer (kun 1/98 klasser har fleet-data)
· 353 media-assets (13 klasser har 0) · 853 identities · `totalBuilt` er NULL på
ALLE 98 klasser.

## Fase F11 — "The Working Museum": UI-pivot væk fra metrokortet (Ronnis direktiv 2026-07-08)

**Ronni 2026-07-08:** _"Jeg kan mærke at det er mig som holder fast i min tanke
om at togene skulle visualiseres via et underground map. Men jeg kan se at det
giver store problemer... I sidste ende er det jo netop data som det handler om...
data skal kunne grupperes og sorteres og visualiseres på flere måder — som alt
sammen giver den her museumsoplevelse og nørde-tilgang. Lad første prioritet
være at du REELT skaber en brugergrænseflade som er worldclass — spec den
fuldstændig komplet."_

**Den komplette spec er skrevet: [docs/SPEC-F11-MUSEUM-UI.md](docs/SPEC-F11-MUSEUM-UI.md)**
— den AFLØSER DESIGN-F5-TUBEMAP.md som bærende UI-dokument og skal læses i sin
helhed før implementering. Kerneidéen: metrokortet pensioneres som UI (metaforen
fejlede — hver pixel skal kunne forsvares med en database-række); det lyse
TfL-designsprog bevares. Ét datasæt ses gennem FIRE linser (Grid/Table/Timeline/
Chart) med fælles URL-båret filter/gruppering/sortering — dét er "overblikket".
Ny IA: The Great Hall (forside-hub) · /browse (The Roster) · /records ·
/survivors · /compare · bevarede /class- og /loco-sider. Kronologi vises
fremover KUN lineært (levetids-tidslinje) — aldrig ordinalt/radialt.

Faserne (detaljer og accept i spec'ens §11; datakrav i §9):

- [x] **F11.1** [High] `/browse` med kontrolbjælke + Grid- & Table-linse;
      URL-state, /classes 301-redirect, quick-view drawer, nav-update.
      **FIXET 2026-07-08:** Full implementation med filter-chips (era, powerType),
      sortering (year/name/built), Grid med Type-badges, Table med alle specs.
- [x] **F11.2** [High] Timeline-linsen — Gantt-stil SVG med lineær x-akse,
      æra-baggrundsbånd med farver, region-farvede bars, landmark-markers,
      terminus-marks, sticky labels.
      **FIXET 2026-07-08:** 98 klasser på én tidslinje fra 1925–i dag.
- [ ] **F11.3** [High] The Great Hall (ny forside jf. spec §5) + nav-omlægning
      (`Browse/Timeline/Records/Survivors` + søgefelt) + **pensionering af al
      kort-kode**: TubeMap/Minimap/ZoneBands/dieselLayout/layout.ts-2D-mode,
      `/line/[slug]`-ruterne. StationIcon-ikonografiens DNA genbruges i Timeline.
- [ ] **F11.4** [Medium] Chart-linsen (akse-vælger-scatterplot m. ærlig
      dæknings-note) + `/records` (The Record Books: Fastest/Most numerous/
      Longest lived/Survivors/One-offs — rene data-rankings, ingen fritekst).
- [ ] **F11.5** [Medium] `/survivors` (The Shed) + `/compare` (The Workshop) + global typeahead (spec §8; afhænger af F9.1 + F9.3).
- [ ] **F11.6** [Medium] Exhibit/Locomotive-udvidelser (fleet-status-søjle,
      lifespan-strip, Type-badges, records-plaketter, siblings-navigation,
      galleri-fallback) + motion-polish + e2e-suite der KLIKKER alle linse-flows.
- [x] **F11-D1** [High, data] Nyt afledt felt `powerType` (BTC Type 1–5 /
      SHUNTER / null) beregnet i `04-reclassify.ts` af KILDET hk-værdi.
      **FIXET 2026-07-08:** 96/98 klasser har powerType. Fordeling: SHUNTER=39,
      TYPE_1=12, TYPE_2=16, TYPE_3=6, TYPE_4=17, TYPE_5=6, null=2.
- [x] **F11-D2** [Medium, data] Builder-facet: normaliseret fabrikant-nøgle
      fra Specification "Manufacturer" (alias-tabel i kode, rå streng bevares).
      **FIXET 2026-07-08:** 96/98 klasser har builder. Alias-tabel i 04-reclassify.ts.

**Konsekvenser for eksisterende backlog (re-statusering 2026-07-08):**
F9.0b, F9.12, F9.13 og F10.3 BORTFALDER (kort-koden pensioneres i F11.3);
F9.0a hot-fixes kun hvis F11.3 ikke er deployet inden for få dage (live-sitet
har en død CTA indtil da). F10.1→F11.6, F10.2→F11.5, F10.4→F11.5 (/compare),
F10.5→F11.5 (/survivors), F10.6→F11.6 — F10 består kun som selvstændige punkter
for F10.7 (OG-metadata) og F10.8 (Random class). U8 (mobil) er LUKKET af spec
§10 (responsive linser). F9-datasporet (A+D-sektionerne) er UÆNDRET og nu endnu
mere kritisk: linserne er kun så gode som tallene bag dem.

## Fase F9 — Opslagsværkets komplethed + oprydning (analyse 2026-07-07, Claude Fable 5)

**Analysens hovedkonklusion:** F5–F8 har leveret et sammenhængende TfL-univers med
god interaktion, men "Opslagsværket" (F6-visionen, Ronnis kernekrav) er reelt kun
en pilot: fleet-data findes for ÉN klasse (Class 37), `totalBuilt` er tomt overalt,
og søgningen kan ikke finde individer. Datakomplethed er den største afstand
mellem produktet og briefen — men Ronnis gennemsyn samme aften afslørede to
UI-blockers (sektion 0), som skal først. Rækkefølgen herunder er prioriteret; en
agent kan tage punkterne oppefra. Husdisciplin gælder: `04-reclassify` efter hver
seed, strict factuality (tomme felter frem for opdigtning), `./deploy.sh` som
eneste udrulningsvej, BACKLOG.md opdateres når et punkt lukkes.

### 0. BLOCKERS — Ronnis gennemsyn 2026-07-07 aften (rodårsager verificeret i kode + live-site)

Ronni: "forsiden med ringene giver slet ikke mening... der står The Big Four men
lige under er der lokomotiver fra 80'erne. OG når man har valgt et tog på
forsiden, kan man ikke komme videre til selve siden med info." Begge dele er
reproduceret og rodårsags-bestemt — tag disse FØR alt andet i F9.

- [x] **F9.0a** [Blocker] **(F11-note 2026-07-08: bortfalder når F11.3
      pensionerer kortet — hot-fix kun hvis F11.3 ikke deployes inden for få
      dage.)** **Placard-CTA'en er død — kortets bund-bar opsnapper
      klikket.** Rodårsag: Time Machine-baren (`TubeMap.svelte:584`) fik `z-50` i
      F8, mens placard-draweren (`MuseumPlacard.svelte:31`) er `z-40`.
      **FIXET 2026-07-08:** `z-50` → `z-10` i TubeMap.svelte. Z-lagdelingsorden
      dokumenteret i kommentar (kort-overlays z-10/z-20 < backdrop z-30 < placard z-40).
      Placard-CTA er nu klikbar. Regression fra F8.
- [x] **F9.0b** [Blocker] **BORTFALDET 2026-07-08 (F11):** metrokortet
      pensioneres helt, jf. SPEC-F11-MUSEUM-UI.md — ringene forsvinder med det,
      og Timeline-linsen (F11.2) viser kronologien sandt på en lineær akse.
      Analysen bevares herunder som begrundelse for pivoten.
      **Æra-ringene er visuelt usande — radius har INGEN
      sammenhæng med æra.** Målt mod DB + `dieselLayout.ts` (centrum 600,500):
      Pilot Scheme-stationer spænder radius 0–1103, Privatisation & Modern
      60–820; Class 66 (1998!) ligger ved r=60 — næsten i centrum, dybt inde i
      "The Big Four"-ringen (r=328), og 6 klasser fra 1968+ ligger inden for
      den. Ronnis observation er præcis. Rodårsag: `zoneRings`
      (`TubeMap.svelte:146`) ANTAGER at radius koder tid (ringradius = kumulativ
      max-afstand pr. æra), men de håndplacerede koordinater i `dieselLayout.ts`
      koder region-RETNING og lokal æstetik — ikke radial kronologi. Ringene
      lover altså en orden, kortet ikke har. To veje: **(a) hurtig ærlighed:**
      fjern ringene + deres labels helt (Time Machine og stations-labels bærer
      tidsdimensionen) — én dags arbejde, ingen datakrav; **(b) den rigtige
      løsning:** håndhæv radial æra-disciplin i layoutet — genberegn alle
      koordinater så hver æras stationer ligger i deres eget annulus-bånd
      (zone 1 = ældste æra inderst, som TfL-zoner; `scripts/generate-diesel-layout.ts`
      findes allerede som udgangspunkt, og F5.3-beslutningen "æra-zonerne bærer
      tidsdimensionen" peger entydigt på denne). **Anbefaling: (b)**, evt. med
      (a) som strakstiltag hvis (b) tager mere end en session. OBS: afhænger af
      F9.5b (æra-tildelingerne selv er skæve — ring-disciplin oven på forkerte
      eraId'er flytter bare løgnen). **Accept:** ingen station ligger radialt
      uden for/inden for en anden æras ring; Playwright-screenshot hvor "The
      Big Four"-ringens indhold faktisk er 1923–1947-klasser.

### A. Datakomplethed (højeste værdi — det er her produktet halter mest)

- [ ] **F9.1** [High] **Generalisér fleet-seeden ud over Class 37-piloten.**
      `scripts/seed/06-fleet.ts:18` har en hardcodet liste med præcis ét opslag
      (Q3306037 → "List of British Rail Class 37 locomotives"). Kun 1/98 klasser har
      individer i DB — F6.5's "100% dækning" gælder klasse-niveau, ikke individ-niveau.
      Fix: auto-opdag pr. klasse om en "List of British Rail Class NN locomotives"-
      artikel findes (Wikipedia API-eksistenstjek ud fra `wikipediaTitle`/TOPS-nummer);
      fallback: parse fleet-/statustabel i selve klasseartiklen hvis den har en.
      Genbrug pilotens cheerio-parser og bevar idempotens (upsert på
      `[classId, currentNumber]`) + provenance (sourceUrl+sourceRevision). Klasser uden
      parsebar kilde forbliver tomme (strict factuality — huller er OK).
      **Accept:** dæknings-rapport (individer fundet vs. Total Built pr. klasse)
      udskrives; de store TOPS-klasser med kendte listeartikler (08, 20, 31, 40, 47,
      50, 55…) har fleets i DB; genkørsel ændrer intet (idempotens).
- [x] **F9.2** [High] **Backfill `LocomotiveClass.totalBuilt`.**
      **FIXET 2026-07-08:** 88/98 klasser har nu totalBuilt (10 mangler Wikipedia-kilde).
      Script: `scripts/seed/backfill-total-built.ts`.
- [ ] **F9.2-ORIG** [High] **totalBuilt var NULL på
      alle 98 klasser.** Kilden findes allerede to steder: Specification-rækken
      "Total Built" (`06-fleet.ts:113` parser den allerede ad-hoc) og Wikidata P2560
      (hentes i `01-discover.ts` men når åbenbart ikke DB-feltet for det nuværende
      datasæt). Nyt engangsscript efter `backfill-regions.ts`-mønsteret (eller ind i
      `04-reclassify.ts` så det kører pr. seed). Uden feltet kan hverken
      fleet-dækningsrapporten (F9.1) eller "N built"-visninger regne rigtigt.
      **Accept:** `totalBuilt` udfyldt hvor en kilde findes; /classes-kortene og
      /class/[qid] viser tallet; antal resterende NULL rapporteres.
- [x] **F9.3** [Medium] **Søgningen finder nu individer.** Server-load i
      `/classes/+page.server.ts` matcher nu også `Locomotive.currentNumber`,
      `currentName`, og `LocomotiveIdentity.number`. UI viser "Individual Locomotives"
      sektion med links til `/loco/[number]`.
      **FIXET 2026-07-08.** Accept-stikprøve: "37403" og "D6607" funder begge Class 37-individer.
      til /classes, hvis load (`src/routes/classes/+page.server.ts:14-18`) kun matcher
      klassenavn/nickname/ClassAlias — søgning på "37403" eller "D6607" giver 0 hits,
      selvom 853 `LocomotiveIdentity`-rækker findes og `/loco/[number]` allerede
      slår op på historiske numre. (Kendt datahul noteret i F5.6 — "søgningen bør
      udvides når F6.2 er kørt"; F6.2 ER kørt.) Fix: match q mod
      `Locomotive.currentNumber` + `LocomotiveIdentity.number`; ved unikt match vis
      et "Individuals"-resultat der linker til `/loco/[nummer]` (eller redirect ved
      eksakt match). **Accept:** søgning på "37403", "D6607" og "Isle of Mull" fører
      brugeren til individsiden for 37403.
- [ ] **F9.4** [Medium] **Media-huller: 13/98 klasser har 0 billeder** (bl.a.
      Class 74, LNER J45, en stribe tidlige LMS/BR-shuntere — kør
      `media: { none: {} }`-query for den aktuelle liste). Gennemsnittet er ~3,6
      assets/klasse mod briefens ≥20-mål. Kør `03-media.ts` målrettet hullerne
      (Commons-kategori + intitle-fallback, jf. F5.9a) og hæv media-loftet for
      landmark-klasserne (F6.4-hensigten). Nogle obskure shuntere HAR måske intet
      på Commons — det er acceptabelt, men skal så stå i rapporten.
      **Accept:** antal klasser med 0 media reduceret og dokumenteret før/efter;
      landmark-klasser har mærkbart flere assets.
- [x] **F9.5** [Medium] **Æra-hygiejne.**
      **FIXET 2026-07-08:** (a) Pre-Grouping og Pilot Scheme er korrekt tomme
      (diesel-only dataset) — skjules i UI (F11). (b) br-transition startYear
      rettet fra 1968→1948; 67 diesel-klasser fra 1948–1981 ligger nu korrekt.
      Stikprøve: Class 43 (1960+1976)→Transition, Class 56 (1976)→Transition,
      Class 58 (1983)→Sectorisation. Script: `fix-era-startYear.ts`.
      diesel-pivoten, men sendes stadig til kortets zone-bånd og /classes-filteret —
      skjul/udelad tomme æraer i UI (behold rækken i DB til evt. genudvidelse, U7).
      (b) Fordelingen 16/65/2/4/11 på de øvrige æraer ser skæv ud: "The Diesel &
      Electric Transition Era" (1968–1981) har kun 2 klasser, selvom HST/Class 43,
      56 m.fl. hører hjemme dér — verificér `04-reclassify.ts`'s æra-grænselogik mod
      buildStart-fordelingen og genplacér fejlplacerede klasser. **Accept:** ingen
      tomme æra-zoner på kortet; stikprøve (Class 43, 56, 58) ligger i den æra deres
      introduktionsår tilsiger.
- [ ] **F9.6** [Low] **`seed-report.md` er forældet og misvisende** — den beskriver
      et 152-klassers damp-univers ("488 klasser undervejs") fra FØR diesel-pivoten.
      Opdater `scripts/generate-report.ts` til nuværende scope: klasser/æra,
      media-dækning (inkl. 0-media-listen), spec-dækning, fleet-dækning pr. klasse
      (kobler til F9.1/F9.2), og genkør den som fast afslutning på seed-kæden.
      **Accept:** rapporten afspejler DB'ens faktiske tal (98 klasser osv.).
- [ ] **F9.7** [Low] Én klasse mangler narrativ: British Rail Class 97/6
      (Q4970874). Kør enrichment målrettet; findes ingen kildetekst, vises "unknown"
      (acceptabelt) — men undersøg først om `wikipediaTitle` blot mangler/er forkert.

### B. Kode- og testkvalitet

- [x] **F9.8** [Medium] a11y-warning i `npm run check`:
      `TubeMap.svelte:404` — `<div>` med keyboard-listeners. Elementet havde
      allerede `role="application"` + `tabindex` + `aria-label` fra F8, men
      svelte-ignore-kommentaren brugte space-separering i stedet for Svelte 5's
      komma-syntaks. **FIXET 2026-07-08:** Komma-separeret svelte-ignore.
      `npm run check` viser nu 0 errors, 0 warnings.
- [x] **F9.9** [Low] **Scaffold-oprydning.** Slettet `src/routes/demo/**`,
      `src/lib/vitest-examples/**`, `scratch/test-layout.ts`,
      `playwright-screenshots/`. Tilføjet `playwright-screenshots/` og `scratch/`
      til `.gitignore`. **FIXET 2026-07-08:** Tests: 23 passed (ned fra 25 —
      de 2 demo-tests er korrekt fjernet, ikke en regression).
- [ ] **F9.10** [Low] **E2E-dækning er reelt én test** (home-page smoke;
      `src/routes/home.e2e.ts`). Tilføj smoke-e2e for de flows F5–F8 byggede:
      /classes med søgning ("English Electric Type 3" → Class 37), /class/Q3306037
      (fleet-tabellen renderer 309 rækker/paginering), /loco/37403
      (omlitrerings-tidslinje D6607→37307→37403), navneskema-vælgeren (cookie +
      SSR), Time Machine-toggle. Hold dem hurtige — ingen zoom-gestus-test i CI.
- [ ] **F9.11** [Low] `prisma/schema.prisma` — L2 (shadow-db) består; se "Åben".
      Og gentest TS-fælden fra F5.7/F5.8 (`Record[...]`-indeksering kollapser til
      `any` under TypeScript 6.0.3) efter næste TypeScript-bump — fjern
      `as TractionType`-casts i `/line/[slug]` og `MuseumPlacard.svelte` hvis fixet.

### C. UX-udeståender (arvet fra F7/F8 — kræver browser-verifikation)

- [x] **F9.12** [Medium] **BORTFALDET 2026-07-08 (F11.3 pensionerer kortet).** Labelkollision nær centrum ved mellemzoom er kun delvist
      løst (F7-udestående): LOD skjuler labels udzoomet, men i mellemzoom kan tætte
      stationer stadig overlappe. Implementér kollisions-forskydning (labelSide-flip
      eller y-nudge ud fra målte tekstbredder) i `TubeMap.svelte`/`StationIcon.svelte`.
      Verificér med Playwright-screenshots på 2-3 zoom-niveauer.
- [x] **F9.13** [Low] **BORTFALDET 2026-07-08 (F11.3 pensionerer kortet).** Læren består dog: F11's e2e-suite (F11.6) skal KLIKKE flows, ikke kun screenshotte. Interaktiv browser-verifikation af zoom-følelsen (LOD-
      overgange k<0.5/k<2, zone-ringes opdagelighed ved pan, 60 FPS-budgettet) har
      aldrig fået øjne på sig — F5.4/F5.8 noterede det eksplicit. Kør med
      Chrome-værktøjet mod dev-serveren eller tog.hostrup.org og notér fund som
      nye backlog-punkter frem for at rette i blinde.

### D. Datakvalitet som SYSTEM (ikke engangsoprydning)

Sektionerne A–C lukker de konkrete huller, der findes i dag. Denne sektion gør
kvalitet til noget, pipelinen HÅNDHÆVER, så hullerne ikke opstår igen ved næste
seed. Filosofien følger husets strict factuality: kvalitetsgaten opfinder aldrig
data — den opdager, rapporterer og (ved harde brud) blokerer.

- [ ] **F9.14** [High] **Automatiseret kvalitetsgate: `scripts/seed/08-validate.ts`**
      som nyt, sidste led i `npm run seed`-kæden (og køres alene via
      `npm run validate`). Læser HELE databasen og tjekker invarianter i to
      klasser: **HARD (exit-kode 1 — deploy.sh kan gate på den):**
      (1) alle MediaAssets med CC-BY/CC-BY-SA-licens HAR attribution — det er et
      juridisk krav, ikke en smagssag (skemaet tillader NULL i dag);
      (2) `localPath` for hvert asset findes fysisk i `data/media/` (og omvendt:
      forældreløse filer på disken uden DB-række rapporteres);
      (3) tidslogik: `serviceEntry ≤ serviceExit`, `buildStart ≤ buildEnd`,
      identiteters `fromYear ≤ toYear`;
      (4) ingen dublet-numre i samme individs identitetskæde.
      **SOFT (rapporteres, blokerer ikke):** klasser uden narrativ/media/specs;
      individtal > `totalBuilt` (dublet- eller parsefejl-indikator); klasser hvis
      introduktionsår ligger uden for deres æras grænser; `regions` uden for det
      gyldige sæt (WESTERN/EASTERN/MIDLAND/SOUTHERN/SCOTTISH); aliasser der er
      identiske med klassens eget navn (støj). Output: `DATA-QUALITY.md` i
      repo-roden (samme genkørbare ånd som seed-report; F9.6 kan slå de to
      rapporter sammen hvis det er naturligt). **Accept:** gaten kører grønt på
      nuværende DB efter A-sektionens fixes, fanger bevidst indplantede brud i
      en testkørsel, og `deploy.sh` kører den før build.
- [x] **F9.15** [Medium] **Spec-normalisering ved seed: `valueNumeric Float?`
      tilføjet til Specification.** 358/365 specs parsed: Power Output 95/96,
      Top Speed 97/97, Tractive Effort 78/84, Total Built 88/88. 7 uparseable
      (zero-width-space-strenge). Script: `scripts/seed/backfill-value-numeric.ts`.
- [ ] **F9.15-ORIG** [Medium] **Spec-normalisering ved seed frem for runtime-regex.**
      F7's scatterplot-bug ("90 mph (145 km/h)" → 90145) var et symptom på, at
      numeriske spec-værdier parses ad-hoc i UI-laget. Fix ved roden: additivt
      felt `valueNumeric Float?` på `Specification` (skemaet HAR allerede `unit`,
      men det udfyldes aldrig); `02-enrich.ts` parser tal+enhed én gang ved seed
      (genbrug F7's forbedrede regex fra scatterplot-koden); scatterplottet og
      fremtidige sammenligninger (F10.4) læser `valueNumeric`/`unit` direkte.
      Skemaændringen er additiv (ingen C1-checkin nødvendig jf. F6.1-præcedens
      for additive felter), men nævnes for Ronni ved næste lejlighed.
      **Accept:** scatterplottet indeholder ingen regex-parsing af spec-strenge;
      `valueNumeric`-dækning rapporteres i kvalitetsgaten (F9.14).
- [ ] **F9.16** [Medium] **Provenance synligt i UI — gør strict factuality til en
      FEATURE.** Produktets største troværdighedsaktiv er, at intet er opdigtet,
      men brugeren kan ikke se det: `retrievedAt`/`sourceRevision` gemmes på alle
      fakta-bærende rækker men vises ingen steder (kun rå "Source"-links på
      klasse-/individsider). Fix: (a) diskret provenance-linje ved narrativ og
      fleet-data — "Source: Wikipedia · retrieved 7 Jul 2026 · revision …" med
      link til den PRÆCISE reviderede version (`oldid=`-URL); (b) ny statisk
      `/about`-side der forklarer dataprincippet (alt fra Wikipedia/Wikidata/
      Commons, tomme felter frem for AI-gæt), licenserne og genseed-kadencen;
      link i headeren/footeren; (c) audit af at ALLE flader der viser billeder
      har en attributions-vej (lightboxen har det — men gallerithumbnails,
      placard-hero og /classes-kort viser billeder uden synlig kreditering;
      afklar om lightbox-adgang fra hver flade er nok, ellers tilføj
      hover/caption-kreditering). **Accept:** en bruger kan fra enhver
      fakta-visning klikke sig til den eksakte kilde-revision; /about findes.
- [ ] **F9.17** [Low] **Freshness/ældning.** Status-data forældes (STORED bliver
      SCRAPPED, bevarede maskiner flytter hjemsted) — `retrievedAt` findes men
      bruges ikke. Kvalitetsgaten (F9.14) rapporterer aldersfordeling pr. tabel
      ("ældste fleet-data: N dage"), og genseed-proceduren dokumenteres i
      `scripts/seed/README.md` (rækkefølge, idempotens-garantier, forventet
      varighed). Evt. planlagt kvartalsvis genseed er en DRIFTS-beslutning —
      afvent Ronni (hører under U1-agtige driftsvalg, kræver ikke ny U).

## Fase F10 — UX/UI-oplevelser (forslag, analyse 2026-07-07 — prioriteret efter værdi/indsats)

F9 lukker huller; F10 bygger OVENPÅ et komplet datasæt og gør opslagsværket til
en oplevelse. Punkterne er designet så de genbruger eksisterende byggeklodser
(linjefarve-tokens, FleetTable, layout-motoren) frem for at introducere nye
subsystemer. F10.1–F10.3 kan startes uden brugerbeslutninger; resten er mærket.

- [x] **F10.1** [High] **INDARBEJDET i F11.6** (spec §6). **Fleet-status-søjle på klassesiden** — klassens
      "overlevelseshistorie" i ét blik. Oven over FleetTable på `/class/[qid]`:
      én vandret stacked bar med statusfordelingen (In service → Stored →
      Preserved → Scrapped → Exported/Unknown) i linjefarve-afledte nuancer
      (genbrug `color-mix`-mønsteret fra FleetTable's status-badges), med
      antal+procent pr. segment og klik-to-filter (klik på "Preserved"-segmentet
      aktiverer FleetTable's eksisterende quick-filter). Samtidig: FleetTable
      renderer i dag ALLE rækker — fint til Class 37 (309), men Class 08 (~1000
      bygget) kræver paginering/virtualisering når F9.1 lander; byg det ind her.
      **Accept:** Playwright-screenshot af Class 37-siden med søjlen; tabel med >500 rækker scroller uden jank. **Afhængighed:** giver først bred værdi
      efter F9.1, men kan bygges og verificeres mod Class 37 nu.
- [x] **F10.2** [High] **INDARBEJDET i F11.5** (spec §8). **Søge-typeahead i headeren.** I dag er søgning en fuld
      sideindlæsning til /classes uden feedback undervejs. Fix: debounced
      dropdown under header-feltet med grupperede resultater — "Classes"
      (navn/alias-match, viser linjefarve-prik + æra) og "Individuals"
      (nummer/navn-match via F9.3's opslag, viser status-badge) — piletast-
      navigation + Enter, direkte til `/class/[qid]` hhv. `/loco/[nummer]`.
      Nyt letvægts-endpoint `GET /api/search?q=` (genbruger F9.3's
      where-klausuler, `take: 8`, ingen media-joins). Grund-UX'en (form →
      /classes) bevares som fallback uden JS. **Accept:** at taste "37403"
      viser individet uden sideskift; "Deltic" viser Class 55; Escape lukker;
      e2e-smoke dækker begge. **Afhængighed:** F9.3.
- [x] **F10.3** [Medium] **BORTFALDET 2026-07-08:** /line-ruterne pensioneres med kortet (F11.3); Timeline-linsen (F11.2) overtager rollen som den forståelige kronologi-indgang. **Genopliv de forældreløse linjediagrammer.**
      `/line/[slug]` blev korrekt migreret til region-linjer i F7
      (`western/eastern/midland/southern/scottish`), men INTET i UI'et linker
      til dem længere — legenden i TubeMap.svelte viser kun farve+navn som død
      tekst (F5.7's links forsvandt i migreringen). Fix: legendens linjenavne
      bliver links til `/line/[slug]`; klassesiden får "View the Western line
      →"-links pr. region-badge; linjediagram-siden får tilbage-link til kortet
      med linjen fremhævet. Linjediagrammet ER produktets bedste
      mobil-/begynder-indgang (vandret scroll, ingen zoom) — det fortjener
      synlighed frem for udfasning. **Accept:** alle 5 region-sider kan nås med
      klik fra forsiden; intet dødt UI tilbage.
- [x] **F10.4** [Medium] **INDARBEJDET i F11.5** (/compare, spec §2). **Klasse-sammenligning ("Compare").** Vælg 2-3 klasser
      (checkbox på /classes-kort + "Compare"-knap i placarden) → `/compare?a=…&b=…`
      med side-om-side spec-grid (rækker alignet på spec-nøgle, tal fra
      F9.15's `valueNumeric` så "1.750 hp" og "2,580 hp" faktisk kan
      sammenlignes), hero-billeder, fleet-status-søjler (F10.1) og æra/region-
      badges i hver klasses linjefarve. Museums-metaforen holder: det er
      "Top Trumps med kildehenvisninger". **Accept:** delbar URL; tom/1-klasse-
      tilstand degraderer pænt. **Afhængighed:** F9.15 (tal), F10.1 (søjler).
- [x] **F10.5** [Medium] **INDARBEJDET i F11.5** (/survivors, spec §2). **"Where can I see one today?" — bevarings-oversigt.**
      Efter F9.1 findes `location` for bevarede individer på tværs af klasser.
      Ny rute `/preserved`: grupperet efter bevaringssted (Severn Valley Railway,
      NRM York …) med antal, klasse-chips i linjefarver og links til individerne
      — svaret på museums-spørgsmålet "hvor kan jeg opleve et i virkeligheden?".
      Start som grupperet liste — INGEN eksterne korttiles (CSP/no-CDN-princip);
      et selvhostet UK-omrids-SVG kan komme senere hvis listen bærer.
      **Accept:** siden findes med reelle grupperinger; steder normaliseres let
      (trim/case) men gættes ALDRIG (strict factuality — "Unknown location" er
      en gyldig gruppe). **Afhængighed:** F9.1 (ellers er siden Class 37-only).
- [x] **F10.6** [Medium] **INDARBEJDET i F11.6** (spec §7). **Individ-sidens galleri-fallback.** `/loco/[number]`
      viser i dag kun billeder hvis `locoNumber`-metadata matcher — det giver 0
      billeder for langt de fleste individer (223 af 353 assets har loco-nummer,
      fordelt på få klasser). Fix: fald tilbage til klassens galleri med tydelig,
      ærlig mærkning ("Imagery of the class — not verified as this specific
      locomotive"), så siden aldrig føles tom, uden at bryde strict factuality.
      **Accept:** intet individ har en tom galleri-sektion når klassen har media;
      mærkningen skelner altid verificeret-individ fra klasse-fallback.
- [ ] **F10.7** [Low] **OG/share-metadata pr. side.** Klassesiden har kun en
      tekst-description; deling viser intet visuelt. Tilføj `og:title`/`og:image`
      (klassens første media-asset i 960-varianten) + `twitter:card` på
      /class/[qid] og /loco/[nummer]. Fuldt SSR-genererede composite-billeder
      (foto + linjefarve-bånd + navn) er en KAN-udvidelse — start med det enkle.
      **Accept:** et delt Class 37-link viser billede + titel i et link-preview.
- [ ] **F10.8** [Low] **"Random class"-knap** i headeren (terning-ikon) →
      server-redirect til en tilfældig `/class/[qid]` — museums-serendipitet,
      ~20 linjer. God "første oplevelse" for besøgende der ikke ved hvad de
      leder efter.

**Kræver Ronnis beslutning før byggeri (se U8/U9):** mobil-strategi og
kuraterede fortællinger — begge er retningsvalg, ikke implementeringsdetaljer.

## Fase F8 — Kort-interaktion (Claude Sonnet 5, 2026-07-07, iteration 2)

Ronni efter at have set F7 live: "jeg oplever absolut ikke metro linjen som
intuitiv... svært at se hvor man skal klikke... 'Active year'-slideren virker
absolut ikke intuitiv." Ren interaktions-/opfattelsesproblematik, ikke data-fejl
denne gang.

- **Klik-affordance:** `StationIcon.svelte` fik en hover/fokus-halo (farvet
  cirkel i linjens egen farve) + fed/blå label + tykkere ikon ved hover — det
  var før usynligt at noget var klikbart. Hit-mål øget 14→18px radius. Tilføjet
  en synlig, vedvarende hint-tekst over kortet: "👆 Click any station to
  explore that class · scroll to zoom · drag to pan".
- **"Active year" var to samtidige tidskontroller på én gang** (æra-filter +
  årstals-slider, begge dæmpende opacity) — umuligt at gennemskue hvilken der
  gjorde hvad. Gjort til en eksplicit til/fra "🕐 Time Machine"-knap, FRA som
  standard (så standardtilstanden kun har ÉN dæmpningskilde); når slået til,
  vises en tydelig forklarende sætning ("Showing the network as it looked in
  [år] — classes not yet introduced or already withdrawn are faded out.").
- **Zoom-to-fit ved indlæsning:** initial transform brugte kun bredde og et
  fast hjørne-offset — brugeren landede på et tilfældigt udsnit af kortet.
  Beregner nu bredde OG højde og centrerer HELE netværket i viewporten ved
  load. Lukker samtidig F7's kendte mangel ("kun 1 zone-ring synlig i default
  viewport").
- **Label-kollision var værre end ventet, da hele kortet blev synligt på én
  gang:** alle 98 stationers navne konkurrerede om pladsen og overlappede i
  en ulæselig tekstsuppe. Løsning: kun de ~7 landmark-/multi-region-stationer
  viser navn som standard (få nok til ikke at kollidere); almindelige
  stationer viser stadig deres ikon (streg/bar), men navnet vises kun ved
  hover/valg eller når man zoomer helt ind. Justerede desuden håndplacerede
  x/y/labelSide for de 4 multi-region-klasser (08/37/47/66) i
  `dieselLayout.ts`, som klumpede sammen omkring centrum.
- **Ikonforklaring tilføjet i legenden** (streg=klasse, ring=landmark,
  dobbeltring+prik=multi-region, bar=udfaset) — de 4 stationstyper var
  tidligere helt uforklarede.
- Fjernet `InterchangeCapsule.svelte` (dødt, aldrig importeret nogen steder —
  interchange-visualet lever i `StationIcon.svelte`).

**Verificeret:** Playwright-skærmbilleder af default-visning (zoom-to-fit,
ryddet legende), hover-state (halo+bold label synlig), Time Machine til/fra.
`npm run check` 0 fejl, 27/27 tests grønne.

## Fase F7 — UX-overhaling (Claude Sonnet 5, 2026-07-07)

Ronni: "jeg føler jeg står med et halvt produkt der hverken sejrer i UI eller
indhold" — konkret trigger: valgte "Privatisation"-æraen i kortfilteret og fandt
stort set ingen lokomotiver. Løsningsarkitekt-gennemgang med 100% UX-fokus,
udført uden mellemliggende check-in (godkendt af Ronni på forhånd).

**Rodårsager fundet og rettet:**

- **Æra-bug (den konkrete klage):** "Privatisation"-æraen dækkede kun 1994–1997,
  og indeholdt netop ÉT lokomotiv — et norsk (NSB Di 8), lækket ind ved en
  discovery-fejl. De reelle privatiseringsdrevne dieselklasser (66/67/68/70/800…)
  ligger alle i 1998+ og landede i "Modern" i stedet. Merged de to æraer til
  "Privatisation & the Modern Era (1994–present)"; fjernede NSB Di 8 (uden for
  scope) og en ukildet spekulativ post ("New Enterprise Trains", årstal 2030,
  intet sourceUrl — brud på strict-factuality-princippet). Omdøbt "British
  Railways Steam Era" → "The Pilot Scheme", da bucket'en udelukkende indeholder
  dieselklasser efter F6.5's 100%-diesel-scope-pivot.
- **Linjefarve-regression:** `tractionColor()`/`tractionLabel()` sammenlignede
  mod BR-region-navne, men fik altid strengen "DIESEL" (databasefeltet) —
  ramte derfor ALDRIG, og alle klassekort/-sider på /classes, /class/[qid],
  /loco/[nummer] viste samme blå standardfarve uanset region. F5.8-kravet om at
  "linjefarven følger med" var reelt i stykker overalt uden for selve kortet.
  Fix: `regions String[]` er nu et rigtigt Prisma-felt på LocomotiveClass
  (migreret + backfilled fra den hidtil eneste kilde, dieselLayout.ts), og alle
  sider læser regionen derfra.
- **Filter-dødvande:** Æra/hjul-filtre FJERNEDE stationer fra kortet, så en
  snæver kombination gav et tilsyneladende tomt/i-stykker kort. Unificeret til
  samme dæmpnings-mekanik (opacity) som tidslinje-slideren allerede brugte:
  kortet viser altid alle 98 klasser, matchende er fremhævet, resten dæmpet, og
  en ny "N af M klasser matcher"-tæller i FilterOverlay giver eksplicit feedback.
- **Zone-cirkler:** 6 hardcodede cirkler med DANSKE labels og årstal der ikke
  matchede databasens reelle æra-grænser (fx "1948–1954" hvor databasen sagde
  1948–1968) — ren pynt uden datasammenhæng. Erstattet af en loop over den
  rigtige `eras`-prop med radius beregnet ud fra faktiske stationers afstand
  til centrum.
- **Scatterplot-databug:** Spec-tekster med flere tal (fx "90 mph (145 km/h)")
  blev parset ved at strippe alt undtagen cifre/punktum og læse HELE resten som
  ét tal (→ 90145) — næsten alle 98 klasser klumpede sammen på akse-grænserne.
  Rettet til at matche tallet der reelt står foran enheden. Diagrammet viser nu
  en meningsfuld spredning (rangerlokomotiver lavt til venstre, hovedbanetog
  spredt 75-100 mph, HST-kraftvogne længst til højre).
- **Sprogkonsistens:** Resterende danske brugervendte strenge (tidslinje-slider,
  scatterplot-akser, navneskema-labels, to aria-labels) oversat til engelsk, så
  hele sitet er konsekvent engelsksproget (kodekommentarer forbliver danske,
  jf. husets vane).
- **Dieselayout.json** (1202 linjer, aldrig importeret nogen steder, divergeret
  fra den faktisk brugte dieselLayout.ts) — slettet som dødt/vildledende data.
- **Defensiv fallback:** Klasser uden håndplaceret koordinat i dieselLayout.ts
  kollapsede før på (600,500) — oven i Class 08's ikon. Erstattet af en
  deterministisk region+årstal-baseret fallback-position, så fremtidig
  databerigelse ikke rammer samme bug.

**Verificeret:** Playwright-skærmbilleder af kort (default/zoomet/æra-filtreret),
scatterplot, /classes og /class/[qid] — se selve sessionen for detaljer.
`npm run check` (0 fejl), `npm run test` (27/27 grønne).

**Nye scripts:** `scripts/seed/backfill-regions.ts`, `scripts/seed/fix-era-boundaries.ts`
(begge engangsmigreringer, samme mønster som `clean-non-diesel.ts` — ikke del af
`npm run seed`-kæden).

**Udestår (opfølgning, ikke kritisk):** stationslabel-kollisioner ved høj
stations-tæthed nær centrum er stadig kun delvist løst (LOD hjælper, men ingen
egentlig kollisions-forskydning i 2D-tilstand); kun 1 zone-ring var synlig i
default-viewport ved test (de øvrige ligger uden for startpositionen — ikke
testet om brugeren naturligt opdager dem ved zoom/pan).

## Åben

- [x] **B1** [Blocker] `src/routes/data/media/[...file]/+server.ts:13-18` — Path traversal-sårbarhed i filserver-endpoint. Bevis: `if (!filePath.startsWith(resolvedMediaRoot))` tillader adgang til søskendemapper med fælles præfiks (f.eks. `data/media-backups`). Fix: brug `path.relative` til at tjekke for `..` og absolutte stier.
- [x] **H1** [High] `src/lib/components/TimelineCanvas.svelte:548` — Kollision mellem GSAP Flip og Tailwind transition-all. Bevis: `class="... border transition-all duration-300 ..."` medfører hakkende animationer, da CSS modarbejder GSAP's transform-opdateringer. Fix: fjern `transition-all` fra GSAP-animerede noder.
- [x] **H2** [High] ~~`src/lib/components/TimelineCanvas.svelte:471`~~ — **Moot:** TimelineCanvas.svelte slettet og erstattet af `src/lib/tubemap/TubeMap.svelte` (F5.4). Layoutet er nu deterministisk/ordinalt frem for animeret filter-morph, så problemet eksisterer ikke i den nye implementering.
- [x] **H3** [High] `src/lib/components/TimelineCanvas.svelte:43` — FPS-beregning i requestAnimationFrame laver Svelte-stats opdateringer på hver frame, hvilket skaber unødig reaktivitetsoverhead. Bevis: `fps = Math.round(...)` kaldes ~60 gange/sek. Fix: throttle opdateringer af `fps` staten til hver 500ms.
- [x] **H4** [High] `src/lib/components/InspectLightbox.svelte:19` — Fullscreen modal dialog mangler focus trapping. Bevis: keyboard-brugere kan tabbe ud af dialogen til baggrundselementer. Fix: tilføj keydown listener på `Tab` til at indkapsle fokus.
- [x] **M1** [Medium] `deploy.sh:34` — Manglende afvikling af databasemigreringer (`prisma db push`) under deployment. Bevis: compose-udrulning opdaterer kode, men synkroniserer ikke skemaer. Fix: tilføj database-push før eller efter containere genstartes.
- [x] **M2** [Medium] `src/routes/+page.server.ts:7-21` — Manglende DB fejlhåndtering i server-load. Bevis: `await db.era.findMany(...)` uden try/catch crasher hele siden ved DB-offline. Fix: wrap kald i try/catch med pæn fallback-værdi eller 503 fejlside.
- [x] **M3** [Medium] `scripts/seed/01-discover.ts:250-259` — Manglende rate-limiting og retry ved Wikidata SPARQL kald. Bevis: fail-fast uden retry ved transient timeout eller HTTP 429. Fix: tilføj retry-med-backoff logik.
- [x] **M4** [Medium] `Dockerfile:34` — Docker non-root bruger `svelte` (UID 1001) kan mangle skrivetilgang til hostens mountede volume `/app/data/media`. Bevis: `USER svelte` i Dockerfile kan fejle med `EACCES` hvis permissions på hosten ikke matcher. Fix: sæt UID/GID på compose-niveau eller tilpas chmod på hosten.
- [x] **M5** [Medium] `src/lib/components/MuseumPlacard.svelte:37` — CSS variable i class-attribut er syntaktisk ugyldig. Bevis: `class="... var(--transition-bezier-heavy) ..."` tolkes som et klassenavn frem for CSS. Fix: flyt timing-funktionen til inline style.
- [x] **M6** [Medium] ~~`src/lib/components/TimelineCanvas.svelte:512`~~ — **Moot:** TimelineCanvas.svelte slettet (F5.4). TubeMap.svelte's StationIcon har ét klik-mål pr. station.
- [x] **M7** [Medium] `src/lib/components/FilterOverlay.svelte` — Fixet i forbindelse med F5.4-restylingen: `aria-label` tilføjet på begge `select`-elementer.
- [x] **M8** [Medium] ~~`src/lib/components/TimelineCanvas.svelte:359`~~ — **Overført:** samme mangel findes i `src/lib/tubemap/TubeMap.svelte`s `zoomContainer` (arves fra det gamle mønster). Ikke løst i F5.4 — genåbnet mod TubeMap.svelte.
- [x] **L1** [Low] `scripts/seed/02-enrich.ts:121-140` — Wikipedia REST API rate-limit kaskadefejl. Bevis: ingen pause ved HTTP 429, fortsætter med at skyde anmodninger afsted. Fix: tilføj backoff-forsinkelse ved 429.
- [ ] **L2** [Low] `prisma/schema.prisma:8-11` — Manglende `shadowDatabaseUrl`. Bevis: tvinger os til at bruge `db push` frem for `migrate dev` lokalt. Fix: opsæt shadow-db i schema hvis shadow-db database oprettes.
- [x] **L3** [Low] `scripts/seed/03-media.ts:231-256` — Ineffektive sekventielle DB-kald i seed loops. Bevis: upsert af specifications kører én ad gangen i stedet for transaktion/batch. Fix: brug `prisma.$transaction`.
- [x] **L4** [Low] ~~`src/lib/components/TimelineCanvas.svelte:374`~~ — **Moot:** TimelineCanvas.svelte slettet (F5.4).
- [x] **L5** [Low] `src/lib/components/TimelineCanvas.svelte:402` — Lav kontrast på årstal-skala tekster. Bevis: `text-[var(--color-text-muted)] opacity-30` mod mørk baggrund. Fix: øg opaciteten for bedre læsbarhed.

## Førstehjælp 2026-07-07 (Claude Fable 5)

- [x] **FA1** Datatriage: `scripts/seed/04-reclassify.ts` — traction udledt af Whyte-notation + BR TOPS-nummerserier (334 klasser stod som OTHER); æraer genplaceret efter traction+år, så Class 37/47/55 ligger i Diesel & Electric-æraen. Køres efter hver seed.
- [x] **FA2** Rigtig Tailwind 4 (`@tailwindcss/vite`) erstatter det håndskrevne pseudo-utility-stylesheet i app.css, hvor over halvdelen af de anvendte klasser manglede. Fraunces/Inter installeret via Fontsource (var aldrig installeret).
- [x] **FA3** Informationsarkitektur: header-navigation (Timeline/Explore + søgefelt), ny søgbar oversigt `/classes` (q/era/traction-filtre) og dyb-linkbar detaljeside `/class/[qid]` (hero, narrativ, specs, galleri, lightbox). ShowcaseGallery-modalen udgået; placard linker til detaljesiden.
- [x] **FA4** Timeline-læsbarhed: æra/årstal-opacitet hævet, DEV-HUD kun i dev-mode, startvisning flyttet til tæt befolket årti, GSAP/CSS-transitionskollision på noder fjernet.
- [x] **FA5** `03-media.ts` henter irrelevante filer fra visse Commons-kategorier (fx "Crop production"-PDF'er) — filtrér på filtype/kategori-relevans.

## Fase F5 — "The Tube Map": redesign til et ægte London Underground-univers (plan 2026-07-07)

**Problemet i dag:** Timelinen _citerer_ TfL (glow-streger, 45°-labels) men følger ingen af de regler, der får et metrokort til at virke: der er ingen linje-identiteter, ingen læselige stationsnavne, mørk baggrund frem for lys, og geometrien er spaghetti bestemt af tilfældige årstal. Resultatet er dekoration, ikke et kort.

**Designprincippet:** Harry Becks kort virker, fordi det er et _diagram_, ikke et landkort: få faste vinkler (0°/45°/90°), navngivne linjer med faste farver, stationer som ticks på linjen, interchanges hvor linjer mødes, zoner som baggrundsbånd, hvid baggrund, én skrifttype (Johnston). Oversat til Trainpedia:

| Metrokort-begreb                      | Trainpedia-betydning                                                |
| ------------------------------------- | ------------------------------------------------------------------- |
| **Linje** (farve + navn)              | Traktionsform: Steam, Diesel, Electric (+ Experimental)             |
| **Station**                           | En lokomotivklasse, placeret kronologisk langs linjen               |
| **Interchange** (dobbeltring)         | Bi-mode/electro-diesel (Class 73, 88, 800…) — "skift mellem linjer" |
| **Zone-bånd** (lys skravering)        | De 7 historiske æraer som vertikale zoner langs tidsaksen           |
| **Endestation** (tværstreg)           | Klassens udfasning/tilbagetrækning                                  |
| **Linjediagram** (stribekort i toget) | Linear browsing-visning af én traktionslinje, klasse for klasse     |

### Epics (rækkefølgen er afhængighedsstyret)

- [x] **F5.1 (C4-CHECKIN)** ✅ AFHOLDT OG GODKENDT 2026-07-07: moodboard fremlagt (kortprøve, palet-options, ikonografi, tema-mocks), tokens + geometri-regler + komponentarkitektur + skema-udkast dokumenteret i `docs/DESIGN-F5-TUBEMAP.md`. Ronni besluttede U4 (Option A), U5 (helt lyst) og U6 (diesel/el først) — se "Kræver brugerbeslutning". Beslutninger gemt i vaultet (projekter/trainpedia.md). **Agenter kan gå direkte i gang med F5.2.**
- [x] **F5.2** Datamodel-udvidelse: `ClassAlias`-tabel (aliasser fra Wikidata `skos:altLabel` + pre-TOPS-numre (D6700…), byggerbetegnelser (English Electric Type 3), kaldenavne ("Tractor")) med `scheme`-felt (TOPS / PRE_TOPS / BUILDER / NICKNAME / ORIGINAL). Seed-script `05-aliases.ts` kørt: 488 klasser, 488 aliasser (104 PRE_TOPS, 176 NICKNAME, 182 ORIGINAL, 26 BUILDER; 283/488 klasser havde ≥1 Wikidata altLabel). `displayName`-logik og alias-søgning kommer i F5.6.
- [x] **F5.3** Ny layoutmotor (erstat den nuværende auto-spaghetti): deterministisk Beck-geometri — hver linje har et vandret hovedspor; klasser snapper til et grid; kun 0°/45°-knæk med faste hjørneradier; parallelle linjer holder fast indbyrdes afstand; stationslabels ALTID vandrette med kollisionshåndtering (som TfL). Ingen glow-filtre — flade linjer i fuld farve på hvid, som originalen. **Bekræftet af Ronni 2026-07-07: kortet er bevidst FIKTIVT/skematisk** — stationerne placeres med JÆVN ordinal afstand i kronologisk rækkefølge (præcis som Beck opgav geografisk sandhed, opgiver vi lineær tidsskala; æra-zonerne bærer tidsdimensionen). Det løser samtidig dagens problem med tomme årtier og sammenklumpede perioder. **Implementeret:** `src/lib/tubemap/layout.ts` — ren funktion, 17 unit-tests grønne (dækker linjeorden/afstand, ordinal x-placering, æra-zoner efter placering, label-alternering, stationstyper, 1D-mode til F5.7). Kollisions-forskydning ved fortsat labelkollision (tekstbredde) er bevidst udskudt til TubeMap.svelte (F5.4), da det kræver reelle skrifttype-metrics.

**AMENDMENT 2026-07-07 (F6-session, efter Ronni så det deployede F5.8-resultat):** Rene, ubrudte vandrette linjer læste som et "swim lane"-diagram, ikke et metrokort — eksplicit krav: kortet skal på en almindelig 4K-skærm i Chrome ligne et Underground-kort i STILEN. `docs/DESIGN-F5-TUBEMAP.md` §3 regel 1 opdateret: hver linje **meandrer** nu — skifter niveau (±1 trin × 20px, mønster `[0,1,0,-1]`) ved hvert æra-skift, tegnet fladt→45°-diagonal→fladt (aldrig lodret). `stroke-linejoin: round` tilføjet på linjepaths for afrundede hjørner (opfylder §3.2's hjørneradius-krav uden manuel bue-geometri). Interchange-kapsler forbinder fortsat til nabolinjens BASIS-y. 8 nye unit-tests (44 i alt), verificeret mod reelle DB-data (Diesel/Electric 3 niveauer, Steam/Other 2 — matcher antal æraer pr. linje).

- [x] **F5.4** Zoner & semantic zoom: æraerne som lyse zone-bånd med zonenavn i kanten (à la "Zone 1"); LOD: zoomet ud = linjenettet + zonenavne + kun landmark-stationer (interchange-ringe); mellemzoom = alle stationsticks + navne; klik = placard. Minimap i hjørnet til orientering. **Implementeret:** `src/lib/tubemap/{TubeMap,ZoneBands,Minimap}.svelte` erstatter TimelineCanvas.svelte (slettet). d3-zoom genopsættes ikke ved filterskift (kun translateExtent opdateres), LOD-tærskler k<0.5/k<2 matcher ARCHITECTURE.md §5. Verificeret: HTTP 200 på /, /classes, /class/[qid]; legende + æra-zonenavne + minikort renderes i SSR-SVG'et (487 stationer, 6 interchanges, 45200×360 layoutdimension mod reelle DB-data — se separat konsolverifikation af mapClasses+layout-pipelinen). **Kunne ikke browser-visuelt verificeres** — Chrome-udvidelsen var ikke forbundet i denne session, så faktisk pixel-layout (labelkollisioner, LOD-overgange ved zoom) er ikke set med øjne.
- [x] **F5.5** Stations-ikonografi: alm. klasse = tick (kort tværstreg i linjefarven); landmark-klasse (flag i DB: fx Flying Scotsman-klassen A3, Deltic, Class 37, APT) = ring-station; bi-mode = dobbeltring-interchange placeret MELLEM diesel- og electric-linjen med forbindelsesstreg. Udfaset klasse = endestations-tværstreg med årstal. **Implementeret:** `StationIcon.svelte` (tick/landmark/terminus) + `InterchangeCapsule.svelte`. Bi-mode-detektion er en præsentationsheuristik i `mapClasses.ts` (klassenummer 73/74/88/93 + narrativ-tekst) — IKKE et DB-felt, da schema kun har ét traction-felt pr. klasse. 4 pilot-klasser flaget `isLandmark=true`: LNER Class A4 (Mallard), British Rail Class 55 (Deltic), British Rail Class 37, British Rail Class 370 (APT-P) — LNER Class A3 findes ikke i det seedede datasæt, A4 brugt i stedet (samme Gresley Pacific-familie, endnu mere kendt via Mallard). Verificeret direkte mod layoutmotoren med reelle DB-data: Class 37 + Class 370 er stadig i drift (intet serviceExit) og renderes som landmark-ringe; A4 (udfaset 1966) og Class 55 (udfaset 1982) renderes korrekt som ENDESTATIONER i stedet — terminus-prioritetsreglen (testet i layout.spec.ts) slår landmark-flaget, hvilket er tilsigtet. Resten af landmark-udvælgelsen er en løbende kuraterings-opgave, ikke et engangsscript.
- [x] **F5.6** Navneskema-vælger (løser U3): global præference i header ("Vis navne som: TOPS / Historiske / Byggernavne"), persisteret i cookie så SSR renderer rigtigt; slår igennem på kort, /classes, /class/[qid] og søgning. Default: TOPS (dét Ronni tænker i — "Class 37", ikke "D6700"). **Implementeret:** `src/lib/nameScheme.ts` (ren `resolveDisplayName` + cookie-helper, 9 unit-tests) + `+layout.server.ts` (læser cookie) + `POST /api/name-scheme` (sætter cookie) + picker i header (kalder API, derefter `invalidateAll()`). HISTORICAL foretrækker PRE_TOPS-alias, dernæst ORIGINAL, ellers TOPS-fallback. Verificeret end-to-end m. curl+cookie-jar: BUILDER-skema viser "English Electric Type 3" for Class 37 i både `<title>` og synlig overskrift, SSR-korrekt uden cookie→default TOPS. `/classes`-søgning matcher nu også `ClassAlias` (bevist: søgning på "English Electric Type 3" finder præcis Class 37). **Kendt datahul:** søgning på "D6700" eller "Tractor" giver 0 hits — Wikidata-altLabels for Class 37 indeholder hverken et bart D-nummer eller kaldenavnet "Tractor" (kun "BR Class 37" + "English Electric Type 3"); D-numre er reelt INDIVID-niveau (D6607 er ét lokomotiv, ikke hele klassen) og hører hjemme i F6's `LocomotiveIdentity`-tabel — søgningen bør udvides til at slå op der, når F6.2 er kørt.
- [x] **F5.7** Linjediagram-visning `/line/[traction]`: det klassiske vandrette stribekort (som over dørene i toget) — én linje, alle klasser kronologisk med ticks og navne, æra-zoner som baggrundsskift. Dette bliver den _forståelige_ browsing-indgang; det store kort er overblikket. **Implementeret:** `src/lib/tubemap/LineDiagram.svelte` (genbruger `layout.ts` i 1D-mode, lod fast på "mellem" — altid ticks+navne, ingen zoom nødvendig, kun vandret scroll). Rute `src/routes/line/[slug]/+page.server.ts+.svelte`; legenden i TubeMap linker nu til `/line/diesel` osv. `StationIcon.svelte` udvidet med et 'interchange'-visual (dobbeltring) til brug når der IKKE er en anden linje at tegne kapsel imod. Verificeret: `/line/diesel` → 200, 113 stationer inkl. "British Rail Class 37"-label i SVG'et; `/line/bogus` → 404. **Værktøjsfælde fundet og omgået:** ruteparameteren kunne IKKE hedde `[traction]` — svelte-check 4.7.1 + TypeScript 6.0.3 kollapsede `PageData` til `any` for ALLE nyoprettede ruter i denne session (bekræftet med isoleret reproduktion, uafhængigt af feltnavne/routekompleksitet — sandsynligvis en TS 6.0-specifik `Awaited<ReturnType<...>>`-cirkularitetsfejl i codegen). Løst pragmatisk: parameteren hedder `[slug]`, og `+page.svelte` caster eksplicit (`data.traction as TractionType` osv.) for at omgå den ødelagte inferens. Værd at genteste efter en TypeScript-opdatering.
- [x] **F5.8** Lys sammenhæng på tværs: /classes og /class/[qid] flyttes til samme lyse TfL-univers (hvide kort, linjefarve-accenter, sort typografi), så sitet føles som ÉT produkt. **U5 opdateret 2026-07-07: mørkt tema er FJERNET HELT, ingen valgfrit tema** (den oprindelige "kan evt. bevares"-formulering var forældet ift. den senere U5-beslutning). **Krav fra Ronni 2026-07-07: linjefarven FØLGER MED ind i undersektionen** — vælger man en dieselklasse, er detaljesiden temaet i diesellinjens farve (hero-bånd, badges, links, spec-accenter). Teknisk: `--line-color` CSS-token sættes pr. side ud fra klassens traction; alle accenter arver den. **Implementeret:** `app.css` mørke `--color-*`-tokens fjernet helt (0 resterende referencer i src/); `--line-color` er nu en rigtig site-wide token (default `--tfl-blue`, overrides pr. side/kort). `+layout.svelte` (header), `/classes`, `/class/[qid]`, `MuseumPlacard.svelte`, `SpecificationGrid.svelte` migreret til lyse tokens; `InspectLightbox.svelte` beholder mørk baggrund (standard foto-lightbox-kontrast, ikke "mørkt tema") men accenter refererer nu `--line-color`. `loco.ts`'s `tractionColor()` delegerer nu til `lineColorVar()` (ét farve-kilde på tværs af kort+sider). Verificeret: `/class/Q3306037` (Class 37, diesel) → `--line-color: var(--line-diesel)`; `/class/Q938253` (LNER A4, steam) → `--line-color: var(--line-steam)`; `/classes` — alle 488 kort korrekt tematiseret (323 steam / 102 diesel / 57 electric / 6 other). **Værktøjsfælde (samme som F5.7):** `Record<TractionType,V>[narrowed-prop-access]` gav igen `any`-fejl i `MuseumPlacard.svelte` (denne gang ikke rutebundet — ren komponent-prop) — løst med eksplicit `as TractionType`-cast. Mønsteret optræder altså bredere end blot ruteparametre; hold øje med det ved fremtidige `Record[...]`-indekseringer af `traction`.
- [x] **F5.9** Datakvalitet der understøtter kortet: (a) FA5-fixet — Commons-fallback må ikke fritekst-søge på "class" (beviset står i seed-loggen: _"The two Mr. Wetherbys; a middle-class comedy"_); (b) filtrér ikke-lokomotiv-materiel fra discovery (godsvogne som "SR Cattle Van" er dukket op — kobles til U2); (c) landmark-flag + linjetildeling seedes. **Implementeret:** (a) `03-media.ts`'s Commons-fallback bruger nu `intitle:"frase"` (præcis titelmatch) i stedet for løs fritekst-søgning — eliminerer generisk-ord-støj som "middle-class comedy". (b) **IKKE rørt** — kræver stadig Ronnis U2-beslutning (blokerer stadig, uændret); ingen data slettet uden beslutning. (c) `scripts/seed/07-landmarks.ts` — ny idempotent seed-fase, formaliserer landmark-flagningen fra F5.4/F5.5 (var ad-hoc DB-opdatering) som et rigtigt, genkørbart script; udvidet med Class 47 (nævnt eksplicit i den kreative brief) ud over de 4 fra F5.4. Linjetildeling (traction) håndteres allerede af `04-reclassify.ts` (kørt efter hver seed, jf. husdisciplinen).
- **Definition of Done for F5:** Ronni kan åbne kortet, straks se hvad linjerne betyder (legende), zoome fra æra-overblik til station, klikke "Class 37" (uanset navneskema), og alt ligner ét sammenhængende TfL-inspireret univers i lyst design. 60 FPS bevares (LOD/virtualisering genbruges). **F5 er nu fuldt implementeret (F5.2–F5.9) og deployet til tog.hostrup.org.** Browser-visuel slutverifikation (faktisk zoom-følelse, labelkollisioner) udestår stadig — Chrome-værktøjet var ikke tilgængeligt i denne session; anbefales som næste skridt før F6 påbegyndes for alvor, eller sideløbende.

## Fase F6 — "Opslagsværket": individniveau for hvert bygget lokomotiv (Ronnis krav 2026-07-07)

**Visionen:** Ved valg af en klasse skal man kunne se ALT om hver enkelt bygget enhed — så man kan slå op, at Class 37 har en specifik maskine, der hedder **37403 "Isle of Mull"**, se dens status, historie og omlitreringer (D6607 → 37307 → 37403). Det gør Trainpedia til et ægte opslagsværk, ikke bare et klassekatalog.

- [x] **F6.1** Datamodel: ny `Locomotive`-tabel (individ) med relation til `LocomotiveClass`: aktuelt nummer, navn ("Isle of Mull"), øgenavne, status-enum (`IN_SERVICE` / `STORED` / `PRESERVED` / `SCRAPPED` / `EXPORTED` / `UNKNOWN`), aktuel operatør/hjemsted hvis kendt, individuel historik-tekst. Ny `LocomotiveIdentity`-tabel til **omlitrerings-historik** (nummer/navn + periode + kilde), så D6607 → 37307 → 37403 kan vises som tidslinje — og søgning finder individet uanset hvilket nummer man bruger (samme princip som klasse-aliasserne i F5.2/U3). **Godkendt af Ronni, db push kørt.** `sourceRevision` tilføjet på begge tabeller i en opfølgende additiv rettelse (var glemt i første diff, krævet af provenance-kravet "sourceUrl + revision").
- [x] **F6.2** Seed `06-fleet.ts`: parse fleet-/statustabeller fra Wikipedia-klasseartikler og "List of…"-artikler; supplér med Wikidata-emner for enkeltlokomotiver (bevarede maskiner har ofte egne emner med navn, status og hjemsted). Strict factuality som altid: felter uden kilde forbliver tomme; provenance (sourceUrl + revision) pr. individ. Dæknings-rapport: enheder fundet vs. `totalBuilt` pr. klasse. **Implementeret (pilot Class 37/U6):** parser Wikipedias regelmæssige fleet-tabel (BTC/TOPS×3/Post-TOPS×2-omlitreringskæde, Names, Status, Notes) via cheerio. Navn↔nummer er IKKE 1:1 i kilden — kun sidste navn gemmes som `currentName`, øvrige i `nicknames`; `LocomotiveIdentity` bærer udelukkende den verificerbare nummer-kæde. Idempotent (upsert på `[classId, currentNumber]`, identities slettes+genskabes pr. individ). **Resultat: 309/309 individer (100% dækning), IN_SERVICE=40/STORED=21/PRESERVED=39/SCRAPPED=209.** Pilot-eksemplet matcher briefen præcist: 37403 "Isle of Mull" (nicknames: Glendarroch, Ben Cruachan), identities D6607→37307→37403, fuld sourceUrl+sourceRevision-provenance. **Udestår:** Wikidata-emner for enkeltlokomotiver (supplerende hjemsted/status for bevarede maskiner) — ikke gjort i denne pilot, mulig fremtidig udvidelse.
- [x] **F6.3** UI på `/class/[qid]`: ny "The Fleet"-sektion — søgbar/sortérbar tabel over alle byggede enheder (nummer, navn, status-badge i linjefarven, bevaringssted) med hurtigfilter ("kun bevarede", "kun i drift"). Individ-side `/loco/[nummer]` med omlitrerings-tidslinje, navnehistorik, øgenavne, individuel historie og galleri.
- [x] **F6.4** Media-kobling pr. individ: `MediaAsset.locoNumber` findes allerede i skemaet — kobl eksisterende assets til `Locomotive`-records, og udvid `03-media.ts` med målrettet Commons-søgning pr. loco-nummer (fx kategori/søgning "37403"), så individ-siderne får egne billeder. Flere billeder pr. klasse generelt (hæv media-loftet for landmark-klasser).
- [x] **F6.5** Komplethed som mål: opslagsværket dækker nu 100% af alle dieselklasser, og udrulningen fokuserer udelukkende på britiske diesel-lokomotiver. **Præcisering (analyse 2026-07-07): "100%" gælder KLASSE-niveau (alle 98 dieselklasser har en side). Individ-niveau er stadig kun Class 37-piloten (1/98 klasser, 309 individer) — generalisering er F9.1.**
- [x] **Sprint 2 (Udrullet 2026-07-07):** 100% diesel-scope integreret med 2D Region Metrokort, spec-scatterplot og Timeline Slider.

## Kræver brugerbeslutning

- [ ] **U1** Authelia-politik (arkitekt-forslag: bypass) — C3. Blokerer intet i F9, men skal afklares før sitet regnes som "færdigt lanceret".
- [x] **U2** ~~Skal discovery udvides ud over de 7 æraers "major classes" til ALT rullende materiel? — OG omvendt: skal ikke-lokomotiver UD?~~ **Overhalet af F6.5-pivoten 2026-07-07:** datasættet er nu 100% britiske diesel-LOKOMOTIVER (98 klasser; godsvogne/ikke-lokomotiver blev renset ud af `clean-non-diesel.ts`). Spørgsmålet genopstår som U7.
- [ ] **U7** Skal damp- og el-æraerne genindføres i datasættet, og i givet fald hvornår? (Briefen siger "all trains of all eras"; diesel-scope var en bevidst kompletheds-prioritering. Genudvidelse rører æra-strukturen (F9.5a), kort-layoutet (dieselLayout.ts er diesel-specifik) og fleet-seeden.) **Anbefaling: udskyd til F9's datakomplethed er lukket for diesel — ellers gentages "halvt produkt"-problemet fra F7 i tre traktioner på én gang.**
- [x] **U8** ✅ LUKKET 2026-07-08 af SPEC-F11-MUSEUM-UI.md §10: alle fire linser er responsive borgere (Table→kortliste, Timeline→vandret scroll, filter-bottom-sheet) — ingen separat mobilstrategi nødvendig, fordi kortet (mobil-problemets kilde) pensioneres. **Mobil-strategi.** Tubemappet er designet desktop-først (Ronnis 4K-krav i F5-amendmentet); på en telefon er pan/zoom-SVG med 98 stationer en dårlig oplevelse. Valg: (a) **anbefalet:** små skærme får linjediagrammerne (F10.3) og /classes som primær indgang — kortet vises med en "best on a larger screen"-note; (b) dedikeret mobil-tilpasning af selve kortet (dyrt, tvivlsom gevinst); (c) mobil ignoreres bevidst. Berører navigation, så beslut FØR F10.3 poleres færdig.
- [ ] **U9** **Kuraterede fortællinger/ture** ("The Deltic story", "Pilot Scheme-fiaskoerne" — en sekvens af eksisterende klasse-/individsider med korte overgangstekster). Det ville give sitet en redaktionel stemme, men overgangstekster er PR DEFINITION ikke-citeret indhold — en bevidst undtagelse fra strict factuality-princippet, som kun Ronni kan give. Alternativ inden for princippet: ture uden fritekst, kun kuraterede sekvenser med kilde-citerede uddrag.
- [x] **U3** ✅ BESLUTTET 2026-07-07: Navneskema-vælger med default TOPS ("Class 37"); søgning matcher alle aliasser (D6700, English Electric Type 3, "Tractor"). → implementeres i F5.2 + F5.6.
- [x] **U4** ✅ BESLUTTET 2026-07-07: **Option A** — Steam = Metropolitan-magenta `#9B0058`, Diesel = District-grøn `#007D32`, Electric = Victoria-lyseblå `#0098D8`, Experimental/Other = Jubilee-grå `#A0A5A9`.
- [x] **U5** ✅ BESLUTTET 2026-07-07: **HELE sitet i det lyse TfL-univers** — ingen mørk toggle. Linjefarven følger med ind på klasse-/individ-sider via `--line-color`.
- [x] **U6** ✅ BESLUTTET 2026-07-07: **Diesel/el-æraerne først** — pilot: Class 37-fleeten (37001+ inkl. omlitreringer, fx D6607 → 37307 → 37403 "Isle of Mull"). Damp følger efter; huller accepteres (strict factuality: "Unknown" er OK).

## Løst

- [x] **F0.1** Scaffold SvelteKit 2 (TS, adapter-node, vitest, playwright, eslint+prettier) (Commit: 44b1f5b)
- [x] **F0.2** Prisma-opsætning og verifikation mod PostgreSQL (Commit: 44b1f5b)
- [x] **F0.3 (C1)** Datamodel godkendt og synkroniseret via db push pga. manglende shadow-db privilegier (Commit: 44b1f5b)
- [x] **F1.1** SPARQL-discovery af britiske lokomotivklasser (Wikidata) → kandidat-CSV per æra
- [x] **F1.2** Enrichment: Wikipedia REST (narrativ-uddrag m. kilde-revision), infobox-fallback m. kildefelt
- [x] **F1.3** Commons-media: download → sharp-resize (480/960/1920 + LQIP) → `data/media/`; licens/attribution/år/loco-nr. i DB
- [x] **F1.4** Zod-validering + idempotente upserts (nøgle: wikidataQid) + `seed-report.md` (dækning: klasser/æra, assets/klasse, spec-huller)
- [x] **F2.1 (C2)** Design-tokens, komponentarkitektur og animations-mekanik fremlægges (moodboard/tokens-fil + prototype af zoom-mekanik)
- [x] **F2.2** d3-zoom canvas m. semantic zoom (LOD: æra-bånd → klasse-noder), viewport-virtualisering, 60 FPS-instrumentering (Performance API-overlay i dev)
- [x] **F2.3** Filter-UI (æra, traction, hjularrangement) m. GSAP Flip layout-morph; `prefers-reduced-motion`-fallback
- [x] **F2.4** Museums-placard (klassekort): blueprint/foto-layout, byggeår, spec-overblik, narrativ
- [x] **F3.1** Fullscreen showcase-rute per klasse: mediegalleri m. lazy srcset
- [x] **F3.2** Ekspanderbart Specification Grid (tabular numerals, GSAP-ekspansion)
- [x] **F3.3** Cinematic inspect-lightbox: titel, årstal, loco-nummer, anekdote, licens/attribution (JURIDISK KRAV ved CC-BY/SA)
