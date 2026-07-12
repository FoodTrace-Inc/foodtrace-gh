ALTER TABLE recall_events ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}';
