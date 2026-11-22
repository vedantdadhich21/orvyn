import { database, databaseConfigured } from './db-core';

export type LaunchProof = {
  wallets: number;
  authors: number;
  strategies: number;
  investors: number;
  eventsToday: number;
  latest: string | null;
};

/**
 * Counts that only the database can answer. Returns null when the database is
 * not configured or not reachable, so the proof page can fall back to the
 * registry without pretending.
 */
export async function readLaunchProof(): Promise<LaunchProof | null> {
  if (!databaseConfigured()) return null;

  try {
    const sql = database();
    const rows = (await sql`
      select
        (select count(*)::int from users) as wallets,
        (select count(distinct author_address)::int from strategies) as authors,
        (select count(*)::int from strategies) as strategies,
        (select count(distinct investor_address)::int from investments) as investors,
        (select count(*)::int from events where created_at >= date_trunc('day', now())) as events_today,
        (select max(published_at) from strategies) as latest
    `) as Array<{
      wallets: number;
      authors: number;
      strategies: number;
      investors: number;
      events_today: number;
      latest: string | Date | null;
    }>;

    const row = rows[0];
    if (!row) return null;

    return {
      wallets: row.wallets,
      authors: row.authors,
      strategies: row.strategies,
      investors: row.investors,
      eventsToday: row.events_today,
      latest: row.latest ? new Date(row.latest).toISOString() : null,
    };
  } catch {
    return null;
  }
}
