import { Suspense } from 'react';
import type { Metadata } from 'next';

import { SimulateScreen } from '@/features/orvyn/simulate-screen';

export const metadata: Metadata = {
  title: 'Run the rebalance',
  description: 'The simulated trades that return a portfolio to its target weights, before and after.',
};

export default function SimulatePage() {
  // useSearchParams needs a boundary so the route can still be prerendered.
  return (
    <Suspense fallback={<p className="text-[13px] text-ink-tertiary">Reading the book…</p>}>
      <SimulateScreen />
    </Suspense>
  );
}
