# CrimeLens — System Architecture

CrimeLens is a containerized, server-rendered web application for visualizing
and crowd-reporting urban petty crime on an interactive map. It is a **modular
monolith**: a single Bun/Elysia process serves HTML, a JSON API, and a WebSocket
channel, backed by a PostgreSQL/PostGIS database. Two Docker containers,
orchestrated with Docker Compose.

---

## Technology stack

| Layer | Technology | Role |
|---|---|---|
| Runtime | **Bun 1.x** | TypeScript execution, bundling, test runner |
| HTTP framework | **Elysia 1.x** | Routing, request validation (TypeBox), WebSocket server |
| Views | **@kitajs/html** | Server-side JSX compiled to HTML strings (no client framework) |
| Map client | **Leaflet 1.9** + markercluster | Interactive map, pin clustering |
| Database | **PostgreSQL 16 + PostGIS 3.4** | Relational storage + geospatial queries |
| DB access | **porsager/postgres** | Parameterized raw SQL — no ORM |
| Authentication | **Email OTP** | bcrypt-hashed one-time codes, HMAC-signed session cookies |
| Email | **Nodemailer** (Gmail SMTP) | Delivers sign-in codes |
| Geocoding | **Photon** / **Nominatim** | City search / reverse-geocode a dropped pin |
| Packaging | **Docker Compose** | Two-container orchestration |

---

## Container topology

```
                      ┌──────────────────────────────────────────────┐
                      │               Client (browser)               │
                      │      Leaflet · forms · fetch · WebSocket     │
                      └──────────────────────────────────────────────┘
                                              │         HTTPS, direct from browser:
                                              ├─────────├─▶ OpenStreetMap  (tiles)
                    HTTP / WS  :3000          │         ├─▶ Photon         (city search)
                                              │         └─▶ Nominatim      (reverse geocode)
                                              ▼
  ┌─── Docker network: crimelens_default ──────────────────────────────────────────────────┐
  │                                                                                        │
  │   ┌──────────────────────────────────┐            ┌────────────────────────────┐       │
  │   │  crimelens_app                   │            │  crimelens_db              │       │
  │   │  Bun + Elysia   :3000            │──── SQL ──▶│  PostgreSQL 16             │       │
  │   │  SSR HTML · /api/* · /ws         │◀── rows ───│  + PostGIS 3.4             │       │
  │   │                                  │            └────────────────────────────┘       │
  │   └──────────────────────────────────┘                          │                      │
  │                 │                                               │                      │
  │                 │  SMTP / TLS :587                              │ volume               │
  └─────────────────│───────────────────────────────────────────────│──────────────────────┘
                    │                                               │
                    │                                               │
                    ▼                                               ▼
            Gmail SMTP ─▶ user's inbox                      pg_data (persistent)
```

- **`crimelens_app`** and **`crimelens_db`** share a private Docker network; only ports `3000` (app) and `5432` (db) are published to the host.
- Database state lives in the **`pg_data`** volume, so it survives container restarts.
- Map tiles and geocoding are called **directly from the browser**; the server never proxies them.

---

## Request lifecycle — map viewport query

The hot path: as the user pans or zooms, the map requests only the incidents inside the current bounding box.

```
Browser                 crimelens_app                   crimelens_db
  │                           │                               │
  │──── GET /api/incidents ───▶                               │
  │                           │ validate params (TypeBox)     │
  │                           │ build SQL · ST_Intersects     │
  │                           │───────── index lookup ────────▶ GiST index scan
  │                           │                               │ (sub-linear)
  │                           │◀──────── matching rows ────────
  │                           │ serialize → JSON              │
  ◀────────── items ──────────│                               │
  │ render markers + clusters │                               │
```

A reported incident is also pushed to every other connected client over
`/ws/incidents`, so new pins appear live without a page reload.

---

## Authentication & email (passwordless OTP over SMTP)

```
Browser               crimelens_app                email_otps (DB)             Gmail SMTP
  │                         │                             │                         │
  │──── send-code {email} ──▶                             │                         │
  │                         │ generate 6-digit code       │                         │
  │                         │ bcrypt-hash · 15-min TTL    │                         │
  │                         │───── INSERT hashed code ────▶                         │
  │                         │──────────────── Nodemailer send (SMTP) ───────────────▶
  │                         │                             │                         │ ─▶ user's inbox
  │── verify {email, code} ─▶                             │                         │
  │                         │ consumeOtp()                │                         │
  │                         │◀───── newest unconsumed ─────                         │
  │                         │ bcrypt compare · ≤5 tries   │                         │
  │                         │ mark consumed · upsert user │                         │
  ◀─────────────────────────│                             │                         │
  │ Set-Cookie: session=<id>.<HMAC>                       │                         │
```

- **`MAIL_MODE=gmail`** sends via Nodemailer (Gmail SMTP, TLS :587).
  **`MAIL_MODE=console`** replaces the send step with a log line — no email account required.
- The session cookie carries only the session id plus an HMAC signature; the
  server verifies the signature before any DB lookup. Cookies are `HttpOnly`,
  `SameSite=Lax`, 30-day expiry.

---

## Data & persistence

Four tables — `users`, `sessions`, `email_otps`, `incidents`:

```
users 1──N sessions          users 1──N incidents
users 1──N email_otps         incidents.location : geometry(Point, 4326)
```

- **`incidents.location`** is a PostGIS point with a **GiST index**, which turns
  viewport ("what's in this rectangle?") queries into index scans instead of full
  table scans — the core performance decision of the system.
- The schema is built by **ordered `.sql` migrations** run automatically on
  container start; an `_migrations` table records applied files so each runs once.
- A seed loads **~450 incidents across 40 European cities** for the demo;
  rows are tagged `SEEDED` vs `USER_REPORTED`.
