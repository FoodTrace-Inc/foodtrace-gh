-- Supports OTP lockout after repeated wrong verification attempts. IP-based
-- rate limiting for login/OTP-request/registration reuses the audit_logs
-- table (ip_address/success columns already added in V37) rather than a
-- new table - each endpoint just logs an attempt and counts recent rows.

ALTER TABLE otp_tokens
  ADD COLUMN IF NOT EXISTS wrong_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;
