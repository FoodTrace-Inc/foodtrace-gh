-- addRecallEvidence was never able to attach evidence to a drug recall - the
-- endpoint always updated recall_events (food) only, so uploading evidence
-- for a drug recall silently 404'd. Mirrors V15's evidence_urls column.
ALTER TABLE drug_recall_events ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}';
