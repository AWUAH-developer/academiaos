import { spawn } from 'node:child_process';
import { join } from 'node:path';

const isPublished = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('Refusing to start: DATABASE_URL is missing. Add it to Replit Secrets and Published App Secrets.');
  process.exit(1);
}

if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  console.error('Refusing to start: DATABASE_URL is not a PostgreSQL connection string.');
  process.exit(1);
}

// Resolve the artifact root (artifacts/academia-os/)
const artifactRoot = new URL('..', import.meta.url).pathname;
const migrationsFolder = join(artifactRoot, 'drizzle');

// ── Run Drizzle migrations before starting Next.js ──────────────────────────
console.log('[start] Running database migrations…');
try {
  const { Pool }    = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');

  const pool = new Pool({ connectionString: databaseUrl });
  const db   = drizzle(pool);
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log('[start] Migrations complete.');
} catch (err) {
  console.error('[start] Migration failed — aborting startup:', err.message);
  process.exit(1);
}

// ── Start Next.js ────────────────────────────────────────────────────────────
const port = process.env.PORT || '3000';

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
