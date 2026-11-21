import type { Metadata } from 'next';

import { SimulateScreen } from '@/features/orvyn/simulate-screen';

export const metadata: Metadata = {
  title: 'Run the rebalance',
  description: 'The simulated trades that return a portfolio to its target weights, before and after.',
};

export default function SimulatePage() {
  return <SimulateScreen />;
}
