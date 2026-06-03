# CrimeLens

Map-first crime-awareness web app showing pickpocketing and petty-theft hotspots in five European cities (Barcelona, Paris, Rome, Prague, Amsterdam).

Authenticated users can report new incidents directly from the map. Anyone can browse the Lost & Found board to post or search for lost items.

---

## Quick start

The entire stack runs in Docker — no local Bun or Postgres installation needed.

```bash
# 1. Clone
git clone git@github.com:neulad/CrimeLens.git
cd CrimeLens

# 2. Start everything (builds app image on first run)
docker compose up -d

# 3. Load ~500 sample incidents (first time only)
docker compose exec app bun run db:seed
```

Open **http://localhost:3000** — you should see an interactive map with crime pin clusters across Europe.

> **Subsequent runs:** just `docker compose up -d`. Migrations run automatically on startup.

---

## Stopping & rebuilding

```bash
docker compose down           # stop containers (data is preserved in pg_data volume)
docker compose up -d --build  # rebuild app image after code changes
docker compose down -v        # stop and wipe all data (fresh start)
```

---

## Local development (without Docker)

If you prefer to run Bun directly:

```bash
# Prerequisites: Bun 1.x installed, Postgres+PostGIS running locally

bun install
cp .env.example .env          # fill in DATABASE_URL and SESSION_SECRET

bun run db:migrate            # apply migrations
bun run db:seed               # load sample data
bun run dev                   # hot-reload dev server
```

---

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Start dev server with hot-reload |
| `bun run start` | Start production server |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Load sample incidents from `seed/incidents.json` |
| `bun run db:generate` | Regenerate migration from schema changes |
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
| Containerisation | Docker + Docker Compose |
| Logging | pino |
| Linting / formatting | Biome |

Full justification: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Environment variables

All env vars are baked into `docker-compose.yml` for local development. When running outside Docker, copy `.env.example` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres connection string |
| `SESSION_SECRET` | **yes** | 32+ byte string used to HMAC-sign session cookies |
| `BASE_URL` | no | Public URL, default `http://localhost:3000` |
| `PORT` | no | Server port, default `3000` |

---

## Documentation

| File | Contents |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Step-by-step local setup, env vars, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack decisions, data flow, auth and incident-report flows |
| [`docs/API.md`](docs/API.md) | All HTTP routes with request/response examples |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Schema tables, ERD, indexes |
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
Dockerfile               App container (oven/bun:1-alpine)
docker-compose.yml       Full stack: app + Postgres/PostGIS
```

---

*University project — incident data is representative / partly synthetic. See the About page for methodology and disclaimer.*
