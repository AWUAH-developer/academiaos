import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { desktopError, desktopJson } from '@/lib/desktop-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return desktopJson({
      data: {
        service: 'AcademiaOS Desktop API',
        version: 'v1',
        database: 'connected',
        time: new Date().toISOString(),
      },
    });
  } catch {
    return desktopError(503, 'SERVICE_UNAVAILABLE', 'The desktop service is temporarily unavailable.');
  }
}
