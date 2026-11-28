import 'server-only';

import {NextResponse} from 'next/server';

import {mainnetReadsEnabled} from '@/server/base/flags';
import {listTokenizedStocks} from '@/server/base/tokenized-stocks';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!mainnetReadsEnabled()) {
    return NextResponse.json({error: 'Mainnet reads are disabled.'}, {status: 503});
  }
  try {
    const tokens = await listTokenizedStocks();
    return NextResponse.json(
      {source: 'https://api.coinbase.com/v1/tokenized-stocks', tokens},
      {headers: {'cache-control': 'no-store'}},
    );
  } catch {
    return NextResponse.json({error: 'Tokenized stock metadata is unavailable.'}, {status: 503});
  }
}
