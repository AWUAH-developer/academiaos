-- Promotion policy: one row per school, configured by Super Admin.
CREATE TABLE IF NOT EXISTS "promotion_policies" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "min_annual_average" numeric(5,2) NOT NULL DEFAULT 50,
  "min_subjects_passed" integer NOT NULL DEFAULT 5,
  "compulsory_subject_ids" jsonb,
  "min_attendance_pct" numeric(5,2),
  "incomplete_results_block" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_policy_school_uq" ON "promotion_policies"("school_id");
--> statement-breakpoint
-- Learner promotions: one record per learner per academic year.
CREATE TABLE IF NOT EXISTS "learner_promotions" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "learner_id" text NOT NULL REFERENCES "learners"("id") ON DELETE CASCADE,
  "academic_year_id" text NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
  "from_class_id" text NOT NULL REFERENCES "classes"("id") ON DELETE RESTRICT,
  "to_class_id" text REFERENCES "classes"("id") ON DELETE RESTRICT,
  "system_recommendation" text NOT NULL,
  "decision" text,
  "reason" text,
  "decided_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamptz,
  "approved_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "applied_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "learner_promotion_year_uq" ON "learner_promotions"("learner_id","academic_year_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learner_promotion_school_year_idx" ON "learner_promotions"("school_id","academic_year_id");
