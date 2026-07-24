-- Migration 0008: per-learner pricing
-- Add price_per_learner to packages and learner_count to subscriptions

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS price_per_learner numeric(12, 2);

ALTER TABLE school_subscriptions
  ADD COLUMN IF NOT EXISTS learner_count integer;

-- Seed the three standard tiers (case-insensitive name match)
UPDATE packages SET price_per_learner = 15.00 WHERE lower(name) = 'starter';
UPDATE packages SET price_per_learner = 25.00 WHERE lower(name) = 'standard';
UPDATE packages SET price_per_learner = 35.00 WHERE lower(name) = 'premium';
