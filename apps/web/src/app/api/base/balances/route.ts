import 'server-only';

import {NextRequest, NextResponse} from 'next/server';
import {isAddress, type Address} from 'viem';

import {readMainnetBalances} from '@/server/base/balances';
import {mainnetReadsEnabled} from '@/server/base/flags';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!mainnetReadsEnabled()) {
    return NextResponse.json({error: 'Mainnet reads are disabled.'}, {status: 503});
  }
  const address = request.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address)) {
    return NextResponse.json({error: 'A valid EVM address is required.'}, {status: 400});
  }
  try {
    const balances = await readMainnetBalances(address as Address);
    return NextResponse.json(balances, {headers: {'cache-control': 'no-store'}});
  } catch {
    return NextResponse.json({error: 'Mainnet balances are temporarily unavailable.'}, {status: 503});
  }
}
