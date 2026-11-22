import 'server-only';

import { NextResponse } from 'next/server';
import { isHex } from 'viem';

import { databaseConfigured } from '@/server/launch/db';
import { ingestLaunchTransaction } from '@/server/launch/ingest-launch';
import { ingestTransaction } from '@/server/launch/ingest';

export const dynamic = 'force-dynamic';

/**
 * The browser sends a transaction hash after a publish. The server re-reads the
 * receipt, decodes it and writes the rows; the browser's word is never trusted.
 */
export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'The indexer is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const txHash = (body as { txHash?: unknown }).txHash;
  if (typeof txHash !== 'string' || !isHex(txHash) || txHash.length !== 66) {
    return NextResponse.json({ ok: false, error: 'A transaction hash is required.' }, { status: 400 });
  }

  try {
    const [chapter, launch] = await Promise.allSettled([
      ingestTransaction(txHash as `0x${string}`),
      ingestLaunchTransaction(txHash as `0x${string}`),
    ]);

    const results = [chapter, launch]
      .filter(
        (item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof ingestTransaction>>> =>
          item.status === 'fulfilled',
      )
      .map((item) => item.value);

    if (results.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'The indexer could not read the transaction.' },
        { status: 502 },
      );
    }

    const written = results.reduce((sum, result) => sum + result.written, 0);
    const ok = results.some((result) => result.ok);
    return NextResponse.json(
      {
        ok,
        written,
        error: ok ? null : (results.find((result) => !result.ok)?.reason ?? 'The transaction could not be indexed.'),
      },
      { status: ok ? 200 : 400, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'The indexer could not read the transaction.' },
      { status: 502 },
    );
  }
}
