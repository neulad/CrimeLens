# CrimeLens

Map-first crime-awareness web app showing pickpocketing and petty-theft hotspots in five European cities (Barcelona, Paris, Rome, Prague, Amsterdam).

- **Browse** clustered crime incidents on a full-screen interactive map
- **Search** by city — the sidebar feed updates in real time as you navigate
- **Live feed** — new incidents reported by other users appear instantly via WebSocket
- **Report** incidents from the map (authenticated users)
- **Lost & Found** board — post or search for lost items

---

## Quick start

The entire stack runs in Docker — no local Bun or Postgres installation needed.

```bash
git clone git@github.com:neulad/CrimeLens.git
cd CrimeLens
docker compose up -d
docker compose exec app bun run db:seed   # first time only — loads ~500 sample incidents
```

Open **http://localhost:3000**.

> **Subsequent runs:** just `docker compose up -d`. Migrations run automatically on startup.

---

## Stopping & rebuilding

```bash
docker compose down           # stop (data preserved in pg_data volume)
docker compose up -d --build  # rebuild after code changes
docker compose down -v        # stop and wipe all data
```

---

## Local development (without Docker)

```bash
# Prerequisites: Bun 1.x, Postgres + PostGIS running locally
bun install
cp .env.example .env   # fill in DATABASE_URL and SESSION_SECRET
bun run db:migrate
bun run db:seed
bun run dev
```

---

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Start dev server with hot-reload |
| `bun run start` | Start production server |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Load sample incidents |
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
| Maps | Leaflet 1.9 + leaflet.markercluster |
| Geocoding | Nominatim — city search autocomplete + reverse geocode on map pan |
| Avatars | DiceBear `lorelei` (seeded from user ID, no storage needed) |
| Real-time | Bun native WebSocket — live incident broadcast to all connected clients |
| CSS | Pico.css v2 + custom app.css |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| ORM / migrations | Drizzle ORM + Drizzle Kit |
| Auth | Password-based (Bun.password bcrypt, HMAC-signed sessions) |
| Containerisation | Docker + Docker Compose |
| Logging | pino |
| Linting / formatting | Biome |

---

## Environment variables

All env vars are baked into `docker-compose.yml` for local development. When running outside Docker:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres connection string |
| `SESSION_SECRET` | **yes** | 32+ byte string for HMAC-signed session cookies |
| `BASE_URL` | no | Public URL, default `http://localhost:3000` |
| `PORT` | no | Server port, default `3000` |

---

## Documentation

| File | Contents |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Local setup, env vars, troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack decisions, data flow, auth and incident flows |
| [`docs/API.md`](docs/API.md) | HTTP routes with request/response examples |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Schema, ERD, indexes |
| [`docs/team-project-plan.pdf`](docs/team-project-plan.pdf) | University grading rubric |

---

## Project structure

```
src/
  app.ts               Elysia entry point + WebSocket /ws/incidents
  env.ts               Typed env loader
  db/                  Drizzle client + schema
  lib/                 Shared utilities (crypto, logger, ids)
  modules/
    pages/             Root layout + map page (sidebar, filter bar)
    auth/              Password auth (register, login, logout, session middleware)
    incidents/         Incident CRUD, bbox query, city feed, live broadcast
    lost-and-found/    Lost & found list + submit + delete
seed/                  Seed script + incidents fixture (~500 incidents, 5 cities)
drizzle/               Migration SQL
public/
  css/app.css          All custom styles
  js/map.js            Map init, markers, city search, live WS feed
  img/                 Logo SVGs (logo.svg for dark bg, logo-dark.svg for light bg)
test/                  Integration tests
docs/                  Architecture, API, setup, data model docs
```

---

*University project — incident data is representative / partly synthetic.*
