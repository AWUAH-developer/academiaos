import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('[start] Refusing to start: DATABASE_URL is missing.');
  process.exit(1);
}

if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  console.error('[start] Refusing to start: DATABASE_URL is not a PostgreSQL connection string.');
  process.exit(1);
}

// Resolve the artifact root (artifacts/academia-os/)
const artifactRoot = new URL('..', import.meta.url).pathname;

// ── Step 1: Apply any outstanding schema changes directly via SQL ────────────
// These statements are all idempotent (IF NOT EXISTS / WHERE NOT EXISTS) so it
// is safe to run them on every startup.  This approach is used in addition to
// the Drizzle migrator because Drizzle may skip a migration it has already
// recorded as applied in __drizzle_migrations even when the DDL never actually
// ran (e.g. if a previous deploy crashed mid-migration).
console.log('[start] Ensuring schema is up to date…');
try {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });

  await pool.query(`
    ALTER TABLE packages
      ADD COLUMN IF NOT EXISTS price_per_learner numeric(12, 2);
  `);

  await pool.query(`
    ALTER TABLE school_subscriptions
      ADD COLUMN IF NOT EXISTS learner_count integer;
  `);

  // Seed per-learner rates for the three standard tiers (safe to re-run)
  await pool.query(`
    UPDATE packages SET price_per_learner = 15.00 WHERE lower(name) = 'starter'  AND price_per_learner IS NULL;
    UPDATE packages SET price_per_learner = 25.00 WHERE lower(name) = 'standard' AND price_per_learner IS NULL;
    UPDATE packages SET price_per_learner = 35.00 WHERE lower(name) = 'premium'  AND price_per_learner IS NULL;
  `);

  // Migration 0009: Desktop outbox idempotency keys (DB-persisted, restart-safe)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "desktop_outbox_idempotency_keys" (
      "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "idempotency_key"  uuid NOT NULL,
      "school_id"        text REFERENCES "schools"("id") ON DELETE CASCADE,
      "user_id"          text REFERENCES "users"("id") ON DELETE SET NULL,
      "operation_type"   text NOT NULL,
      "result"           text NOT NULL,
      "error_message"    text,
      "processed_at"     timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "doik_idempotency_key_idx"
      ON "desktop_outbox_idempotency_keys"("idempotency_key");
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "doik_school_processed_idx"
      ON "desktop_outbox_idempotency_keys"("school_id", "processed_at");
  `);

  await pool.end();
  console.log('[start] Schema bootstrap complete.');
} catch (err) {
  console.error('[start] Schema bootstrap failed — aborting startup:', err.message);
  process.exit(1);
}

// ── Step 2: Run Drizzle migrations (picks up any remaining pending migrations) ─
console.log('[start] Running Drizzle migrations…');
try {
  const { Pool }    = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');

  const pool = new Pool({ connectionString: databaseUrl });
  const db   = drizzle(pool);
  await migrate(db, { migrationsFolder: `${artifactRoot}/drizzle` });
  await pool.end();
  console.log('[start] Drizzle migrations complete.');
} catch (err) {
  // Non-fatal: log but continue — schema was already bootstrapped above
  console.warn('[start] Drizzle migrator warning (non-fatal):', err.message);
}

// ── Step 3: Start Next.js ────────────────────────────────────────────────────
const port = process.env.PORT || '3000';
console.log(`[start] Starting Next.js on port ${port}…`);

const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  cwd: artifactRoot,
  env: process.env,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
