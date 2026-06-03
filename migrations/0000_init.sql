-- CrimeLens — initial migration
-- Applies PostGIS + citext extensions, then creates all five tables.
-- Run via: bun run db:migrate

-- Extensions must come first (require superuser or pg_extension membership)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  "id"           uuid        PRIMARY KEY,
  "email"        citext      NOT NULL UNIQUE,
  "display_name" text,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- magic_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "magic_links" (
  "id"           uuid        PRIMARY KEY,
  "user_id"      uuid        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash"   text        NOT NULL UNIQUE,
  "expires_at"   timestamptz NOT NULL,
  "consumed_at"  timestamptz,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sessions" (
  "id"           uuid        PRIMARY KEY,
  "user_id"      uuid        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at"   timestamptz NOT NULL,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "incidents" (
  "id"           uuid        PRIMARY KEY,
  "crime_type"   text        NOT NULL,
  "occurred_at"  timestamptz NOT NULL,
  "location"     geometry(Point, 4326) NOT NULL,
  "city"         text        NOT NULL,
  "description"  text        NOT NULL,
  "source"       text        NOT NULL,
  "created_by"   uuid        REFERENCES "users"("id"),
  "created_at"   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crime_type_check CHECK (
    crime_type IN ('pickpocketing','bag_snatching','theft_from_vehicle','other')
  ),
  CONSTRAINT source_check CHECK (
    source IN ('SEEDED','USER_REPORTED')
  )
);

CREATE INDEX IF NOT EXISTS idx_incidents_location    ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_crime_type  ON incidents (crime_type);

-- ---------------------------------------------------------------------------
-- lost_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "lost_items" (
  "id"           uuid        PRIMARY KEY,
  "user_id"      uuid        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"        text        NOT NULL,
  "category"     text        NOT NULL,
  "status"       text        NOT NULL,
  "city"         text        NOT NULL,
  "occurred_at"  timestamptz NOT NULL,
  "description"  text        NOT NULL,
  "location"     geometry(Point, 4326),
  "created_at"   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT category_check CHECK (
    category IN ('phone','bag','wallet','keys','documents','other')
  ),
  CONSTRAINT status_check CHECK (
    status IN ('LOST','FOUND')
  )
);

CREATE INDEX IF NOT EXISTS idx_lost_items_created_at ON lost_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_items_user_id    ON lost_items (user_id);
