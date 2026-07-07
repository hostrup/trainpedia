# DESIGN-SPEC F5/F6 — "The Tube Map" & "Opslagsværket"

> C4-checkin-materiale, fremlagt for Ronni 2026-07-07. Moodboard: se C4-artifact
> (chat) — kortprøve, palet-options, ikonografi og tema-mocks.
> Status for beslutninger står i BACKLOG.md under "Kræver brugerbeslutning".
> Implementerende agenter: læs denne fil FØR F5.2+ påbegyndes, og afvig ikke
> fra tokens/geometri-reglerne uden nyt checkin.

## 1. Designprincip

Kortet er et **diagram, ikke et landkort** (Beck 1931): vi opgiver lineær
tidsskala, som Beck opgav geografi. Stationer (lokomotivklasser) placeres med
**jævn ordinal afstand i kronologisk rækkefølge** langs deres linje. Æra-zoner
i baggrunden bærer tidsdimensionen. Bekræftet af Ronni 2026-07-07.

- **Linje** = traktionsform (Steam / Diesel / Electric / Experimental)
- **Station** = lokomotivklasse; **ringstation** = landmark-klasse
- **Interchange** (dobbeltring m. kapsel) = bi-mode/electro-diesel
- **Endestation** (tyk tværbar + årstal) = udfasning (fx Steam 1968)
- **Zone-bånd** = de 7 æraer, alternerende `--map-bg`/`--map-zone`

## 2. Tokens

```css
/* Kort-arket (lyst univers) */
--map-bg: #ffffff; /* kortbaggrund */
--map-zone: #f4f4f4; /* æra-zonebånd, hver anden */
--map-ink: #1c1c1e; /* stationsnavne, ringe, brødtekst */
--map-ink-soft: #6b6e73; /* årstal, sekundær tekst */
--tfl-blue: #0019a8; /* UI-krom: header, links, primære knapper */

/* Linjefarver — U4 BESLUTTET 2026-07-07: Option A */
--line-steam: #9b0058; /* Metropolitan */
--line-diesel: #007d32; /* District */
--line-electric: #0098d8; /* Victoria */
--line-other: #a0a5a9; /* Jubilee — Experimental Line */

/* Tema-mekanikken (F5.8, krav fra Ronni): */
--line-color: /* sættes pr. side/komponent ud fra traction */;
```

- `--line-color` sættes via `style="--line-color: var(--line-diesel)"` (eller
  data-attribut) på rodelementet af klasse-/individ-sider. ALLE accenter
  (hero-bånd, badges, links, spec-kanter, status-farver) refererer KUN
  `--line-color` — aldrig traktionsfarver direkte. Afdæmpede flader laves med
  `color-mix(in srgb, var(--line-color) 8%, white)`.
- Typografi: **Hammersmith One** (Fontsource, Johnston-homage — juridisk OK)
  til kort, stationsnavne, overskrifter, linjenavne. **Inter Variable**
  fortsætter som brødtekst/UI. Ingen TfL-roundel, ingen Johnston (beskyttet).
- Ingen glow/skygge-filtre på kortet. Flade farver på hvidt, som originalen.

## 3. Geometri-regler (F5.3 layoutmotor)

> **AMENDMENT 2026-07-07 (samme dag, F6-session):** Ronni så det deployede kort og
> vurderede at rene, ubrudte vandrette linjer læser som et "swim lane"-diagram, ikke
> et metrokort — kravet er eksplicit at kortet på en almindelig 4K-skærm i Chrome skal
> ligne et Underground-kort i STILEN. Regel 1 er derfor opdateret: hver linje har et
> **bånd** (ikke længere ét fast y), og bugter sig med 45°-knæk ved æra-skift — se
> "Meander" nedenfor. Reglen om kun 0°/45°-knæk (regel 2) står ved magt og er nu det,
> der reelt bruges, ikke kun en urealiseret constraint.

1. Hver linje har et **vandret hovedbånd** (fast basis-y pr. linje, fast indbyrdes
   afstand ≥ 80px). Rækkefølge top→bund: Steam, Diesel, Electric, Experimental.
   **Meander:** linjen skifter niveau (±1 trin × 20px, mønster `[0,1,0,-1]` der
   cykler) hver gang den, i kronologisk rækkefølge, krydser en æra-grænse. Skiftet
   tegnes som fladt spor → 45°-diagonal → fladt spor (aldrig en ren lodret linje).
   Stationens faktiske y følger dens niveau, så tick/ring sidder præcis på det
   bugtede spor. Interchange-kapsler forbliver forbundet til nabolinjens BASIS-y
   (ikke dens niveau), da to uafhængige meandre ellers ikke kan forbindes meningsfuldt.
2. Kun **0°/45°-knæk** med fast hjørneradius (linjebredde × 1,5).
   Linjebredde 7px (kort), 5px (linjediagram). Hjørner afrundes med `stroke-linejoin:
round` — matcher radius-kravet uden manuel bue-geometri.
3. **Ordinal x-placering**: stationerne på en linje sorteres efter introår og
   placeres med fast interval (STATION_GAP ≈ 140px ved zoom 1). Æra-grænser
   beregnes EFTER placering: zonens x-udstrækning = fra første til sidste
   station med intro i æraen (+ margin), så zonerne følger kortet, ikke tiden.
4. **Stationslabels er ALTID vandrette**. Kollisionsregel: labels alternerer
   over/under linjen; ved fortsat kollision forskydes x let eller skjules
   laveste LOD-prioritet. Ingen roterede labels.
5. Interchange-kapsel (bi-mode) tegnes MELLEM de to relevante linjer på
   stationens x-position: hvid kapsel, `--map-ink`-kant 3px, ring på hver linje.
6. Landmark-ring: r=8, hvid fyld, `--map-ink`-kant 3,5px. Tick: 12px
   perpendikulær streg i linjefarven. Endestation: bar 8×28px + årstalslabel.

## 4. LOD / semantic zoom (F5.4)

| Zoom   | Viser                                                               |
| ------ | ------------------------------------------------------------------- |
| Ud     | Linjenettet, zonenavne, KUN landmark-ringe + interchanges m. labels |
| Mellem | + alle ticks og stationsnavne (kollisionshåndteret)                 |
| Ind    | + årstal under navne, hover-kort med thumbnail                      |

Viewport-virtualisering og 60 FPS-kravet fra F2.2 genbruges. Minimap i
hjørnet. `prefers-reduced-motion` respekteres som hidtil.

## 5. Komponentarkitektur

```
src/lib/tubemap/
  layout.ts        — ren funktion: klasser+linjer → {stations, paths, zones}
                     (INGEN Svelte-afhængighed; unit-testes isoleret)
  TubeMap.svelte   — SVG-rendering + d3-zoom + LOD (erstatter TimelineCanvas)
  StationIcon.svelte, InterchangeCapsule.svelte, ZoneBands.svelte, Minimap.svelte
  LineDiagram.svelte — F5.7: vandret stribekort, genbruger layout.ts i 1D-mode
```

Routes: `/` = TubeMap (fuldt kort) · `/line/[traction]` = LineDiagram ·
`/classes`, `/class/[qid]`, `/loco/[number]` = lyse sider m. `--line-color`.

## 6. Skema-udkast (F5.2 + F6.1 — kræver C1-agtig godkendelse før db push)

```prisma
enum AliasScheme { TOPS PRE_TOPS BUILDER NICKNAME ORIGINAL }

model ClassAlias {
  id        Int             @id @default(autoincrement())
  class     LocomotiveClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  classId   Int
  alias     String          // "D6700", "English Electric Type 3", "Tractor"
  scheme    AliasScheme
  sourceUrl String?
  @@unique([classId, alias])
  @@index([alias])
}

enum LocoStatus { IN_SERVICE STORED PRESERVED SCRAPPED EXPORTED UNKNOWN }

model Locomotive {
  id            Int              @id @default(autoincrement())
  class         LocomotiveClass  @relation(fields: [classId], references: [id], onDelete: Cascade)
  classId       Int
  currentNumber String           // "37403"
  currentName   String?          // "Isle of Mull"
  nicknames     String[]         @default([])
  status        LocoStatus       @default(UNKNOWN)
  location      String?          // bevaringssted/operatør hvis kendt
  history       String?          // individ-narrativ (citeret, strict factuality)
  identities    LocomotiveIdentity[]
  sourceUrl     String?
  retrievedAt   DateTime?
  @@unique([classId, currentNumber])
  @@index([status])
}

/// Omlitrerings-/navnehistorik: D6607 -> 37307 -> 37403 "Isle of Mull"
model LocomotiveIdentity {
  id         Int        @id @default(autoincrement())
  loco       Locomotive @relation(fields: [locoId], references: [id], onDelete: Cascade)
  locoId     Int
  number     String
  name       String?
  fromYear   Int?
  toYear     Int?
  sortIndex  Int        @default(0)
  sourceUrl  String?
  @@index([number]) // søgning finder individet på ALLE historiske numre
}
```

Desuden på `LocomotiveClass`: `isLandmark Boolean @default(false)` (F5.5).

## 7. Rækkefølge for agenter

1. ~~Afvent U4/U5/U6~~ **BESLUTTET 2026-07-07** (se BACKLOG + vault):
   U4 = Option A · U5 = helt lyst univers (ingen mørk toggle) · U6 = diesel/el
   først, pilot = Class 37-fleeten. Intet er blokeret.
2. F5.2 skema + `05-aliases.ts` (skema-godkendelse hos Ronni først).
3. F5.3 `layout.ts` m. unit-tests (geometrireglerne ovenfor ER testkravene).
4. F5.4–F5.5 TubeMap.svelte, F5.6 navneskema-vælger (cookie + SSR).
5. F5.7 LineDiagram, F5.8 lys-migrering af /classes + /class/[qid].
6. F6.1–F6.4 individ-niveau; pilot: Class 37-fleeten (U6).
7. Hver fase: tests grønne, `./deploy.sh`, BACKLOG synk (husets SOP).
