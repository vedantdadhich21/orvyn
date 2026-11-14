import type { Metadata } from 'next';

import { HomeScreen } from '@/features/orvyn/home-screen';

export const metadata: Metadata = {
  title: 'Portfolios, programmed',
  description:
    'Build a stock portfolio, write the rules it follows, and publish the strategy onchain. Simulated holdings; testnet only.',
};

export default function HomePage() {
  return <HomeScreen />;
}
