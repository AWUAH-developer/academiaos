/**
 * repair-journal.ts
 *
 * One-time reconciliation: inserts missing Drizzle journal entries for migrations
 * that were applied to the database by Replit's publish-time schema-diff mechanism
 * (outside of Drizzle), leaving the drizzle.__drizzle_migrations journal out of sync.
 *
 * Affected migrations on the current production database:
 *   0013_silky_korvac    — creates `school_events` table
 *   0014_true_purifiers  — adds `staff_attendance_officer_id` to `school_management_controls`
 *
 * Safety contract:
 *   - READ-ONLY checks first; only INSERTs journal rows, never touches user data.
 *   - Each INSERT is conditional: only runs when the real-world object already
 *     exists AND the matching journal row is absent. Fully idempotent.
 *   - On a fresh database (objects absent) the script is a no-op; pnpm db:migrate
 *     then applies migrations normally.
 *   - On a fully-migrated database (objects present, journal rows present) the
 *     script is also a no-op.
 */

import 'dotenv/config';
import { Pool } from 'pg';

// Hash values are the SHA-256 fingerprints Drizzle computed when the migrations
// were first applied to the development database (read from drizzle.__drizzle_migrations).
const REPAIRS: Array<{
  tag: string;
  hash: string;
  created_at: number;
  objectCheck: string; // returns ≥1 row when the real-world object exists
}> = [
  {
    tag: '0013_silky_korvac',
    hash: 'd4646c38cff0d2dddb94bcc870a19330af3e91e30ffbb7042b2917303e35b0a1',
    created_at: 1785296052100,
    objectCheck: `
      SELECT 1
      FROM   information_schema.tables
      WHERE  table_schema = 'public'
        AND  table_name   = 'school_events'
    `,
  },
  {
    tag: '0014_true_purifiers',
    hash: '94e109398dbe8e0b5959dac40e900c3393ec742e6e67ed44e15db3ac0c465e72',
    created_at: 1785313693440,
    objectCheck: `
      SELECT 1
      FROM   information_schema.columns
      WHERE  table_schema = 'public'
        AND  table_name   = 'school_management_controls'
        AND  column_name  = 'staff_attendance_officer_id'
    `,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error('[repair-journal] DATABASE_URL is not set — aborting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    let repaired = 0;

    for (const repair of REPAIRS) {
      // 1. Does the real-world object already exist?
      const { rows: objectRows } = await pool.query(repair.objectCheck);
      const objectExists = objectRows.length > 0;

      // 2. Does the journal entry already exist?
      const { rows: journalRows } = await pool.query(
        `SELECT 1 FROM drizzle."__drizzle_migrations" WHERE created_at = $1`,
        [repair.created_at],
      );
      const journalEntryExists = journalRows.length > 0;

      if (!objectExists) {
        console.log(
          `[repair-journal] ${repair.tag}: object absent — skipping (pnpm db:migrate will create it).`,
        );
        continue;
      }

      if (journalEntryExists) {
        console.log(
          `[repair-journal] ${repair.tag}: journal entry already present — nothing to do.`,
        );
        continue;
      }

      // Object exists but journal entry is missing — insert the missing row.
      await pool.query(
        `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [repair.hash, repair.created_at],
      );
      console.log(
        `[repair-journal] ${repair.tag}: inserted missing journal entry (hash ${repair.hash.slice(0, 12)}…).`,
      );
      repaired++;
    }

    if (repaired === 0) {
      console.log('[repair-journal] No repairs needed.');
    } else {
      console.log(`[repair-journal] Inserted ${repaired} missing journal entry/entries.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error('[repair-journal] Fatal error:', err);
  process.exit(1);
});
