-- Migration 0010: SUPER_ADMIN-controlled User & Admission Management
--
-- Premium subscription eligibility alone NEVER unlocks this feature.
-- Missing row = locked.
-- New row defaults to locked with every delegated permission disabled.

CREATE TABLE IF NOT EXISTS "school_management_controls" (
  "school_id" text PRIMARY KEY NOT NULL
    REFERENCES "schools"("id") ON DELETE CASCADE,

  "user_admission_enabled" boolean NOT NULL DEFAULT false,

  "allow_school_admin_learners" boolean NOT NULL DEFAULT false,
  "allow_school_admin_staff" boolean NOT NULL DEFAULT false,

  "allow_proprietor_learners" boolean NOT NULL DEFAULT false,
  "allow_proprietor_staff" boolean NOT NULL DEFAULT false,

  "updated_by_id" text
    REFERENCES "users"("id") ON DELETE SET NULL,

  "unlocked_at" timestamp with time zone,

  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
