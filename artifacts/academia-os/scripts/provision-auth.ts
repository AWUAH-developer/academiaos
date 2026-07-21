import { execFileSync } from 'node:child_process';
import { sql } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { users } from '../src/db/schema';

function hasAllInitialAdminValues() {
  return [
    'INITIAL_SUPER_ADMIN_NAME',
    'INITIAL_SUPER_ADMIN_USERNAME',
    'INITIAL_SUPER_ADMIN_EMAIL',
    'INITIAL_SUPER_ADMIN_PHONE',
    'INITIAL_SUPER_ADMIN_PASSWORD'
  ].every((key) => Boolean(process.env[key]?.trim()));
}

function runNpmScript(script: string, extraEnv: Record<string, string> = {}) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['run', script], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  });
}

async function main() {
  const demoMode = process.env.ACADEMIAOS_DEMO_MODE === 'true';
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users);
  await pool.end();

  if (demoMode) {
    console.log('ACADEMIAOS_DEMO_MODE=true: provisioning the local username/password demo accounts.');
    runNpmScript('db:seed', { ALLOW_DEMO_SEED: 'true' });
    return;
  }

  if (Number(total) > 0) {
    console.log(`Authentication provisioning skipped: ${total} user account(s) already exist.`);
    return;
  }

  if (hasAllInitialAdminValues()) {
    console.log('No accounts exist. Creating the first local AcademiaOS Super Admin from deployment secrets.');
    runNpmScript('db:bootstrap-admin');
    return;
  }

  throw new Error(
    'No AcademiaOS login account exists. Either set ACADEMIAOS_DEMO_MODE=true for a temporary demo, or add all INITIAL_SUPER_ADMIN_* secrets before publishing.'
  );
}

main().catch(async (error) => {
  try { await pool.end(); } catch {}
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
