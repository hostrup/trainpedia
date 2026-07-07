# 🚂 Trainpedia

Interaktiv digital krønike over britisk jernbanehistorie — zoombar æra-timeline, museums-placards og immersive lokomotiv-showcases. Kører på [tog.hostrup.org](https://tog.hostrup.org).

**Data:** Udelukkende Wikipedia/Wikidata/Wikimedia Commons med fuld provenance — ingen AI-genererede fakta.
**Stack:** SvelteKit 2 · Svelte 5 · PostgreSQL/Prisma · d3-zoom · GSAP (Flip) · selvhostede fonte.

| Dokument | Formål |
|----------|--------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Løsningsarkitektur og fastlagte teknologivalg |
| [AGENT-BRIEF.md](AGENT-BRIEF.md) | Brief til implementerende agent (kreativ brief + husets standarder + check-ins) |
| [BACKLOG.md](BACKLOG.md) | Faseopdelt implementeringsplan |
| [prisma/schema.prisma](prisma/schema.prisma) | Datamodel-udkast (check-in C1) |
| [scripts/seed/README.md](scripts/seed/README.md) | Seed-pipeline-spec (Wikidata/Wikipedia/Commons) |

## Lokal udvikling
```bash
npm install
cp .env.example .env   # udfyld DATABASE_URL (dev: 127.0.0.1:5432)
npx prisma migrate dev
npm run seed
npm run dev
```

## Udrulning
Kun via `./deploy.sh "besked"` (kvalitets-gates → git push → docker rebuild). Se compose-blok i [docs/compose-snippet.yml](docs/compose-snippet.yml).
