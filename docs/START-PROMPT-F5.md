# Start-prompt til implementerende agent — Fase F5+F6 (kopiér alt herunder)

Du er hovedagent/orkestrator på projektet **Trainpedia** i denne mappe (`/hostrup/docker/projects/trainpedia`). Sitet kører allerede på tog.hostrup.org (SvelteKit 2 / Svelte 5 / Prisma / Postgres, 488 klasser seedet). Din opgave er at gennemføre **Fase F5 ("The Tube Map") og F6 ("Opslagsværket")** som specificeret — designet er FASTLAGT og alle brugerbeslutninger er truffet. Du skal implementere loyalt, ikke gendesigne.

## Trin 0 — Kontekst (før du skriver én linje kode)

1. Læs i denne rækkefølge: `AGENT-BRIEF.md` → `docs/DESIGN-F5-TUBEMAP.md` (DIN VIGTIGSTE FIL — tokens, geometri-regler, komponentarkitektur, skema-udkast) → `BACKLOG.md` (Fase F5 + F6 + beslutningerne U3–U6) → `ARCHITECTURE.md` → `prisma/schema.prisma`.
2. Læs vaultet: `/hostrup/data/vault/projekter/trainpedia.md` (afsnittet "Beslutninger C4 (2026-07-07)").
3. Bekræft kort over for mig, at du har forstået: (a) kortet er et FIKTIVT Beck-diagram med ordinal stationsafstand — IKKE en lineær tidsakse; (b) linjefarverne er låst (Option A: Steam `#9B0058`, Diesel `#007D32`, Electric `#0098D8`, Other `#A0A5A9`); (c) HELE sitet migreres til det lyse TfL-univers — det mørke tema udgår; (d) `--line-color`-tokenen følger med ind på alle klasse-/individ-sider; (e) navne vises default som TOPS ("Class 37") med vælger og alias-søgning; (f) repoet er OFFENTLIGT — aldrig secrets i git.

## Rækkefølgen (afhængighedsstyret — følg den)

1. **F5.2** Skema-udvidelse (`ClassAlias` + `isLandmark`) og `05-aliases.ts`. ⛔ **CHECK-IN: præsentér den endelige prisma-diff for mig FØR `db push`** (udkastet i DESIGN-spec §6 er godkendt som udgangspunkt — men den endelige diff skal jeg se).
2. **F5.3** `src/lib/tubemap/layout.ts` — ren funktion uden Svelte-afhængigheder, unit-tests FØRST (geometri-reglerne i spec §3 ER testkravene).
3. **F5.4+F5.5** `TubeMap.svelte` m. LOD/zoom/minimap + stations-ikonografi. Erstatter `TimelineCanvas.svelte` (slet den, når TubeMap er verificeret).
4. **F5.6** Navneskema-vælger (cookie-persisteret, SSR-korrekt) + alias-søgning.
5. **F5.7** `LineDiagram.svelte` + route `/line/[traction]`.
6. **F5.8** Lys-migrering af `/classes` og `/class/[qid]` med `--line-color`-tematisering. Husk `app.css`: nye tokens jf. spec §2, Hammersmith One via Fontsource.
7. **F6.1–F6.4** Individ-niveau. ⛔ **CHECK-IN: prisma-diff for `Locomotive`/`LocomotiveIdentity` FØR `db push`.** Pilot: **Class 37-fleeten** (fleet-tabel fra Wikipedia-artiklen, omlitreringer D-numre → TOPS, fx D6607 → 37307 → 37403 "Isle of Mull"). Vis mig pilot-resultatet, før du ruller ud til øvrige diesel/el-klasser.
8. Undervejs: **F5.9/FA5** datakvalitet — fix Commons-fallback (må ALDRIG fritekst-søge "class"), kør `scripts/seed/04-reclassify.ts` efter ENHVER seed-kørsel (upserts overskriver traction/æra).

## Arbejdsregler (ufravigelige)

- **Designet er låst:** `docs/DESIGN-F5-TUBEMAP.md` afviges IKKE uden nyt check-in. Ingen glow, ingen roterede labels, ingen mørke flader på kortet. Ingen TfL-roundel og ikke Johnston-skriften (juridik — brug Hammersmith One).
- **BACKLOG.md er kontrakten:** arbejd punkt for punkt, flyt til «Løst» med commit-hash, nye fund = nye punkter. Små atomare commits.
- **Udrulning:** KUN `./deploy.sh "besked"` (Global Rule 5). Efter hvert epic: deploy + verificér på tog.hostrup.org med screenshot.
- **Kvalitet:** `npm run lint && npm run check && npm run test` grønne før hvert deploy (deploy.sh håndhæver det). Efter F5.8 og igen efter F6.4: kør `/review-project` og udbedr med `/fix-backlog`.
- **Viden:** Efter hvert check-in og væsentlig erfaring: gem i vaultet via `/brain` (frontmatter med `agent:` + `model:`).
- **Værktøjer:** MCP `postgres-trainpedia`/`prisma-trainpedia` til DB-arbejde. Lokal `.env` har `DATABASE_URL`.
- **Strict factuality:** Individ-data (status, navne, omlitreringer) KUN fra kilder med provenance (sourceUrl + revision). Kildeløse felter = NULL/"Unknown". Al media med licens + attribution.

## Subagent-strategi (parallelisér styret)

- **Kun DU** committer, kører migrations/db push, deployer og taler med mig.
- Egnede parallelspor: (a) `layout.ts` + unit-tests, (b) StationIcon/InterchangeCapsule/ZoneBands-komponenter, (c) fleet-parseren til F6.2, (d) research (read-only) på Wikipedia fleet-tabellers HTML-struktur. Snitfladen er typerne — dem definerer DU først.
- Uegnet: skema-ændringer, app.css/tokens, deploy — sekventielt og selv.
- Validér alt subagent-output ved at køre det, før du merger.

## Definition of Done (F5+F6)

tog.hostrup.org åbner på et lyst, ægte Beck-diagram: navngivne linjer i de fire låste farver med legende, æra-zonebånd, ringstationer/interchanges/endestationer, vandrette labels, 60 FPS, minimap. `/line/diesel` viser stribekortet. Søgning finder "Class 37", "D6700" og "Tractor" til samme side, som er District-grøn-tematiseret og viser The Fleet-sektionen med 37403 "Isle of Mull" inkl. omlitrerings-tidslinje. Navneskema-vælgeren virker med SSR. Det mørke tema er fjernet. `/review-project` uden Blocker/High. Beslutninger og erfaringer i vaultet.

**Start nu med Trin 0 og rapportér din forståelse — derefter F5.2.**
