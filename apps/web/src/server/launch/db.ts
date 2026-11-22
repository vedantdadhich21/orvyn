import 'server-only';

import { neon } from '@neondatabase/serverless';

/**
 * One server-only Neon client. The HTTP driver works on Vercel functions and
 * does not need a TCP pool. Nothing in this module may be imported by a client
 * component.
 */
let client: ReturnType<typeof neon> | null = null;

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured.');
  client ??= neon(url);
  return client;
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
