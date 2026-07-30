import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { schools, users } from '../src/db/schema';

const EMAIL = 'clintonosei074@gmail.com';
const SCHOOL_CODE = 'CLINTON-DEMO';
const SCHOOL_NAME = 'Clinton Osei Demo School';
const USERNAME = 'clinton.demo';
const PASSWORD = 'AcademiaDemo2026!';

async function main() {
  const now = new Date();

  let school = (
    await db
      .select()
      .from(schools)
      .where(eq(schools.code, SCHOOL_CODE))
      .limit(1)
  )[0];

  if (!school) {
    [school] = await db
      .insert(schools)
      .values({
        name: SCHOOL_NAME,
        code: SCHOOL_CODE,
        email: EMAIL,
        phone: '0240000000',
        address: 'Kumasi, Ghana',
        logoUrl: '/icon.svg',
        currency: 'GHS',
        timezone: 'Africa/Accra',
        proprietorApprovalRequired: true,
        isActive: true,
      })
      .returning();
  } else {
    [school] = await db
      .update(schools)
      .set({
        name: SCHOOL_NAME,
        email: EMAIL,
        isActive: true,
        updatedAt: now,
      })
      .where(eq(schools.id, school.id))
      .returning();
  }

  const existingAdmin = (
    await db
      .select()
      .from(users)
      .where(eq(users.username, USERNAME))
      .limit(1)
  )[0];

  if (existingAdmin && existingAdmin.schoolId !== school.id) {
    throw new Error(
      `Safety stop: ${USERNAME} already belongs to another school.`,
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  let admin;

  if (existingAdmin) {
    [admin] = await db
      .update(users)
      .set({
        schoolId: school.id,
        name: 'Clinton Osei',
        email: EMAIL,
        passwordHash,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, existingAdmin.id))
      .returning();
  } else {
    [admin] = await db
      .insert(users)
      .values({
        schoolId: school.id,
        name: 'Clinton Osei',
        username: USERNAME,
        email: EMAIL,
        passwordHash,
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
      })
      .returning();
  }

  console.log('');
  console.log('===== PRODUCTION TENANT READY =====');
  console.log(`School: ${school.name}`);
  console.log(`Administrator: ${admin.username}`);
}

main()
  .catch((error) => {
    console.error('');
    console.error('PRODUCTION TENANT CREATION FAILED');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
