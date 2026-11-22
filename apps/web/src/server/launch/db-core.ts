import { neon } from '@neondatabase/serverless';

/**
 * The driver only. Kept free of the `server-only` marker so maintenance
 * scripts can import it; every Next route that uses it is server-only.
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
