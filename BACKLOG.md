# Backlog — trainpedia (arkitekt-plan 2026-07-07)

Faseopdelt. Hver fase afsluttes med grøn test-suite + commit. Check-ins (C1–C3) er STOP-punkter — se AGENT-BRIEF.md.

## Åben

### Fase 0 — Fundament
- [ ] **F0.1** Scaffold SvelteKit 2 (TS, adapter-node, vitest, playwright, eslint+prettier) i denne mappe — bevar eksisterende filer (ARCHITECTURE, AGENT-BRIEF, Dockerfile, deploy.sh, prisma/)
- [ ] **F0.2** Prisma-opsætning mod `postgresql://$TP_USER:$TP_PW@postgresql:5432/$TP_DB` (lokal dev: host `127.0.0.1:5432`); verificér forbindelse via `postgres-trainpedia` MCP
- [ ] **F0.3 (C1)** Præsentér datamodellen for Ronni → derefter `prisma migrate dev --name init`

### Fase 1 — Seed-pipeline (strict factuality)
- [ ] **F1.1** SPARQL-discovery af britiske lokomotivklasser (Wikidata) → kandidat-CSV per æra
- [ ] **F1.2** Enrichment: Wikipedia REST (narrativ-uddrag m. kilde-revision), infobox-fallback m. kildefelt
- [ ] **F1.3** Commons-media: download → sharp-resize (480/960/1920 + LQIP) → `data/media/`; licens/attribution/år/loco-nr. i DB
- [ ] **F1.4** Zod-validering + idempotente upserts (nøgle: wikidataQid) + `seed-report.md` (dækning: klasser/æra, assets/klasse, spec-huller) → fremlæg for Ronni

### Fase 2 — Timeline (kerneoplevelsen)
- [ ] **F2.1 (C2)** Design-tokens, komponentarkitektur og animations-mekanik fremlægges (moodboard/tokens-fil + prototype af zoom-mekanik)
- [ ] **F2.2** d3-zoom canvas m. semantic zoom (LOD: æra-bånd → klasse-noder), viewport-virtualisering, 60 FPS-instrumentering (Performance API-overlay i dev)
- [ ] **F2.3** Filter-UI (æra, traction, hjularrangement) m. GSAP Flip layout-morph; `prefers-reduced-motion`-fallback
- [ ] **F2.4** Museums-placard (klassekort): blueprint/foto-layout, byggeår, spec-overblik, narrativ

### Fase 3 — Showcase & Inspect
- [ ] **F3.1** Fullscreen showcase-rute per klasse: mediegalleri m. lazy srcset
- [ ] **F3.2** Ekspanderbart Specification Grid (tabular numerals, GSAP-ekspansion)
- [ ] **F3.3** Cinematic inspect-lightbox: titel, årstal, loco-nummer, anekdote, licens/attribution (JURIDISK KRAV ved CC-BY/SA)

### Fase 4 — Kvalitet & Deploy
- [ ] **F4.1** `/review-project` → ret fund via `/fix-backlog`
- [ ] **F4.2** Lighthouse ≥90 performance; INP <200 ms; a11y-gennemgang (fokusorden, kontrast, reduced motion)
- [ ] **F4.3 (C3)** Deploy-SOP: compose-blok ind i projects.yml → `dcup` → `/config-auth` (bypass efter Ronnis OK) → `/config-proxy` (STANDARD-mønster + verificér proxy_pass!) → `/config-kuma` → `/sync-homepage` → røgtest på tog.hostrup.org
- [ ] **F4.4** `/brain`: gem arkitektur-erfaringer + vault-projektnote opdateres til "i drift"

## Kræver brugerbeslutning
- [ ] **U1** Authelia-politik (arkitekt-forslag: bypass) — C3
- [ ] **U2** Skal discovery udvides ud over de 7 æraers "major classes" til ALT rullende materiel? (briefen siger "preferably all trains of all eras" — start m. ≥20/æra, udvid efter seed-rapport)

## Løst
(flyttes hertil af /fix-backlog med commit-hash)
