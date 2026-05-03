# CrimeLens — Architecture

**Version:** 0.1.0
**Last updated:** 2026-05-03
**Source of truth:** this file plus `src/db/schema.ts`

> This document describes what was **actually built**, not what was planned.
> The original engineering plan lives at `docs/03-architecture.md`.

---

## 1. System overview

CrimeLens is a single-process, server-rendered web application. One Bun process, one PostgreSQL database, no cache layer, no message queue, no background workers.

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│                                                                  │
│  ┌───────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │  HTMX 2.x     │  │  Pico.css  │  │  Leaflet 1.9 + cluster   │ │
│  │  (hx-get /    │  │  + app.css │  │  /public/js/map.js       │ │
│  │   hx-post)    │  │            │  │  (single JS island)      │ │
│  └──────┬────────┘  └────────────┘  └────────────┬─────────────┘ │
│         │                                        │               │
└─────────┼────────────────────────────────────────┼───────────────┘
          │ HTML pages + fragments                 │ JSON (bbox query)
          │                                        │ + Nominatim (geocode)
          ▼                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Elysia (Bun 1.x runtime)                       │
│                                                                  │
│  modules/pages       modules/auth       modules/incidents        │
│  GET /               GET /auth          GET  /incidents/:id      │
│  (map page)          GET /auth/register GET  /api/incidents      │
│                      POST /auth/login   POST /api/incidents      │
│                      POST /auth/logout                           │
│                      POST /auth/register                         │
│                                                                  │
│  modules/lost-and-found                                          │
│  GET  /lost-and-found                                            │
│  GET  /lost-and-found/new                                        │
│  POST /lost-and-found                                            │
│  POST /lost-and-found/:id/delete                                 │
│                                                                  │
│  lib/crypto   lib/logger   lib/ids   lib/mail (unused in prod)   │
│  ─────────────────────────────────────────────────────────────── │
│  Drizzle ORM + porsager/postgres driver                          │
└──────────────────────────┬───────────────────────────────────────┘
                           │ TCP / Postgres wire protocol
                           ▼
               ┌───────────────────────┐
               │  PostgreSQL 16        │
               │  + PostGIS 3.4        │
               │                       │
               │  users                │
               │  sessions             │
               │  incidents  (GiST)    │
               │  lost_items           │
               └───────────────────────┘
```

---

## 2. Stack decisions

### 2.1 Runtime — Bun 1.x
Runs TypeScript natively, includes a built-in test runner, bundler, and package manager. Sub-millisecond startup means `bun dev` and `bun test` are instant. No separate `tsc` / `ts-node` / `jest` to configure. Bun 1.x is production-stable.

### 2.2 Web framework — Elysia 1.x
Bun-first HTTP framework with end-to-end type inference and first-class TypeBox integration for request validation. The API surface is small enough to learn in an afternoon.

### 2.3 Language — TypeScript (strict)
`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Strict TS is the cheapest way to catch a class of bugs before they become bugs.

### 2.4 Templating — @kitajs/html (server-side JSX)
JSX components that compile to plain HTML strings at request time. No virtual DOM, no hydration, no frontend bundler. Templates live as `.tsx` files next to routes and produce raw HTML that HTMX can swap into the DOM.

### 2.5 Client interactivity — HTMX 2.x + vanilla JS
HTMX handles all standard interactions: filter bar changes, form submissions, partial page updates. The one exception is the Leaflet map, which is a single vanilla-JS island in `public/js/map.js`. No React, no Vue, no build step for the frontend.

### 2.6 Maps — Leaflet 1.9.x + leaflet.markercluster + OpenStreetMap
Leaflet is the battle-tested open-source mapping library. `leaflet.markercluster` handles pin clustering at low zoom. Tiles come from OpenStreetMap's public CDN. No API key required. Nominatim is used for reverse geocoding when a user drops a new incident pin (free, no key required).

### 2.7 CSS — Pico.css v2 + ~500 lines custom
Pico.css is a classless CSS framework that makes semantic HTML look good by default. All bespoke styling (nav, filter bar, map container, detail panel, badges, auth forms, lost-and-found cards, report-incident overlay) lives in `public/css/app.css`.

### 2.8 Database — PostgreSQL 16 + PostGIS 3.4
Postgres is the default; PostGIS adds first-class geospatial types. Bounding-box queries on ~500 seeded incidents use `ST_MakeEnvelope` + `ST_Intersects` against a GiST index — near-instant at this data volume.

### 2.9 DB driver — porsager/postgres
Tagged-template-literal driver. Supports Bun natively. `sql.array(types)` for typed arrays; `::timestamptz` casts for date params.

### 2.10 ORM / migrations — Drizzle ORM + Drizzle Kit
SQL-first, type-safe query builder. Schema in `src/db/schema.ts` is the single source of truth. `drizzle-kit generate` diffs the schema and writes SQL migrations. `drizzle-kit migrate` applies them.

### 2.11 Validation — TypeBox (via Elysia's `t`)
Request bodies, query params, and route params are validated at the route boundary. No extra dependency — TypeBox ships with Elysia.

### 2.12 Auth — password auth with bcrypt (Bun.password)
Email + first name + last name + password. `Bun.password.hash(pw, { algorithm: 'bcrypt', cost: 12 })` for registration; `Bun.password.verify(pw, hash)` for login. No external email service required. Sessions are stored in Postgres, identified by a UUIDv7 session ID that is HMAC-SHA256–signed before being written to a cookie.

> **Note:** The original plan used magic-link email auth via Resend. This was replaced with password auth because Resend requires a verified custom domain on the free tier. The `MAIL_MODE` and `RESEND_API_KEY` env vars remain in `.env.example` as stubs but are not used for auth.

### 2.13 Session cookie — HMAC-signed, HttpOnly
Cookie format: `session=<uuidv7>.<hmac-sha256-hex>`. The server verifies the HMAC before touching the database. `HttpOnly; SameSite=Lax; Max-Age=2592000` (30 days).

### 2.14 Logging — pino
Structured JSON logs to stdout. `pino-pretty` for human-readable output in local dev.

### 2.15 Testing — bun:test
Bun's built-in test runner. Route-level integration tests in `test/`. No extra dependency.

### 2.16 Linting / formatting — Biome
Single tool for both lint and format. Faster than Prettier + ESLint. Configured in `biome.json`.

---

## 3. Folder structure (actual)

```
CrimeLens/
├─ .env.example
├─ .gitignore
├─ CLAUDE.md
├─ README.md
├─ biome.json
├─ bun.lock
├─ docker-compose.yml
├─ drizzle.config.ts
├─ package.json
├─ tsconfig.json
│
├─ docs/
│  ├─ ARCHITECTURE.md       ← this file
│  ├─ API.md                ← all HTTP routes with examples
│  ├─ DATA-MODEL.md         ← schema tables + ERD
│  ├─ SETUP.md              ← step-by-step local setup
│  ├─ 01-mvp-scope.md
│  ├─ 02-locked-features.md
│  ├─ 03-architecture.md    ← original planning doc (read-only)
│  ├─ 04-design.md
│  ├─ crimelens-idea.md
│  └─ team-project-plan.pdf
│
├─ drizzle/
│  ├─ 0000_init.sql         ← creates extensions, tables, GiST indexes
│  ├─ 0001_password_auth.sql ← adds first_name, last_name, password_hash; drops magic_links
│  └─ meta/
│
├─ public/
│  ├─ css/
│  │  └─ app.css            ← all custom styles (~500 lines)
│  ├─ js/
│  │  └─ map.js             ← Leaflet island: fetch, cluster, pin, report mode
│  └─ img/
│     └─ favicon.svg
│
├─ seed/
│  ├─ incidents.json        ← ~500 seeded incidents, 5 cities
│  └─ run.ts               ← wipe + reload script
│
├─ src/
│  ├─ app.ts               ← Elysia entry point, plugin registration, listen()
│  ├─ env.ts               ← typed env loader
│  │
│  ├─ db/
│  │  ├─ client.ts         ← postgres + Drizzle setup
│  │  └─ schema.ts         ← all tables (users, sessions, incidents, lost_items)
│  │
│  ├─ lib/
│  │  ├─ crypto.ts         ← token gen, sha256, HMAC sign/verify
│  │  ├─ ids.ts            ← uuidv7
│  │  ├─ logger.ts         ← pino instance
│  │  └─ mail.ts           ← stub (unused in current auth flow)
│  │
│  └─ modules/
│     ├─ auth/
│     │  ├─ middleware.ts  ← loadUser(), SESSION_COOKIE
│     │  ├─ routes.ts      ← GET/POST /auth/*, /auth/register
│     │  ├─ service.ts     ← register(), login(), logout()
│     │  └─ views.tsx      ← LoginPage, RegisterPage, AuthErrorPage
│     │
│     ├─ incidents/
│     │  ├─ queries.ts     ← getIncidentById, getBboxIncidents, createIncident
│     │  ├─ routes.ts      ← GET /incidents/:id, GET/POST /api/incidents
│     │  ├─ service.ts     ← listByBbox (filter + time-window logic)
│     │  └─ views.tsx      ← IncidentDetailPage, IncidentNotFoundPage
│     │
│     ├─ lost-and-found/
│     │  ├─ routes.ts      ← GET/POST /lost-and-found, POST /lost-and-found/:id/delete
│     │  ├─ service.ts     ← listItems, createItem, deleteItem
│     │  └─ views.tsx      ← LostFoundListPage, LostFoundNewPage, LostFoundUnauthorizedPage
│     │
│     └─ pages/
│        ├─ layout.tsx     ← Layout, Nav, MapPage, InnerPage components
│        └─ routes.ts      ← GET /
│
└─ test/
   └─ auth.test.ts
```

---

## 4. Auth flow (password-based)

```
  Register
  ─────────────────────────────────────────
  POST /auth/register
    body: { email, firstName, lastName, password }
    → Bun.password.hash(password, bcrypt, cost 12)
    → INSERT INTO users
    → INSERT INTO sessions
    → set HMAC-signed cookie
    → redirect to /

  Login
  ─────────────────────────────────────────
  POST /auth/login
    body: { email, password }
    → SELECT user WHERE email = $email
    → Bun.password.verify(password, passwordHash)
    → INSERT INTO sessions
    → set HMAC-signed cookie
    → redirect to /

  Per-request auth
  ─────────────────────────────────────────
  cookie: session=<id>.<hmac>
    → verify HMAC signature
    → SELECT sessions JOIN users WHERE id = $id AND expires_at > now()
    → loadUser() returns { userId, email, firstName, lastName, displayName }
    → anonymous if session missing/invalid/expired

  Logout
  ─────────────────────────────────────────
  POST /auth/logout
    → DELETE FROM sessions WHERE id = $sessionId
    → clear cookie
    → redirect to /
```

---

## 5. Incident report flow (map → pin → form → POST)

```
  1. Authenticated user clicks "📍 Report incident" button
     → map enters crosshair cursor mode

  2. User clicks a location on the map
     → Leaflet fires click event with { lat, lng }
     → temp red marker dropped at click position
     → Nominatim reverse geocode called:
        GET https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json
        → extracts city / town / village name
     → report form shown in detail panel with auto-filled city

  3. User fills in crime type, date, description → submits

  4. POST /api/incidents { lat, lng, crimeType, city, occurredAt, description }
     → server validates, requires session
     → INSERT INTO incidents with ST_MakePoint(lng, lat)
     → returns { id }

  5. map.js reloads markers (loadIncidents())
     → success state shown in panel with link to /incidents/:id
```

---

## 6. Data flow — map viewport query

```
  Browser: map moves or filter changes
    ↓
  GET /api/incidents?bbox=W,S,E,N&types=pickpocketing,bag_snatching&since=30d
    ↓
  service.ts: listByBbox()
    ↓
  queries.ts: getBboxIncidents({ west, south, east, north, types, since, limit })
    ↓
  SQL:
    SELECT id, crime_type, occurred_at, city, description, source,
           ST_Y(location) AS lat, ST_X(location) AS lng
    FROM incidents
    WHERE ST_Intersects(location, ST_MakeEnvelope($W,$S,$E,$N, 4326))
      AND crime_type = ANY($types)     -- omitted if all types selected
      AND occurred_at >= $since
    ORDER BY occurred_at DESC
    LIMIT 500
    ↓
  Response: { items: [...] }
    ↓
  map.js: renderMarkers(items) → L.markerClusterGroup
```

---

## 7. Decisions not made / deferred

- **Deployment.** Local-first. Fly.io / Railway are viable targets. Not in scope for this build.
- **Tile provider in production.** OSM's CDN bans heavy usage. Switch to Maptiler free tier if deploying.
- **CI.** No GitHub Actions workflow yet. `bun run check && bun test` is the local gate.
- **Backup / restore.** Out of scope.
- **Rate limiting.** `/auth/login` and `/auth/register` are not rate-limited. A production deployment should add in-memory or Redis rate limiting.
