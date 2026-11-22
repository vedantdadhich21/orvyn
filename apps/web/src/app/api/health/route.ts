import 'server-only';

import { NextResponse } from 'next/server';

import { database, databaseConfigured } from '@/server/launch/db';

export const dynamic = 'force-dynamic';

/**
 * A small read-only proof that the database is reachable and the schema is in
 * place. It exposes counts, never connection details.
 */
export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ database: 'not_configured' }, { status: 503 });
  }

  try {
    const sql = database();
    const tables = (await sql`
      select count(*)::int as count
      from information_schema.tables
      where table_schema = 'public'
    `) as Array<{ count: number }>;
    const strategies = (await sql`select count(*)::int as count from strategies`) as Array<{
      count: number;
    }>;

    return NextResponse.json({
      database: 'ok',
      tables: tables[0]?.count ?? 0,
      strategies: strategies[0]?.count ?? 0,
    });
  } catch {
    return NextResponse.json({ database: 'unavailable' }, { status: 503 });
  }
}
