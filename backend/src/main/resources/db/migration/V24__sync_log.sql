-- Part D: tracks every FDA registry sync run (scheduled or manually
-- triggered), scheduled or manual, so there's a visible audit trail of
-- when the sync ran, what it found, and whether it succeeded.
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'fda_scheduled' | 'fda_manual'
  status TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  records_scraped INT,
  matched_applied INT,
  matched_pending_review INT,
  unmatched INT,
  failed_records INT,
  newly_recalled INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at DESC);
