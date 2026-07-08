# START-PROMPT runde 3 — "Samlingen": mere data, bedre data, flere billeder

> Kopiér alt under stregen som første besked til den implementerende agent.
> Skrevet 2026-07-08 (Claude Fable 5) efter review af runde 2 (godkendt).

---

Du er implementerende agent på **Trainpedia** (tog.hostrup.org). Runde 2
(storytelling + kvalitetsgate) er reviewet og godkendt. Dette sprint handler
om SAMLINGEN: datakorrekthed, dybere museumsviden, langt flere billeder og
video — **Fase F12 i [BACKLOG.md](../BACKLOG.md)**.

## Læs FØRST

1. [BACKLOG.md](../BACKLOG.md) — Fase F12 (øverst) med rodårsager og
   accept-kriterier for F12.1–F12.6, plus reviewet af runde 2.
2. [docs/SPEC-F11-MUSEUM-UI.md](SPEC-F11-MUSEUM-UI.md) **§14** — UI-mønstrene
   for "Names through history"-plaketten og "On film"-sektionen.
3. [AGENT-BRIEF.md](../AGENT-BRIEF.md) + [ARCHITECTURE.md](../ARCHITECTURE.md).

## Arbejdsordre

**Bølge 1 — korrekthed før volumen (F12.1):** Reviewet fandt, at "New
Enterprise Trains" (Q139989800) — slettet i F7 som ukildet/spekulativ — er
GENOPSTÅET ved genkørsel (DB har 99 klasser). Byg QID-blocklisten
(genseed-sikker, håndhævet i 01-discover + hard error i 08-validate), slet
posten igen, fix de 3 dublet-identiteter i 06-fleet-parseren (rodårsag, ikke
symptom), og tilføj kryds-kilde-valideringen + de 10 kendte-facts-stikprøver
til gaten. Kør IKKE bred berigelse, før dette er grønt — ellers beriger du
snavs.

**Bølge 2 — mere museumsviden (F12.2 + F12.3):**
F12.2 "Names through history": additive `fromYear/toYear` på ClassAlias,
aggregér pre-TOPS-nummerserier fra identitetskæderne, byg plaketten på
/class/[qid] efter spec §14. F12.3: `NarrativeSection`-tabel (additiv) +
udvid 02-enrich med flere kildeciterede sektioner (Design & construction,
Operations, Withdrawal, Preservation) og flere spec-nøgler (Engine,
Transmission, Brakes, Train heating, Route availability…); individ-historier
fra Notes-kolonner + Wikidata-emner for bevarede maskiner. ALT er citater med
sourceUrl+revision — aldrig AI-formuleret tekst.

**Bølge 3 — billedjagten (F12.4):** Udvid media-seeden: Commons dybere
(fuldtekst, kategoritræ, INDIVID-numre så bevarede maskiner får egne fotos),
Geograph- og Flickr-materiale VIA deres Commons-spejle (licens-pipelinen
forbliver den eneste vej ind). Kun åbne licenser, attribution obligatorisk
(gaten håndhæver). Kuratér `sortIndex` så hero-billedet er det bedste, ikke
det første. Mål: median ≥8 assets/klasse, landmarks ≥25, de 14
0-billede-klasser endeligt afklaret. Respektér API-etikette (rate limits,
User-Agent) — det er store kørsler.

**Bølge 4 — video (F12.5a) + polish:** "On film"-sektionen på klasse- og
individsider: Commons-VIDEOFILER som `MediaKind.VIDEO` (additiv enum,
afspilles lokalt) + deterministisk "Watch on YouTube →"-søgelink som
fallback-indhold. F12.5b (kuraterede YouTube-links) AFVENTER U10-nøglen —
byg gerne `VideoLink`-tabellen og UI'et klar, men seed ikke uden nøgle.
Dertil: **F12.6** (og:image → absolut URL) og **F9.17** (freshness-rapport i
gaten — sidste åbne F9-punkt).

## Disciplin (indskærpet efter runde 2)

- **ATOMARE COMMITS — ét backlog-punkt = ét commit.** Runde 2 landede i ét
  mega-commit (aae5e4a); det gør review og rollback unødigt svært. Gentag
  ikke.
- Backlog-bogføring: redigér punktet selv til `[x]` + 1-3 linjers bevis i
  samme commit. Ingen dubletter, ingen efterladte tekstrester.
- Seed-kørsler: `04-reclassify` efter hver seed; `npm run validate` skal være
  GRØN før hvert deploy; store media-kørsler logges med før/efter-tal i
  DATA-QUALITY.md.
- Klik-verifikation med Playwright mod `npm run dev` eller tog.hostrup.org
  efter deploy — ALDRIG localhost:3000 (det er Grafana).
- Deploy KUN via `./deploy.sh`, minimum efter hver bølge.
- Strict factuality: kun kildede data; blocklisten er den eneste "mening" vi
  selv tilføjer, og den kræver begrundelse pr. post.
- Repoet er OFFENTLIGT — aldrig secrets; API-nøgler læses fra env.

## Hårde stop — beslut ALDRIG selv

- **U10** (YouTube/Flickr API-nøgler), **U1**, **U7**, **U9** er Ronnis.
  F12.5b og direkte Flickr-API venter på U10 — alt andet kan bygges nu.
- Destruktive skema-ændringer kræver Ronnis OK; additive er OK
  (NarrativeSection, VideoLink, fromYear/toYear, MediaKind.VIDEO er godkendt
  via spec/backlog).
- Afviger virkeligheden fra et punkts præmis: opdatér punktet med det målte
  og fortsæt — gæt aldrig.

## Definition of Done

F12.1–F12.6 (minus F12.5b hvis U10 udestår) + F9.17 er `[x]` med bevis.
DB har 98 klasser, 0 dublet-identiteter, kryds-kilde-sektion i
DATA-QUALITY.md. Class 37-siden viser navnekæden D6700→Class 37→"Tractor"
med kilder, ≥3 narrativ-sektioner, ≥10 spec-nøgler og en On film-sektion.
Median ≥8 billeder pr. klasse. Alle gates grønne, sidste `./deploy.sh`
succesfuld. Afslut med rapport: lukket / afventer / de 3 vigtigste ting du
så, som backloggen ikke vidste.
