-- Upgrades the single security-question recovery (V18) to two questions,
-- picked from a fixed catalog, for a stronger self-contained password
-- reset that still needs no email/SMS delivery. Existing single-question
-- accounts are NOT broken: their answer becomes question_1, question_2
-- stays NULL, and the reset flow asks only the one question it has until
-- the account owner sets a second one.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS security_question_1 text,
  ADD COLUMN IF NOT EXISTS security_answer_1_hash text,
  ADD COLUMN IF NOT EXISTS security_question_2 text,
  ADD COLUMN IF NOT EXISTS security_answer_2_hash text,
  ADD COLUMN IF NOT EXISTS token_valid_after timestamptz;

UPDATE users
SET security_question_1 = security_question,
    security_answer_1_hash = security_answer_hash
WHERE security_question IS NOT NULL
  AND security_answer_hash IS NOT NULL
  AND security_question_1 IS NULL;

-- Tracks progress through the multi-step forgot-password wizard. user_id is
-- nullable so a lookup for an identifier with no account can still get a
-- real session + decoy questions, rather than the API response shape itself
-- revealing whether the account exists.
CREATE TABLE IF NOT EXISTS password_reset_sessions (
  id SERIAL PRIMARY KEY,
  session_token varchar(64) UNIQUE NOT NULL,
  user_id uuid,
  question_1_text text NOT NULL,
  question_2_text text NOT NULL,
  q1_verified boolean NOT NULL DEFAULT false,
  q2_verified boolean NOT NULL DEFAULT false,
  attempt_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lets the existing audit_logs table (V1) double as the password-reset
-- audit trail and the per-IP rate-limit counter, instead of adding a
-- near-duplicate table.
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address varchar(64),
  ADD COLUMN IF NOT EXISTS success boolean;
