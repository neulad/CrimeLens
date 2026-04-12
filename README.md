# CrimeLens

Map-first crime-awareness web app showing pickpocketing and petty-theft
hotspots in five European cities (Barcelona, Paris, Rome, Prague, Amsterdam).

> **Status:** Week 4 scaffold — hello-map boots, full feature build in Weeks 5–11.

---

## Quick start

```bash
# 1. Clone and install
git clone <repo-url>
cd CrimeLens
bun install

# 2. Copy env template and fill in values
cp .env.example .env

# 3. Start Postgres + PostGIS
docker compose up -d

# 4. Apply database migrations
bun run db:migrate

# 5. Start the dev server (hot-reload)
bun run dev
```

Open **http://localhost:3000** — you should see an empty map centred on Europe.

---

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Start dev server with hot-reload |
| `bun run start` | Start production server |
| `bun run db:up` | Start Postgres via Docker Compose |
| `bun run db:down` | Stop Postgres |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:generate` | Regenerate migration from schema changes |
| `bun run seed` | Wipe + reload incidents from `seed/incidents.json` |
| `bun run check` | Lint + format check (Biome) |
| `bun run format` | Auto-fix formatting |
| `bun test` | Run integration tests |

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun 1.x |
| Web framework | Elysia |
| Templating | @kitajs/html (server-side JSX) |
| Client interactivity | HTMX 2.x |
| Maps | Leaflet 1.9 + leaflet.markercluster |
| CSS | Pico.css + ~100 lines custom |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM / migrations | Drizzle ORM + Drizzle Kit |
| Auth | Hand-rolled magic-link (~200 LOC) |
| Email | Resend (prod) / console (dev) |
| Logging | pino |
| Linter / formatter | Biome |

Full stack justification: `docs/03-architecture.md`.

---

## Environment variables

See `.env.example` for all variables and their defaults.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | 32+ byte HMAC secret for session cookies |
| `BASE_URL` | no | Public URL, default `http://localhost:3000` |
| `PORT` | no | Server port, default `3000` |
| `MAIL_MODE` | no | `console` (default) or `resend` |
| `RESEND_API_KEY` | if resend | Resend API key |

---

## Documentation

| File | Contents |
|---|---|
| `docs/01-mvp-scope.md` | Product scope, persona, 12-week timeline |
| `docs/02-locked-features.md` | Locked feature list (L1–L5) |
| `docs/03-architecture.md` | Stack decisions, data model, API routes, build order |
| `docs/04-design.md` | UI/UX specification, design tokens, screen specs |
| `docs/team-project-plan.pdf` | University grading rubric |

---

## Project structure

```
src/
  app.ts                 Elysia entry point
  env.ts                 Typed env loader
  db/                    Drizzle client + schema
  lib/                   Shared utilities (crypto, logger, mail, ids)
  modules/
    pages/               Root layout + map page
    auth/                Magic-link auth
    incidents/           Crime incident CRUD + geospatial query
    lost-and-found/      Lost & found list + submission
  types/                 HTMX JSX type declarations
seed/                    Seed script + incidents fixture
drizzle/                 Generated migration SQL
public/                  Static assets (CSS, JS, images)
test/                    Integration tests (bun:test)
```

---

*University project — data is representative / partly synthetic. See About page for methodology and disclaimer.*
