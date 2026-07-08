# START-PROMPT runde 2 — Storytelling, æra-struktur og resterende backlog

> Kopiér alt under stregen som første besked til den implementerende agent.
> Skrevet 2026-07-08 (Claude Fable 5) efter review af første F11-leverance
> (commit c1ca03c). Forgængeren START-PROMPT-F9-F11.md er udført og historisk.

---

Du er implementerende agent på **Trainpedia** (tog.hostrup.org). Første
F11-leverance er reviewet og godkendt — flot arbejde. Din mission nu: **luk de
resterende åbne punkter i [BACKLOG.md](../BACKLOG.md)**, med Ronnis nye
storytelling-feature som topprioritet.

## Læs FØRST

1. [BACKLOG.md](../BACKLOG.md) — især sektionen **"Review af F11-implementeringen
   (2026-07-08)"**: den indeholder dine vigtigste opgaver (F11.7–F11.10) med
   rodårsager og accept-kriterier.
2. [docs/SPEC-F11-MUSEUM-UI.md](SPEC-F11-MUSEUM-UI.md) **§13** — den komplette
   spec for storytelling-featuren "The Era Room Card" (+ §3/§4/§5 for kontekst).
3. [AGENT-BRIEF.md](../AGENT-BRIEF.md) + [ARCHITECTURE.md](../ARCHITECTURE.md) —
   arbejdsform og teknologivalg (ufravigelige).

## Arbejdsordre

**Bølge 1 — Storytelling (Ronnis eksplicitte ønske, tag den først):**

1. **F11.8** — genopret en sand æra-struktur FØRST: fordelingen er i dag
   0/16/0/67/4/11 med overlappende år-spænd (Pilot Scheme 1948–1968 er TOM,
   Transition dækker 1948–1981 med 67 klasser). Pilot Scheme & Modernisation
   1948–1967, Transition 1968–1981, genplacér efter introduktionsår, skjul
   tomme æraer, gør inddelingen genseed-sikker i `04-reclassify.ts`.
2. **F11.7** — "The Era Room Card" (spec §13): (a) `scripts/seed/09-eras.ts`
   seeder kildeciterede æra-narrativer fra Wikipedias historie-artikler
   (sourceUrl + revision; additivt `sourceRevision`-felt på Era er OK);
   (b) EraRoomCard-komponenten i tre størrelser: fuld (øverst på /browse når
   `era=` er aktiv — Ronnis eksempel: vælg "The Big Four" → fortællingen
   vises), kompakt (Great Hall-æra-kort + `group=era`-rum-headere), panel
   (klik på æra-bånd i Timeline-linsen). Strict factuality: CITEREDE uddrag,
   aldrig AI-formuleret tekst.

**Bølge 2 — kvalitet og troværdighed:**
**F9.14** (kvalitetsgate `08-validate.ts` — hard: licens-attribution,
fil-eksistens, tidslogik, dublet-identiteter; soft: resten; kør i deploy.sh og
som sidste seed-led; med 1.193 individer er behovet vokset) · **F9.16**
(provenance-UI + `/about` — hænger naturligt sammen med F11.7's kilde-linjer)
· **F9.4** (media-huller: 13 klasser med 0 billeder; hæv loft for landmarks).

**Bølge 3 — polish:**
**F11.9** (grid-kort/tabelrækker/timeline-barer skal være rigtige links med
href — a11y + SEO; verificeret i dag: 0 links i /browse-main) · **F11.10**
(e2e: quick-view→chronicle→/class, /loco-siden, typeahead-klik, era-room-card)
· **F10.7** (OG-metadata) · **F10.8** (Random class-knap) · **F9.17**
(freshness-rapport i kvalitetsgaten).

**Bølge 4 — rest:** F9.11/L2 (kun notering/gentest).

## Disciplin (skærpet efter reviewet af runde 1)

- **Backlog-bogføring:** når du lukker et punkt, redigér punktet SELV til
  `[x]` + 1-3 linjers bevis. Opret ALDRIG dublet-punkter (runde 1 efterlod
  "-ORIG"-kopier og teksterester — det er ryddet op; gentag ikke mønsteret).
  Slet den gamle tekst kun hvis den er erstattet af beviset.
- Ét punkt = én atomar commit; check/lint/tests grønne før hvert commit.
- **Klik-verifikation:** Playwright skal KLIKKE flows og lande på mål-URL'er.
  Test ALDRIG mod localhost:3000 (det er Grafana) — brug `npm run dev` eller
  tog.hostrup.org efter deploy.
- Deploy KUN via `./deploy.sh`; deploy minimum efter hver bølge.
- Strict factuality: æra-narrativer er CITATER med kilde+revision; tomme
  felter er korrekte svar. `04-reclassify` efter hver seed-kørsel.
- Repoet er OFFENTLIGT — aldrig secrets.

## Hårde stop — beslut ALDRIG selv

- **U1** (Authelia), **U7** (damp/el-genudvidelse), **U9** (kuraterede ture
  med fri overgangstekst — BEMÆRK: F11.7's citerede æra-narrativer er IKKE U9
  og må gerne bygges) er Ronnis beslutninger.
- Destruktive skema-ændringer kræver Ronnis OK; additive felter er OK.
- Afviger virkeligheden fra et punkts præmis: opdatér punktet med det målte
  og fortsæt — gæt aldrig.

## Definition of Done

Alle åbne checkbokse er `[x]` med bevis eller annoteret "afventer Ronni".
Kvalitetsgaten kører grønt i deploy.sh. `/browse?era=big-four` fortæller
Ronnis Big Four-historie med kildeciteret tekst, klik-verificeret med
Playwright. Afslut med kort rapport: lukket / afventer / de 3 vigtigste ting
du så, som backloggen ikke vidste.
