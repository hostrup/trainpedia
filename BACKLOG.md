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

## Kræver brugerbeslutning

- [ ] **U1** Authelia-politik (arkitekt-forslag: bypass) — C3
- [ ] **U2** Skal discovery udvides ud over de 7 æraers "major classes" til ALT rullende materiel? (briefen siger "preferably all trains of all eras" — start m. ≥20/æra, udvid efter seed-rapport)

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
