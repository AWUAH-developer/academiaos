import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { users } from '../src/db/schema';
import { cleanText, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from '../src/lib/validation';

async function main() {
  const name = cleanText(process.env.INITIAL_SUPER_ADMIN_NAME, 120);
  const username = cleanText(process.env.INITIAL_SUPER_ADMIN_USERNAME, 100).toLowerCase();
  const email = normalizeEmail(process.env.INITIAL_SUPER_ADMIN_EMAIL);
  const phone = normalizePhone(process.env.INITIAL_SUPER_ADMIN_PHONE);
  const password = String(process.env.INITIAL_SUPER_ADMIN_PASSWORD || '');

  if (!name || username.length < 3 || !isValidEmail(email) || !isValidPhone(phone) || password.length < 15) {
    throw new Error('Set INITIAL_SUPER_ADMIN_NAME, INITIAL_SUPER_ADMIN_USERNAME, INITIAL_SUPER_ADMIN_EMAIL, INITIAL_SUPER_ADMIN_PHONE, and a password of at least 15 characters.');
  }

  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1))[0];
  if (existing) {
    console.log('Initial administrator already exists. No changes were made.');
    return;
  }

  await db.insert(users).values({
    schoolId: null,
    name,
    username,
    email,
    phone,
    role: 'SUPER_ADMIN',
    passwordHash: await bcrypt.hash(password, 12),
    mustChangePassword: true,
    temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
  });

  console.log('Initial Super Admin created. Sign in within 72 hours and change the password immediately.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
