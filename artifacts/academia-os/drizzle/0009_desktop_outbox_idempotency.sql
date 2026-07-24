-- Migration 0009: Desktop outbox idempotency keys (persisted, restart-safe)
--
-- Replaces the in-process Map in /api/desktop/v1/sync/outbox/route.ts.
-- Each row stores one server-processed operation idempotency key so that
-- duplicate transmissions of the same offline operation produce exactly
-- one logical server mutation, even across server restarts and pod failures.
--
-- Retention: rows older than 90 days can be purged safely; the desktop
-- client recycles idempotency keys no more frequently than every 30 days
-- (the refresh token lifetime).

CREATE TABLE IF NOT EXISTS "desktop_outbox_idempotency_keys" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "idempotency_key"  uuid NOT NULL,
  "school_id"        text REFERENCES "schools"("id") ON DELETE CASCADE,
  "user_id"          text REFERENCES "users"("id") ON DELETE SET NULL,
  "operation_type"   text NOT NULL,
  "result"           text NOT NULL,       -- 'ok' | 'rejected'
  "error_message"    text,
  "processed_at"     timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "doik_idempotency_key_idx"
  ON "desktop_outbox_idempotency_keys"("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doik_school_processed_idx"
  ON "desktop_outbox_idempotency_keys"("school_id", "processed_at");
