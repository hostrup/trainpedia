# SPEC F11 — "The Working Museum": data-først UI der reelt giver mening

> Skrevet 2026-07-08 (Claude Fable 5) på Ronnis direktiv: _"Jeg kan mærke at det
> er mig som holder fast i min tanke om at togene skulle visualiseres via et
> underground map. Men jeg kan se at det giver store problemer... I sidste ende
> er det jo netop data som det handler om. Sæt dig ind i rollen som en reel
> tognørd... data skal kunne grupperes og sorteres og visualiseres på flere
> måder — som alt sammen giver den her museumsoplevelse og nørde-tilgang."_
>
> Denne spec **afløser** DESIGN-F5-TUBEMAP.md som bærende UI-dokument.
> Metrokortet som PRIMÆR navigation pensioneres (begrundelse i §1). Det lyse
> TfL-designsprog (tokens, typografi, linjefarver) **bevares** — det er smukt,
> bygget og elsket; det er metaforen der fejlede, ikke æstetikken.
> Implementerende agenter: læs HELE dokumentet før F11.1 påbegyndes.

---

## 1. Hvorfor metrokortet fejlede — og hvad vi lærer af det

Beck-kortet virker for TfL, fordi metroens data ER en graf: stationer har ægte
naboskab, linjer har ægte forløb. Vores data er ikke en graf — det er et
**katalog**: 98 klasser med rige attributter (år, hestekræfter, regioner,
byggetal, individer). Da vi tvang kataloget ind i kort-metaforen, opstod
kaskaden af problemer, som F7/F8/F9.0 dokumenterer: håndplacerede koordinater
uden datamening, æra-ringe der lyver (Class 66 fra 1998 inde i "The Big
Four"-ringen), labelkollisioner, en zoom-model ingen forstod.

**Læren — spec'ens grundlov:** _Hver pixel skal kunne forsvares med en
database-række._ Ingen visning må love en orden, dataene ikke har. Det er
strict factuality udvidet fra indhold til FORM.

**Hvad en tognørd faktisk vil (personas der styrer hver flade):**

| Persona                | Spørgsmål                                                           | Flade der svarer             |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------- |
| **Spotteren**          | "Hvor er 37403 i dag? Hvad hed den før?"                            | Global søgning → `/loco/…`   |
| **Historikeren**       | "Hvad skete der i 1968? Hvilke klasser overlevede sektorerne?"      | Timeline-linsen, æra-rum     |
| **Ingeniør-nørden**    | "Type 4'ere sorteret efter trækkraft. Sulzer vs. English Electric." | Table-/Chart-linsen, Records |
| **Bevarings-turisten** | "Hvad kan jeg se i virkeligheden på Severn Valley?"                 | `/survivors`                 |
| **Museumsgæsten**      | "Vis mig noget smukt og fortæl en historie."                        | The Great Hall (forsiden)    |

---

## 2. Informationsarkitektur

```
/                    THE GREAT HALL   — hub: søgning, samlingsoverblik, featured, æra-rum
/browse              THE ROSTER      — ÉT datasæt, FIRE linser (Grid/Table/Timeline/Chart),
                                       fælles filter/gruppering/sortering båret i URL'en
/class/[qid]         THE EXHIBIT     — klassesiden (eksisterende, udvidet §6)
/loco/[number]       THE LOCOMOTIVE  — individsiden (eksisterende, udvidet §7)
/survivors           THE SHED        — bevarings-oversigt: hvor kan man se dem i dag
/records             THE RECORD BOOKS — leaderboards + statistik-fortællinger
/compare?ids=a,b,c   THE WORKSHOP    — 2–4 klasser side om side
/about               THE ARCHIVE NOTE — dataprincip, kilder, licenser (jf. F9.16)
```

**Header-navigation (erstatter Map/Explore):**
`Trainpedia · [Browse] [Timeline] [Records] [Survivors] · [søgefelt m. typeahead] · [navneskema-vælger]`
— "Timeline" er et deep-link til `/browse?lens=timeline` (IKKE en separat rute;
se §4 om linse-arkitekturen — det er samme side i en anden linse).

**Pensioneres:** `/` som metrokort, `/line/[slug]`-diagrammerne (allerede
forældreløse, jf. F10.3-analysen), `TubeMap.svelte`, `Minimap.svelte`,
`ZoneBands.svelte`, `dieselLayout.ts`, `layout.ts`'s 2D-mode. `StationIcon`s
visuelle DNA (tick/ring/terminus) genbruges i Timeline-linsen (§4.4).
MuseumPlacard genbruges som quick-view i Grid-linsen (§4.2). Beslutningen om
evt. at genopstå kortet som ren kunst-plakat ("a schematic fantasy") er
bevidst IKKE en del af F11 — det må aldrig igen være navigation.

---

## 3. Designsprog (uændret fundament, to tilføjelser)

Alle tokens fra DESIGN-F5-TUBEMAP.md §2 bevares: `--map-bg/-zone/-ink/-ink-soft`,
`--tfl-blue`, region-linjefarverne, `--line-color`-mekanikken pr. side,
Hammersmith One til wayfinding/tal, Fraunces til narrativ, Inter til UI/data
(tabular numerals i ALLE talkolonner). Lyst univers, ingen mørk toggle (U5).

**Tilføjelse 1 — æra-farveskala** (7 dæmpede museums-nuancer, én pr. æra,
afledt som `color-mix(in srgb, var(--tfl-blue) X%, var(--map-zone))` i faldende
mætning fra ældst til nyest — implementor vælger de præcise mix-procenter, så
nabo-æraer kan skelnes ved siden af hinanden). Bruges KUN som baggrundsbånd i
Timeline-linsen og som kant-accent på æra-rum-kort. Region-farverne forbliver
klassens identitetsfarve (`--line-color`) overalt.

**Tilføjelse 2 — "exhibit label"-komponenten:** museets gennemgående
mikro-mønster. En lille plakette (Hammersmith One-overskrift, Inter-metadata,
1px `--map-zone`-ramme, 2px `--line-color`-kant i venstre side) der bruges til
stat-tiles, leaderboard-rækker, gruppe-headere og hover-cards — så alle flader
taler samme visuelle sprog.

**Motion (GSAP, `prefers-reduced-motion` respekteres overalt):** linseskift =
FLIP-morph af de kort der overlever skiftet (Grid-kort → Table-række);
tal-tællere på stat-tiles (600 ms count-up ved første viewport-entry);
hover = 150 ms løft + skygge. Ingen animation må blokere interaktion.

---

## 4. `/browse` — The Roster: én samling, fire linser

### 4.1 Linse-arkitekturen (spec'ens kerne-idé)

Det Ronni kalder "overblik" opstår, når ÉT filtreret udvalg kan ses gennem
flere optikker uden at miste konteksten. Derfor: al tilstand bor i URL'en og
deles af alle fire linser:

```
/browse?lens=grid|table|timeline|chart
       &q=…                  fritekst (navn + alias, jf. F9.3)
       &era=pilot-scheme     æra-slug
       &region=WESTERN       BR-region
       &type=4               BTC-effekttype 1–5 | shunter  (§9 datakrav)
       &wheel=Co-Co          hjularrangement
       &builder=…            fabrikant (fra Specification "Manufacturer")
       &decade=1960          introduktions-årti
       &surviving=yes        mindst ét bevaret/kørende individ
       &group=none|era|region|type|builder|wheel|decade
       &sort=number|year|power|speed|te|built|name  (+ &dir=asc|desc)
       &sel=Q3306037         valgt klasse (quick-view åben)
```

Skifter man linse, bevares ALT andet. _"Sulzer Type 2'ere fra 1960'erne"_
forbliver udvalget, hvad enten man ser kort-grid, tal-tabel, levetids-tidslinje
eller effekt-scatterplot. Delbar URL = delbart overblik. SSR renderer den
fulde tilstand (ingen klient-only-filtre); tilbage-knappen virker pr.
tilstandsændring (`replaceState` ved slider-træk, `pushState` ved diskrete valg).

**Kontrolbjælken** (sticky under headeren, ens for alle linser):

```
[Lens: ▦ Grid | ☰ Table | ⟝ Timeline | ⣿ Chart]   [Group by: —]  [Sort: № ↑]
[era ▾] [region ▾] [type ▾] [wheel ▾] [builder ▾] [decade ▾] [☑ has survivors]
      → aktive filtre som fjernbare chips · "34 of 98 classes" · [Clear all]
```

Tælleren "N of M classes" er obligatorisk (arven fra F7's filter-dødvande:
brugeren skal ALTID kunne se hvorfor noget er tomt). Tomt resultat viser en
venlig tom-tilstand med de aktive chips og ét klik til at rydde.

**Gruppering** deler enhver linse i "museums-rum": en sektions-header pr.
gruppe (exhibit label med gruppenavn, antal, og gruppens nøgletal — fx
"Western Region · 14 classes · 2,512 built · 61 preserved"). I Timeline- og
Chart-linsen bliver gruppen til hhv. svimlebaner og farvekodning (§4.4/§4.5).

### 4.2 Grid-linsen (default — museumsgæsten)

Kort-grid, 4/3/2/1 kolonner efter viewport. Hvert kort (genbrug af
/classes-kortet, poleret): hero-foto (LQIP-blur → lazy), klassenavn efter
navneskema-præference, nickname i anførselstegn, tre datapunkter (introår,
hk, byggetal) samt region-farvestribe i toppen. Hover: løft + "Quick view".
Klik: åbner **MuseumPlacard som quick-view-drawer** (genbruges 1:1 fra i dag,
inkl. "Open full chronicle"-CTA — nu uden z-index-konflikten, da kortet er
væk). `&sel=`-parameteren gør quick-view SSR-delbar.

### 4.3 Table-linsen (ingeniør-nørden)

Tæt, sorterbar tabel — nørdens regneark med museets typografi:

| №   | Class | Nickname | Intro | Withdrawn | Type | Power (hp) | T.E. (lbf) | Speed (mph) | Built | Surviving | Region |
| --- | ----- | -------- | ----- | --------- | ---- | ---------- | ---------- | ----------- | ----- | --------- | ------ |

- № = TOPS-nummer udtrukket numerisk af klassenavnet ("Class 37" → 37;
  pre-TOPS-klasser uden nummer sorterer efter introår og viser "—").
- Alle talkolonner: tabular numerals, højrestillet, sorterbare (klik på
  header, tredje klik nulstiller). Manglende værdi = "—" og sorterer sidst
  (strict factuality: aldrig 0 for ukendt).
- Talværdier kommer fra `Specification.valueNumeric` (F9.15 — HÅRDT datakrav,
  §9). "Surviving" = optælling af individer med status PRESERVED/IN_SERVICE
  (kræver F9.1-fleets; viser "?" for klasser uden fleet-data, aldrig 0).
- Rækkeklik = quick-view (samme drawer som Grid). Region-kolonnen viser
  farve-chips. >100 rækker virtualiseres (kun synlige rækker i DOM).

### 4.4 Timeline-linsen (historikeren — den ÆRLIGE kronologi)

Det metrokortet aldrig kunne: en **levetids-tidslinje** (Gantt-stil), hvor
hver klasse er en vandret bar fra `serviceEntry` til `serviceExit` (åben
højre kant + pil for klasser stadig i drift). Tid er en LINEÆR x-akse
(1930→i dag) — ingen ordinal snyd; tomme år får lov at være tomme, for det
er sandheden.

```
        1930      1948        1968      1982   1994        i dag
        │ Big Four │ Pilot Scheme │ Transition │ Sect. │ Privatisation… │   ← æra-bånd (æra-farver)
Class 08  ▐████████████████████████████████████▶
Class 37       ▐███████████████████████████████▶
Class 55            ▐█████████████▌1982
…
```

- Bar i klassens region-farve; landmark-klasser får ring-markør ved
  introduktionspunktet, udfasede får terminus-tværstreg + årstal
  (StationIcon-ikonografiens DNA genbruges — nu datasandt).
- Æra-bånd som lodrette baggrundszoner MED årstalsgrænser i kanten — det
  æra-ringene løj om, viser båndene sandt, fordi x-aksen ER tid.
- Default-sortering: introår. Gruppering = svimlebaner med gruppelabel i
  venstre kant. Hover = exhibit-label-tooltip (navn, år-spænd, hk, byggetal).
  Klik = quick-view. Klik på et æra-bånd = filtrér til æraen.
- 98 rækker × én SVG-rect + labels er trivielt ydelsesmæssigt; vertikal
  scroll med sticky x-akse. Labels står ALTID vandret i venstre kolonne
  (ingen kollisionsgeometri — lærestregen fra F7/F8).

### 4.5 Chart-linsen (ingeniør-nørden, del 2)

Scatterplot-udforskeren (F7's scatterplot forfremmet til fuld linse):

- Akse-vælgere for x og y: Power (hp) · Tractive effort (lbf) · Top speed
  (mph) · Total built · Intro year · Service years (beregnet exit−entry).
- Boblestørrelse (valgfri): Total built. Farve: gruppérings-aksen (region
  default; æra-farver ved æra-gruppering).
- Kun klasser med BEGGE akseværdier plottes; en diskret note siger "Showing
  61 of 98 classes — 37 lack a sourced value for tractive effort" (ærlighed
  frem for udeladelse). Hover = exhibit-label. Klik = quick-view.
- Aksevalg bæres i URL (`&x=power&y=speed`), så fund kan deles.

### 4.6 Migrering

`/classes` 301-redirecter til `/browse` (query-parametre oversættes:
`?q=&era=` → samme navne). `/browse` overtager /classes' load-funktion som
udgangspunkt og udvider den med de nye facetter.

---

## 5. `/` — The Great Hall (forsiden)

Museets foyer: overblik, indgange og forundring — INGEN interaktiv leg der
kan lyve. Alt SSR, alt klikbart fører til en filtreret `/browse` eller en side.

Sektioner oppefra:

1. **Hero:** "Trainpedia — a working museum of British rail traction." +
   stort søgefelt (typeahead: klasser + individer + aliasser, §8) + to
   CTA'er: "Browse the collection" (`/browse`) og "Explore the timeline"
   (`/browse?lens=timeline`).
2. **The collection at a glance** — 4 stat-tiles (exhibit labels, count-up):
   klasser · individer sporet · bevarede · fotografier. Tallet er DB-live;
   hvert tile linker til den visning der beviser tallet (fx bevarede →
   `/survivors`). Under tilene én ærlig dæknings-linje: "Fleet histories
   traced for N of 98 classes — the archive grows weekly" (gør F9-arbejdet
   til en synlig styrke i stedet for et skjult hul).
3. **Featured exhibits** — 3–4 kuraterede landmark-klasser (isLandmark) som
   store kort med foto, narrativ-uddrag og "Visit exhibit →". Rotation pr.
   deploy, ikke pr. request (stabil, cachebar).
4. **The eras** — 6 æra-kort i vandret bånd (æra-farvekant, år-spænd,
   klasse-antal, én narrativ-sætning) → `/browse?era=…`. Tomme æraer vises
   IKKE (F9.5a).
5. **The record books** — 3 mini-leaderboards (Fastest · Most numerous ·
   Longest lived), top-3 hver, → `/records`.
6. **From the archive** — ét stort fotografi (roteres dagligt deterministisk
   af dato, ikke tilfældigt pr. request), med billedtekst, årstal,
   fotograf-attribution og licens synligt — museets "dagens genstand" og
   samtidig F9.16-attributionskravet gjort til en feature.
7. **Footer:** About/dataprincip, Wikipedia/Commons-kreditering, GitHub.

---

## 6. `/class/[qid]` — The Exhibit (udvidelser af eksisterende side)

Siden består (hero, narrativ, specs, galleri, lightbox, fleet-tabel) med:

- **Fleet-status-søjle** over fleet-tabellen (F10.1 uændret indarbejdet:
  stacked bar, klik-to-filter, paginering ved store flåder).
- **Lifespan-strip:** klassens egen tidslinje-bar (mini-udgave af §4.4) med
  æra-båndene bag — "hvor i historien står du" i ét blik. Klik → Timeline-
  linsen med klassen highlightet (`&sel=`).
- **Type-badge** (BTC Type 1–5/Shunter, §9) ved siden af region-badges;
  klik → `/browse?type=…`.
- **Records held:** hvis klassen er top-3 i en Records-kategori, vises
  plaketten ("③ Third most numerous diesel class") → `/records`.
- **Related exhibits** v2: samme Type ELLER samme fabrikant (i dag: æra+region)
  — det er sådan nørder faktisk associerer ("de andre Type 4'ere").
- Al provenance-visning følger F9.16 (kilde + revision + dato).

## 7. `/loco/[number]` — The Locomotive (udvidelser)

- Identitets-tidslinjen består (D6607 → 37307 → 37403).
- **Galleri-fallback** (F10.6 indarbejdet): klassens billeder med ærlig
  mærkning når individ-specifikke fotos mangler.
- **"Siblings"-navigation:** forrige/næste nummer i klassen (37402 ← 37403
  → 37404) — spotterens naturlige bladre-retning.
- Status + hjemsted får exhibit-label-behandling med link til `/survivors`
  filtreret på stedet.

---

## 8. Global søgning (typeahead — F10.2 præciseret)

Debounced (150 ms) dropdown under header-feltet, `GET /api/search?q=`:

- **Classes** (max 5): match på navn + alle aliasser; viser region-prik,
  år-spænd, match-kilden hvis alias ("English Electric Type 3 — builder name
  for Class 37").
- **Individuals** (max 5): match på `currentNumber`, `currentName` og ALLE
  historiske numre via `LocomotiveIdentity` (F9.3); viser status-badge og
  klasse. "37403", "D6607" og "Isle of Mull" rammer alle individet.
- Piletaster + Enter; Escape lukker; uden JS falder feltet tilbage til
  `/browse?q=`. Eksakt nummer-match (ét resultat) → direkte redirect til
  `/loco/…` ved Enter.

---

## 9. Datakrav (spec'ens hårde afhængigheder — mappes til F9)

| Krav                                                                     | Bruges af                              | Backlog |
| ------------------------------------------------------------------------ | -------------------------------------- | ------- |
| `Specification.valueNumeric` + `unit` udfyldt (hp/te/mph)                | Table, Chart, Records, Type            | F9.15   |
| `totalBuilt` backfilled                                                  | Table, Records, stat-tiles             | F9.2    |
| Fleet-data ud over Class 37                                              | Survivors, søjler, "Surviving"-kolonne | F9.1    |
| Individ-søgning                                                          | Typeahead                              | F9.3    |
| Tomme æraer skjult + æra-genplacering                                    | Timeline-bånd, æra-kort                | F9.5    |
| **NYT: `powerType`-felt** (BTC Type 1–5 / SHUNTER / null)                | Type-facet, badges, Related            | F11-D1  |
| **NYT: `builder`-facet** (normaliseret fra Specification "Manufacturer") | Builder-filter/gruppering              | F11-D2  |

**F11-D1, BTC-typen:** afledes deterministisk i `04-reclassify.ts` af den
KILDEDE hk-værdi efter British Transport Commissions historiske klassifikation
(Type 1 <1.000 hk · Type 2 1.000–1.499 · Type 3 1.500–1.999 · Type 4
2.000–2.999 · Type 5 ≥3.000; rangerlokomotiver = SHUNTER via hjularrangement/
maks-fart). Det er en KLASSIFIKATION af et kildet tal — ikke et opdigtet
faktum — og reglen dokumenteres i /about. Uden kildet hk-værdi: null → vises
aldrig.

**F11-D2, builder:** `Specification "Manufacturer"`-strenge normaliseres let
(trim, "British Rail Engineering Limited"="BREL"-alias-tabel i koden) til en
facet — rå streng bevares urørt på siden (kilde-loyalitet).

---

## 10. Responsivt (lukker U8), tilgængelighed, ydelse

- **Mobil er nu en naturlig borger** — det var kortets største offer. Grid
  1-kolonne; Table → kort-liste med de 4 vigtigste kolonner (№, navn, år,
  hk) og "flere tal"-udvidelse pr. række; Timeline scroller vandret med
  sticky venstre labels; Chart får fuld bredde + touch-tooltips;
  kontrolbjælken folder til et "Filters (3)"-bottom-sheet. INGEN "best on
  desktop"-undskyldning nødvendig.
- **A11y:** alle linser er semantisk HTML/SVG med rigtige roller (table ER
  `<table>`); quick-view-drawer får fokus-fælde (mønster fra InspectLightbox);
  farve er aldrig eneste informationsbærer (region-chips har tekst);
  WCAG AA-kontrast på alle exhibit labels; fuld tastaturvej gennem
  kontrolbjælken.
- **Ydelse:** SSR af default-linse < 100 KB HTML; virtualisering ved >100
  tabelrækker; timeline/chart er statisk SVG (ingen d3-zoom!) — 60
  FPS-budgettet bliver trivielt at holde, fordi vi holdt op med at bekæmpe
  geometrien. Lighthouse ≥ 90 fastholdes som gate.

---

## 11. Implementeringsfaser (→ BACKLOG F11)

| Fase  | Leverance                                                                                                | Afhænger af                |
| ----- | -------------------------------------------------------------------------------------------------------- | -------------------------- |
| F11.1 | `/browse` m. kontrolbjælke + Grid- & Table-linse; URL-state; /classes-redirect; quick-view-drawer        | F9.15, F9.2 (parallelt OK) |
| F11.2 | Timeline-linsen + æra-farver + F9.5-æra-hygiejne                                                         | F11.1                      |
| F11.3 | The Great Hall (ny forside) + nav-omlægning + **pensionering af TubeMap/line-ruter og al død kort-kode** | F11.1                      |
| F11.4 | Chart-linsen + `/records`                                                                                | F11.1, F9.15               |
| F11.5 | `/survivors` + `/compare` + typeahead                                                                    | F9.1, F9.3                 |
| F11.6 | Exhibit/Locomotive-udvidelser (§6/§7) + motion-polish + e2e-suite for alle linser                        | F11.1–F11.5                |

Hver fase afsluttes med Playwright-verifikation af RIGTIGE klik-flows (ikke
kun screenshots — lærestregen fra F9.0a), `npm run check`/tests grønne,
`./deploy.sh`, BACKLOG-opdatering.

## 12. Beslutninger truffet i denne spec (delegeret kreativitet)

1. Metrokortet pensioneres HELT som UI; designsproget består. (F9.0a/b,
   F9.12, F9.13 bortfalder dermed — F9.0a hot-fixes dog straks hvis F11.3
   ligger mere end få dage ude, da live-sitet ellers har en død CTA.)
2. Kronologi vises fremover kun lineært (Timeline-linsen) — aldrig ordinalt.
3. Klassens identitetsfarve forbliver REGIONEN (uændret `--line-color`);
   æraer får egen dæmpet baggrundsskala.
4. U8 (mobil) lukkes af §10: responsive linser, ingen separat mobilstrategi.
5. BTC Type-klassifikationen indføres som afledt, kildet felt (§9) — det er
   dén taksonomi, britiske dieselnørder faktisk taler i.
6. U9 (kuraterede fortællinger) forbliver ÅBEN — Records' "fortællinger" er
   rene data-rankings og kræver ingen fritekst.

---

## 13. Tilføjelse 2026-07-08 — Storytelling: "The Era Room Card" (F11.7/F11.8)

Ronnis ønske efter første F11-leverance: _"mere storytelling — fx når jeg
vælger The Big Four, så bør der komme en information et sted som fortæller om
denne era og hvad der kendetegner den."_ Museums-metaforen får dermed sit
manglende element: **rummets vægtekst**.

**Komponenten `EraRoomCard`** (exhibit-label-familien, §3): æra-navn + år-spænd
i Hammersmith One, kildeciteret narrativ i Fraunces (2-3 afsnit, sammenklappet
til første afsnit med "Read more"), nøgletals-linje (N klasser · N bygget ·
N bevaret — alle klikbare ind i /browse), kilde-linje efter F9.16-mønsteret
(Wikipedia-link + revision + dato). Æra-farven (§3, tilføjelse 1) som kant-accent.

**Placeringer (samme komponent, tre størrelser):**

1. **Fuld** — øverst i /browse-resultatområdet når `era=`-filteret er aktivt,
   uanset linse. Det er det direkte svar på Ronnis eksempel.
2. **Kompakt (én kendetegn-sætning)** — som rum-header når `group=era`, og på
   Great Hall-æra-kortene ("Enter the era →").
3. **Tooltip/panel** — ved klik på et æra-bånd i Timeline-linsen (klik
   filtrerer OG viser kortet, jf. §4.4).

**Data (strict factuality):** `Era.narrative` er i dag NULL for alle 6 æraer —
nyt seed-script `09-eras.ts` henter citerede uddrag fra Wikipedias
historie-artikler (fx "History of rail transport in Great Britain 1923–1947")
med sourceUrl + revision; additivt `sourceRevision`-felt på Era hvis det
mangler. Én "kendetegn"-sætning pr. æra udvælges som CITAT (første sætning
af uddragets ingress), aldrig AI-formuleret. **Forudsætning:** æra-strukturen
skal først være sand og ikke-overlappende (F11.8) — 67 klasser i ét rum kan
ikke fortælles.

Dette er IKKE U9 (kuraterede ture med fri overgangstekst) — U9 forbliver åben;
æra-narrativer er citeret kildetekst inden for strict factuality.

---

## 14. Tilføjelse 2026-07-08 (runde 3) — Samlingens dybde: navnekæden og "On film" (F12)

Ronnis direktiv: _"mere data og bedre data og flere billeder... mere
museumsviden og mere synlige facts, fx navne gennem historien fra start til
TOPS til i dag... og links til kendte YouTube-videoer."_ To nye UI-mønstre;
datakravene står i BACKLOG F12.

**"Names through history"-plaketten (F12.2)** — på /class/[qid] under heroen:
en vandret kronologisk kæde i exhibit-label-stil, ét led pr. navnefase med
år-spænd og skema-badge:

```
[D6700-serien]──────[Class 37]──────["Tractor"]      [English Electric Type 3]
 1960–1973 · BR      1973– · TOPS    entusiast-navn    byggerens betegnelse
```

Led med årstal lægges kronologisk; udaterede aliasser (kaldenavne,
byggernavne) står som løse plaketter efter kæden. Hvert led har kilde-tooltip
(F9.16-mønsteret). Pre-TOPS-serien aggregeres fra individernes
identitetskæder — den vises KUN hvis den er datagrundet. Klik på et led →
/browse?q=navnet (beviser at søgningen finder alle navne).

**"On film"-sektionen (F12.5)** — nederst på /class og /loco, over galleriet:
række af video-kort. Commons-videofiler afspilles lokalt (`<video>`-tag,
samme licens/attributions-pligt som fotos); YouTube-indhold vises som
thumbnail-kort med titel + kanal, der åbner i ny fane — ALDRIG embeddet
(ingen tracking, ingen CSP-udvidelse). Uden kuraterede links (U10) viser
sektionen ét ærligt "Watch on YouTube →"-søgelink bygget af klassens navn +
kaldenavn hhv. individ-nummeret. Sektionen skjules aldrig — søgelinket ER
fallback-indholdet.

**Billed-kvalitetsprincip (F12.4):** heroen på hver side skal være det BEDSTE
billede, ikke det første fundne — `sortIndex` kurateres af seed-scriptet
(opløsning + motiv-heuristik: hele lokomotiver frem for detaljer/skilte).
Galleriet grupperer: "This locomotive" (individ-match) → "The class" →
"Video". Alle nye kilder (Geograph/Flickr) hentes via deres Commons-spejle,
så licens- og attributions-pipelinen forbliver den eneste vej ind i
databasen.
