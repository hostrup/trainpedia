# START-PROMPT — Luk hele backloggen (F9-data, F9-kvalitet, F11-UI)

> Kopiér alt under stregen som første besked til den implementerende agent.
> Skrevet 2026-07-08 (Claude Fable 5), godkendt arbejdsordre for at lukke ALLE
> åbne punkter i BACKLOG.md.

---

Du er implementerende agent på **Trainpedia** (tog.hostrup.org). Din mission:
**luk ALLE åbne punkter i [BACKLOG.md](../BACKLOG.md)** i den rækkefølge, der
står herunder. Du arbejder autonomt fase for fase — men stopper ved de hårde
stop-regler nederst.

## Læs FØRST, i denne rækkefølge

1. [AGENT-BRIEF.md](../AGENT-BRIEF.md) — arbejdsform, skills, deploy-SOP (ufravigelig)
2. [BACKLOG.md](../BACKLOG.md) — hvert åbent punkt har rodårsag, filhenvisninger og accept-kriterier; det er din opgaveliste
3. [docs/SPEC-F11-MUSEUM-UI.md](SPEC-F11-MUSEUM-UI.md) — det bærende UI-dokument. HELE dokumentet, før du rører F11. (DESIGN-F5-TUBEMAP.md er AFLØST — implementér aldrig efter det.)
4. [ARCHITECTURE.md](../ARCHITECTURE.md) — teknologivalg (fastlagt, afvig ikke)
5. Vaultet: `/hostrup/data/vault/server/beslutninger.md` + `projekter/trainpedia.md`

## Arbejdsordre (afhængighedsstyret — afvig kun med begrundelse i BACKLOG)

**Bølge 0 — straks (live-sitet bløder):**
F9.0a (én-linjes z-index-hotfix — sitet har en DØD placard-CTA indtil F11.3
erstatter forsiden) · F9.8 (a11y-warning) · F9.9 (scaffold-oprydning; OBS:
testtallet falder korrekt, demo-tests ryger).

**Bølge 1 — datafundamentet (alt i F11 hviler på det):**
F9.15 (valueNumeric/unit ved seed) → F9.2 (totalBuilt-backfill) → F11-D1
(BTC powerType) → F11-D2 (builder-facet) · F9.5 (æra-hygiejne) · F9.1
(fleet-seed generaliseres UD OVER Class 37 — det tungeste og vigtigste
datapunkt) · F9.3 (individ-søgning) · F9.4 (media-huller) · F9.7 (Class 97/6-narrativ).
Kør `04-reclassify` efter HVER seed-kørsel (husdisciplin).

**Bølge 2 — kvalitet som system:**
F9.14 (kvalitetsgate `08-validate.ts`, hard/soft-brud, deploy-gate) · F9.6
(seed-rapport genoplivet) · F9.17 (freshness-rapportering).

**Bølge 3 — F11-UI'et (spec'ens §11-faser, i rækkefølge):**
F11.1 (/browse: kontrolbjælke + Grid/Table-linser + URL-state + /classes-redirect)
→ F11.2 (Timeline-linsen) → F11.3 (The Great Hall + nav + **pensionér al
kort-kode**: TubeMap/Minimap/ZoneBands/dieselLayout/layout.ts-2D, /line-ruter)
→ F11.4 (Chart-linsen + /records) → F11.5 (/survivors + /compare + typeahead)
→ F11.6 (Exhibit/Loco-udvidelser + motion + e2e-suite). Undervejs, hvor det
falder naturligt: F9.16 (provenance-UI + /about), F10.7 (OG-metadata), F10.8
(Random class), F9.10 (e2e-flows — dækkes primært af F11.6).

**Bølge 4 — rest:** F9.11/L2 (kun notering/gentest — kræver ingen store greb).

## Ufravigelig disciplin (pr. punkt, ingen undtagelser)

- **Ét punkt = én atomar commit** (eller få, hvis punktet er stort). Efter
  hvert lukket punkt: sæt `[x]` i BACKLOG.md med 1-3 linjers bevis (hvad blev
  målt/set) i SAMME commit.
- **Verifikation = rigtige klik-flows**, ikke kun screenshots — F9.0a opstod,
  fordi et screenshot så rigtigt ud, mens knappen var død. Playwright skal
  KLIKKE og lande på mål-URL'en. `npm run check` + `npm run lint` + tests
  grønne før hvert commit.
- **Test ALDRIG mod localhost:3000 — det er Grafana!** Containeren publicerer
  ingen port. Brug `npm run dev` lokalt eller https://tog.hostrup.org efter deploy.
- **Deploy KUN via `./deploy.sh "besked"`** (Global Rule 5). Deploy efter hver
  afsluttet bølge (minimum), så Ronni kan følge med live.
- **Strict factuality:** intet felt udfyldes uden kilde — tomme felter og
  "Unknown" er korrekte svar. Afledninger (powerType) skal være deterministiske
  regler på kildede tal, dokumenteret i /about.
- Repoet er OFFENTLIGT — aldrig secrets. Media-assets bor i `data/media/`
  (volume, ikke git).

## Hårde stop — beslut ALDRIG selv

- **U1** (Authelia-politik), **U7** (damp/el-genudvidelse), **U9** (kuraterede
  fortællinger) er Ronnis. Rør dem ikke; notér gerne anbefaling i BACKLOG.
- Skema-ændringer: ADDITIVE felter er OK uden check-in (F6.1-præcedens —
  `valueNumeric`, `powerType` er godkendt via spec'en). Alt destruktivt
  (drop/rename/ændret semantik) kræver Ronnis OK først.
- Afviger virkeligheden fra et backlog-punkts præmis (fx et tal der har ændret
  sig), så opdatér punktet med det målte og fortsæt — gæt aldrig.

## Definition of Done for HELE opgaven

Alle åbne checkbokse i BACKLOG.md er enten `[x]` med bevis eller eksplicit
annoteret "afventer Ronni (U-beslutning)". `npm run check` 0 fejl/0 warnings,
kvalitetsgaten (F9.14) kører grønt, e2e-suiten klikker alle hovedflows,
sidste `./deploy.sh` er succesfuld, og du afslutter med en kort rapport til
Ronni: hvad der er lukket, hvad der afventer ham, og de 3 vigtigste ting du
så undervejs, som backloggen IKKE vidste.
