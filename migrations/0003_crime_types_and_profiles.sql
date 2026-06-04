-- CrimeLens — migration 0003
-- 1. Rename crime types to new category set
-- 2. Add user contact/profile columns

-- ── 1. Crime type rename ─────────────────────────────────────────────────────
-- Old: pickpocketing, bag_snatching, theft_from_vehicle, other
-- New: pickpocketing, bicycle_stolen, street_fight, robbery, street_scams

-- Drop old check constraint
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS crime_type_check;

-- Migrate existing data to closest new category
UPDATE incidents SET crime_type = 'robbery'       WHERE crime_type = 'bag_snatching';
UPDATE incidents SET crime_type = 'bicycle_stolen' WHERE crime_type = 'theft_from_vehicle';
UPDATE incidents SET crime_type = 'street_scams'   WHERE crime_type = 'other';
-- pickpocketing stays as-is

-- Add new check constraint
ALTER TABLE incidents ADD CONSTRAINT crime_type_check CHECK (
  crime_type IN ('pickpocketing', 'bicycle_stolen', 'street_fight', 'robbery', 'street_scams')
);

-- ── 2. User profile / contacts columns ───────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_whatsapp  text,
  ADD COLUMN IF NOT EXISTS contact_telegram  text,
  ADD COLUMN IF NOT EXISTS contact_facebook  text,
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS pending_email     citext,
  ADD COLUMN IF NOT EXISTS email_verified    boolean NOT NULL DEFAULT true;
