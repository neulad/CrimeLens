-- CrimeLens — migration 0001: switch from magic-link to password auth
-- Adds first_name, last_name, password_hash to users.
-- Drops the magic_links table (no longer needed).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_name"     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "last_name"      text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "password_hash"  text NOT NULL DEFAULT '';

-- Remove the temporary defaults now that the columns exist
ALTER TABLE "users"
  ALTER COLUMN "first_name"    DROP DEFAULT,
  ALTER COLUMN "last_name"     DROP DEFAULT,
  ALTER COLUMN "password_hash" DROP DEFAULT;

-- Existing test users have no password — delete them so the constraint is clean
-- (dev only; there is no real user data yet)
DELETE FROM "sessions";
DELETE FROM "users";

DROP TABLE IF EXISTS "magic_links";
