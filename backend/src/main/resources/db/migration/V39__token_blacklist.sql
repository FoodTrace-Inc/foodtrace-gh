-- Per-token logout revocation. This complements TokenRevocationService's
-- users.token_valid_after (which invalidates ALL of a user's tokens on
-- password change): logout should only kill the one token being used, not
-- every other signed-in device, so it needs to be keyed by token rather
-- than by user. Storing a SHA-256 hash, never the raw token.
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token_hash varchar(64) NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
