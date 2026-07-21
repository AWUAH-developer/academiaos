import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`select 1 as ok`);
    return NextResponse.json({ status: 'ok', app: 'AcademiaOS', database: 'connected', time: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch {
    return NextResponse.json({ status: 'error', app: 'AcademiaOS', database: 'unavailable', time: new Date().toISOString() }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
