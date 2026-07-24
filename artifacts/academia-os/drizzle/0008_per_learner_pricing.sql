-- Migration 0008: per-learner pricing
-- Add price_per_learner to packages and learner_count to subscriptions

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS price_per_learner numeric(12, 2);

ALTER TABLE school_subscriptions
  ADD COLUMN IF NOT EXISTS learner_count integer;

-- Seed default pricing only for rows where no price has been set yet.
-- AND price_per_learner IS NULL ensures existing production prices are
-- never overwritten, even if this migration runs on a database that
-- already received the column via a prior drizzle-kit push.
UPDATE packages SET price_per_learner = 15.00
  WHERE lower(name) = 'starter'  AND price_per_learner IS NULL;
UPDATE packages SET price_per_learner = 25.00
  WHERE lower(name) = 'standard' AND price_per_learner IS NULL;
UPDATE packages SET price_per_learner = 35.00
  WHERE lower(name) = 'premium'  AND price_per_learner IS NULL;
