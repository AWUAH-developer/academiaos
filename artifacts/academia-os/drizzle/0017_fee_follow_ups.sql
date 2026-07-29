-- Fee arrears follow-up log: records every chase/contact activity against a learner's outstanding fees.
-- Intentionally does NOT modify any financial balance; balance changes only through charges, payments, reversals, or approved adjustments.
CREATE TABLE IF NOT EXISTS "fee_follow_ups" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "learner_id" text NOT NULL REFERENCES "learners"("id") ON DELETE CASCADE,
  "contact_method" text NOT NULL,
  "outcome" text NOT NULL,
  "note" text,
  "promised_payment_date" timestamptz,
  "next_follow_up_date" timestamptz,
  "recorded_by_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_follow_up_learner_idx" ON "fee_follow_ups"("school_id","learner_id","created_at");
