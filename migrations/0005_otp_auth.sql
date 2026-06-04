-- CrimeLens — migration 0005
-- Replace password auth with email OTP codes.
-- Keeps password_hash column (non-destructive) but auth code no longer uses it.

CREATE TABLE IF NOT EXISTS email_otps (
  id          uuid        PRIMARY KEY,
  email       citext      NOT NULL,
  code_hash   text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps (email);
