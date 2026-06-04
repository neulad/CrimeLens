-- CrimeLens — migration 0004
-- Lost & Found: add contact fields + image support

ALTER TABLE lost_items
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS contact_whatsapp  text,
  ADD COLUMN IF NOT EXISTS contact_telegram  text,
  ADD COLUMN IF NOT EXISTS image_data        text;   -- base64-encoded compressed JPEG, nullable
