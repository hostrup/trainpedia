# Trainpedia — Løsningsarkitektur

> Interaktiv digital krønike over britisk jernbanehistorie · `tog.hostrup.org`
> Arkitekt: Claude (claude-fable-5), 2026-07-07. Implementering: billigere agent efter [AGENT-BRIEF.md](AGENT-BRIEF.md).

## 1. Teknologivalg (BESLUTTET — afvig ikke uden ny arkitekt-godkendelse)

| Lag | Valg | Begrundelse |
|-----|------|-------------|
| Framework | **SvelteKit 2 + Svelte 5 (TypeScript), adapter-node** | Husstandard (elektravej, workout, mikkel_stat) — agenterne kender mønstrene; kompilerede, reaktive opdateringer giver 60 FPS-budgettet en reel chance; SSR til SEO/first-paint af placards |
| Database | **PostgreSQL 17 (delt `postgresql`-container) + Prisma** | Wishbuy-mønsteret 1:1; relationelt fit (eras→classes→specs→media); `prisma-trainpedia`/`postgres-trainpedia` MCP-servere er klargjort til agent-tooling |
| Zoom-canvas | **d3-zoom + d3-scale over et CSS-transformeret DOM/SVG-lag** (semantic zoom, IKKE ren canvas-rastering) | Noderne er rigt indhold (typografi, kort) — DOM-noder m. `transform: translate3d/scale` på ét compositor-lag giver GPU-accelereret pan/zoom; semantic zoom (LOD): æra-bånd → klasse-noder afhængigt af zoom-niveau; virtualisér noder uden for viewport |
| Animation | **GSAP 3 + Flip-plugin** (gratis, inkl. alle plugins) | Præcis det "GSAP-quality layout-morph" briefen kræver: Flip til filter-morph af timeline-noder; timelines til card-åbning/inspect-view; `will-change` + transforms only (aldrig layout-triggende properties) |
| Typografi | **Selvhostet via Fontsource** — display: `Fraunces` (museums-serif), UI/data: `Inter` (tabular numerals til spec-grids) | Ingen CDN-afhængighed (CSP, GDPR, hastighed); endeligt valg fremlægges i design-token check-in |
| Datapipeline | **TS seed-scripts (`tsx`) → Wikidata SPARQL + Wikipedia REST + Wikimedia Commons API**, valideret med Zod | Struktureret, verificérbar fakta-indsamling — se §4 |
| Billeder | Downloades til `data/media/` (volume), serveres lokalt m. genererede størrelser (sharp) | CSP-venligt, hurtigt, stabilt — Commons hotlinking er langsomt/skrøbeligt; attribution gemmes i DB (licens-krav for CC-BY/CC-BY-SA!) |
| Test | Vitest (logik/seed-validering) + Playwright (kritiske flows) | Husstandard-let; deploy.sh kører suiten som gate |
| Runtime | Docker multi-stage `node:22-slim`, port 3000, non-root | Husstandard (kopieret fra workout) |

**Bevidste fravalg:** PixiJS/WebGL (unødigt — nodeantal er hundreder, ikke titusinder; DOM bevarer tilgængelighed og tekstkvalitet), Three.js/3D (uden for scope per brief), eksterne font/asset-CDN'er (CSP + kvalitetskontrol), AI-genererede fakta (forbudt per brief).

## 2. Systemoverblik

```
Wikidata/Wikipedia/Commons ──(seed-scripts, engangs + opdatérbare)──▶ PostgreSQL (trainpedia DB)
                                                   │                        │
                                                   ▼                        ▼
                                     data/media/ (lokale assets)   SvelteKit (SSR + API-ruter)
                                                   │                        │
                                                   └────────▶ Browser: d3-zoom timeline · GSAP-morph
                                                              placards · showcase · inspect-lightbox

Drift: container `trainpedia` (projects.yml) → NPM (STANDARD-mønster!) → tog.hostrup.org
       Authelia: bypass (offentligt site — SKAL bekræftes af Ronni) · Kuma-monitor · Homepage-entry
```

## 3. Datamodel (udkast — CHECK-IN #1 før migration!)
Se [prisma/schema.prisma](prisma/schema.prisma). Kerneidéer:
- `Era` (slug, navn, periode, narrativ, sortIndex) — de 7 æraer fra briefen
- `LocomotiveClass` (klassenavn, aka, traction: STEAM/DIESEL/ELECTRIC, wheelArrangement, serviceEntry/serviceExit-datoer, narrativ, eraId, wikidataQid, wikipediaTitle) — positioneres på timeline efter `serviceEntry`
- `Specification` (key/value/unit/sortIndex per klasse — fleksibelt spec-grid: Manufacturer, Designer, Power Output, Tractive Effort, Top Speed, Total Built…)
- `MediaAsset` (classId, kind: PHOTO/BLUEPRINT/DIAGRAM, localPath, title, year, locoNumber, anecdote, commonsUrl, license, attribution, width/height)
- `Provenance` på alle fakta-bærende rækker: `sourceUrl`, `sourceRevision`, `retrievedAt` — **strict factuality**: felter uden kilde forbliver NULL og vises som "ukendt", aldrig udfyldt af AI

## 4. Seed-pipeline (strict factuality)
1. **Discovery:** SPARQL mod Wikidata: alle instanser af britiske lokomotivklasser (P31 locomotive class, P17 UK) m. datoer, traction, wheel arrangement, fabrikant, designer → kandidatliste per æra (mål: ≥20 klasser/æra; helst alt)
2. **Enrichment:** Wikipedia REST (summary + sections) → narrativ-uddrag (citeret, ikke omskrevet af AI); infobox-parsing KUN som fallback med kildefelt
3. **Media:** Commons-API per klasse-kategori → ≥20 assets/klasse hvor muligt; filtrér til PD/CC-licenser; download + sharp-resize; gem licens+attribution+beskrivelse (år/loco-nummer parses fra Commons-metadata hvor det findes — ellers NULL)
4. **Validering:** Zod-skemaer; rapport over huller (klasser med <20 assets, manglende specs) committes som `seed-report.md` — huller er acceptable, opdigtning er ikke
5. Scripts er **idempotente** (upsert på wikidataQid) så de kan genkøres for opdateringer

## 5. Performance-budget (60 FPS-kontrakt)
- Pan/zoom: kun `transform` på ét lag; ingen re-render af noder under gesture (d3-zoom → CSS-var/transform, Svelte opdaterer først ved settle)
- LOD-tærskler: k<0.5 æra-bånd · 0.5≤k<2 klasse-prikker+labels · k≥2 fulde noder; virtualisering uden for viewport+margin
- Billeder: `loading=lazy`, srcset (sharp-genererede 480/960/1920), LQIP-blur
- GSAP Flip til filter-morph (FLIP-teknik = ingen layout thrash); `prefers-reduced-motion` respekteres
- Mål: Lighthouse Performance ≥90, INP <200 ms, ingen long tasks >50 ms under zoom

## 6. Drift-integration (Ronnis standarder — UFRAVIGELIGE)
- Compose-blok: [docs/compose-snippet.yml](docs/compose-snippet.yml) → tilføjes `stacks/projects.yml` ved første deploy
- `DATABASE_URL` bygges af `TP_USER/TP_PW/TP_DB` fra `/hostrup/docker/.env` (ALLEREDE oprettet — DB og bruger findes i postgres)
- Udrulning KUN via `./deploy.sh` (Global Rule 5) — gates: lint, check, tests, build
- NPM: **STANDARD-mønsteret** (tom locations!) — læs config-proxy-skillens advarsel om klon-fælden
- Authelia: forslag **bypass** (offentligt museum-site) — kræver Ronnis eksplicitte OK (SOP)
- Kuma-monitor + Homepage-entry ("Mine Apps") via `/config-kuma` + `/sync-homepage`
- Repoet er **OFFENTLIGT** → aldrig secrets committes; kun `.env.example`
