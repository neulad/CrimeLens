# CrimeLens — Local Setup Guide

Get the app running from a fresh clone in about 5 minutes.

---

## Prerequisites

| Tool | Min version | How to install |
|---|---|---|
| **Bun** | 1.1+ | `curl -fsSL https://bun.sh/install \| bash` |
| **Docker Desktop** | any | https://www.docker.com/products/docker-desktop |
| **git** | any | system package manager |

Verify your environment:

```bash
bun --version    # should be ≥ 1.1.0
docker --version # Docker Desktop must be running
git --version
```

---

## One-time setup

```bash
# 1. Clone the repo
git clone git@github.com:neulad/CrimeLens.git
cd CrimeLens

# 2. Install dependencies
bun install

# 3. Copy the env template and fill in SESSION_SECRET
cp .env.example .env
```

Open `.env` and set `SESSION_SECRET` to any 32+ character random string:

```bash
# Quick way to generate one:
openssl rand -hex 32
```

The other defaults work as-is for local development.

```bash
# 4. Start PostgreSQL + PostGIS
docker compose up -d

# 5. Apply database migrations
bun run db:migrate

# 6. Seed 446 sample incidents across 40 major European cities
bun run seed

# 7. Start the dev server (hot-reload on file changes)
bun run dev
```

Open **http://localhost:3000** — you should see a map with crime incident pins clustered across Europe.

---

## Environment variables

All variables live in `.env`. Only `DATABASE_URL` and `SESSION_SECRET` are required.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **yes** | `postgres://crimelens:crimelens@localhost:5432/crimelens` | Postgres connection string. Matches the Docker Compose defaults. |
| `SESSION_SECRET` | **yes** | *(none)* | 32+ random bytes used to HMAC-sign session cookies. Generate with `openssl rand -hex 32`. |
| `BASE_URL` | no | `http://localhost:3000` | Public URL of the app. Controls the `secure` flag on session cookies. |
| `PORT` | no | `3000` | HTTP port to listen on. |
| `MAIL_MODE` | no | `console` | `console` prints OTP sign-in codes to stdout (no email sent); `gmail` sends them via Gmail SMTP. |
| `GMAIL_FROM` | when `MAIL_MODE=gmail` | *(none)* | Gmail address that sends OTP codes. |
| `GMAIL_APP_PASSWORD` | when `MAIL_MODE=gmail` | *(none)* | 16-character Google App Password for that account. |

---

## Available commands

| Command | What it does |
|---|---|
| `bun run dev` | Start dev server with hot-reload (`--watch`) |
| `bun run start` | Start production server (no watch) |
| `bun run db:up` | Start the Docker Compose stack (Postgres + PostGIS) |
| `bun run db:down` | Stop the Docker Compose stack |
| `bun run db:migrate` | Apply all pending `.sql` migrations (custom runner) |
| `bun run seed` | Reload seeded incidents from `seed/incidents.json` |
| `bun run check` | Lint + format check (Biome) |
| `bun run format` | Auto-fix formatting issues |
| `bun test` | Run integration tests |

---

## Verification checklist

After `bun run dev`, walk through these manually:

- [ ] **Map loads** — http://localhost:3000 shows a map centred on Europe with pin clusters.
- [ ] **Zoom in** — zooming into a city (e.g. London or Paris) breaks clusters into individual pins.
- [ ] **City search** — typing a city in the sidebar search jumps the map there.
- [ ] **Pin click** — clicking a pin opens the detail panel on the right with crime type, date, and city.
- [ ] **Filter bar** — toggling a crime-type pill shows/hides those pins immediately.
- [ ] **Time filter** — selecting "Last 30 days" reduces visible pins.
- [ ] **Detail page** — clicking "View full details →" in the panel opens `/incidents/:id`.
- [ ] **Sign in (OTP)** — click Sign in → enter your email → check the code (printed to the server console in `MAIL_MODE=console`) → enter it → you're signed in (account auto-created on first sign-in).
- [ ] **Nav** — after sign-in, the sidebar shows your avatar, name, and a Sign out button.
- [ ] **Report incident** — while signed in, click "Report Incident" → click the map → the city auto-detects → fill the form → submit → new pin appears.
- [ ] **Edit / delete** — open one of your own reports → edit it inline, or delete it via the confirmation modal.

---

## Resetting the database

If you need to start fresh:

```bash
bun run db:down          # stop the container
docker volume rm crimelens-db   # delete the Postgres volume
bun run db:up            # start fresh
bun run db:migrate       # re-apply migrations
bun run seed             # re-seed incidents
```

---

## Troubleshooting

**`docker compose up -d` fails with "port already in use"**
Something is already listening on 5432. Either stop it or change the port in `docker-compose.yml` and update `DATABASE_URL` in `.env`.

**`bun run db:migrate` fails with "role does not exist"**
The container is still starting. Wait a few seconds and retry.

**Map shows no pins after seeding**
Check the browser console for fetch errors on `/api/incidents`. Make sure the server is running and `bun run seed` completed without errors.

**`SESSION_SECRET` error on startup**
You haven't set `SESSION_SECRET` in `.env`. Generate one with `openssl rand -hex 32` and paste it in.
