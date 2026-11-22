import type { Metadata } from 'next';

import { LaunchPortfolioScreen } from '@/features/orvyn/launch-portfolio-screen';
import { readMarketPrices, type MarketPrice } from '@/server/launch/market';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Test portfolio',
  description: 'tUSDC and test stock balances at demo oracle prices. No real money.',
};

export default async function LaunchPortfolioPage() {
  let prices: MarketPrice[] = [];
  try {
    prices = await readMarketPrices();
  } catch {
    prices = [];
  }

  return <LaunchPortfolioScreen prices={prices} />;
}
