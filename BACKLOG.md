# Backlog — trainpedia (review 2026-07-07)

Baseline: lint 0 fejl · check/tsc 0 fejl · tests 3/3 grønne (2 unit, 1 e2e)

## Åben

- [x] **B1** [Blocker] `src/routes/data/media/[...file]/+server.ts:13-18` — Path traversal-sårbarhed i filserver-endpoint. Bevis: `if (!filePath.startsWith(resolvedMediaRoot))` tillader adgang til søskendemapper med fælles præfiks (f.eks. `data/media-backups`). Fix: brug `path.relative` til at tjekke for `..` og absolutte stier.
- [x] **H1** [High] `src/lib/components/TimelineCanvas.svelte:548` — Kollision mellem GSAP Flip og Tailwind transition-all. Bevis: `class="... border transition-all duration-300 ..."` medfører hakkende animationer, da CSS modarbejder GSAP's transform-opdateringer. Fix: fjern `transition-all` fra GSAP-animerede noder.
- [ ] **H2** [High] `src/lib/components/TimelineCanvas.svelte:471` — SVG metroruter snapper øjeblikkeligt ved filter-skift frem for at glide flydende med station noderne. Bevis: `<path d={line.path} ... />` transitioneres ikke med GSAP. Fix: tildel noderne og linje-ændringer en koordinat-transition eller synkronisér layout morphing.
- [x] **H3** [High] `src/lib/components/TimelineCanvas.svelte:43` — FPS-beregning i requestAnimationFrame laver Svelte-stats opdateringer på hver frame, hvilket skaber unødig reaktivitetsoverhead. Bevis: `fps = Math.round(...)` kaldes ~60 gange/sek. Fix: throttle opdateringer af `fps` staten til hver 500ms.
- [ ] **H4** [High] `src/lib/components/InspectLightbox.svelte:19` — Fullscreen modal dialog mangler focus trapping. Bevis: keyboard-brugere kan tabbe ud af dialogen til baggrundselementer. Fix: tilføj keydown listener på `Tab` til at indkapsle fokus.
- [ ] **M1** [Medium] `deploy.sh:34` — Manglende afvikling af databasemigreringer (`prisma db push`) under deployment. Bevis: compose-udrulning opdaterer kode, men synkroniserer ikke skemaer. Fix: tilføj database-push før eller efter containere genstartes.
- [x] **M2** [Medium] `src/routes/+page.server.ts:7-21` — Manglende DB fejlhåndtering i server-load. Bevis: `await db.era.findMany(...)` uden try/catch crasher hele siden ved DB-offline. Fix: wrap kald i try/catch med pæn fallback-værdi eller 503 fejlside.
- [ ] **M3** [Medium] `scripts/seed/01-discover.ts:250-259` — Manglende rate-limiting og retry ved Wikidata SPARQL kald. Bevis: fail-fast uden retry ved transient timeout eller HTTP 429. Fix: tilføj retry-med-backoff logik.
- [ ] **M4** [Medium] `Dockerfile:34` — Docker non-root bruger `svelte` (UID 1001) kan mangle skrivetilgang til hostens mountede volume `/app/data/media`. Bevis: `USER svelte` i Dockerfile kan fejle med `EACCES` hvis permissions på hosten ikke matcher. Fix: sæt UID/GID på compose-niveau eller tilpas chmod på hosten.
- [x] **M5** [Medium] `src/lib/components/MuseumPlacard.svelte:37` — CSS variable i class-attribut er syntaktisk ugyldig. Bevis: `class="... var(--transition-bezier-heavy) ..."` tolkes som et klassenavn frem for CSS. Fix: flyt timing-funktionen til inline style.
- [ ] **M6** [Medium] `src/lib/components/TimelineCanvas.svelte:512` — Duplikerede stations-knapper i Tier 2 zoom forurener keyboard tab index. Bevis: to uafhængige `button` elementer trigger samme station-valg. Fix: flet til én knap eller sæt `tabindex="-1"` på den ene.
- [ ] **M7** [Medium] `src/lib/components/FilterOverlay.svelte:43` — Dropdown select elementer mangler labels / aria-labels. Bevis: `select` tags har ingen tilknyttet label. Fix: brug `<label>` eller `aria-label`.
- [ ] **M8** [Medium] `src/lib/components/TimelineCanvas.svelte:359` — Canvas er ikke keyboard navigérbar (pan/zoom). Bevis: `zoomContainer` har ingen `tabindex`. Fix: tilføj `tabindex="0"` samt focus-listeners på stations til at auto-panne.
- [ ] **L1** [Low] `scripts/seed/02-enrich.ts:121-140` — Wikipedia REST API rate-limit kaskadefejl. Bevis: ingen pause ved HTTP 429, fortsætter med at skyde anmodninger afsted. Fix: tilføj backoff-forsinkelse ved 429.
- [ ] **L2** [Low] `prisma/schema.prisma:8-11` — Manglende `shadowDatabaseUrl`. Bevis: tvinger os til at bruge `db push` frem for `migrate dev` lokalt. Fix: opsæt shadow-db i schema hvis shadow-db database oprettes.
- [ ] **L3** [Low] `scripts/seed/03-media.ts:231-256` — Ineffektive sekventielle DB-kald i seed loops. Bevis: upsert af specifications kører én ad gangen i stedet for transaktion/batch. Fix: brug `prisma.$transaction`.
- [ ] **L4** [Low] `src/lib/components/TimelineCanvas.svelte:374` — Hover stroke-width på metrolinjer er utilgængelig grundet `pointer-events-none` på forælder. Bevis: `<svg class="... pointer-events-none">`. Fix: tilføj `pointer-events-stroke` på stierne.
- [x] **L5** [Low] `src/lib/components/TimelineCanvas.svelte:402` — Lav kontrast på årstal-skala tekster. Bevis: `text-[var(--color-text-muted)] opacity-30` mod mørk baggrund. Fix: øg opaciteten for bedre læsbarhed.

## Førstehjælp 2026-07-07 (Claude Fable 5)

- [x] **FA1** Datatriage: `scripts/seed/04-reclassify.ts` — traction udledt af Whyte-notation + BR TOPS-nummerserier (334 klasser stod som OTHER); æraer genplaceret efter traction+år, så Class 37/47/55 ligger i Diesel & Electric-æraen. Køres efter hver seed.
- [x] **FA2** Rigtig Tailwind 4 (`@tailwindcss/vite`) erstatter det håndskrevne pseudo-utility-stylesheet i app.css, hvor over halvdelen af de anvendte klasser manglede. Fraunces/Inter installeret via Fontsource (var aldrig installeret).
- [x] **FA3** Informationsarkitektur: header-navigation (Timeline/Explore + søgefelt), ny søgbar oversigt `/classes` (q/era/traction-filtre) og dyb-linkbar detaljeside `/class/[qid]` (hero, narrativ, specs, galleri, lightbox). ShowcaseGallery-modalen udgået; placard linker til detaljesiden.
- [x] **FA4** Timeline-læsbarhed: æra/årstal-opacitet hævet, DEV-HUD kun i dev-mode, startvisning flyttet til tæt befolket årti, GSAP/CSS-transitionskollision på noder fjernet.
- [ ] **FA5** `03-media.ts` henter irrelevante filer fra visse Commons-kategorier (fx "Crop production"-PDF'er) — filtrér på filtype/kategori-relevans.

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
- [ ] **F5.4** Zoner & semantic zoom: æraerne som lyse zone-bånd med zonenavn i kanten (à la "Zone 1"); LOD: zoomet ud = linjenettet + zonenavne + kun landmark-stationer (interchange-ringe); mellemzoom = alle stationsticks + navne; klik = placard. Minimap i hjørnet til orientering.
- [ ] **F5.5** Stations-ikonografi: alm. klasse = tick (kort tværstreg i linjefarven); landmark-klasse (flag i DB: fx Flying Scotsman-klassen A3, Deltic, Class 37, APT) = ring-station; bi-mode = dobbeltring-interchange placeret MELLEM diesel- og electric-linjen med forbindelsesstreg. Udfaset klasse = endestations-tværstreg med årstal.
- [ ] **F5.6** Navneskema-vælger (løser U3): global præference i header ("Vis navne som: TOPS / Historiske / Byggernavne"), persisteret i cookie så SSR renderer rigtigt; slår igennem på kort, /classes, /class/[qid] og søgning. Default: TOPS (dét Ronni tænker i — "Class 37", ikke "D6700").
- [ ] **F5.7** Linjediagram-visning `/line/[traction]`: det klassiske vandrette stribekort (som over dørene i toget) — én linje, alle klasser kronologisk med ticks og navne, æra-zoner som baggrundsskift. Dette bliver den _forståelige_ browsing-indgang; det store kort er overblikket.
- [ ] **F5.8** Lys sammenhæng på tværs: /classes og /class/[qid] flyttes til samme lyse TfL-univers (hvide kort, linjefarve-accenter, sort typografi), så sitet føles som ÉT produkt. Museums-mørke kan evt. bevares som valgfrit tema (U5). **Krav fra Ronni 2026-07-07: linjefarven FØLGER MED ind i undersektionen** — vælger man en dieselklasse, er detaljesiden temaet i diesellinjens farve (hero-bånd, badges, links, spec-accenter). Teknisk: `--line-color` CSS-token sættes pr. side ud fra klassens traction; alle accenter arver den. Paletten holdes AFDÆMPET lys (TfL-farver på hvid, evt. let desatureret til flader; fuld farve kun på selve linjerne/accenterne).
- [ ] **F5.9** Datakvalitet der understøtter kortet: (a) FA5-fixet — Commons-fallback må ikke fritekst-søge på "class" (beviset står i seed-loggen: _"The two Mr. Wetherbys; a middle-class comedy"_); (b) filtrér ikke-lokomotiv-materiel fra discovery (godsvogne som "SR Cattle Van" er dukket op — kobles til U2); (c) landmark-flag + linjetildeling seedes.
- **Definition of Done for F5:** Ronni kan åbne kortet, straks se hvad linjerne betyder (legende), zoome fra æra-overblik til station, klikke "Class 37" (uanset navneskema), og alt ligner ét sammenhængende TfL-inspireret univers i lyst design. 60 FPS bevares (LOD/virtualisering genbruges).

## Fase F6 — "Opslagsværket": individniveau for hvert bygget lokomotiv (Ronnis krav 2026-07-07)

**Visionen:** Ved valg af en klasse skal man kunne se ALT om hver enkelt bygget enhed — så man kan slå op, at Class 37 har en specifik maskine, der hedder **37403 "Isle of Mull"**, se dens status, historie og omlitreringer (D6607 → 37307 → 37403). Det gør Trainpedia til et ægte opslagsværk, ikke bare et klassekatalog.

- [ ] **F6.1** Datamodel: ny `Locomotive`-tabel (individ) med relation til `LocomotiveClass`: aktuelt nummer, navn ("Isle of Mull"), øgenavne, status-enum (`IN_SERVICE` / `STORED` / `PRESERVED` / `SCRAPPED` / `EXPORTED` / `UNKNOWN`), aktuel operatør/hjemsted hvis kendt, individuel historik-tekst. Ny `LocomotiveIdentity`-tabel til **omlitrerings-historik** (nummer/navn + periode + kilde), så D6607 → 37307 → 37403 kan vises som tidslinje — og søgning finder individet uanset hvilket nummer man bruger (samme princip som klasse-aliasserne i F5.2/U3).
- [ ] **F6.2** Seed `06-fleet.ts`: parse fleet-/statustabeller fra Wikipedia-klasseartikler og "List of…"-artikler; supplér med Wikidata-emner for enkeltlokomotiver (bevarede maskiner har ofte egne emner med navn, status og hjemsted). Strict factuality som altid: felter uden kilde forbliver tomme; provenance (sourceUrl + revision) pr. individ. Dæknings-rapport: enheder fundet vs. `totalBuilt` pr. klasse.
- [ ] **F6.3** UI på `/class/[qid]`: ny "The Fleet"-sektion — søgbar/sortérbar tabel over alle byggede enheder (nummer, navn, status-badge i linjefarven, bevaringssted) med hurtigfilter ("kun bevarede", "kun i drift"). Individ-side `/loco/[nummer]` med omlitrerings-tidslinje, navnehistorik, øgenavne, individuel historie og galleri.
- [ ] **F6.4** Media-kobling pr. individ: `MediaAsset.locoNumber` findes allerede i skemaet — kobl eksisterende assets til `Locomotive`-records, og udvid `03-media.ts` med målrettet Commons-søgning pr. loco-nummer (fx kategori/søgning "37403"), så individ-siderne får egne billeder. Flere billeder pr. klasse generelt (hæv media-loftet for landmark-klasser).
- [ ] **F6.5** Komplethed som mål: opslagsværket skal dække ALLE klasser (488 er seedet; udvid jf. U2-beslutningen) og på sigt alle individer, hvor kilderne findes. Berigelses-loop: kør fleet-seed periodisk, log dækningsgrad i seed-rapporten, og prioritér huller efter Ronnis interesse (diesel/el-æraen først, jf. U6).

## Kræver brugerbeslutning

- [ ] **U1** Authelia-politik (arkitekt-forslag: bypass) — C3
- [ ] **U2** Skal discovery udvides ud over de 7 æraers "major classes" til ALT rullende materiel? (briefen siger "preferably all trains of all eras" — start m. ≥20/æra, udvid efter seed-rapport) — OG omvendt: skal ikke-lokomotiver (godsvogne mv.) UD af det nuværende datasæt?
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
