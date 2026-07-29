/**
 * AcademiaOS — Production Startup Script
 *
 * Startup sequence:
 *   1. Validate DATABASE_URL
 *   2. Post-migration schema verification (read-only; fails loudly if anything
 *      required by migrations 0008/0009 is absent)
 *   3. Start Next.js
 *
 * Migration authority: build phase only.
 * Migrations are applied by `pnpm db:migrate` in the production build command
 * (artifact.toml [services.production.build]), not at runtime.  Running
 * migrations at startup delays Next.js port binding past Replit's port-detection
 * window (~2 min), which causes the promote step to time out and fail.
 * The schema verification below is a lightweight read-only sanity check that
 * confirms the required schema objects exist before serving traffic.
 */
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

// ── Step 1: Post-migration schema verification ────────────────────────────────
// Read-only checks against information_schema.  If anything required by a
// migration is absent, startup fails immediately with a precise error message.
// This is a verification step only — it does NOT create or alter anything.
console.log('[start] Verifying post-migration schema…');
try {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });

  const required = [
    {
      migration: '0008_per_learner_pricing',
      label:     'packages.price_per_learner column',
      query:     `SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name   = 'packages'
                    AND column_name  = 'price_per_learner'`,
    },
    {
      migration: '0008_per_learner_pricing',
      label:     'school_subscriptions.learner_count column',
      query:     `SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name   = 'school_subscriptions'
                    AND column_name  = 'learner_count'`,
    },
    {
      migration: '0009_desktop_outbox_idempotency',
      label:     'desktop_outbox_idempotency_keys table',
      query:     `SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public'
                    AND table_name   = 'desktop_outbox_idempotency_keys'`,
    },
    {
      migration: '0009_desktop_outbox_idempotency',
      label:     'doik_idempotency_key_idx unique index',
      query:     `SELECT 1 FROM pg_indexes
                  WHERE schemaname = 'public'
                    AND indexname  = 'doik_idempotency_key_idx'`,
    },
    {
      migration: '0013_silky_korvac',
      label:     'school_events table',
      query:     `SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public'
                    AND table_name   = 'school_events'`,
    },
    {
      migration: '0014_true_purifiers',
      label:     'school_management_controls.staff_attendance_officer_id column',
      query:     `SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public'
                    AND table_name   = 'school_management_controls'
                    AND column_name  = 'staff_attendance_officer_id'`,
    },
  ];

  const failures = [];
  for (const check of required) {
    const { rows } = await pool.query(check.query);
    if (rows.length === 0) {
      failures.push(`  MISSING: ${check.label} (expected by migration ${check.migration})`);
    }
  }

  await pool.end();

  if (failures.length > 0) {
    console.error(
      '[start] Schema verification FAILED — required objects are missing:\n' +
      failures.join('\n') + '\n' +
      '[start] Run the Drizzle migration manually or check the migration journal.'
    );
    process.exit(1);
  }

  console.log('[start] Schema verification passed.');
} catch (err) {
  console.error('[start] Schema verification failed — aborting startup:', err.message);
  process.exit(1);
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
