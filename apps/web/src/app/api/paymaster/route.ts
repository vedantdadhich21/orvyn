import 'server-only';

import { NextResponse } from 'next/server';

/**
 * The paymaster proxy. The CDP URL stays on the server, and only the two
 * methods a smart wallet needs during a sponsored call are forwarded.
 *
 * The CDP allowlist is the real protection; this hides the URL and refuses
 * every method that is not part of paying for a call. It returns 503 until the
 * URL is configured, so the rest of the app keeps working without it.
 */
const ALLOWED = new Set(['pm_getPaymasterStubData', 'pm_getPaymasterData']);

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const target = process.env.CDP_PAYMASTER_URL;
  if (!target) return fail('The paymaster is not configured.', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Bad request.', 400);
  }

  if (typeof body !== 'object' || body === null) return fail('Bad request.', 400);
  const method = (body as { method?: unknown }).method;
  if (typeof method !== 'string' || !ALLOWED.has(method)) {
    return fail('Method not allowed.', 403);
  }

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return fail('The paymaster did not answer.', 502);
  }
}
