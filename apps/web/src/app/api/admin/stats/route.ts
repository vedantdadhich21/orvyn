import 'server-only';

import { NextResponse } from 'next/server';
import { isAddress, isHex, verifyMessage } from 'viem';

import { strategyRegistryAddress } from '@/lib/orvyn/registry';
import { readRegistryCount, readStrategies } from '@/lib/orvyn/registry-read';
import { readAdminOverview } from '@/server/launch/admin';

/**
 * Admin is a signature gate, not a password. The browser signs a short lived
 * message with the connected wallet; the server verifies it against the wallet
 * list and then reads the launch database. If the database is unavailable, the
 * route falls back to registry counts and says so.
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

  const overview = await readAdminOverview();
  if (overview) {
    return NextResponse.json({
      configured: true,
      registryOnly: false,
      registry: strategyRegistryAddress ?? null,
      ...overview,
    });
  }

  if (!strategyRegistryAddress) {
    return NextResponse.json({
      configured: false,
      registryOnly: false,
      registry: null,
      users: 0,
      strategies: 0,
      investors: 0,
      eventsToday: 0,
      recentEvents: [],
      recentUsers: [],
      launch: null,
    });
  }

  try {
    const [count, entries] = await Promise.all([
      readRegistryCount({ address: strategyRegistryAddress }),
      readStrategies({ address: strategyRegistryAddress, limit: 50 }),
    ]);

    return NextResponse.json({
      configured: true,
      registryOnly: true,
      registry: strategyRegistryAddress,
      users: new Set(entries.map((entry) => entry.author.toLowerCase())).size,
      strategies: count,
      investors: 0,
      eventsToday: 0,
      recentEvents: [],
      recentUsers: [],
      launch: null,
    });
  } catch {
    return fail('The registry could not be read right now.', 502);
  }
}
