# CrimeLens

Map-first crime-awareness web app showing pickpocketing and petty-theft hotspots in five European cities (Barcelona, Paris, Rome, Prague, Amsterdam).

Authenticated users can report new incidents directly from the map. Anyone can browse the Lost & Found board to post or search for lost items.

---

## Quick start

```bash
# 1. Clone and install
git clone git@github.com:neulad/CrimeLens.git
cd CrimeLens
bun install

# 2. Copy env template — set SESSION_SECRET to any 32+ random chars
cp .env.example .env

# 3. Start Postgres + PostGIS
docker compose up -d

# 4. Apply database migrations
bun run db:migrate

# 5. Load ~500 sample incidents
bun run seed

# 6. Start the dev server (hot-reload)
bun run dev
```

Open **http://localhost:3000** — you should see an interactive map with crime pin clusters across Europe.

Full setup walkthrough: [`docs/SETUP.md`](docs/SETUP.md)

---

## Screenshots

> *(To be added — map view, detail panel, report form, Lost & Found list)*

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
| Web framework | Elysia 1.x |
| Templating | @kitajs/html (server-side JSX) |
| Client interactivity | HTMX 2.x |
| Maps | Leaflet 1.9 + leaflet.markercluster |
| Geocoding | Nominatim (OpenStreetMap) — reverse geocode for report pins |
| CSS | Pico.css v2 + custom app.css |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM / migrations | Drizzle ORM + Drizzle Kit |
| Auth | Password-based (Bun.password bcrypt, HMAC-signed sessions) |
| Logging | pino |
| Linting / formatting | Biome |

Full justification: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres connection string (matches Docker Compose defaults) |
| `SESSION_SECRET` | **yes** | 32+ byte string used to HMAC-sign session cookies |
| `BASE_URL` | no | Public URL, default `http://localhost:3000` |
| `PORT` | no | Server port, default `3000` |

See `.env.example` for all variables.

---

## Documentation

| File | Contents |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Step-by-step local setup, env vars, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack decisions, data flow, auth and incident-report flows |
| [`docs/API.md`](docs/API.md) | All HTTP routes with request/response examples |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Schema tables, ERD, indexes |
| [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) | Product scope, persona, 12-week timeline |
| [`docs/02-locked-features.md`](docs/02-locked-features.md) | Locked feature list (L1–L5) |
| [`docs/team-project-plan.pdf`](docs/team-project-plan.pdf) | University grading rubric |

---

## Project structure

```
src/
  app.ts                 Elysia entry point
  env.ts                 Typed env loader
  db/                    Drizzle client + schema (4 tables)
  lib/                   Shared utilities (crypto, logger, ids)
  modules/
    pages/               Root layout + map page
    auth/                Password auth (register, login, logout, session middleware)
    incidents/           Crime incident CRUD + geospatial bbox query
    lost-and-found/      Lost & found list + submit + delete
seed/                    Seed script + incidents fixture (~500 incidents, 5 cities)
drizzle/                 Generated migration SQL
public/                  Static assets (CSS, JS, images)
test/                    Integration tests (bun:test)
docs/                    Architecture, API, setup, and data model docs
```

---

*University project — incident data is representative / partly synthetic. See the About page for methodology and disclaimer.*
