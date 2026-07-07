# AGENT-BRIEF — Trainpedia (tog.hostrup.org)

Du er implementerende agent på **Trainpedia**. Arkitekturen er FASTLAGT i [ARCHITECTURE.md](ARCHITECTURE.md) — læs den først, og afvig ikke fra teknologivalgene. Opgaverne står prioriteret i [BACKLOG.md](BACKLOG.md).

## Din arbejdsform (Ronnis miljø — ufravigeligt)

1. **Skills:** Brug husets skills aktivt: `docker-hostrup` (infrastruktur-fakta), `deploy-service` (udrulnings-SOP), `config-proxy`/`config-auth`/`config-kuma`/`sync-homepage` (atomare deploy-trin), `review-project`/`fix-backlog` (kvalitetsloop efter hver fase), `brain` (varige beslutninger → vault).
2. **Vidensbasen:** Læs `/hostrup/data/vault/server/beslutninger.md` og `projekter/trainpedia.md` FØR du starter. Efter hver check-in-beslutning med Ronni: gem den via `/brain` (husk `agent:` + `model:` frontmatter).
3. **MCP-værktøjer:** `postgres-trainpedia` og `prisma-trainpedia` er klargjort i mcp_config. Brug dem til DB-arbejde frem for rå psql.
4. **Deploy:** KUN `./deploy.sh "besked"` (Global Rule 5). Repoet er **OFFENTLIGT** — commit ALDRIG secrets; `.env`-værdier bor i `/hostrup/docker/.env` (TP_USER/TP_PW/TP_DB findes allerede).
5. **Git:** Små, atomare commits per delopgave. BACKLOG.md holdes i sync (review-project/fix-backlog-kontrakten).

## CHECK-INS med Ronni (stop og afvent — beslut ALDRIG selv)

- **C1:** Datamodellen (prisma/schema.prisma-udkastet) præsenteres og godkendes FØR `prisma migrate` køres.
- **C2:** Design-tokens (farver, typografi-skala, spacing), komponentarkitektur og animations-mekanik for timeline-overgange fremlægges FØR UI-implementering.
- **C3:** Authelia-politik (arkitektens forslag: `bypass` — offentligt site) bekræftes FØR `/config-auth` køres.
- Seed-rapporten (`seed-report.md` — dækningsgrad, huller) fremlægges efter første fulde seed.

---

## DEN KREATIVE BRIEF (Ronnis originale krav — bevaret på engelsk)

Build an interactive digital chronicle of British railway history that runs in the browser. The application must feature state-of-the-art web visualization with fluid animations, high-end typography, and a deeply immersive, polished user interface.

### [THE TIMELINE]

The entry point is a zoomable, infinite-canvas timeline of British railway eras – node-based and organized by real operational dates.

- **Zoomed out:** the full historical sweep across comprehensive eras (Pre-Grouping, The Big Four, British Railways Steam Era, The Diesel & Electric Transition/Era, Sectorisation, Privatisation, Modern Post-Privatisation).
- **Zooming in:** a specific era reveals its prominent locomotive classes, positioned by the actual dates they entered service — e.g. the Diesel Era surfaces Class 37, Class 47, Class 55 (Deltic).
- **Interactivity:** clicking a locomotive class opens an elegant, high-fidelity informational card with a timeless, museum-placard quality: high-resolution blueprint/photo layout, build dates, technical specifications overview, and a concise narrative on why the class mattered.
- **Filtering:** by era, traction type (Steam, Diesel, Electric) and wheel arrangement. Filtering must be an interactive, beautiful moment with smooth, high-performance animations (GSAP-quality) that fluid-shift and layout-morph the content.

### [THE LOCOMOTIVE CHRONICLE & GALLERY]

From a card, transition into a dedicated immersive showcase per class (state-of-the-art 2D/pseudo-3D web presentation; no raw 3D):

- **The Showcase:** full-screen, media-rich interactive gallery — crisp imagery, historical photographs, technical diagrams/schematics.
- **Technical Deep-Dive:** expandable "Specification Grid": Manufacturer, Designer, Wheel Arrangement, Power Output, Tractive Effort, Top Speed, Total Built.
- **Inspect View:** clicking any asset opens a cinematic light-box: title, year of photograph, specific locomotive number pictured (e.g. 37001), and the historical context/anecdote behind the shot.

### [DATA — ALL FROM WIKIPEDIA & RELIABLE TRAIN DATABASES]

Every biography, spec, image and anecdote pulled via structured APIs or clean seeding scripts from Wikipedia and Wikimedia Commons (public-domain/CC images).

- **Strict Factuality:** do NOT generate specifications or historical facts with AI — if it isn't verified in the data source, it doesn't go in (fields stay empty/"unknown").
- **Scope:** all major operational eras, minimum 20 distinct classes per era, at least 20 media assets/schematics per class showcase — preferably all classes of all eras.

### [VISUAL QUALITY & FRONTEND STANDARD]

No generic dashboard template. Premium, tactile, fluid:

- **Layout & Typography:** crisp, high-end typography with clear hierarchical weight; clean scannable layout, subtle grid-based dividers, generous negative space.
- **Motion Design:** every interaction (card open, grid expand, era switch) feels tactile and intentional — fluid layout-morphing, micro-interactions on hover, soft shadows, subtle gradient glares on container borders.
- **Performance:** 60 FPS for all canvas zooming and DOM manipulation. UI layout and state transitions are a core feature.

---

## Miljø-integration (oversat til dette hus)

- Domæne: **tog.hostrup.org** → NPM proxy-host (STANDARD-mønster, forward `trainpedia:3000`) → Authelia (C3) → Kuma-monitor "Trainpedia" → Homepage-entry under "Mine Apps" (icon: `mdi-train`).
- Compose: blokken i [docs/compose-snippet.yml](docs/compose-snippet.yml) indsættes i `/hostrup/docker/stacks/projects.yml`; første start med `dcup`.
- Media-assets bor i `data/media/` (volume — IKKE i git; er dækket af server-backuppen via projects-data).
- Definition of Done per fase: tests grønne, `./deploy.sh` succesfuld, BACKLOG.md opdateret, beslutninger i vaultet.
