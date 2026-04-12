# CrimeLens — Architecture

**Status:** LOCKED
**Owner:** solo developer (me + Claude)
**Date locked:** 2026-04-11
**Feature source of truth:** `docs/02-locked-features.md`
**Process source of truth:** `docs/01-mvp-scope.md` (persona, timeline, risks)

This document is the engineering plan for the five locked features (L1–L5). Every decision is made unilaterally here. If you want to change one, re-lock this file in a commit.

---

## 0. Constraints, repeated so we don't forget them

- Solo developer, ~12 weeks, rubric-driven grading (see `docs/team-project-plan.pdf`).
- Modern but stable open-source. Lightweight. Fast local setup.
- Must support interactive maps and geospatial queries.
- Must support magic-link email authentication.
- Local-first development. Deployment is a stretch goal.
- Small project. No microservices, no message queue, no cache layer, no feature flags.

---

## 1. Stack decisions

Sixteen choices. One paragraph each. No alternatives presented.

### 1.1 Runtime — **Bun 1.x**
Bun runs TypeScript natively, has a built-in test runner, bundler, and package manager, and starts in milliseconds. That means `bun dev` is instant, `bun test` is instant, and there's no separate `tsc` / `ts-node` / `jest` / `vitest` / `esbuild` tooling to wire up. For a solo 12-week build, the fastest edit-run loop wins. Bun 1.x is production-stable and the quirks that burned early adopters are behind us.

### 1.2 Web framework — **Elysia**
Elysia is a Bun-first HTTP framework with end-to-end type inference. You define a route, Elysia infers the request and response types, and your handlers are fully typed without manual generics. It has a first-class TypeBox integration for request validation, plug-in architecture for things like cookies and JWT, and an API surface small enough to learn in an afternoon. It's the obvious choice in the Bun ecosystem and it's not going to get abandoned.

### 1.3 Language — **TypeScript (strict)**
Not a decision so much as a table stake. `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` in `tsconfig.json`. The rubric rewards code quality; strict TS is the cheapest way to catch a class of bugs before they become bugs.

### 1.4 Frontend rendering — **@kitajs/html (server-side JSX)**
Server-rendered JSX strings via `@kitajs/html`. You write components that look like React but compile to plain HTML strings at request time. No virtual DOM, no hydration, no bundler for page templates. It plugs into Elysia via `@elysiajs/html`. The result is that page templates live next to routes as `.tsx` files and produce raw HTML that HTMX can swap into the DOM.

### 1.5 Client interactivity — **HTMX 2.x**
HTMX is the whole story for client-side interactivity. Filter changes, form submissions, and partial page updates are `hx-get` / `hx-post` attributes that re-render a fragment on the server. No React, no Vue, no build step for the frontend, no state management library. For a map-first app with a handful of forms, HTMX is exactly the right amount of machinery. The only place we escape HTMX is the Leaflet map itself, which is a single Alpine-free vanilla JS island.

### 1.6 Maps — **Leaflet 1.9.x + leaflet.markercluster + OpenStreetMap tiles**
Leaflet is the boring, battle-tested open-source mapping library. `leaflet.markercluster` handles pin clustering at low zoom out of the box. Tiles come from OpenStreetMap's public tile server for development and from a free tier (Maptiler or Stadia) for the presentation if we deploy. No API key headaches in local dev, no Mapbox bill, no 50MB JS bundle.

### 1.7 CSS — **Pico.css + a small custom stylesheet**
Pico.css is a classless CSS framework that makes semantic HTML look good by default. Drop it in, write `<main>` `<article>` `<form>`, and you have a presentable demo without writing a design system. Any bespoke styling (the sidebar filter, the map container sizing, the lost-and-found cards) goes into one ~100-line `app.css` on top of Pico. The rubric does not reward custom design.

### 1.8 Database — **PostgreSQL 16 + PostGIS 3.4**
Postgres is the default choice and PostGIS turns it into a first-class geospatial database. Bounding-box queries on ~500 seeded incidents are trivial, and we get GiST indexes, `ST_MakeEnvelope`, `ST_DWithin`, and proper SRID handling for free. The Docker image `postgis/postgis:16-3.4` is one line of `docker-compose.yml`.

### 1.9 DB driver — **`postgres` (porsager/postgres)**
Not `pg` (node-postgres). `postgres` by porsager is the fast, modern, tagged-template-literal driver that Drizzle's Postgres adapter uses under the hood. It supports Bun natively and has a smaller API surface than `pg`.

### 1.10 ORM / query builder — **Drizzle ORM**
Drizzle is a SQL-first, type-safe query builder with a schema DSL that maps cleanly to Postgres types (including PostGIS geometry via `customType`). Migrations via `drizzle-kit generate` and `drizzle-kit migrate`. Zero runtime reflection, no decorators, no metadata files. The schema in `src/db/schema.ts` is the single source of truth for the data model.

### 1.11 Migrations — **Drizzle Kit**
`drizzle-kit generate` diffs the schema file against the latest migration and writes a new SQL file. `drizzle-kit migrate` applies pending migrations. One CLI, checked into the repo, reproducible from a fresh clone. Seed script runs after migrations.

### 1.12 Validation — **TypeBox (via Elysia's `t`)**
Elysia ships with TypeBox as its built-in schema validator. Request bodies, query params, and cookies are validated at the route boundary with the same schema that drives type inference. No `zod` + `@elysiajs/zod` layering. One validator, one source of truth per route.

### 1.13 Auth — **hand-rolled magic-link (~200 LOC)**
We do not use `lucia`, `better-auth`, or `auth.js`. Magic link is simple enough to implement correctly in a weekend and the auth libraries all come with abstractions built for OAuth providers we don't use. Our implementation: generate a 32-byte random token, SHA-256 hash it, store the hash + user_id + expires_at in a `magic_links` table, email the raw token in a signed URL, verify on click by hashing and looking up, create a session row, set an HttpOnly HMAC-signed cookie. Sessions live in Postgres. Cookie secret comes from `.env`.

### 1.14 Email — **Resend HTTP API + console-mode fallback**
In local development, `MAIL_MODE=console` prints the magic link to `stdout` with a banner. In production (if we deploy), `MAIL_MODE=resend` posts to Resend's HTTP API. No SMTP, no Nodemailer, no IMAP. The email body is a single HTML template string. Total email code: ~40 LOC.

### 1.15 Logging — **pino**
Structured JSON logs to stdout. `pino-pretty` in local dev for human-readable output. Elysia has an official `@elysiajs/logger` plug-in but pino directly is one line of setup and gives us more control. Rubric graders like to see real logs in a demo.

### 1.16 Testing — **`bun:test`**
Bun's built-in test runner. No separate dependency. We write route-level integration tests that spin up the Elysia app against a test database, hit endpoints, and assert JSON/HTML responses. Target: ~15 tests covering the happy paths of L1–L5. The rubric's Week 10 "testing" deliverable is satisfied by this plus a manual test plan.

### Supporting tooling

| Tool | Role |
|---|---|
| `drizzle-kit` | schema migrations |
| `dotenv` | env loading (Bun reads `.env` natively, but we use a tiny wrapper for validation) |
| `docker-compose` | Postgres + PostGIS locally |
| `@kitajs/ts-html-plugin` | JSX typing for `@kitajs/html` |
| Biome (or Prettier + ESLint) | format + lint — Biome is faster and simpler, so Biome |

---

## 2. Folder structure

```
CrimeLens/
├─ .env.example
├─ .gitignore
├─ README.md
├─ biome.json
├─ bun.lockb
├─ docker-compose.yml
├─ drizzle.config.ts
├─ package.json
├─ tsconfig.json
│
├─ docs/
│  ├─ 01-mvp-scope.md
│  ├─ 02-locked-features.md
│  ├─ 03-architecture.md           ← this file
│  ├─ 04-api.md                    ← written Week 3
│  ├─ 05-stack-justification.md    ← written Week 3
│  ├─ 06-install-guide.md          ← written Week 11
│  ├─ 07-demo-script.md            ← written Week 12
│  ├─ crimelens-idea.md
│  └─ team-project-plan.pdf
│
├─ drizzle/                        ← generated migration SQL
│  ├─ meta/
│  └─ 0000_init.sql
│
├─ public/                         ← static assets served as-is
│  ├─ css/
│  │  ├─ pico.min.css
│  │  └─ app.css
│  ├─ js/
│  │  ├─ htmx.min.js
│  │  ├─ leaflet.js
│  │  ├─ leaflet.markercluster.js
│  │  └─ map.js                    ← the single JS island
│  └─ img/
│     └─ favicon.svg
│
├─ seed/
│  ├─ incidents.json               ← ~500 seeded incidents
│  └─ run.ts                       ← wipes + reloads incidents
│
├─ src/
│  ├─ app.ts                       ← Elysia instance, plug-ins, listen
│  ├─ env.ts                       ← typed env loader
│  │
│  ├─ db/
│  │  ├─ client.ts                 ← `postgres` + Drizzle setup
│  │  └─ schema.ts                 ← all tables in one file
│  │
│  ├─ lib/
│  │  ├─ crypto.ts                 ← token gen, sha256, HMAC cookie sign
│  │  ├─ logger.ts                 ← pino instance
│  │  ├─ mail.ts                   ← sendMagicLink() — resend | console
│  │  └─ ids.ts                    ← uuidv7
│  │
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ routes.ts              ← GET/POST /auth/*
│  │  │  ├─ service.ts             ← requestLink, consumeLink, logout
│  │  │  ├─ middleware.ts          ← requireUser, loadUser
│  │  │  └─ views.tsx              ← auth page templates
│  │  │
│  │  ├─ incidents/
│  │  │  ├─ routes.ts              ← GET /api/incidents, POST /api/incidents
│  │  │  ├─ service.ts             ← bbox query + create
│  │  │  ├─ queries.ts             ← raw SQL for geospatial
│  │  │  └─ views.tsx              ← popup, detail page, submit form fragments
│  │  │
│  │  ├─ lost-and-found/
│  │  │  ├─ routes.ts              ← GET/POST /lost-and-found
│  │  │  ├─ service.ts             ← list, create, update, delete
│  │  │  └─ views.tsx              ← list page, item card, submit form
│  │  │
│  │  └─ pages/
│  │     ├─ routes.ts              ← GET /, /about, /lost-and-found
│  │     └─ layout.tsx             ← root HTML shell
│  │
│  └─ types/
│     └─ htmx.d.ts                 ← HTMX attribute typings
│
└─ test/
   ├─ setup.ts                     ← spins up test DB
   ├─ auth.test.ts
   ├─ incidents.test.ts
   └─ lost-and-found.test.ts
```

Feature-sliced under `src/modules/`. Every feature folder has the same shape: `routes.ts` wires URLs, `service.ts` holds business logic, `views.tsx` holds JSX templates. No cross-module imports except through `src/lib/`.

---

## 3. Data model

Five tables. All under one schema. All primary keys are UUIDv7 (lexicographically sortable, index-friendly).

### 3.1 `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `email` | `citext` | UNIQUE, NOT NULL |
| `display_name` | `text` | NULL |
| `created_at` | `timestamptz` | default `now()` |

`citext` gives case-insensitive email uniqueness without us having to lowercase manually. No password hash column, no email-verified column — clicking the magic link *is* verification.

### 3.2 `magic_links`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id, NOT NULL |
| `token_hash` | `bytea` | NOT NULL, UNIQUE |
| `expires_at` | `timestamptz` | NOT NULL |
| `consumed_at` | `timestamptz` | NULL |
| `created_at` | `timestamptz` | default `now()` |

We store `sha256(token)`, never the raw token. The raw token only exists long enough to build the email URL. TTL: 15 minutes. Single-use: `consumed_at` set on verification, subsequent verifies fail. On request, if the email doesn't exist in `users`, we create the user row first (JIT provisioning), then create the magic link.

### 3.3 `sessions`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK (this is also the session cookie value, signed) |
| `user_id` | `uuid` | FK → users.id, NOT NULL |
| `expires_at` | `timestamptz` | NOT NULL |
| `created_at` | `timestamptz` | default `now()` |

Sessions live 30 days. On each authenticated request we check `expires_at > now()` and optionally slide the expiry (cheap write, not implemented in MVP). The cookie carries `id.hmacSignature` and the server verifies the signature before hitting the DB.

### 3.4 `incidents`

The star of the show.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `crime_type` | `text` | NOT NULL, CHECK in (`pickpocketing`, `bag_snatching`, `theft_from_vehicle`, `other`) |
| `occurred_at` | `timestamptz` | NOT NULL |
| `location` | `geometry(Point, 4326)` | NOT NULL |
| `city` | `text` | NOT NULL |
| `description` | `text` | NOT NULL |
| `source` | `text` | NOT NULL, CHECK in (`SEEDED`, `USER_REPORTED`) |
| `created_by` | `uuid` | FK → users.id, NULL (seeded rows have NULL) |
| `created_at` | `timestamptz` | default `now()` |

Indexes:
- `CREATE INDEX idx_incidents_location ON incidents USING GIST (location);`
- `CREATE INDEX idx_incidents_occurred_at ON incidents (occurred_at DESC);`
- `CREATE INDEX idx_incidents_crime_type ON incidents (crime_type);`

The viewport query uses `ST_MakeEnvelope($west, $south, $east, $north, 4326)` + `ST_Intersects(location, envelope)`. The GiST index makes this near-instant at our data volume.

### 3.5 `lost_items`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id, NOT NULL |
| `title` | `text` | NOT NULL |
| `category` | `text` | NOT NULL, CHECK in (`phone`, `bag`, `wallet`, `keys`, `documents`, `other`) |
| `status` | `text` | NOT NULL, CHECK in (`LOST`, `FOUND`) |
| `city` | `text` | NOT NULL |
| `occurred_at` | `timestamptz` | NOT NULL |
| `description` | `text` | NOT NULL |
| `location` | `geometry(Point, 4326)` | NULL (optional map pin) |
| `created_at` | `timestamptz` | default `now()` |

Indexes:
- `CREATE INDEX idx_lost_items_created_at ON lost_items (created_at DESC);`
- `CREATE INDEX idx_lost_items_user_id ON lost_items (user_id);`

No GiST index on `location` — lost items are browsed as a list, not a map query. Keeping the column lets us render an optional pin on the detail card without a separate table.

### 3.6 Drizzle schema sketch

```ts
// src/db/schema.ts
import { pgTable, uuid, text, timestamp, bytea, customType, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const geometry = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Point, 4326)',
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(), // citext via raw SQL in migration
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey(),
  crimeType: text('crime_type').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  location: geometry('location').notNull(),
  city: text('city').notNull(),
  description: text('description').notNull(),
  source: text('source').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  locationIdx: index('idx_incidents_location').using('gist', t.location),
  occurredAtIdx: index('idx_incidents_occurred_at').on(t.occurredAt.desc()),
  crimeTypeIdx: index('idx_incidents_crime_type').on(t.crimeType),
  crimeTypeCheck: check('crime_type_check', sql`${t.crimeType} in ('pickpocketing','bag_snatching','theft_from_vehicle','other')`),
  sourceCheck: check('source_check', sql`${t.source} in ('SEEDED','USER_REPORTED')`),
}));

export const lostItems = pgTable('lost_items', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull(),
  city: text('city').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  description: text('description').notNull(),
  location: geometry('location'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  createdAtIdx: index('idx_lost_items_created_at').on(t.createdAt.desc()),
  userIdx: index('idx_lost_items_user_id').on(t.userId),
  categoryCheck: check('category_check', sql`${t.category} in ('phone','bag','wallet','keys','documents','other')`),
  statusCheck: check('status_check', sql`${t.status} in ('LOST','FOUND')`),
}));
```

The `citext` extension and the geometry type need raw SQL in the initial migration. Drizzle Kit generates the migration scaffold; we hand-edit `0000_init.sql` to prepend:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE users ALTER COLUMN email TYPE citext;
```

---

## 4. API and route list

Every URL the app exposes. HTML routes return full pages or HTMX fragments. API routes return JSON (only the map query is JSON; everything else is HTML-over-the-wire).

### 4.1 Page routes (HTML)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | public | Home page = map page. Renders layout + map container + filter sidebar. Initial map data loads via `hx-get` on `#map-data`. |
| GET | `/about` | public | About page. Data sources, methodology, disclaimer. |
| GET | `/incidents/:id` | public | Full crime detail page. |
| GET | `/lost-and-found` | public | Reverse-chronological list of lost/found items. |
| GET | `/lost-and-found/new` | authed | Submit form (redirects to `/auth` if not logged in). |
| GET | `/lost-and-found/:id` | public | Detail page for one lost item. |
| POST | `/lost-and-found` | authed | Create a lost item. Returns HTML fragment on success (HTMX swap) or re-renders form with errors. |
| POST | `/lost-and-found/:id/delete` | authed (owner) | Delete own lost item. |
| GET | `/auth` | public | Magic-link request form. |
| POST | `/auth/request` | public | Accepts email, creates magic link, sends email, returns "check your inbox" HTML fragment. |
| GET | `/auth/verify?token=...` | public | Consumes the magic link, creates a session, sets cookie, redirects to `/`. |
| POST | `/auth/logout` | authed | Destroys the session, clears the cookie, redirects to `/`. |

### 4.2 API routes (JSON)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/incidents` | public | Viewport + filter query. Returns `{ items: Incident[] }`. |
| POST | `/api/incidents` | authed | Submit a new incident pin. Returns the created incident. |

#### 4.2.1 `GET /api/incidents`

Query params:

| Param | Type | Required | Default |
|---|---|---|---|
| `bbox` | `W,S,E,N` (4 floats, comma-separated) | yes | — |
| `types` | comma-separated list of crime types | no | all types |
| `since` | ISO date or one of `30d`, `90d`, `1y`, `all` | no | `all` |
| `limit` | integer | no | `500` (capped at `1000`) |

Response:

```json
{
  "items": [
    {
      "id": "018f...",
      "crimeType": "pickpocketing",
      "occurredAt": "2025-11-14T18:32:00Z",
      "city": "Barcelona",
      "lat": 41.3809,
      "lng": 2.1228,
      "description": "Victim reported...",
      "source": "SEEDED"
    }
  ]
}
```

SQL template:

```sql
SELECT id, crime_type, occurred_at, city, description, source,
       ST_X(location) AS lng, ST_Y(location) AS lat
  FROM incidents
 WHERE ST_Intersects(location, ST_MakeEnvelope($1, $2, $3, $4, 4326))
   AND ($5::text[] IS NULL OR crime_type = ANY($5))
   AND occurred_at >= $6
 ORDER BY occurred_at DESC
 LIMIT $7;
```

#### 4.2.2 `POST /api/incidents`

Request body (JSON):

```json
{
  "crimeType": "pickpocketing",
  "occurredAt": "2026-04-10T14:00:00Z",
  "lat": 41.3851,
  "lng": 2.1734,
  "city": "Barcelona",
  "description": "Saw someone reach into a tourist's backpack."
}
```

Validated with TypeBox. Lat/lng bounded to valid earth coordinates. Description length 10–500. On success the server responds with a small HTML fragment that HTMX swaps into the map to render the new pin (via a tiny custom event that `map.js` listens for).

---

## 5. Auth flow

The whole magic-link dance in one diagram and one paragraph.

```
 ┌─────────────┐  (1) POST /auth/request  ┌──────────┐
 │   Browser   │ ─────────────────────── │ Elysia   │
 │             │   { email }             │          │
 └─────────────┘                          └────┬─────┘
                                                │
                             (2) upsert user,   │
                                 create token,  │
                                 hash, store    │
                                                ▼
                                          ┌──────────┐
                                          │ Postgres │
                                          └────┬─────┘
                                                │
                             (3) send email     │
                                 with raw token │
                                                ▼
                                          ┌──────────┐
                                          │ Resend / │
                                          │ console  │
                                          └────┬─────┘
                                                │
 ┌─────────────┐  (4) GET /auth/verify?token=… │
 │   Email     │ ─────────────────────────────┘
 │   inbox     │
 └─────────────┘
                                                │
                             (5) hash token,    │
                                 find row,      │
                                 check expiry,  │
                                 mark consumed, │
                                 create session,│
                                 set cookie     │
                                                ▼
                                       redirect to /
```

**Step-by-step:**

1. User enters email on `/auth`. POST `/auth/request`.
2. Server upserts the user row (JIT provisioning on first sign-in). Generates 32 random bytes, base64url-encodes → `rawToken`. Computes `hash = sha256(rawToken)`. Inserts into `magic_links` with `expires_at = now() + 15 min`.
3. Server builds URL `${BASE_URL}/auth/verify?token=${rawToken}`. Sends via Resend (prod) or prints to stdout (dev). Returns "check your inbox" HTML fragment via HTMX swap.
4. User clicks the link in their email. Browser GETs `/auth/verify?token=...`.
5. Server hashes the received token, SELECTs the `magic_links` row by `token_hash`. Rejects if not found, expired, or already consumed. Marks `consumed_at = now()`. Creates a `sessions` row. Signs the session id with HMAC-SHA256 using `SESSION_SECRET`. Sets cookie `session=<id>.<hmac>; HttpOnly; SameSite=Lax; Secure (in prod); Max-Age=2592000`. Redirects to `/`.

**Request auth middleware:** every request reads the session cookie, verifies HMAC, SELECTs the session row, checks `expires_at > now()`, loads the user. Failed lookup = anonymous request (not an error). Protected routes (submit incident, submit lost item, logout) use a `requireUser` guard that 401s if anonymous.

**Rate limiting:** `/auth/request` is rate-limited in-memory to 5 requests per email per 10 minutes. In-memory is fine for single-process local. No Redis.

**CSRF:** HTMX uses the browser's cookie on same-origin requests. All state-changing routes are POST with `SameSite=Lax` cookies, which blocks cross-site form submissions. We additionally require an `HX-Request: true` header on state-changing routes, which a real CSRF attacker can't set cross-origin via a form.

---

## 6. Build order (Weeks 4–12)

Maps to the `01-mvp-scope.md` §6 timeline. Every slice ends with a commit that ships working code.

### Week 4 — Skeleton
- `bun init` → Elysia hello-world at `/` that returns "CrimeLens".
- Docker Compose with `postgis/postgis:16-3.4`. `bun run db:up` starts it.
- Drizzle config + empty schema + first migration. `bun run db:push` applies.
- Biome configured. `bun run check` lints and formats.
- `.env.example` committed, `.env` gitignored.
- Root layout page renders with Pico.css. HTMX script served from `/public/js/`.
- **Commit target:** 8–12 small commits.

### Week 5 — Data model
- Full schema.ts with all 5 tables.
- `drizzle-kit generate` produces `0000_init.sql`. Hand-edit to add `CREATE EXTENSION postgis`, `citext`, and geometry index.
- `seed/incidents.json` authored (~500 incidents across 5 hero cities, plausible lat/lng, timestamps spread over 18 months, distribution of crime types).
- `seed/run.ts` wipes `incidents` and reloads from JSON.
- `docs/03-data-model.md` written (it's mostly copy-paste from §3 of this file).
- **Commit target:** 10–14 small commits.

### Week 6 — Core logic (server-side)
- `modules/incidents/queries.ts` with the bbox+filter query.
- `GET /api/incidents` endpoint returning JSON.
- `POST /api/incidents` endpoint (behind a placeholder auth guard).
- `modules/auth/service.ts` — requestLink, consumeLink, logout. `magic_links` CRUD. `sessions` CRUD. Crypto helpers in `lib/crypto.ts`.
- `modules/auth/routes.ts` — `/auth`, `/auth/request`, `/auth/verify`, `/auth/logout`.
- `lib/mail.ts` with console mode.
- **Commit target:** 12–16 small commits.

### Week 7 — UI (the big one)
- Map page: Leaflet map in `public/js/map.js`, fetch `/api/incidents` for current viewport, marker cluster plug-in, popup template.
- Filter sidebar: HTMX form updates URL params, re-triggers map data fetch via a custom event.
- `/incidents/:id` detail page.
- Auth pages: `/auth` form, "check your inbox" fragment, verify redirect.
- `/lost-and-found` list page + item card component.
- `/lost-and-found/new` form + submission handling.
- `/about` page.
- Global nav: home, lost-and-found, about, auth state (login or logout button).
- **Commit target:** 20+ small commits.

### Week 8 — Integration
- Submit-incident UX: click map in "report mode" → modal form → POST → HTMX swap adds pin.
- Filter state persisted in URL, shareable.
- Session loaded once per request; layout template shows current user.
- Polish: empty states, error messages, loading spinners on map fetch.
- **Commit target:** 10–14 small commits.

### Week 9 — Auth hardening
- HMAC signing on session cookie verified with constant-time compare.
- Rate limit on `/auth/request`.
- `HX-Request` header check on state-changing routes.
- Magic-link expiry + single-use verified by tests.
- Authorization checks: lost-item delete requires `user_id === session.user_id`.
- Proper 401 / 403 / 404 pages.
- **Commit target:** 8–12 small commits.

### Week 10 — Testing
- `test/setup.ts` spins up a test DB against a separate schema (or a separate `crimelens_test` database).
- `bun:test` integration tests for auth flow, incidents query, lost-and-found CRUD.
- Manual test plan executed by the tester. Bugs filed as GitHub issues, fixed here.
- **Commit target:** 8–12 small commits.

### Week 11 — Documentation
- `docs/04-api.md` — full route map (formalize §4 of this file).
- `docs/05-stack-justification.md` — one doc per stack choice, formalize §1.
- `docs/06-install-guide.md` — step-by-step from fresh clone, verified by running it.
- Screenshots for the README.
- Architecture diagram cleanup.
- **Commit target:** 5–10 small commits.

### Week 12 — Presentation
- `docs/07-demo-script.md` — scripted happy path.
- Rehearse on presentation hardware.
- No new features. Scope is locked.
- **Commit target:** 3–5 small commits.

---

## 7. System architecture diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                            Browser                                │
│                                                                    │
│   ┌────────────┐   ┌────────────┐   ┌─────────────────────────┐    │
│   │  HTMX 2.x  │   │ Pico.css   │   │   Leaflet + cluster     │    │
│   │ (hx-get,   │   │ (layout)   │   │   /public/js/map.js     │    │
│   │  hx-post)  │   │            │   │   (the only JS island)  │    │
│   └─────┬──────┘   └────────────┘   └──────────┬──────────────┘    │
│         │                                       │                  │
└─────────┼───────────────────────────────────────┼──────────────────┘
          │ HTML fragments + pages                │ JSON (bbox query)
          │                                       │
          ▼                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Elysia (Bun runtime)                           │
│                                                                    │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐      │
│   │ modules/pages │  │ modules/auth  │  │ modules/incidents │      │
│   │  layout.tsx   │  │  /auth/*      │  │  GET /api/...     │      │
│   │  / /about     │  │  sessions     │  │  POST /api/...    │      │
│   └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘      │
│           │                  │                    │                │
│           │          ┌───────┴────────┐            │                │
│           │          │ modules/lost-  │            │                │
│           │          │  and-found     │            │                │
│           │          │  /lost-and-f.  │            │                │
│           │          └───────┬────────┘            │                │
│           │                  │                    │                │
│           └──────────────────┴────────────────────┘                │
│                              │                                     │
│   ┌─────────┐  ┌──────────┐  │  ┌─────────┐  ┌──────────────┐      │
│   │ lib/    │  │ lib/     │  │  │ lib/    │  │ lib/mail.ts  │      │
│   │ crypto  │  │ logger   │  │  │ ids     │  │ (Resend |    │      │
│   │ (HMAC,  │  │ (pino)   │  │  │ (uuidv7)│  │  console)    │      │
│   │  sha256)│  │          │  │  │         │  │              │      │
│   └─────────┘  └──────────┘  │  └─────────┘  └──────┬───────┘      │
│                              │                     │               │
│                              ▼                     │               │
│                      ┌───────────────┐              │               │
│                      │ Drizzle ORM   │              │               │
│                      │ + `postgres`  │              │               │
│                      │   driver      │              │               │
│                      └───────┬───────┘              │               │
└──────────────────────────────┼──────────────────────┼───────────────┘
                               │                     │
                               ▼                     ▼
                     ┌───────────────────┐   ┌───────────────┐
                     │  PostgreSQL 16    │   │  Resend API   │
                     │  + PostGIS 3.4    │   │  (prod only)  │
                     │                   │   │               │
                     │  users            │   │  or stdout    │
                     │  magic_links      │   │  in dev       │
                     │  sessions         │   └───────────────┘
                     │  incidents (GiST) │
                     │  lost_items       │
                     └───────────────────┘
```

One process. One database. No cache, no queue, no worker. The arrows are HTTP (top) and TCP/Postgres wire (bottom). The only external network call is Resend in production.

---

## 8. Local development setup

From a fresh clone on a machine with Bun, Docker, and git installed.

### 8.1 Prerequisites

| Tool | Version | Install |
|---|---|---|
| Bun | ≥1.1 | `curl -fsSL https://bun.sh/install \| bash` (or `irm bun.sh/install.ps1 \| iex` on Windows) |
| Docker Desktop | latest | https://docker.com |
| git | any | system package manager |

### 8.2 One-time setup

```bash
git clone <repo>
cd CrimeLens
cp .env.example .env             # fill in SESSION_SECRET (any 32+ random chars)
bun install
docker compose up -d db          # starts postgis on localhost:5432
bun run db:migrate               # applies drizzle migrations
bun run db:seed                  # loads ~500 incidents
```

### 8.3 Run the app

```bash
bun run dev                      # http://localhost:3000, hot reload on file change
```

Check console: magic links sent during `/auth/request` print here in dev mode.

### 8.4 `package.json` scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/app.ts",
    "start": "bun src/app.ts",
    "build": "bun build src/app.ts --outdir dist --target bun",
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "test": "bun test",
    "db:up": "docker compose up -d db",
    "db:down": "docker compose down",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run src/db/migrate.ts",
    "db:seed": "bun run seed/run.ts",
    "db:reset": "bun run db:down && bun run db:up && sleep 3 && bun run db:migrate && bun run db:seed"
  }
}
```

### 8.5 `docker-compose.yml`

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    container_name: crimelens-db
    environment:
      POSTGRES_USER: crimelens
      POSTGRES_PASSWORD: crimelens
      POSTGRES_DB: crimelens
    ports:
      - "5432:5432"
    volumes:
      - crimelens-db:/var/lib/postgresql/data

volumes:
  crimelens-db:
```

### 8.6 `.env.example`

```
# App
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgres://crimelens:crimelens@localhost:5432/crimelens

# Auth
SESSION_SECRET=replace-with-32+-random-chars
SESSION_TTL_DAYS=30
MAGIC_LINK_TTL_MINUTES=15

# Email
MAIL_MODE=console                 # console | resend
RESEND_API_KEY=
MAIL_FROM=CrimeLens <noreply@localhost>
```

### 8.7 Verification checklist

After `bun run dev`, verify:

- [ ] http://localhost:3000 shows a map centered on Europe with visible pin clusters.
- [ ] Zooming into Barcelona shows ~100 individual pins.
- [ ] Clicking a pin opens a popup with type, date, and a "View details" link.
- [ ] Filter sidebar reduces pin count when you uncheck a crime type.
- [ ] Time-window filter works.
- [ ] /lost-and-found shows an empty-state (or seeded items if we seeded any).
- [ ] /auth → enter your email → console prints `MAGIC LINK: http://localhost:3000/auth/verify?token=...`.
- [ ] Clicking the link logs you in; a "logout" button appears in the nav.
- [ ] /lost-and-found/new accepts a submission and the item appears on the list.
- [ ] Clicking "submit incident" on the map (while logged in) drops a new pin.

If any row fails, that's the bug queue for the next commit.

---

## 9. Decisions explicitly NOT made here

These are deferred to later docs or later commits:

- **Deployment target.** Fly.io, Railway, Render, a VPS — decided in Week 11 if and only if we deploy. Local-first works for the demo.
- **Tile provider in production.** OSM's tile server bans commercial/heavy usage. If we deploy, switch to Maptiler free tier. Decided Week 11.
- **Backup / restore.** Out of scope for a student project.
- **Monitoring.** pino logs to stdout. Good enough.
- **CI.** A GitHub Actions workflow that runs `bun run check` and `bun test` on push. Added in Week 4 as a small nice-to-have.

---

## 10. Summary in ten lines

1. Bun + Elysia + TypeScript + Drizzle + Postgres/PostGIS.
2. HTMX + @kitajs/html for pages, Leaflet for the map, Pico.css for looks.
3. Five tables: users, magic_links, sessions, incidents (GiST), lost_items.
4. Hand-rolled magic-link auth, ~200 LOC, sessions in DB, HMAC-signed cookie.
5. Console email in dev, Resend HTTP in prod.
6. One Elysia process, one Postgres container, no cache, no queue, no worker.
7. Feature-sliced `src/modules/` with `routes.ts` / `service.ts` / `views.tsx` in each.
8. Seed script loads ~500 incidents across 5 hero cities on `bun run db:seed`.
9. Build order: skeleton → data → logic → UI → integration → auth harden → tests → docs → demo.
10. If anything in this doc stops being true, re-lock this file in a new commit.
