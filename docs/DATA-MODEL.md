# CrimeLens — Data Model

**Source of truth:** `src/db/schema.ts`
**Migrations:** `drizzle/0000_init.sql`, `drizzle/0001_password_auth.sql`

---

## Tables at a glance

```
users ─────────────────────────────────────────────── PRIMARY ENTITIES
  id (PK)
  email (citext, UNIQUE)
  first_name, last_name
  password_hash
  created_at

sessions ─────────────────────────────────────────── AUTH SESSIONS
  id (PK, also the cookie value)
  user_id (FK → users.id CASCADE DELETE)
  expires_at
  created_at

incidents ────────────────────────────────────────── CRIME PINS (GiST)
  id (PK)
  crime_type   CHECK in (pickpocketing, bag_snatching, theft_from_vehicle, other)
  occurred_at
  location     geometry(Point, 4326)  ← PostGIS, GiST indexed
  city
  description
  source       CHECK in (SEEDED, USER_REPORTED)
  created_by   (FK → users.id, NULL for seeded rows)
  created_at

lost_items ───────────────────────────────────────── LOST & FOUND
  id (PK)
  user_id (FK → users.id CASCADE DELETE)
  title
  category     CHECK in (phone, bag, wallet, keys, documents, other)
  status       CHECK in (LOST, FOUND)
  city
  occurred_at
  description
  location     geometry(Point, 4326)  ← optional
  created_at
```

---

## Entity-relationship diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            users                                │
│                                                                 │
│  id            uuid         PK                                  │
│  email         citext       UNIQUE NOT NULL                     │
│  first_name    text         NOT NULL                            │
│  last_name     text         NOT NULL                            │
│  password_hash text         NOT NULL                            │
│  created_at    timestamptz  DEFAULT now()                       │
└────────────────────────────┬───────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              │ 1 : N                       │ 1 : N
              ▼                             ▼
┌─────────────────────────┐  ┌────────────────────────────────────┐
│        sessions         │  │            incidents               │
│                         │  │                                    │
│  id          uuid  PK   │  │  id          uuid    PK            │
│  user_id     uuid  FK   │  │  crime_type  text    NOT NULL      │
│  expires_at  tstz        │  │             CHECK (pickpocketing,  │
│  created_at  tstz        │  │             bag_snatching,         │
│                         │  │             theft_from_vehicle,    │
│  30-day TTL             │  │             other)                 │
│  HMAC-signed cookie     │  │  occurred_at tstz    NOT NULL      │
└─────────────────────────┘  │  location    geometry NOT NULL     │
                             │             (Point, 4326)          │
                             │             GiST indexed           │
                             │  city        text    NOT NULL      │
                             │  description text    NOT NULL      │
                             │  source      text    NOT NULL      │
                             │             CHECK (SEEDED,         │
                             │             USER_REPORTED)         │
                             │  created_by  uuid    FK → users.id │
                             │             (NULL for seeded rows) │
                             │  created_at  tstz                  │
                             └────────────────────────────────────┘

                             ┌────────────────────────────────────┐
                             │           lost_items               │
                             │                                    │
             users 1:N ────► │  id          uuid    PK            │
                             │  user_id     uuid    FK → users.id │
                             │  title       text    NOT NULL      │
                             │  category    text    NOT NULL      │
                             │             CHECK (phone, bag,     │
                             │             wallet, keys,          │
                             │             documents, other)      │
                             │  status      text    NOT NULL      │
                             │             CHECK (LOST, FOUND)    │
                             │  city        text    NOT NULL      │
                             │  occurred_at tstz    NOT NULL      │
                             │  description text    NOT NULL      │
                             │  location    geometry NULL         │
                             │             (optional map pin)     │
                             │  created_at  tstz                  │
                             └────────────────────────────────────┘
```

---

## Column details

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | UUIDv7 — lexicographically sortable, generated by `lib/ids.ts` |
| `email` | `citext` | Case-insensitive via PostgreSQL `citext` extension. UNIQUE. |
| `first_name` | `text` | Required at registration |
| `last_name` | `text` | Required at registration |
| `password_hash` | `text` | bcrypt hash via `Bun.password.hash(pw, { algorithm: 'bcrypt', cost: 12 })` |
| `created_at` | `timestamptz` | Server time at insert |

### `sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | UUIDv7. This is the value stored in the cookie (alongside its HMAC) |
| `user_id` | `uuid` | FK → `users.id ON DELETE CASCADE` |
| `expires_at` | `timestamptz` | `now() + 30 days` at creation |
| `created_at` | `timestamptz` | |

Cookie format: `session=<id>.<hmac-sha256-hex>; HttpOnly; SameSite=Lax; Max-Age=2592000`

### `incidents`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | UUIDv7 |
| `crime_type` | `text` | One of: `pickpocketing`, `bag_snatching`, `theft_from_vehicle`, `other` |
| `occurred_at` | `timestamptz` | When the incident happened (user-supplied or seeded) |
| `location` | `geometry(Point, 4326)` | WGS84 lon/lat point. `ST_MakePoint(lng, lat)` |
| `city` | `text` | Nominatim-derived for user reports; pre-seeded for seeded rows |
| `description` | `text` | Free text, max 1000 chars from UI |
| `source` | `text` | `SEEDED` or `USER_REPORTED` |
| `created_by` | `uuid` | FK → `users.id`; NULL for seeded rows |
| `created_at` | `timestamptz` | |

### `lost_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | UUIDv7 |
| `user_id` | `uuid` | FK → `users.id ON DELETE CASCADE` |
| `title` | `text` | Item name, max 120 chars |
| `category` | `text` | One of: `phone`, `bag`, `wallet`, `keys`, `documents`, `other` |
| `status` | `text` | `LOST` or `FOUND` |
| `city` | `text` | Free text |
| `occurred_at` | `timestamptz` | When item was lost/found |
| `description` | `text` | Free text, max 1000 chars |
| `location` | `geometry(Point, 4326)` | Optional map pin |
| `created_at` | `timestamptz` | |

---

## Indexes

```sql
-- incidents (geospatial — the performance-critical one)
CREATE INDEX idx_incidents_location   ON incidents USING GIST (location);
CREATE INDEX idx_incidents_occurred_at ON incidents (occurred_at DESC);
CREATE INDEX idx_incidents_crime_type  ON incidents (crime_type);

-- lost_items
CREATE INDEX idx_lost_items_created_at ON lost_items (created_at DESC);
CREATE INDEX idx_lost_items_user_id    ON lost_items (user_id);
```

The GiST index on `incidents.location` is what makes the viewport query fast. `ST_MakeEnvelope + ST_Intersects` against a GiST index is O(log N) instead of a full table scan.

---

## PostGIS setup

The `0000_init.sql` migration runs:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
```

These must be in the migration (not the Drizzle schema DSL) because Drizzle's `pgTable` doesn't know how to create PostGIS extensions.

---

## Migrations

| File | What it does |
|---|---|
| `drizzle/0000_init.sql` | Creates extensions, all 5 tables (including now-dropped `magic_links`), all indexes |
| `drizzle/0001_password_auth.sql` | Adds `first_name`, `last_name`, `password_hash` to `users`; drops `magic_links` table; clears existing sessions and users (dev-only data) |

Run with: `bun run db:migrate`
