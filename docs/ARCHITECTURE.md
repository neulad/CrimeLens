# CrimeLens — Architecture

**Version:** 0.1.0
**Last updated:** 2026-06-04
**Source of truth:** this file plus the SQL in `migrations/`

> This document describes what was **actually built**, not what was planned.
> The original engineering plan lives at `docs/03-architecture.md`.

---

## 1. System overview

CrimeLens is a single-process, server-rendered web application. One Bun process, one PostgreSQL database, no cache layer, no message queue, no background workers.

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser                                  │
│                                                                    │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │ Plain HTML      │  │  app.css   │  │  Leaflet 1.9 + cluster   │ │
│  │ forms + fetch() │  │ (custom)   │  │  /public/js/map.js       │ │
│  │ + vanilla JS    │  │            │  │  (single JS island)      │ │
│  └──────┬─────────┘  └────────────┘  └────────────┬─────────────┘ │
│         │                                         │                │
└─────────┼─────────────────────────────────────────┼────────────────┘
          │ server-rendered HTML                    │ JSON (bbox query)
          │ + JSON for /api/*                       │ + Photon (search)
          ▼                                         ▼ + Nominatim (reverse)
┌──────────────────────────────────────────────────────────────────┐
│                   Elysia (Bun 1.x runtime)                         │
│                                                                    │
│  modules/pages    modules/auth          modules/incidents          │
│  GET /            GET  /auth            GET  /incidents/:id        │
│  (map page)       POST /auth/send-code  GET  /api/incidents        │
│                   GET  /auth/verify     GET  /api/incidents/feed    │
│                   POST /auth/verify     POST /api/incidents         │
│                   POST /auth/logout     POST /incidents/:id/edit    │
│                   GET  /api/avatar/:id  POST /incidents/:id/delete  │
│                                                                    │
│  modules/profile                                                   │
│  GET/POST /profile   POST /profile/change-email                    │
│                      POST /profile/confirm-email                   │
│                                                                    │
│  WebSocket: /ws/incidents (live new-incident broadcast)            │
│  lib/crypto  lib/logger  lib/ids  lib/http  lib/mail               │
│  ───────────────────────────────────────────────────────────────  │
│  porsager/postgres driver (raw SQL) + custom migration runner      │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ TCP / Postgres wire protocol
                           ▼
               ┌───────────────────────┐
               │  PostgreSQL 16        │
               │  + PostGIS 3.4        │
               │                       │
               │  users                │
               │  sessions             │
               │  email_otps           │
               │  incidents  (GiST)    │
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
JSX components that compile to plain HTML strings at request time. No virtual DOM, no hydration, no frontend bundler. Templates live as `.tsx` files next to routes and produce raw HTML.

### 2.5 Client interactivity — plain HTML forms + fetch() + vanilla JS
Standard interactions use server-rendered pages and native `<form>` POSTs. Dynamic pieces (filter bar, sidebar feed, report flow) use `fetch()` against the `/api/*` JSON endpoints. The Leaflet map is a single vanilla-JS island in `public/js/map.js`. No React, no Vue, no HTMX, no frontend build step.

### 2.6 Maps — Leaflet 1.9.x + leaflet.markercluster + OpenStreetMap
Leaflet is the battle-tested open-source mapping library. `leaflet.markercluster` handles pin clustering at low zoom. Tiles come from OpenStreetMap's public CDN — no API key required. City **search** uses Photon (`photon.komoot.io`, `osm_tag=place:city`) for forward geocoding; the report flow uses **Nominatim** to reverse-geocode a dropped pin into a city name. Both are free and key-less.

### 2.7 CSS — custom `app.css`
A single hand-written stylesheet (`public/css/app.css`) covers everything: sidebar, filter pills, map container, detail panel, badges, auth forms, modals, report overlay. It uses Pico-style `--pico-*` CSS variables for colours but does not load the Pico framework itself.

### 2.8 Database — PostgreSQL 16 + PostGIS 3.4
Postgres is the default; PostGIS adds first-class geospatial types. Bounding-box queries on the ~450 seeded incidents use `ST_MakeEnvelope` + `ST_Intersects` against a GiST index — near-instant at this data volume.

### 2.9 DB driver — porsager/postgres (raw SQL, no ORM)
Tagged-template-literal driver with native Bun support. Queries are written as raw, parameterised SQL (`sql\`...\``) in each module's `queries.ts` / `service.ts`. `sql(array)` for `IN` lists; `::timestamptz` / `::uuid` casts for typed params. No query builder or ORM sits in between.

### 2.10 Migrations — plain `.sql` + a custom runner
Migrations are ordinary `.sql` files in `migrations/`, applied in filename order by `src/db/migrate.ts`. The runner records each applied file in a `_migrations` table so it never re-runs, and runs automatically on container start (`db:migrate && app.ts`). No Drizzle, no schema DSL — the SQL is the source of truth.

### 2.11 Validation — TypeBox (via Elysia's `t`)
Request bodies, query params, and route params are validated at the route boundary. No extra dependency — TypeBox ships with Elysia.

### 2.12 Auth — passwordless email OTP
Sign-in is a 6-digit code emailed to the user. `sendOtp()` stores a bcrypt hash of the code (`Bun.password.hash(code, { algorithm: 'bcrypt', cost: 10 })`) in `email_otps` with a 15-minute expiry and a 60-second-per-email send limit. `verifyOtp()` checks the code (max 5 attempts before the code locks), then upserts the user — the account is created on first successful sign-in. Sessions are stored in Postgres, identified by a UUIDv7 session ID that is HMAC-SHA256–signed before being written to a cookie.

Email delivery is controlled by `MAIL_MODE`: `console` prints the code to stdout (dev default, no credentials), `gmail` sends it via Gmail SMTP using `GMAIL_FROM` + `GMAIL_APP_PASSWORD`.

> **History:** the project moved magic-link → password → email-OTP auth. The
> `password_hash` column was dropped in migration 0008.

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
├─ Dockerfile
├─ package.json
├─ tsconfig.json
│
├─ docs/
│  ├─ ARCHITECTURE.md       ← this file
│  ├─ API.md                ← all HTTP routes with examples
│  ├─ DATA-MODEL.md         ← schema tables + ERD
│  ├─ SETUP.md              ← step-by-step local setup
│  ├─ 01-mvp-scope.md       ← original planning docs (historical)
│  ├─ 02-locked-features.md
│  ├─ 03-architecture.md
│  ├─ 04-design.md
│  ├─ crimelens-idea.md
│  └─ team-project-plan.pdf
│
├─ migrations/              ← plain .sql, applied in order by the runner
│  ├─ 0000_init.sql         ← extensions, tables, GiST indexes
│  ├─ 0001_password_auth.sql
│  ├─ 0002_user_avatar.sql
│  ├─ 0003_crime_types_and_profiles.sql
│  ├─ 0004_lf_contacts_images.sql
│  ├─ 0005_otp_auth.sql
│  ├─ 0006_drop_lost_items.sql
│  ├─ 0007_otp_attempts.sql
│  └─ 0008_drop_dead_user_columns.sql
│
├─ public/
│  ├─ css/app.css           ← all custom styles
│  ├─ js/map.js             ← Leaflet island: fetch, cluster, pin, report mode
│  └─ img/                  ← logo SVGs
│
├─ seed/
│  ├─ incidents.json        ← 446 seeded incidents, 40 cities
│  ├─ generate.ts           ← regenerates incidents.json
│  └─ run.ts                ← wipe SEEDED rows + reload script
│
├─ src/
│  ├─ app.ts               ← Elysia entry point, plugin registration, WS, listen()
│  ├─ env.ts               ← typed env loader
│  │
│  ├─ db/
│  │  ├─ client.ts         ← postgres() connection
│  │  └─ migrate.ts        ← ordered .sql migration runner
│  │
│  ├─ lib/
│  │  ├─ crypto.ts         ← HMAC sign/verify (sessions)
│  │  ├─ http.ts           ← shared cookieVal() + UUID_RE
│  │  ├─ ids.ts            ← uuidv7
│  │  ├─ logger.ts         ← pino instance
│  │  └─ mail.ts           ← OTP email (console or Gmail SMTP)
│  │
│  └─ modules/
│     ├─ auth/
│     │  ├─ middleware.ts  ← loadUser(), SESSION_COOKIE
│     │  ├─ routes.ts      ← /auth/* OTP routes, /api/avatar/:id
│     │  ├─ service.ts     ← sendOtp/consumeOtp/verifyOtp, profile + email-change
│     │  └─ views.tsx      ← LoginPage, VerifyPage, AuthErrorPage
│     │
│     ├─ incidents/
│     │  ├─ crime-types.ts ← CRIME_TYPES single source of truth
│     │  ├─ queries.ts     ← getIncidentById, getBboxIncidents, createIncident, …
│     │  ├─ routes.ts      ← /incidents/:id, /api/incidents(/feed), edit, delete
│     │  ├─ service.ts     ← listByBbox (filter + time-window logic)
│     │  ├─ live.ts        ← in-memory WS client registry + broadcast
│     │  └─ views.tsx      ← IncidentDetailPage, IncidentNotFoundPage
│     │
│     ├─ profile/
│     │  ├─ routes.ts      ← GET/POST /profile, change/confirm email
│     │  ├─ service.ts     ← getProfile()
│     │  └─ views.tsx      ← ProfilePage
│     │
│     └─ pages/
│        ├─ layout.tsx     ← Layout, MapPage, InnerPage components
│        └─ routes.ts      ← GET /
│
└─ test/
   ├─ auth.test.ts
   ├─ incidents.test.ts
   └─ setup.ts
```

---

## 4. Auth flow (email OTP)

```
  Request a code
  ─────────────────────────────────────────
  POST /auth/send-code   body: { email }
    → rate-limit: max 1 code per 60s per email
    → generate 6-digit code, bcrypt-hash it
    → INSERT INTO email_otps (expires_at = now() + 15 min)
    → email the code (console or Gmail per MAIL_MODE)
    → render VerifyPage

  Verify
  ─────────────────────────────────────────
  POST /auth/verify   body: { email, code }
    → consumeOtp(): newest unconsumed, unexpired OTP for email
        • attempts ≥ 5 → lock the code, reject
        • wrong code   → attempts += 1, reject
        • correct      → mark consumed_at
    → upsert user (account created on first successful sign-in)
    → INSERT INTO sessions
    → set HMAC-signed cookie → redirect to /

  Per-request auth
  ─────────────────────────────────────────
  cookie: session=<id>.<hmac>
    → verify HMAC signature
    → SELECT sessions JOIN users WHERE id = $id AND expires_at > now()
    → loadUser() returns { userId, email, firstName, lastName, displayName, hasAvatar }
    → anonymous if session missing/invalid/expired

  Logout
  ─────────────────────────────────────────
  POST /auth/logout
    → DELETE FROM sessions WHERE id = $sessionId
    → clear cookie → redirect to /
```

`consumeOtp()` is a pure verify-and-consume step with no user side effects, so
the same logic backs both sign-in (`verifyOtp`) and the profile email-change
confirmation (`confirmEmailChange`) without creating spurious accounts.

---

## 5. Incident report flow (map → pin → form → POST)

```
  1. Authenticated user clicks "Report Incident"
     → map enters crosshair cursor mode (.report-placing)
     → if geolocation is available, a pin is pre-dropped at the user's location

  2. User clicks a location on the map (to place or move the pin)
     → Leaflet fires click event with { lat, lng }
     → temp pin marker dropped at click position
     → Nominatim reverse geocode called:
        GET https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json
        → extracts city / town / village name
     → report form shown in detail panel with auto-filled city
       (existing form values are preserved when the pin is moved)

  3. User fills in crime type, date, time, description → submits

  4. POST /api/incidents { lat, lng, crimeType, city, occurredAt, description }
     → server validates, requires session
     → INSERT INTO incidents with ST_MakePoint(lng, lat)
     → broadcastIncident() pushes it to all WebSocket clients
     → returns { id }

  5. map.js reloads markers (loadIncidents())
     → toast shown with a link to /incidents/:id
```

---

## 6. Data flow — map viewport query

```
  Browser: map moves or filter changes
    ↓
  GET /api/incidents?bbox=W,S,E,N&types=pickpocketing,robbery&since=30d
    ↓
  service.ts: listByBbox()  (parses types CSV + since window, clamps limit)
    ↓
  queries.ts: getBboxIncidents({ west, south, east, north, types, since, limit })
    ↓
  SQL:
    SELECT id, crime_type, occurred_at, city, description, source, created_by,
           ST_Y(location) AS lat, ST_X(location) AS lng
    FROM incidents
    WHERE ST_Intersects(location, ST_MakeEnvelope($W,$S,$E,$N, 4326))
      AND crime_type IN ($types)       -- omitted if all types selected
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
- **Rate limiting.** OTP sending is limited to 1/60s per email and codes lock after 5 failed verifies, but there is no per-IP throttling. A production deployment should add in-memory or Redis rate limiting in front of `/auth/*`.
- **CSRF.** State-changing POSTs rely on `SameSite=Lax` cookies; there are no CSRF tokens. Worth adding before any public deployment.
