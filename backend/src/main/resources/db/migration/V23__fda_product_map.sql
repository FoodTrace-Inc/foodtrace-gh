-- Links our internal product_batches/drug_batches rows to their official
-- Ghana FDA registry entry, so repeat syncs update the same row instead of
-- creating duplicates. Also records unmatched FDA products (no product_batch
-- or drug_batch yet) so they can be reviewed and imported deliberately later
-- rather than auto-created with a fabricated seller.
CREATE TABLE IF NOT EXISTS fda_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fda_registration_number TEXT NOT NULL,
  fda_product_uuid TEXT,
  product_batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  drug_batch_id UUID REFERENCES drug_batches(id) ON DELETE SET NULL,
  fda_product_name TEXT NOT NULL,
  fda_manufacturer TEXT,
  fda_category TEXT,
  fda_status TEXT NOT NULL,
  fda_registration_date DATE,
  fda_expiry_date DATE,
  match_confidence NUMERIC(4,3),
  match_status TEXT NOT NULL DEFAULT 'unmatched', -- 'matched_applied' | 'matched_pending_review' | 'unmatched'
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fda_registration_number)
);

CREATE INDEX IF NOT EXISTS idx_fda_product_map_product_batch ON fda_product_map(product_batch_id);
CREATE INDEX IF NOT EXISTS idx_fda_product_map_drug_batch ON fda_product_map(drug_batch_id);
CREATE INDEX IF NOT EXISTS idx_fda_product_map_match_status ON fda_product_map(match_status);
