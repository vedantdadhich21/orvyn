import { database, databaseConfigured } from './db-core';

export type AdminEvent = {
  id: string;
  kind: string;
  actor: string;
  subject: string | null;
  txHash: string | null;
  createdAt: string;
};

export type AdminUserRow = {
  address: string;
  firstSeenAt: string;
  lastSeenAt: string;
  strategies: number;
};

export type AdminOverview = {
  users: number;
  strategies: number;
  investors: number;
  eventsToday: number;
  recentEvents: AdminEvent[];
  recentUsers: AdminUserRow[];
};

function iso(value: string | Date): string {
  try {
    return new Date(value).toISOString();
  } catch {
    return '';
  }
}

/**
 * The admin views that only Postgres can answer. Null when the database is not
 * configured or not reachable; the route then falls back to registry counts.
 */
export async function readAdminOverview(): Promise<AdminOverview | null> {
  if (!databaseConfigured()) return null;

  try {
    const sql = database();

    const counts = (await sql`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from strategies) as strategies,
        (select count(distinct investor_address)::int from investments) as investors,
        (select count(*)::int from events where created_at >= date_trunc('day', now())) as events_today
    `) as Array<{ users: number; strategies: number; investors: number; events_today: number }>;

    const events = (await sql`
      select id, kind, actor_address, subject, tx_hash, created_at
      from events
      order by created_at desc
      limit 20
    `) as Array<{
      id: string | number;
      kind: string;
      actor_address: string;
      subject: string | null;
      tx_hash: string | null;
      created_at: string | Date;
    }>;

    const users = (await sql`
      select
        u.address,
        u.first_seen_at,
        u.last_seen_at,
        count(s.onchain_id)::int as strategies
      from users u
      left join strategies s on s.author_address = u.address
      group by u.address, u.first_seen_at, u.last_seen_at
      order by u.last_seen_at desc
      limit 20
    `) as Array<{
      address: string;
      first_seen_at: string | Date;
      last_seen_at: string | Date;
      strategies: number;
    }>;

    const row = counts[0];
    if (!row) return null;

    return {
      users: row.users,
      strategies: row.strategies,
      investors: row.investors,
      eventsToday: row.events_today,
      recentEvents: events.map((event) => ({
        id: String(event.id),
        kind: event.kind,
        actor: event.actor_address,
        subject: event.subject,
        txHash: event.tx_hash,
        createdAt: iso(event.created_at),
      })),
      recentUsers: users.map((user) => ({
        address: user.address,
        firstSeenAt: iso(user.first_seen_at),
        lastSeenAt: iso(user.last_seen_at),
        strategies: user.strategies,
      })),
    };
  } catch {
    return null;
  }
}
