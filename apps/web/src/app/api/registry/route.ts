import 'server-only';

import { NextResponse } from 'next/server';

import { strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readStrategies } from '@/lib/orvyn/registry-read';

/**
 * The home gallery reads this, so the client never needs an RPC or a key.
 * A missing address is a normal state (publishing off), not an error.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!strategyRegistryAddress) {
    return NextResponse.json(
      { configured: false, entries: [], error: null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const entries = await readStrategies({ address: strategyRegistryAddress });
    return NextResponse.json(
      { configured: true, entries, error: null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        configured: true,
        entries: [],
        error: 'The registry could not be read right now. Try again in a moment.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
