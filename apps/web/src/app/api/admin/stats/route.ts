import 'server-only';

import { NextResponse } from 'next/server';
import { isAddress, isHex, verifyMessage } from 'viem';

import { strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readRegistryCount, readStrategies } from '@/lib/orvyn/registry-read';

/**
 * Admin is a signature gate, not a password. The browser signs a short lived
 * message with the connected wallet; the server verifies it against the wallet
 * list and then reads public registry counts. No user data is exposed here.
 *
 * This is deliberately small until Postgres and the exchange exist. The pack's
 * user list, timeline and sybil views belong in this route once those tables do.
 */

const WINDOW_MS = 5 * 60 * 1000;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Bad request.', 400);
  }

  if (typeof body !== 'object' || body === null) return fail('Bad request.', 400);
  const { address, message, signature } = body as {
    address?: unknown;
    message?: unknown;
    signature?: unknown;
  };

  if (typeof address !== 'string' || !isAddress(address)) return fail('Bad request.', 400);
  if (typeof message !== 'string' || typeof signature !== 'string' || !isHex(signature)) {
    return fail('Bad request.', 400);
  }

  const allowed = (process.env.ADMIN_WALLETS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return fail('Admin is not configured.', 503);
  if (!allowed.includes(address.toLowerCase())) return fail('Not allowed.', 403);

  const stamp = message.match(/^ORVYN admin\n(\d{4}-\d{2}-\d{2}T[\d:.]+Z)$/);
  if (!stamp?.[1]) return fail('Bad challenge.', 400);
  const signedAt = Date.parse(stamp[1]);
  if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > WINDOW_MS) {
    return fail('The challenge expired. Sign again.', 401);
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }
  if (!valid) return fail('Signature does not match.', 401);

  if (!strategyRegistryAddress) {
    return NextResponse.json({
      configured: false,
      count: 0,
      authors: 0,
      latest: null,
    });
  }

  try {
    const [count, entries] = await Promise.all([
      readRegistryCount({ address: strategyRegistryAddress }),
      readStrategies({ address: strategyRegistryAddress, limit: 50 }),
    ]);

    return NextResponse.json({
      configured: true,
      count,
      authors: new Set(entries.map((entry) => entry.author.toLowerCase())).size,
      latest: entries[0]?.publishedAt ?? null,
    });
  } catch {
    return fail('The registry could not be read right now.', 502);
  }
}
