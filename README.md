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

> **No setup needed to grade the app:** it runs out of the box with the built-in
> defaults. Sign-in codes are printed to the server logs (`docker compose logs app`),
> so you can log in without any email account. The `.env` below is only required
> to send real emails.

---

## Configuration & credentials (`.env`)

**All configuration and secrets live in one file: `.env` in the project root.**
It is gitignored and never committed. `docker-compose.yml` reads every value from
it, falling back to safe development defaults when a value is absent — which is
why the app runs without a `.env` at all.

To customise (or to enable real email), copy the template and edit it:

```bash
cp .env.example .env
```

| Variable | Default | What it's for |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `crimelens` | Database name / user / password (shared by the `db` and `app` containers). |
| `SESSION_SECRET` | dev placeholder | Secret that signs login session cookies. Set a real random value (`openssl rand -hex 32`) for anything public. |
| `PORT` | `3000` | Port the app listens on. |
| `MAIL_MODE` | `console` | `console` = print sign-in codes to the logs (no email needed). `gmail` = send real emails. |
| `GMAIL_FROM` | *(empty)* | The Gmail address that sends sign-in codes. **Required only when `MAIL_MODE=gmail`.** |
| `GMAIL_APP_PASSWORD` | *(empty)* | 16-character Google **App Password** (not the normal Gmail password). **Required only when `MAIL_MODE=gmail`.** |

> 🔒 **About the email password:** `GMAIL_APP_PASSWORD` is a real secret, so it is
> kept out of this repository (the committed `.env.example` only has a blank
> placeholder). The team's filled-in `.env` — including the Gmail credentials — is
> shared with the instructor separately. If it is not present, the app falls back
> to `console` mode (codes printed to the logs), so the sign-in flow works either way.

To enable real email, set in your `.env`:

```ini
MAIL_MODE=gmail
GMAIL_FROM=youraddress@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

---

## Stopping & rebuilding

```bash
docker compose down           # stop (data preserved in pg_data volume)
docker compose up -d --build  # rebuild after code changes
docker compose down -v        # stop and wipe all data
```

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

## Documentation

| File | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture: stack, container topology, request lifecycle, auth/SMTP, and data layer |

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
