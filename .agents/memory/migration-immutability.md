---
name: Migration immutability rule
description: Applied migrations must never be edited; corrections go in a new migration file
---

## Rule

Once a migration file has been recorded in `drizzle.__drizzle_migrations` in **any** environment (dev or production), that file is immutable. All corrections must go in a new migration (0010, 0011, …).

**Why:** Drizzle's migrator compares the last applied `created_at` timestamp against each migration's `when` field. It does not re-check hashes of already-applied migrations. Editing an applied file silently diverges the file from what was executed, making the journal misleading. A new migration file keeps the journal accurate and auditable.

**How to apply:** If a bug is found in an applied migration (wrong value, missing index, etc.), write a new `000N_description.sql` that corrects only the delta. Run `drizzle-kit generate` to create it properly with the right `when` timestamp, or hand-write it and add the entry to `meta/_journal.json` with a `when` strictly greater than the current production watermark.

**Specific history:** Migration 0007 (`0007_reset_superadmin`) was applied in production with different file content than what is now in the repo (local file was edited after deployment). Do not edit 0007 again — next correction = 0010+.

**Journal timestamp pitfall:** Migrations generated locally during an offline session (July 2025) received `when` timestamps that fell below the production watermark (July 2026), causing Drizzle to skip them silently. When hand-authoring migrations, ensure `when` in `meta/_journal.json` is strictly greater than the last production `created_at`. Check watermark with: SELECT MAX(created_at) FROM drizzle.__drizzle_migrations.
