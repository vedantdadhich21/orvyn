import type { Metadata } from 'next';

import { LaunchScreen } from '@/features/orvyn/launch-screen';
import { readLaunchStrategies, readMarketPrices, type LaunchStrategy, type MarketPrice } from '@/server/launch/market';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Testnet market',
  description:
    'Claim test USD, buy the test stocks and follow a published strategy. Demo prices, no real money.',
};

export default async function LaunchPage() {
  let strategies: LaunchStrategy[] = [];
  let prices: MarketPrice[] = [];
  let error: string | null = null;

  try {
    [strategies, prices] = await Promise.all([readLaunchStrategies(), readMarketPrices()]);
  } catch {
    error = 'The testnet market could not be read right now. Try again in a moment.';
  }

  return <LaunchScreen strategies={strategies} prices={prices} error={error} />;
}
