import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { mobileError, mobileJson } from '@/lib/mobile-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return mobileJson({ data: { service: 'AcademiaOS Mobile API', version: 'v1', database: 'connected', time: new Date().toISOString() } });
  } catch {
    return mobileError(503, 'SERVICE_UNAVAILABLE', 'The mobile service is temporarily unavailable.');
  }
}
