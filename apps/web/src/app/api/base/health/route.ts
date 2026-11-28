import 'server-only';

import {NextResponse} from 'next/server';

import {mainnetReadsEnabled} from '@/server/base/flags';
import {mainnetRpcHealth} from '@/server/base/rpc';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!mainnetReadsEnabled()) {
    return NextResponse.json({ok: false, error: 'Mainnet reads are disabled.'}, {status: 503});
  }
  const health = await mainnetRpcHealth();
  return NextResponse.json(health, {status: health.ok ? 200 : 503});
}
