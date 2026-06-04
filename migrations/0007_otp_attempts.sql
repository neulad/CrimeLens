-- CrimeLens — migration 0007
-- Brute-force protection: track failed verification attempts per OTP.

ALTER TABLE email_otps
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
