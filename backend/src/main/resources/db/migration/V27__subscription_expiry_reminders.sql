-- Tracks whether the 7-day and 1-day expiry reminders have already been
-- sent for the CURRENT expiry period, so the daily scheduler doesn't spam
-- the same reminder every day it runs. Cleared whenever expires_at changes
-- (a renewal), via the PaymentService reconciliation logic re-inserting/
-- updating the row — new expires_at naturally needs new reminders.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS reminder_7d_sent_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent_for TIMESTAMPTZ;
