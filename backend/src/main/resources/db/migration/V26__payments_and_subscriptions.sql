-- Paystack payments: subscriptions table drives access-limit enforcement,
-- payments table is the append-only ledger of every Paystack transaction
-- attempt (pending/success/failed), used for both webhook reconciliation
-- and the account payment-history view.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('micro', 'small', 'medium', 'large');
  END IF;
  -- Consumer premium plan reuses the same enum as manufacturer/pharmacist tiers.
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'subscription_tier'::regtype AND enumlabel = 'premium') THEN
    ALTER TYPE subscription_tier ADD VALUE 'premium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  plan_type subscription_tier NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  channel TEXT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_type subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  paystack_subscription_code TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Consumer free-tier scan counting: how many scans a consumer has used in
-- the current calendar month, reset by comparing period_start rather than
-- a cron job (cheaper, no scheduler dependency for something this small).
CREATE TABLE IF NOT EXISTS consumer_scan_usage (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  scan_count INT NOT NULL DEFAULT 0
);
