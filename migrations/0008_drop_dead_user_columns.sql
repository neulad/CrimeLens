-- CrimeLens — migration 0008
-- Remove columns that nothing reads anymore:
--   password_hash  — relic of password auth, replaced by email OTP in 0005
--   email_verified — added in 0003, never checked in code

ALTER TABLE users
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS email_verified;
