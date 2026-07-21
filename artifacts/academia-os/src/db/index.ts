import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalDb = globalThis as unknown as { pool?: Pool; db?: ReturnType<typeof drizzle<typeof schema>> };
const configuredConnectionString = process.env.DATABASE_URL?.trim();


const poolMaxInput = Number(process.env.DATABASE_POOL_MAX || 10);
const poolMax = Number.isFinite(poolMaxInput) ? Math.min(Math.max(Math.trunc(poolMaxInput), 1), 20) : 10;
const useSsl = process.env.DATABASE_SSL === 'true';
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

export const pool = globalDb.pool ?? new Pool({
  ...(configuredConnectionString ? { connectionString: configuredConnectionString } : {}),
  max: poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  query_timeout: 20_000,
  statement_timeout: 20_000,
  allowExitOnIdle: true,
  application_name: 'AcademiaOS',
  ssl: useSsl ? { rejectUnauthorized } : undefined
});

export const db = globalDb.db ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalDb.pool = pool;
  globalDb.db = db;
}
