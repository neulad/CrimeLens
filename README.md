# CrimeLens

Map-first crime-awareness web app showing pickpocketing and petty-theft hotspots across 40 major European cities.

- **Browse** clustered crime incidents on a full-screen interactive map
- **Search** by city — the sidebar feed updates in real time as you navigate
- **Live feed** — new incidents reported by other users appear instantly via WebSocket
- **Report** incidents from the map (authenticated users)
- **Edit / delete** your own reports inline on the incident detail page

---

## Quick start

The entire stack runs in Docker — no local Bun or Postgres installation needed.

```bash
git clone git@github.com:neulad/CrimeLens.git
cd CrimeLens
docker compose up -d
docker compose exec app bun run db:seed   # first time only — loads 446 sample incidents
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
| Geocoding | Photon (Komoot) for city-search autocomplete (`place=city`); Nominatim for reverse-geocoding the report pin |
| Avatars | DiceBear `lorelei` (seeded from user ID, cached in `users.avatar_svg`) |
| Real-time | Bun native WebSocket — live incident broadcast to all connected clients |
| CSS | Custom `app.css` (Pico-style CSS variables) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Migrations | Plain `.sql` files + a small custom runner (`src/db/migrate.ts`) — no ORM |
| Auth | Passwordless email OTP (6-digit codes, bcrypt-hashed, HMAC-signed sessions) |
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

## Project structure

```
src/
  app.ts               Elysia entry point + WebSocket /ws/incidents
  env.ts               Typed env loader
  db/                  Raw postgres client + migration runner
  lib/                 Shared utilities (crypto, logger, ids, http helpers)
  modules/
    pages/             Root layout + map page (sidebar, filter bar)
    auth/              Email OTP auth (send code, verify, logout, session middleware)
    incidents/         Incident CRUD, bbox query, city feed, live broadcast
    profile/           Profile editing, contacts, email change
migrations/            Plain .sql migration files (applied in order by the runner)
seed/                  Seed script + incidents fixture (446 incidents, 40 cities)
public/
  css/app.css          All custom styles
  js/map.js            Map init, markers, city search, live WS feed
  img/                 Logo SVGs (logo.svg for dark bg, logo-dark.svg for light bg)
test/                  Integration test stubs
```

---

*University project — incident data is representative / partly synthetic.*
