-- FoodTrace GH — Initial Database Migration
-- Run with: psql $DATABASE_URL -f migrations/001_initial.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MANUFACTURERS
-- ============================================================
CREATE TABLE IF NOT EXISTS manufacturers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name     VARCHAR(255) NOT NULL,
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  fda_reg_number   VARCHAR(100) UNIQUE NOT NULL,
  phone            VARCHAR(30),
  address          TEXT,
  is_verified      BOOLEAN DEFAULT FALSE,  -- TRUE after email OTP confirmed
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OTP CODES (email verification)
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            VARCHAR(255) NOT NULL,
  code             VARCHAR(10) NOT NULL,
  purpose          VARCHAR(50) NOT NULL,  -- 'register' | 'login'
  expires_at       TIMESTAMPTZ NOT NULL,
  used             BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

-- ============================================================
-- BATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer_id       UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  batch_number          VARCHAR(100) NOT NULL,
  product_name          VARCHAR(255) NOT NULL,
  -- Raw ingredients (stored as JSON array of {name, supplier, foodtrace_farmer_id?})
  raw_ingredients       JSONB NOT NULL DEFAULT '[]',
  -- Processing steps (stored as JSON array of strings)
  processing_steps      JSONB NOT NULL DEFAULT '[]',
  -- Quality check results
  quality_check_passed  BOOLEAN NOT NULL,
  quality_check_notes   TEXT,
  packaging_date        DATE NOT NULL,
  expiry_date           DATE NOT NULL,
  -- Status: active | recalled | under_investigation | invalidated
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  qr_url                TEXT,           -- S3 URL of generated QR image
  qr_code_data          TEXT,           -- the URL encoded in the QR
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manufacturer_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_manufacturer ON batches(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- ============================================================
-- RECALLS
-- ============================================================
CREATE TABLE IF NOT EXISTS recalls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  issued_by_type  VARCHAR(20) NOT NULL DEFAULT 'manufacturer',  -- 'manufacturer' | 'regulator'
  issued_by_id    UUID NOT NULL,   -- manufacturer_id or regulator_id
  reason          TEXT NOT NULL,
  safe_disposal   TEXT,            -- instructions for consumers
  status          VARCHAR(30) NOT NULL DEFAULT 'active',  -- 'active' | 'resolved'
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recalls_batch ON recalls(batch_id);

-- ============================================================
-- QR SCANS (track who scanned which batch — needed for recall alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  consumer_email  VARCHAR(255),    -- NULL if anonymous web scan
  consumer_phone  VARCHAR(30),     -- for SMS recall alerts
  push_token      TEXT,            -- for push notification recall alerts
  scanned_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_batch ON qr_scans(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- ============================================================
-- RECALL NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS recall_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id       UUID NOT NULL REFERENCES recalls(id) ON DELETE CASCADE,
  recipient       VARCHAR(255) NOT NULL,   -- email or phone
  channel         VARCHAR(20) NOT NULL,    -- 'email' | 'sms' | 'push'
  status          VARCHAR(20) NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recalls_updated_at
  BEFORE UPDATE ON recalls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
